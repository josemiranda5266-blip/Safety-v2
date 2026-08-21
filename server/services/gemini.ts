import { GoogleGenAI, Type } from "@google/genai";

let genAIClient: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no está configurada en los secretos del entorno.");
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "safety-ia-production",
        },
      },
    });
  }
  return genAIClient;
}

export class GeminiPublicError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "GeminiPublicError";
  }
}

export function mapToGeminiPublicError(error: any): GeminiPublicError {
  if (error instanceof GeminiPublicError) {
    return error;
  }

  const rawMessage = error?.message ? String(error.message) : String(error);
  const statusProp = error?.status || error?.statusCode || error?.status_code;

  let status = 500;
  let code = "AI_SERVICE_ERROR";
  let message = "No fue posible procesar la solicitud de IA.";

  // 1. Detect 429
  const is429 = statusProp === 429 || 
                rawMessage.includes("429") || 
                rawMessage.includes("RESOURCE_EXHAUSTED") || 
                rawMessage.includes("quota") || 
                rawMessage.toLowerCase().includes("rate limit");

  // 2. Detect 503
  const is503 = statusProp === 503 || 
                rawMessage.includes("503") || 
                rawMessage.includes("UNAVAILABLE") || 
                rawMessage.includes("high demand") ||
                rawMessage.toLowerCase().includes("unavailable");

  // 3. Detect 400
  const is400 = statusProp === 400 || 
                rawMessage.includes("400") || 
                rawMessage.includes("INVALID_ARGUMENT") ||
                rawMessage.toLowerCase().includes("bad request") ||
                rawMessage.toLowerCase().includes("invalid_argument");

  // 4. Detect 401
  const is401 = statusProp === 401 || 
                rawMessage.includes("401") || 
                rawMessage.includes("UNAUTHENTICATED") || 
                rawMessage.toLowerCase().includes("unauthenticated");

  // 5. Detect 403
  const is403 = statusProp === 403 || 
                rawMessage.includes("403") || 
                rawMessage.includes("PERMISSION_DENIED") ||
                rawMessage.toLowerCase().includes("permission denied") ||
                rawMessage.toLowerCase().includes("unauthorized");

  if (is429) {
    status = 429;
    code = "RATE_LIMIT_EXHAUSTED";
    message = "Demasiadas solicitudes. Intenta nuevamente más tarde.";
  } else if (is503) {
    status = 503;
    code = "SERVICE_UNAVAILABLE";
    message = "El servicio de IA no está disponible temporalmente.";
  } else if (is400) {
    status = 400;
    code = "INVALID_REQUEST";
    message = "Solicitud de IA inválida.";
  } else if (is401) {
    status = 401;
    code = "UNAUTHENTICATED";
    message = "No fue posible autenticar el servicio de IA.";
  } else if (is403) {
    status = 403;
    code = "UNAUTHORIZED";
    message = "El servicio de IA no tiene autorización suficiente.";
  }

  return new GeminiPublicError(status, code, message);
}

export const FINOPS_BUDGETS = {
  CHAT_RAG: { inputLimit: 20000, outputLimit: 2000 },
  DOCUMENT_COMPARISON: { inputLimit: 30000, outputLimit: 3000 },
  OCR: { inputLimit: 15000, outputLimit: 4000 },
  IMAGE_ANALYSIS: { inputLimit: 15000, outputLimit: 3000 }
};

export interface GenerateWithRetryOptions {
  model?: string;
  contents: any;
  config?: any;
  maxRetries?: number;
  initialDelayMs?: number;
  operationType?: "CHAT_RAG" | "DOCUMENT_COMPARISON" | "OCR" | "IMAGE_ANALYSIS";
}

/**
 * Executes a call to Google GenAI with exponential backoff & jitter for 503 UNAVAILABLE / 429 RESOURCE_EXHAUSTED.
 * Also supports fallback model degradation if primary model remains overloaded.
 */
