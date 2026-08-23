import { Router } from "express";
import { requireAiCredits, CreditGuardedRequest } from "../middleware/creditGatekeeper";
import { aiEndpointsLimiter, concurrencyLimiter } from "../middleware/rateLimiter";
import {
  validateChatPayload,
  validateImagePayload,
  validateComparisonPayload,
} from "../middleware/payloadValidator";
import { requireAuth, requireTenantContext, TenantRequest } from "../authorization/middleware";
import { generateContentWithRetry, generateContentWithRetryWithTimeout, Type, GeminiPublicError, mapToGeminiPublicError } from "../services/gemini";
import * as documentService from "../services/documentService";

const router = Router();

// Apply AI rate limiter, concurrency guard, and mandatory verified auth across all AI routes
router.use(aiEndpointsLimiter);
router.use(concurrencyLimiter(3));
router.use(requireAuth);

/**
 * 1. POST /api/chat-rag (Cost: 1 credit)
 */
router.post(
  "/chat-rag",
  validateChatPayload,
  requireAiCredits("CHAT_RAG"),
  async (req: CreditGuardedRequest, res) => {
    const startTime = Date.now();
    try {
      const { question, contextChunks, tenantContext } = req.body;
      const hasContext = Array.isArray(contextChunks) && contextChunks.length > 0;

      const formattedContext = hasContext
        ? contextChunks
            .map(
              (
                c: {
                  docTitle: string;
                  page: string | number;
                  chapter?: string;
                  section?: string;
                  article?: string;
                  text: string;
                  category?: string;
                },
                idx: number
              ) =>
                `[FRAGMENTO ${idx + 1}]
Documento: "${c.docTitle}"
Categoría: ${c.category || "Normativa"}
Página: ${c.page || "1"}
Capítulo/Sección: ${c.chapter || c.section || "N/A"}
Artículo: ${c.article || "N/A"}
Texto del Fragmento:
"${c.text}"`
            )
            .join("\n\n--------------------\n\n")
        : "NO HAY FRAGMENTOS DISPONIBLES EN LA BIBLIOTECA.";

      const tenantContextInfo = tenantContext
        ? `\nCONTEXTO DE LA EMPRESA CONSULTANTE:
- Empresa: ${tenantContext.companyName || tenantContext.legalName || "No especificada"}
- CUIT: ${tenantContext.taxId || "N/A"}
- Actividad Principal / Rubro: ${tenantContext.activity || "General / Industrial"}
- Establecimiento / Planta: ${tenantContext.establishmentName || "General"}
- Sectores / Puestos Involucrados: ${tenantContext.sectors || "Todos"}
- Cantidad de Trabajadores: ${tenantContext.totalEmployees || "No especificado"}`
        : "";

      const systemInstruction = `Eres "Safety IA", un Arquitecto Senior y Especialista en Higiene y Seguridad Laboral en Argentina y normativa internacional.
${tenantContextInfo}

REGLAS ABSOLUTAS DE ANTI-ALUCINACIÓN (CUMPLIMIENTO OBLIGATORIO):
1. La aplicación NUNCA debe responder inventando información o utilizando conocimientos externos fuera de la biblioteca provista.
2. Tu respuesta debe generarse ÚNICA Y EXCLUSIVAMENTE utilizando la información de los FRAGMENTOS DE LA BIBLIOTECA provistos en el contexto, adaptándola al contexto de la empresa consultante cuando aplique.
3. Si los fragmentos no contienen información suficiente para responder con precisión la pregunta del usuario, debes responder EXACTAMENTE con la siguiente frase completa y sin modificaciones:
"No encontré información suficiente sobre este tema dentro de tu biblioteca documental."
(No agregues explicaciones extras ni especulaciones si devuelves esta frase).

REGLAS DE CITAS AUTOMÁTICAS (SI EXISTE INFORMACIÓN EN LA BIBLIOTECA):
1. Toda respuesta debe indicar al final o por cada punto las citas exactas de las fuentes utilizadas en la biblioteca con el formato:
   **Fuente:** [Título del Documento] | **Página:** [Número de Página] | **Capítulo/Sección:** [Capítulo o Sección] | **Artículo:** [Número de Artículo o Parágrafo]
2. Las respuestas deben ser claras, técnicas, estructuradas y fáciles de entender por profesionales de Higiene y Seguridad.
3. Al final de CUALQUIER respuesta afirmativa basada en la biblioteca, DEBES agregar como último párrafo independiente EXACTAMENTE la siguiente frase:
"Puedo ampliar esta respuesta utilizando otros documentos relacionados."`;

      const userPrompt = `FRAGMENTOS DE LA BIBLIOTECA DEL USUARIO:
${formattedContext}

PREGUNTA / CONSULTA DEL USUARIO:
"${question}"

Instrucción: Analiza minuciosamente los fragmentos anteriores de la biblioteca. Si contienen respuesta precisa, responde con rigurosidad técnica, citas exactas y la frase final obligatoria. Si no hay información suficiente, responde únicamente con "No encontré información suficiente sobre este tema dentro de tu biblioteca documental."`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.1,
        },
        operationType: "CHAT_RAG",
      });

      const answer =
        response.text ||
        "No encontré información suficiente sobre este tema dentro de tu biblioteca documental.";

      // Commit credit deduction only upon successful response
      const creditResult = req.creditContext?.commit(question.slice(0, 50));

      const latencyMs = Date.now() - startTime;
      console.log(`[AI Observability] /api/chat-rag ejecutado con éxito en ${latencyMs}ms. Créditos restantes: ${creditResult?.remainingCredits}`);

      return res.json({
        answer,
        creditsRemaining: creditResult?.remainingCredits,
        creditCost: req.creditContext?.cost,
      });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      console.error("[Error /api/chat-rag]", {
        code: publicError.code,
        status: publicError.status,
      });
      return res.status(publicError.status).json({
        error: publicError.code,
        message: publicError.message,
      });
    }
  }
);

/**
 * 2. POST /api/compare-documents (Cost: 2 credits)
 */
