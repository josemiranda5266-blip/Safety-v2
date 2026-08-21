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

export interface GenerateWithRetryOptions {
  model?: string;
  contents: any;
  config?: any;
  maxRetries?: number;
  initialDelayMs?: number;
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

  const ai = getGenAI();
  let currentModel = primaryModel;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: options.contents,
        config: options.config,
      });

      return response;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const is503 = errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE") || errorMessage.includes("high demand");
      const is429 = errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota");

      console.warn(
        `[Gemini Retry] Intento ${attempt}/${maxRetries} falló con modelo ${currentModel}. Causa: ${errorMessage.slice(0, 120)}`
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

      // If non-recoverable or out of retries, throw custom error with details
      throw new Error(
        is503
          ? "El modelo de IA experimenta alta demanda momentánea. Por favor, reintenta en unos instantes."
          : is429
          ? "Se ha superado temporalmente la cuota de procesamiento de la API. Intente en unos segundos."
          : errorMessage
      );
    }
  }
}

export { Type };