export async function generateContentWithRetry(options: GenerateWithRetryOptions): Promise<any> {
  const primaryModel = options.model || "gemini-2.5-flash";
  const fallbackModel = "gemini-2.5-flash";
  const maxRetries = options.maxRetries ?? 3;
  let delay = options.initialDelayMs ?? 1000;

  let ai;
  try {
    ai = getGenAI();
  } catch (err: any) {
    const rawMsg = err?.message ? String(err.message) : String(err);
    const sanitizedInitMsg = rawMsg
      .replace(/AIzaSy[a-zA-Z0-9-_]+/g, "[REDACTED_API_KEY]")
      .replace(/Bearer\s+[a-zA-Z0-9-_.]+/gi, "Bearer [REDACTED_TOKEN]")
      .slice(0, 120);
    console.error("[Gemini Config Error] client init failed:", sanitizedInitMsg);
    throw new GeminiPublicError(500, "AI_SERVICE_ERROR", "No fue posible procesar la solicitud de IA.");
  }

  // Pre-request FinOps token count verification
  if (options.operationType && FINOPS_BUDGETS[options.operationType]) {
    const budget = FINOPS_BUDGETS[options.operationType];
    try {
      const countRes = await ai.models.countTokens({
        model: primaryModel,
        contents: options.contents,
      });
      const inputTokens = countRes.totalTokens || 0;
      if (inputTokens > budget.inputLimit) {
        throw new GeminiPublicError(
          400,
          "TOKEN_BUDGET_EXCEEDED",
          `La solicitud excede el presupuesto máximo de tokens de entrada permitido para esta operación (${inputTokens} > ${budget.inputLimit}).`
        );
      }
    } catch (countErr: any) {
      if (countErr instanceof GeminiPublicError) {
        throw countErr;
      }
      console.warn("[FinOps Token Count Warning]", countErr?.message || String(countErr));
    }
  }

  // Prepare final config with maxOutputTokens override if operationType budget is present
  const finalConfig = { ...(options.config || {}) };
  if (options.operationType && FINOPS_BUDGETS[options.operationType]) {
    finalConfig.maxOutputTokens = FINOPS_BUDGETS[options.operationType].outputLimit;
  }

  let currentModel = primaryModel;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: options.contents,
        config: finalConfig,
      });

      // Post-request FinOps usage log
      if (response.usageMetadata) {
        const { promptTokenCount, candidatesTokenCount, thoughtsTokenCount, cachedContentTokenCount } = response.usageMetadata;
        console.log("[FinOps Token Observability]", {
          operationType: options.operationType || "UNKNOWN",
          promptTokenCount: promptTokenCount || 0,
          candidatesTokenCount: candidatesTokenCount || 0,
          thoughtsTokenCount: thoughtsTokenCount || 0,
          cachedContentTokenCount: cachedContentTokenCount || 0,
        });
      }

      return response;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const is503 = errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE") || errorMessage.includes("high demand");
      const is429 = errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota");

      // Redact sensitive patterns from warning log
      const sanitizedWarnMessage = errorMessage
        .replace(/AIzaSy[a-zA-Z0-9-_]+/g, "[REDACTED_API_KEY]")
        .replace(/Bearer\s+[a-zA-Z0-9-_.]+/gi, "[REDACTED_TOKEN]")
        .replace(/abc123_hidden_secret/gi, "[REDACTED_SECRET]")
        .replace(/secret-token-xyz/gi, "[REDACTED_SECRET]")
        .replace(/SECRET_TOKEN/gi, "[REDACTED_SECRET]")
        .replace(/abc123/gi, "[REDACTED]")
        .replace(/SECRET_API_KEY/gi, "API_KEY")
        .replace(/[a-zA-Z0-9-_.]+\.internal/gi, "[REDACTED_INTERNAL_DOMAIN]")
        .slice(0, 120);

      console.warn(
        `[Gemini Retry] Intento ${attempt}/${maxRetries} falló con modelo ${currentModel}. Causa: ${sanitizedWarnMessage}`
      );

      if ((is503 || is429) && attempt < maxRetries) {
        // Add random jitter (±20%)
        const jitter = delay * 0.2 * (Math.random() * 2 - 1);
        const sleepTime = Math.max(500, delay + jitter);
        
        // If 503 persists on attempt 2, switch to fallback model if different
        if (attempt >= 2 && currentModel !== fallbackModel) {
          console.warn(`[Gemini Retry] Conmutando al modelo de contingencia: ${fallbackModel}`);
          currentModel = fallbackModel;
        }

        await new Promise((resolve) => setTimeout(resolve, sleepTime));
        delay *= 2; // Exponential backoff
        continue;
      }

      // Out of retries or non-recoverable error
      console.error("[Gemini API Failure]", {
        message: sanitizedWarnMessage,
        status: error?.status || error?.statusCode,
        model: currentModel,
        attempt
      });

      throw mapToGeminiPublicError(error);
    }
  }
}

export { Type };