router.post(
  "/compare-documents",
  validateComparisonPayload,
  requireAiCredits("DOCUMENT_COMPARISON"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { docTitles, topicQuery, documentChunks } = req.body;

      const formattedDocs = (documentChunks || [])
        .map(
          (c: any, i: number) =>
            `[FRAGMENTO ${i + 1}] Documento: "${c.docTitle}" | Pág: ${c.pageNumber || 1} | Art/Sección: ${c.article || c.chapter || "N/A"}\n"${c.text}"`
        )
        .join("\n\n");

      const promptText = `Actúa como un Especialista Legal y Técnico en Higiene y Seguridad Laboral.
Realiza un Análisis Comparativo Riguroso entre los siguientes documentos de la biblioteca del usuario:
Documentos a comparar: ${docTitles.join(", ")}
Tema o enfoque de comparación: "${topicQuery || "Análisis comparativo general de obligaciones y alcance técnico"}"

FRAGMENTOS DISPONIBLES DE LOS DOCUMENTOS EN LA BIBLIOTECA:
${formattedDocs || "Fragmentos cargados para la comparación de normativa."}

Instrucciones:
1. Analiza coincidencias, diferencias normativas, exigencias técnicas de cada norma y nivel de exigencia.
2. Responde estrictamente con un formato JSON estructurado:
{
  "summaryComparison": "Resumen ejecutivo comparativo de 3-4 párrafos",
  "similarities": ["Coincidencia o punto en común 1", "Punto en común 2"],
  "differences": ["Diferencia o discrepancia normativa 1", "Diferencia 2"],
  "normativeDetails": [
    {
      "docTitle": "Nombre de la norma A",
      "position": "Postura o exigencia de esta norma sobre el tema",
      "requirements": "Artículos o requisitos clave estipulados"
    }
  ]
}`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summaryComparison: { type: Type.STRING },
              similarities: { type: Type.ARRAY, items: { type: Type.STRING } },
              differences: { type: Type.ARRAY, items: { type: Type.STRING } },
              normativeDetails: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    docTitle: { type: Type.STRING },
                    position: { type: Type.STRING },
                    requirements: { type: Type.STRING },
                  },
                  required: ["docTitle", "position", "requirements"],
                },
              },
            },
            required: ["summaryComparison", "similarities", "differences", "normativeDetails"],
          },
        },
        operationType: "DOCUMENT_COMPARISON",
      });

      const parsed = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`Comparación: ${docTitles.join(" vs ")}`);

      return res.json({
        ...parsed,
        creditsRemaining: creditResult?.remainingCredits,
      });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      console.error("[Error /api/compare-documents]", {
        code: publicError.code,
        status: publicError.status,
      });
      return res.status(publicError.status).json({
        error: publicError.code,
        message: publicError.message,
      });
    }
  }
);

/**
 * 3. POST /api/ocr-extract (Cost: 3 credits)
 */
router.post(
  "/ocr-extract",
  validateImagePayload,
  requireAiCredits("OCR"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { imageBase64, mimeType, fileName } = req.body;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      };

      const promptText = `Analiza esta imagen de un documento de Higiene y Seguridad Laboral (${fileName || "documento"}).
Realiza un OCR de alta precisión y extrae todo el texto legible.
Devuelve únicamente una estructura JSON válida con el siguiente formato:
{
  "title": "Título sugerido o detectado en el documento",
  "category": "Ley | Decreto | Resolución | Manual | Procedimiento | Informe",
  "extractedText": "Texto completo extraído de forma estructurada",
  "summary": "Resumen conciso de 2-3 oraciones del contenido",
  "tags": ["etiqueta1", "etiqueta2", "etiqueta3"]
}`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: { parts: [imagePart, { text: promptText }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              extractedText: { type: Type.STRING },
              summary: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["title", "category", "extractedText", "summary", "tags"],
          },
        },
        operationType: "OCR",
      });

      const parsedData = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`OCR: ${fileName || "Documento"}`);

      return res.json({
        ...parsedData,
        creditsRemaining: creditResult?.remainingCredits,
      });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      console.error("[Error /api/ocr-extract]", {
        code: publicError.code,
        status: publicError.status,
      });
      return res.status(publicError.status).json({
        error: publicError.code,
        message: publicError.message,
      });
    }
  }
);

/**
 * Helper: Server-side deterministic RAG retrieval for tenant library
 */
async function retrieveServerTenantChunks(orgId: string, assignedCompanyIds: string[] | undefined, queryKeywordsText: string) {
  try {
    const docs = await documentService.listDocuments(orgId, {}, assignedCompanyIds);
    if (!docs || docs.length === 0) {
      return {
        topChunks: [],
        formattedLibraryContext: "NO HAY DOCUMENTOS / FRAGMENTOS VERIFICADOS EN LA BIBLIOTECA DE LA ORGANIZACIÓN.",
      };
    }

    // Limit documents to top 5 to avoid timeouts
    const limitedDocs = docs.slice(0, 5);
    const allChunks: any[] = [];
    
    // Fetch chunks in parallel
    const chunkPromises = limitedDocs.map(docItem => 
      documentService.getDocumentChunks(orgId, docItem.id, assignedCompanyIds)
    );
    
    const chunkResults = await Promise.allSettled(chunkPromises);
    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        allChunks.push(...result.value);
      } else {
        console.warn('Error fetching chunks for a document:', result.reason);
      }
    }
    
    // Limit total chunks to prevent memory issues
    const finalChunks = allChunks.slice(0, 50);

    if (finalChunks.length === 0) {
      return {
        topChunks: [],
        formattedLibraryContext: "NO HAY FRAGMENTOS VERIFICADOS EN LA BIBLIOTECA DE LA ORGANIZACIÓN.",
      };
    }

    // Rank chunks based on query terms
    const searchTerms = queryKeywordsText
      .toLowerCase()
      .split(/[^\w\dáéíóúñ]+/)
      .filter((t) => t.length > 2);

    const scoredChunks = finalChunks.map((chunk) => {
      const chunkText = (chunk.text || "").toLowerCase();
      const docTitle = (chunk.docTitle || "").toLowerCase();
      let score = 0;

      for (const term of searchTerms) {
        if (chunkText.includes(term)) score += 2;
        if (docTitle.includes(term)) score += 5;
      }
      return { chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 8).map((sc) => sc.chunk);

    const formattedLibraryContext = topChunks
      .map(
        (c: any, i: number) =>
          `[DOCUMENTO BIBLIOTECA VERIFICADO ${i + 1}]
ID Documento: ${c.docId}
ID Chunk: ${c.chunkId || c.id || `chunk_${i}`}
Título: "${c.docTitle}"
Categoría: ${c.category || "Normativa"}
Página: ${c.pageNumber || "N/A"}
Sección/Artículo: ${c.article || c.chapter || c.section || "N/A"}
Texto Normativo:
"${c.text}"`
      )
      .join("\n\n--------------------\n\n");

    return { topChunks, formattedLibraryContext };
  } catch (err) {
    console.warn("Error recuperando fragmentos RAG del tenant en servidor:", err);
    return {
      topChunks: [],
      formattedLibraryContext: "NO HAY DOCUMENTOS / FRAGMENTOS VERIFICADOS EN LA BIBLIOTECA DE LA ORGANIZACIÓN.",
    };
  }
}

/**
 * 4. POST /api/analyze-image (Cost: 4 credits)
 */
router.post(
  "/analyze-image",
  requireTenantContext,
  validateImagePayload,
  requireAiCredits("IMAGE_ANALYSIS"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const tenantReq = req as TenantRequest & CreditGuardedRequest;
      const orgId = tenantReq.authContext?.orgId;
      const assignedCompanyIds = tenantReq.authContext?.assignedCompanyIds;

      const { imageBase64, mimeType, activityDescription } = req.body;

      if (!orgId) {
        return res.status(403).json({
          error: "ORG_MEMBERSHIP_REQUIRED",
          message: "Se requiere contexto de organización válido para realizar el análisis.",
        });
      }

      // Server-side RAG chunk retrieval
      const { topChunks, formattedLibraryContext } = await retrieveServerTenantChunks(
        orgId,
        assignedCompanyIds,
        activityDescription || "inspección de seguridad e higiene"
      );

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      };

      const promptText = `Actúa como un Auditor y Técnico especialista en Higiene y Seguridad Laboral.
Examina detenidamente esta fotografía tomada en un puesto o área de trabajo, EVALUÁNDOLA DE MANERA CONJUNTA E INTEGRADA con la descripción de la actividad y elementos críticos provistos por el usuario.

CONTEXTO OPERATIVO Y DESCRIPCIÓN DE LA ACTIVIDAD / ELEMENTOS CRÍTICOS:
"${activityDescription || 'Inspección visual general del puesto o sector de trabajo.'}"

BIBLIOTECA DOCUMENTAL DE LA ORGANIZACIÓN (RAG VERIFICADO):
${formattedLibraryContext}

REGLAS STRICTAS DE RESPALDO NORMATIVO:
1. Solo puedes citar una norma si existe un fragmento real provisto arriba en la BIBLIOTECA DOCUMENTAL.
2. Si no existe un fragmento verificado en la biblioteca para un riesgo, debes establecer applicableNorm: "Sin respaldo documental verificado en la biblioteca".
3. NO INVENTES NORMAS NI USES FALLBACKS AUTOMÁTICOS COMO LEY 19.587 O DECRETO 351/79 A MENOS QUE APAREZCAN EXPLÍCITAMENTE EN LOS FRAGMENTOS PROVISTOS.

TAREA:
1. Evalúa la imagen y la descripción de la actividad como un todo.
2. Detecta todos los riesgos visibles y operativos.
3. Asocia cada riesgo únicamente con normas verificadas presentes en la biblioteca provista o indica "Sin respaldo documental verificado en la biblioteca".

Responde únicamente en formato JSON con la siguiente estructura:
{
  "overallAssessment": "Evaluación general integrando la actividad descripta y los elementos visuales observados",
  "riskLevel": "Bajo | Medio | Alto | Crítico",
  "hazards": [
    {
      "hazardName": "Nombre del riesgo detectado",
      "severity": "Bajo | Medio | Alto | Crítico",
      "description": "Descripción detallada de la condición observada",
      "applicableNorm": "Título de la norma verificada o 'Sin respaldo documental verificado en la biblioteca'",
      "preventiveAction": "Medida correctiva recomendada"
    }
  ],
  "recommendations": ["Recomendación general 1", "Recomendación general 2"]
}`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: { parts: [imagePart, { text: promptText }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallAssessment: { type: Type.STRING },
              riskLevel: { type: Type.STRING },
              hazards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hazardName: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    description: { type: Type.STRING },
                    applicableNorm: { type: Type.STRING },
                    preventiveAction: { type: Type.STRING },
                  },
                  required: ["hazardName", "severity", "description", "applicableNorm", "preventiveAction"],
                },
              },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["overallAssessment", "riskLevel", "hazards", "recommendations"],
          },
        },
        operationType: "IMAGE_ANALYSIS",
      });

      const rawResult = JSON.parse(response.text || "{}");

      // Server-side post validation
      const verifiedHazards = (rawResult.hazards || []).map((h: any) => {
        const norm = h.applicableNorm || "";
        const match = topChunks.find(
          (c: any) => c.docTitle && norm.toLowerCase().includes(c.docTitle.toLowerCase())
        );
        return {
          ...h,
          applicableNorm: match ? match.docTitle : "Sin respaldo documental verificado en la biblioteca",
          verificationStatus: match ? "verified" : "no_evidence",
        };
      });

      const creditResult = req.creditContext?.commit("Análisis fotográfico de riesgos");

      return res.json({
        ...rawResult,
        hazards: verifiedHazards,
        creditsRemaining: creditResult?.remainingCredits,
      });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      console.error("[Error /api/analyze-image]", {
        code: publicError.code,
        status: publicError.status,
      });
      return res.status(publicError.status).json({
        error: publicError.code,
        message: publicError.message,
      });
    }
  }
);

/**
 * 5. POST /api/inspector-ai-analyze (Cost: 5 credits)
 */
router.post(
  "/inspector-ai-analyze",
  requireTenantContext,
  validateImagePayload,
  requireAiCredits("INSPECTOR_IA"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const tenantReq = req as TenantRequest & CreditGuardedRequest;
      const orgId = tenantReq.authContext?.orgId;
      const assignedCompanyIds = tenantReq.authContext?.assignedCompanyIds;

      const {
        imageBase64,
        mimeType,
        companyName,
        siteLocation,
        inspectorName,
        inspectorRegistration,
        activityDescription,
      } = req.body;

      if (!orgId) {
        return res.status(403).json({
          error: "ORG_MEMBERSHIP_REQUIRED",
          message: "Se requiere contexto de organización válido para realizar la inspección.",
        });
      }

      // Server-side RAG retrieval
      const searchTerms = `${activityDescription || ""} ${companyName || ""} ${siteLocation || ""}`;
      const { topChunks, formattedLibraryContext } = await retrieveServerTenantChunks(
        orgId,
        assignedCompanyIds,
        searchTerms
      );

      const mediaPart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      };

      const systemInstruction = `Eres "INSPECTOR IA", un Ingeniero Senior en Higiene y Seguridad Laboral y Especialista en Visión Artificial.

DIRECTRICES DE ANÁLISIS INTEGRADO (IMAGEN + DESCRIPCIÓN OPERATIVA):
1. EVALUACIÓN CONJUNTA OBLIGATORIA: Debes analizar de manera holística e integrada tanto la imagen/fotografía capturada como la DESCRIPCIÓN DE LA ACTIVIDAD Y ELEMENTOS CRÍTICOS provista por el auditor.
2. CONTEXTUALIZACIÓN DE RIESGOS: Utiliza la descripción para entender la operación en curso y busca evidencias de actos/condiciones inseguras en la imagen.
3. REGLAS DE RESPALDO NORMATIVO Y ANTI-ALUCINACIÓN STRICTAS:
   - Para CADA hallazgo/riesgo detectado, busca el respaldo dentro de los DOCUMENTOS DE LA BIBLIOTECA VERIFICADA provistos en el contexto.
   - Si un fragmento provisto respalda la norma, cita el Título exacto, Página, Artículo y texto relevante, y establece "hasLibraryBackup": true y "verificationStatus": "verified".
   - Si la biblioteca NO contiene fragmentos de respaldo para un hallazgo en particular, DEBES indicar exactamente docTitle: "Sin respaldo documental verificado en la biblioteca", "hasLibraryBackup": false, "verificationStatus": "no_evidence", y "quotedText": "No se encontró norma específica cargada en la biblioteca del usuario.".
   - NUNCA INVENTES CITAS O ARTÍCULOS QUE NO ESTÉN EN LOS FRAGMENTOS DE LA BIBLIOTECA. NO USES FALLBACKS AUTOMÁTICOS.`;

      const promptText = `INFORMACIÓN DE LA INSPECCIÓN DE CAMPO:
Empresa: ${companyName || "Empresa / Cliente"}
Ubicación / Obra: ${siteLocation || "Planta Industrial / Obra"}
Inspector: ${inspectorName || "Técnico en H&S"} (${inspectorRegistration || "Matrícula H&S"})
Fecha: ${new Date().toISOString().split("T")[0]}

DESCRIPCIÓN DE LA ACTIVIDAD & ELEMENTOS CRÍTICOS OBSERVADOS:
"""
${activityDescription || "Inspección visual general del sector/puesto de trabajo."}
"""

BIBLIOTECA DOCUMENTAL VERIFICADA EN LA APLICACIÓN (DEL TENANT):
${formattedLibraryContext}

Realiza un informe técnico riguroso de inspección visual en formato JSON estructurado integrando la imagen y la descripción de la actividad como un todo:`;

      const response = await generateContentWithRetryWithTimeout({
        model: "gemini-3.7-flash",
        contents: { parts: [mediaPart, { text: promptText }] },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              executiveSummary: { type: Type.STRING },
              appliedNorms: { type: Type.ARRAY, items: { type: Type.STRING } },
              generalRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hazardCategory: { type: Type.STRING },
                    hazardTitle: { type: Type.STRING },
                    riskLevel: { type: Type.STRING },
                    description: { type: Type.STRING },
                    suggestedAction: { type: Type.STRING },
                    normativeCitation: {
                      type: Type.OBJECT,
                      properties: {
                        docTitle: { type: Type.STRING },
                        pageNumber: { type: Type.STRING },
                        articleOrSection: { type: Type.STRING },
                        quotedText: { type: Type.STRING },
                        hasLibraryBackup: { type: Type.BOOLEAN },
                        verificationStatus: { type: Type.STRING },
                      },
                      required: ["docTitle", "hasLibraryBackup"],
                    },
                  },
                  required: [
                    "hazardCategory",
                    "hazardTitle",
                    "riskLevel",
                    "description",
                    "suggestedAction",
                    "normativeCitation",
                  ],
                },
              },
              actionPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    task: { type: Type.STRING },
                    responsible: { type: Type.STRING },
                    deadline: { type: Type.STRING },
                    riskLevel: { type: Type.STRING },
                  },
                  required: ["task", "responsible", "deadline", "riskLevel"],
                },
              },
            },
            required: [
              "title",
              "executiveSummary",
              "appliedNorms",
              "generalRecommendations",
              "findings",
              "actionPlan",
            ],
          },
        },
      });

      const rawResponseText = response?.text;

      if (!rawResponseText || typeof rawResponseText !== "string" || rawResponseText.trim().length === 0) {
        throw new GeminiPublicError(500, "INVALID_AI_RESPONSE", "La IA no devolvió una respuesta de texto válida.");
      }

      let parsedReport: any;
      try {
        const cleanedJson = rawResponseText.trim().replace(/^```json\s*/, '').replace(/```$/, '');
        parsedReport = JSON.parse(cleanedJson);
      } catch (parseError) {
        console.error("[InspectorIA Gemini JSON Parse Error] Failed to parse model response text:", {
          textLength: rawResponseText.length,
          preview: rawResponseText.slice(0, 150),
        });
        throw new GeminiPublicError(
          500,
          "INVALID_AI_RESPONSE",
          "La IA devolvió una respuesta que no pudo ser procesada en formato JSON."
        );
      }

      // Post-validation against authorized topChunks
      const verifiedFindings = (parsedReport.findings || []).map((f: any) => {
        const normTitle = f.normativeCitation?.docTitle || "";
        const matchedChunk = topChunks.find(
          (tc: any) =>
            tc.docTitle &&
            (normTitle.toLowerCase().includes(tc.docTitle.toLowerCase()) ||
              tc.docTitle.toLowerCase().includes(normTitle.toLowerCase()))
        );

        if (matchedChunk && topChunks.length > 0) {
          return {
            ...f,
            normativeCitation: {
              docTitle: matchedChunk.docTitle,
              pageNumber: f.normativeCitation?.pageNumber || matchedChunk.pageNumber || null,
              articleOrSection:
                f.normativeCitation?.articleOrSection || matchedChunk.article || matchedChunk.chapter || matchedChunk.section || null,
              quotedText: f.normativeCitation?.quotedText || matchedChunk.text || "",
              hasLibraryBackup: true,
              verificationStatus: "verified",
              documentId: matchedChunk.docId,
              chunkId: matchedChunk.chunkId || matchedChunk.id,
            },
          };
        } else {
          return {
            ...f,
            normativeCitation: {
              docTitle: "Sin respaldo documental verificado en la biblioteca",
              pageNumber: null,
              articleOrSection: null,
              quotedText: "No se encontró norma específica cargada en la biblioteca del usuario.",
              hasLibraryBackup: false,
              verificationStatus: "no_evidence",
            },
          };
        }
      });

      const verifiedNorms = Array.from(
        new Set(
          verifiedFindings
            .filter((f: any) => f.normativeCitation?.verificationStatus === "verified")
            .map((f: any) => f.normativeCitation.docTitle)
        )
      );

      const creditResult = req.creditContext?.commit(`Informe Inspector IA: ${companyName || "Obra"}`);

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).json({
        ...parsedReport,
        findings: verifiedFindings,
        appliedNorms: verifiedNorms,
        creditsRemaining: creditResult?.remainingCredits,
      });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      console.error("[Error /api/inspector-ai-analyze]", {
        code: publicError.code,
        status: publicError.status,
      });
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(publicError.status).json({
        error: publicError.code,
        message: publicError.message,
      });
    }
  }
);

/**
 * 6. POST /api/generate-summary (Cost: 2 credits)
 */
router.post(
  "/generate-summary",
  requireAiCredits("SUMMARY"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { documentText, documentTitle } = req.body;
      if (!documentText) {
        return res.status(400).json({ error: "VALIDATION_ERROR", message: "Se requiere el texto del documento para resumir." });
      }

      const promptText = `Analiza el siguiente texto técnico de Higiene y Seguridad Laboral correspondiente al documento "${documentTitle || "Documento"}":

TEXTO:
"""
${documentText.slice(0, 30000)}
"""

Genera un informe analítico completo estructurado exactamente con el siguiente JSON:
{
  "shortSummary": "Resumen ejecutivo conciso de 3 a 5 oraciones",
  "technicalSummary": "Explicación técnica estructurada por temas principales",
  "keyPoints": ["Punto clave 1", "Punto clave 2", "Punto clave 3"],
  "legalObligations": ["Obligación legal o patronal 1", "Obligación 2"],
  "recommendations": ["Recomendación técnica del profesional de CySAT 1", "Recomendación 2"]
}`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shortSummary: { type: Type.STRING },
              technicalSummary: { type: Type.STRING },
              keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              legalObligations: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              "shortSummary",
              "technicalSummary",
              "keyPoints",
              "legalObligations",
              "recommendations",
            ],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`Resumen: ${documentTitle || "Doc"}`);

      return res.json({
        ...result,
        creditsRemaining: creditResult?.remainingCredits,
      });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      console.error("[Error /api/generate-summary]", {
        code: publicError.code,
        status: publicError.status,
      });
      return res.status(publicError.status).json({
        error: publicError.code,
        message: publicError.message,
      });
    }
  }
);

/**
 * 7. POST /api/generate-checklist (Cost: 2 credits)
 */
router.post(
  "/generate-checklist",
  requireAiCredits("CHECKLIST"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { category, customTopic, relevantNormsText } = req.body;

      const promptText = `Genera una Lista de Control / Checklist de Inspección Profesional de Higiene y Seguridad Laboral para la categoría: "${category}" ${customTopic ? `(Tema específico: ${customTopic})` : ""}.

CONTEXTO NORMATIVO APORTADO EN LA BIBLIOTECA:
${relevantNormsText || "Normativa Ley 19.587, Dec. 351/79, Dec. 911/96, Res. SRT."}

Requisitos:
- Genera entre 10 y 15 ítems de verificación técnica real y concreta.
- Para cada ítem, especifica qué norma/artículo aplica.

Responde únicamente en formato JSON con la estructura:
{
  "title": "Título oficial de la lista de inspección",
  "category": "${category}",
  "normativeReference": "Marco regulatorio de referencia principal",
  "items": [
    {
      "id": "1",
      "aspect": "Aspecto a verificar (ej: Presión de manómetro en extintor)",
      "normativeRef": "Art. 175 Dec 351/79 / Norma IRAM 3517",
      "guidance": "Instrucción de cómo verificar este aspecto en campo"
    }
  ]
}`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              normativeReference: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    aspect: { type: Type.STRING },
                    normativeRef: { type: Type.STRING },
                    guidance: { type: Type.STRING },
                  },
                  required: ["id", "aspect", "normativeRef", "guidance"],
                },
              },
            },
            required: ["title", "category", "normativeReference", "items"],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`Checklist: ${category}`);

      return res.json({
        ...result,
        creditsRemaining: creditResult?.remainingCredits,
      });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      console.error("[Error /api/generate-checklist]", {
        code: publicError.code,
        status: publicError.status,
      });
      return res.status(publicError.status).json({
        error: publicError.code,
        message: publicError.message,
      });
    }
  }
);

/**
 * 8. POST /api/suggest-hazards-controls (Cost: 2 credits)
 */
router.post(
  "/suggest-hazards-controls",
  requireAiCredits("SUGGESTIONS"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { taskDescription, environment } = req.body;
      const promptText = `Actúa como especialista en Higiene y Seguridad Laboral.
Analiza la siguiente tarea: "${taskDescription}" en el entorno: "${environment}".
Sugiere peligros potenciales y controles preventivos (Jerarquía de Controles).
Responde en formato JSON: { "hazards": [...], "controls": [...] }`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: promptText,
        config: { responseMimeType: "application/json" },
        operationType: "SUGGESTIONS",
      });

      const result = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit("Sugerencia riesgos/controles");

      return res.json({ ...result, creditsRemaining: creditResult?.remainingCredits });
    } catch (error: any) {
        const publicError = mapToGeminiPublicError(error);
        return res.status(publicError.status).json({ error: publicError.code, message: publicError.message });
    }
  }
);

/**
 * 9. POST /api/extract-expiry (Cost: 2 credits)
 */
router.post(
  "/extract-expiry",
  requireAiCredits("OCR"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { documentText } = req.body;
      const promptText = `Extrae fechas de vencimiento de este texto: "${documentText}".
Responde en formato JSON: { "dates": [{ "date": "YYYY-MM-DD", "description": "..." }] }`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: promptText,
        config: { responseMimeType: "application/json" },
        operationType: "OCR",
      });

      const result = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit("Extracción vencimientos");

      return res.json({ ...result, creditsRemaining: creditResult?.remainingCredits });
    } catch (error: any) {
        const publicError = mapToGeminiPublicError(error);
        return res.status(publicError.status).json({ error: publicError.code, message: publicError.message });
    }
  }
);

/**
 * 10. POST /api/generate-draft (Cost: 2 credits)
 */
router.post(
  "/generate-draft",
  requireAiCredits("DRAFTING"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { topic, notes } = req.body;
      const promptText = `Genera un borrador técnico profesional para: "${topic}" basado en: "${notes}".
Formato: Título, Introducción, Cuerpo, Conclusión.`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: promptText,
        operationType: "DRAFTING",
      });

      const creditResult = req.creditContext?.commit("Generación borrador");
      return res.json({ draft: response.text, creditsRemaining: creditResult?.remainingCredits });
    } catch (error: any) {
        const publicError = mapToGeminiPublicError(error);
        return res.status(publicError.status).json({ error: publicError.code, message: publicError.message });
    }
  }
);

/**
 * 11. POST /api/generate-action-plan (Cost: 2 credits)
 */
router.post(
  "/generate-action-plan",
  requireAiCredits("PLANNING"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { finding } = req.body;
      const promptText = `Crea un plan de acción para este hallazgo: "${finding}".
Formato JSON: { "actions": [{ "action": "...", "responsible": "...", "deadline": "..." }] }`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: promptText,
        config: { responseMimeType: "application/json" },
        operationType: "PLANNING",
      });

      const result = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit("Generación plan acción");
      return res.json({ ...result, creditsRemaining: creditResult?.remainingCredits });
    } catch (error: any) {
        const publicError = mapToGeminiPublicError(error);
        return res.status(publicError.status).json({ error: publicError.code, message: publicError.message });
    }
  }
);

/**
 * 12. POST /api/normative-consultation (Cost: 1 credit)
 * Deep technical consultation on a specific norm with legal obligations, required evidence and compliance tips.
 */
router.post(
  "/normative-consultation",
  requireAiCredits("CHAT_RAG"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { normaTitle, topic, companyContext, specificQuestion } = req.body;
      const promptText = `Eres un Experto Legal y Técnico en Seguridad e Higiene Laboral (Argentina y Mercosur).
Analiza la siguiente norma / resolución:
Norma: "${normaTitle || "Normativa de Seguridad e Higiene"}"
Tema: "${topic || "Higiene y Seguridad"}"
${companyContext ? `Contexto Empresa: ${JSON.stringify(companyContext)}` : ""}
${specificQuestion ? `Pregunta específica: "${specificQuestion}"` : ""}

Realiza un análisis exhaustivo y estructurado de la norma.
Responde únicamente en formato JSON con la siguiente estructura:
{
  "norma": "${normaTitle || "Normativa"}",
  "officialSummary": "Resumen técnico oficial de la norma y su marco regulatorio",
  "keyObligations": [
    {
      "article": "Art. o Anexo",
      "obligation": "Descripción de la obligación patronal o profesional",
      "mandatoryEvidence": "Evidencia documental o registro exigible por SRT/Inspectores"
    }
  ],
  "applicableSectors": ["Sector o Actividad 1", "Sector 2"],
  "sanctionsForNonCompliance": "Riesgo de sanción, clausura o multas según SRT / Ley 19.587",
  "auditChecklist": [
    {
      "checkItem": "Aspecto a verificar",
      "standard": "Criterio de aprobación"
    }
  ],
  "expertTips": ["Consejo práctico de implementación 1", "Consejo 2"]
}`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              norma: { type: Type.STRING },
              officialSummary: { type: Type.STRING },
              keyObligations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    article: { type: Type.STRING },
                    obligation: { type: Type.STRING },
                    mandatoryEvidence: { type: Type.STRING },
                  },
                  required: ["article", "obligation", "mandatoryEvidence"],
                },
              },
              applicableSectors: { type: Type.ARRAY, items: { type: Type.STRING } },
              sanctionsForNonCompliance: { type: Type.STRING },
              auditChecklist: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    checkItem: { type: Type.STRING },
                    standard: { type: Type.STRING },
                  },
                  required: ["checkItem", "standard"],
                },
              },
              expertTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["norma", "officialSummary", "keyObligations", "applicableSectors", "sanctionsForNonCompliance", "auditChecklist", "expertTips"],
          },
        },
        operationType: "CHAT_RAG",
      });

      const result = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`Consulta Normativa: ${normaTitle}`);
      return res.json({ ...result, creditsRemaining: creditResult?.remainingCredits });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      return res.status(publicError.status).json({ error: publicError.code, message: publicError.message });
    }
  }
);

/**
 * 13. POST /api/audit-normative-applicability (Cost: 2 credits)
 * Evaluates a company's activity, sectors, and positions to suggest an entire tailored legal matrix.
 */
router.post(
  "/audit-normative-applicability",
  requireAiCredits("SUGGESTIONS"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { companyName, activity, establishments, sectors, positions, employeeCount } = req.body;

      const promptText = `Actúa como Auditor Principal en Higiene y Seguridad Laboral en Argentina.
Analiza la siguiente empresa y su perfil de operaciones:
- Razón Social: "${companyName || "Empresa Cliente"}"
- Actividad Económica / Rubro: "${activity || "Industria / Comercio"}"
- Establecimientos: ${Array.isArray(establishments) ? establishments.join(", ") : "1 Planta"}
- Sectores: ${Array.isArray(sectors) ? sectors.join(", ") : "Producción, Mantenimiento, Administración"}
- Puestos de Trabajo: ${Array.isArray(positions) ? positions.join(", ") : "Operarios, Técnicos, Administrativos"}
- Dotación de Personal: ${employeeCount || 20} trabajadores

TAREA:
Determina todas las normas obligatorias aplicables bajo el marco regulatorio argentino (Ley 19.587, Decretos Reglamentarios 351/79, 911/96, 249/07, Res. SRT 299/11, Res. SRT 905/15, Res. SRT 84/12, Res. SRT 295/03, Res. SRT 900/15 de Puesta a Tierra, Res. SRT 886/15 Ergonomía, etc.).

Para cada norma, indica si es Obligatoria, Condicional o Recomendada, la periodicidad de cumplimiento y la evidencia exacta exigida.

Responde únicamente en formato JSON con la siguiente estructura:
{
  "companyProfile": "Resumen del perfil de riesgo de la empresa",
  "applicableNorms": [
    {
      "norma": "Ej: Resolución SRT 299/11",
      "type": "Resolución SRT | Ley | Decreto | Norma IRAM",
      "topic": "Elementos de Protección Personal (EPP)",
      "articleAnexo": "Anexo I",
      "applicability": "Obligatoria | Condicional | Recomendada",
      "reason": "Motivo por el cual aplica a la actividad de la empresa",
      "obligation": "Descripción concisa de la exigencia patronal",
      "evidenceRequired": "Registro o documento probatorio obligatorio",
      "frequency": "Semestral | Anual | Permanente | Eventual",
      "priority": "Alta | Media | Crítica"
    }
  ],
  "recommendations": ["Recomendación estratégica para la gestión legal 1", "Recomendación 2"]
}`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              companyProfile: { type: Type.STRING },
              applicableNorms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    norma: { type: Type.STRING },
                    type: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    articleAnexo: { type: Type.STRING },
                    applicability: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    obligation: { type: Type.STRING },
                    evidenceRequired: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    priority: { type: Type.STRING },
                  },
                  required: ["norma", "type", "topic", "applicability", "reason", "obligation", "evidenceRequired", "priority"],
                },
              },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["companyProfile", "applicableNorms", "recommendations"],
          },
        },
        operationType: "SUGGESTIONS",
      });

      const result = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`Auditoría Matriz: ${companyName || "Empresa"}`);
      return res.json({ ...result, creditsRemaining: creditResult?.remainingCredits });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      return res.status(publicError.status).json({ error: publicError.code, message: publicError.message });
    }
  }
);

/**
 * 14. POST /api/analyze-hs-document (Cost: 2 credits)
 * Uses Gemini 3.7 Flash to extract structured H&S metadata from uploaded files or text.
 */
router.post(
  "/analyze-hs-document",
  requireAiCredits("OCR"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { filename, fileBase64, mimeType, sampleText, companyContext } = req.body;

      const companyInfo = companyContext ? `Contexto Empresa: ${companyContext.companyName || ''} (Actividad: ${companyContext.activity || ''})` : '';

      let parts: any[] = [];
      if (fileBase64 && (mimeType?.startsWith('image/') || mimeType === 'application/pdf')) {
        parts.push({
          inlineData: {
            mimeType: mimeType || 'application/pdf',
            data: fileBase64,
          },
        });
      }

      const promptText = `Eres un Auditor y Especialista Senior en Higiene y Seguridad Laboral en Argentina.
Analiza el siguiente documento técnico (${filename || 'documento'}).
${companyInfo}

${sampleText ? `MUESTRA DE TEXTO EXTRAÍDO:\n"""\n${sampleText.slice(0, 8000)}\n"""\n` : ''}

TAREA:
Extrae y clasifica con precisión técnica todos los campos necesarios para la gestión documental SG-SST:
1. Título descriptivo oficial y profesional del documento.
2. Categoría obligatoria exacta entre UNA de estas 12 opciones:
   - "ART" (Pólizas, certificados de cobertura, cláusulas no repetición, avisos de obra)
   - "Legajo empresa" (Habilitaciones, organigramas, ROL, seguros generales)
   - "Trabajadores" (Altas, exámenes periódicos/preocupacionales, certificados psicofísicos)
   - "EPP" (Constancias de entrega Res. SRT 299/11, fichas técnicas)
   - "Capacitaciones" (Actas de capacitación Dec. 351/79 Cap. 21, temarios, registros de asistencia)
   - "Inspecciones" (Actas de inspección, check-lists de campo, desvíos)
   - "Mediciones" (Protocolos SRT 900/15 Puesta a tierra, SRT 84/12 Iluminación, SRT 85/12 Ruido, Carga Térmica, Contaminantes)
   - "Procedimientos" (PETS, ATS, permisos de trabajo de alto riesgo, instructivos)
   - "Informes" (Informes técnicos anuales, auditorías de ART/SRT, relevamiento RGRL)
   - "Emergencias" (Plan de evacuación, simulacros, roles de incendio, asignación de brigadas)
   - "Matriz de riesgos" (Matrices IPER, análisis de puestos de trabajo)
   - "Organismos" (Inspecciones municipales, intimaciones SRT, resoluciones ministeriales)
3. Subcategoría específica sugerida.
4. Número de documento, póliza, protocolo o certificado (si existe).
5. Fecha de emisión detectada (formato YYYY-MM-DD, o fecha de hoy si no se especifica).
6. Fecha de vencimiento o próxima renovación recomendada por normativa (formato YYYY-MM-DD, o vacío si es permanente).
7. Indicador si es de vigencia permanente (hasNoExpiry: true/false).
8. Nombre o cargo del responsable técnico firmante / emisor con matrícula si figura.
9. Organismo emisor / ART / Entidad certificadora.
10. Resumen ejecutivo de 2 a 3 oraciones del contenido técnico y hallazgos.
11. Observaciones técnicas para la auditoría.
12. 3 a 5 etiquetas clave (tags).

Responde únicamente en formato JSON con la siguiente estructura:
{
  "title": "...",
  "category": "ART | Legajo empresa | Trabajadores | EPP | Capacitaciones | Inspecciones | Mediciones | Procedimientos | Informes | Emergencias | Matriz de riesgos | Organismos",
  "subCategory": "...",
  "documentNumber": "...",
  "issueDate": "YYYY-MM-DD",
  "expirationDate": "YYYY-MM-DD",
  "hasNoExpiry": false,
  "responsibleName": "...",
  "issuingOrganism": "...",
  "summary": "...",
  "notes": "...",
  "tags": ["..."]
}`;

      parts.push({ text: promptText });

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              subCategory: { type: Type.STRING },
              documentNumber: { type: Type.STRING },
              issueDate: { type: Type.STRING },
              expirationDate: { type: Type.STRING },
              hasNoExpiry: { type: Type.BOOLEAN },
              responsibleName: { type: Type.STRING },
              issuingOrganism: { type: Type.STRING },
              summary: { type: Type.STRING },
              notes: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["title", "category", "issueDate", "hasNoExpiry", "responsibleName", "issuingOrganism", "summary", "tags"],
          },
        },
        operationType: "OCR",
      });

      const result = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`Análisis Doc IA: ${filename || "Documento"}`);
      return res.json({ ...result, creditsRemaining: creditResult?.remainingCredits });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      return res.status(publicError.status).json({ error: publicError.code, message: publicError.message });
    }
  }
);

/**
 * 15. POST /api/audit-document-compliance (Cost: 2 credits)
 * Audits an existing document against Argentine regulations and good engineering practices.
 */
router.post(
  "/audit-document-compliance",
  requireAiCredits("SUGGESTIONS"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { documentTitle, category, documentNumber, issueDate, expirationDate, responsibleName, issuingOrganism, notes, tags } = req.body;

      const promptText = `Actúa como Auditor Principal del Sistema de Gestión de Higiene y Seguridad Laboral en Argentina.
Realiza una AUDITORÍA TÉCNICA Y NORMATIVA del siguiente documento registrado:

DATOS DEL DOCUMENTO:
- Título: "${documentTitle}"
- Categoría Normativa: "${category}"
- N° / Póliza: "${documentNumber || "No especificado"}"
- Fecha de Emisión: "${issueDate || "No informada"}"
- Fecha de Vencimiento: "${expirationDate || "Sin vencimiento informado"}"
- Responsable Técnico: "${responsibleName || "No especificado"}"
- Organismo Emisor: "${issuingOrganism || "No especificado"}"
- Observaciones Registradas: "${notes || "Ninguna"}"
- Etiquetas: ${Array.isArray(tags) ? tags.join(", ") : "Ninguna"}

CRITERIOS DE AUDITORÍA:
1. Evalúa el cumplimiento de formalidades legales según la legislación argentina (Ley 19.587, Dec. 351/79, Dec. 911/96, Res. SRT 900/15, Res. SRT 299/11, Res. SRT 84/12, etc.).
2. Validez temporal (periodicidades exigidas por SRT: anual para protocolos de puesta a tierra, iluminación, extintores; mensual/semestral para capacitaciones; periódica para EPP).
3. Requisitos técnicos críticos que debe contener (firmas con matrícula profesional, certificados de calibración trazables al INTI/IRAM, cláusula de no repetición a favor de la comitente en certificados ART, etc.).

Responde únicamente en formato JSON con la siguiente estructura:
{
  "complianceScore": 90,
  "complianceStatus": "Conforme | Conforme con Observaciones | No Conforme / Incompleto",
  "executiveAuditVerdict": "Veredicto del auditor en 2-3 oraciones",
  "legalBasis": ["Ley 19.587 Art. 9", "Res. SRT 900/15"],
  "conformities": ["Puntos conformes y correctos identificados"],
  "findingsAndGaps": [
    {
      "finding": "Descripción del hallazgo u omisión",
      "severity": "Alta | Media | Baja",
      "normativeImpact": "Consecuencia o artículo reglamentario afectado"
    }
  ],
  "actionPlanRecommendations": ["Acción preventiva o correctiva 1", "Acción 2"]
}`;

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              complianceScore: { type: Type.NUMBER },
              complianceStatus: { type: Type.STRING },
              executiveAuditVerdict: { type: Type.STRING },
              legalBasis: { type: Type.ARRAY, items: { type: Type.STRING } },
              conformities: { type: Type.ARRAY, items: { type: Type.STRING } },
              findingsAndGaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    finding: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    normativeImpact: { type: Type.STRING },
                  },
                  required: ["finding", "severity", "normativeImpact"],
                },
              },
              actionPlanRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              "complianceScore",
              "complianceStatus",
              "executiveAuditVerdict",
              "legalBasis",
              "conformities",
              "findingsAndGaps",
              "actionPlanRecommendations",
            ],
          },
        },
        operationType: "SUGGESTIONS",
      });

      const result = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`Auditoría Doc: ${documentTitle}`);
      return res.json({ ...result, creditsRemaining: creditResult?.remainingCredits });
    } catch (error: any) {
      const publicError = mapToGeminiPublicError(error);
      return res.status(publicError.status).json({ error: publicError.code, message: publicError.message });
    }
  }
);

export default router;

