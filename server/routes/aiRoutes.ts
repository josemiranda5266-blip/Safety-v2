import { Router } from "express";
import { requireAiCredits, CreditGuardedRequest } from "../middleware/creditGatekeeper";
import { aiEndpointsLimiter, concurrencyLimiter } from "../middleware/rateLimiter";
import {
  validateChatPayload,
  validateImagePayload,
  validateComparisonPayload,
} from "../middleware/payloadValidator";
import { requireAuth } from "../authorization/middleware";
import { generateContentWithRetry, Type } from "../services/gemini";

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
      const { question, contextChunks } = req.body;
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

      const systemInstruction = `Eres "Safety IA", un Arquitecto Senior y Especialista en Higiene y Seguridad Laboral.

REGLAS ABSOLUTAS DE ANTI-ALUCINACIÓN (CUMPLIMIENTO OBLIGATORIO):
1. La aplicación NUNCA debe responder inventando información o utilizando conocimientos externos fuera de la biblioteca provista.
2. Tu respuesta debe generarse ÚNICA Y EXCLUSIVAMENTE utilizando la información de los FRAGMENTOS DE LA BIBLIOTECA provistos en el contexto.
3. Si los fragmentos no contienen información suficiente para responder con precisión la pregunta del usuario, debes responder EXACTAMENTE con la siguiente frase completa y sin modificaciones:
"No encontré información suficiente sobre este tema dentro de tu biblioteca documental."
(No agregues explicaciones extras ni especulaciones si devuelves esta frase).

REGLAS DE CITAS AUTOMÁTICAS (SI EXISTE INFORMACIÓN EN LA BIBLIOTECA):
1. Toda respuesta debe indicar al final o por cada punto las citas exactas de las fuentes utilizadas en la biblioteca con el formato:
   **Fuente:** [Título del Documento] | **Página:** [Número de Página] | **Capítulo/Sección:** [Capítulo o Sección] | **Artículo:** [Número de Artículo o Parágrafo]
2. Las respuestas deben ser claras, técnicas, resumidas y fáciles de entender por profesionales de Higiene y Seguridad.
3. Al final de CUALQUIER respuesta afirmativa basada en la biblioteca, DEBES agregar como último párrafo independiente EXACTAMENTE la siguiente frase:
"Puedo ampliar esta respuesta utilizando otros documentos relacionados."`;

      const userPrompt = `FRAGMENTOS DE LA BIBLIOTECA DEL USUARIO:
${formattedContext}

PREGUNTA / CONSULTA DEL USUARIO:
"${question}"

Instrucción: Analiza minuciosamente los fragmentos anteriores de la biblioteca. Si contienen respuesta precisa, responde con rigurosidad técnica, citas exactas y la frase final obligatoria. Si no hay información suficiente, responde únicamente con "No encontré información suficiente sobre este tema dentro de tu biblioteca documental."`;

      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.1,
        },
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
      console.error("[Error /api/chat-rag]:", error);
      return res.status(500).json({
        error: "AI_PROCESSING_ERROR",
        message: error.message || "Error procesando la consulta con la IA.",
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
        model: "gemini-2.5-flash",
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
      });

      const parsed = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`Comparación: ${docTitles.join(" vs ")}`);

      return res.json({
        ...parsed,
        creditsRemaining: creditResult?.remainingCredits,
      });
    } catch (error: any) {
      console.error("[Error /api/compare-documents]:", error);
      return res.status(500).json({ error: "AI_PROCESSING_ERROR", message: error.message || "Error en la comparación de documentos." });
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
        model: "gemini-2.5-flash",
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
      });

      const parsedData = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`OCR: ${fileName || "Documento"}`);

      return res.json({
        ...parsedData,
        creditsRemaining: creditResult?.remainingCredits,
      });
    } catch (error: any) {
      console.error("[Error /api/ocr-extract]:", error);
      return res.status(500).json({ error: "AI_PROCESSING_ERROR", message: error.message || "Error al realizar el OCR del documento." });
    }
  }
);

/**
 * 4. POST /api/analyze-image (Cost: 4 credits)
 */
router.post(
  "/analyze-image",
  validateImagePayload,
  requireAiCredits("IMAGE_ANALYSIS"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const { imageBase64, mimeType, availableNormsContext } = req.body;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      };

      const promptText = `Actúa como un Auditor y Técnico especialista en Higiene y Seguridad Laboral.
Examina detenidamente esta fotografía tomada en un puesto o área de trabajo.

BIBLIOTECA NORMATIVA DISPONIBLE EN LA APLICACIÓN:
${availableNormsContext || "Ley 19.587, Decreto 351/79, Decreto 911/96 (Construcción), Res. SRT 295/03 (Ergonomía/Contaminantes), Normas IRAM."}

TAREA:
1. Detecta todos los riesgos visibles (falta de EPP, orden y limpieza, riesgo eléctrico, trabajo en altura desprotegido, sustancias químicas, mala postura, falta de señalización, extintor obstruido o ausente, etc.).
2. Para cada riesgo detectado, evalúa el Nivel de Severidad (Bajo, Medio, Alto, Crítico).
3. Asocia cada riesgo con la normativa legal aplicable presente en la biblioteca.
4. Recomienda las medidas preventivas y correctivas inmediatas.

Responde únicamente en formato JSON con la siguiente estructura:
{
  "overallAssessment": "Evaluación general del lugar inspeccionado",
  "riskLevel": "Bajo | Medio | Alto | Crítico",
  "hazards": [
    {
      "hazardName": "Nombre del riesgo detectado",
      "severity": "Bajo | Medio | Alto | Crítico",
      "description": "Descripción detallada de la condición subestándar observada en la imagen",
      "applicableNorm": "Artículo y ley/decreto aplicable según la biblioteca",
      "preventiveAction": "Medida correctiva recomendada"
    }
  ],
  "recommendations": ["Recomendación general 1", "Recomendación general 2"]
}`;

      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
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
      });

      const result = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit("Análisis fotográfico de riesgos");

      return res.json({
        ...result,
        creditsRemaining: creditResult?.remainingCredits,
      });
    } catch (error: any) {
      console.error("[Error /api/analyze-image]:", error);
      return res.status(500).json({ error: "AI_PROCESSING_ERROR", message: error.message || "Error al analizar la imagen de riesgos." });
    }
  }
);

/**
 * 5. POST /api/inspector-ai-analyze (Cost: 5 credits)
 */
router.post(
  "/inspector-ai-analyze",
  validateImagePayload,
  requireAiCredits("INSPECTOR_IA"),
  async (req: CreditGuardedRequest, res) => {
    try {
      const {
        imageBase64,
        mimeType,
        companyName,
        siteLocation,
        inspectorName,
        inspectorRegistration,
        relevantLibraryChunks,
      } = req.body;

      const mediaPart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      };

      const formattedLibraryContext =
        Array.isArray(relevantLibraryChunks) && relevantLibraryChunks.length > 0
          ? relevantLibraryChunks
              .map(
                (c: any, i: number) =>
                  `[DOCUMENTO BIBLIOTECA ${i + 1}]
Título: "${c.docTitle}"
Categoría: ${c.category || "Normativa"}
Página: ${c.pageNumber || "N/A"}
Sección/Artículo: ${c.article || c.chapter || c.section || "N/A"}
Texto Normativo:
"${c.text}"`
              )
              .join("\n\n--------------------\n\n")
          : "NO HAY DOCUMENTOS RELACIONADOS EN LA BIBLIOTECA DEL USUARIO.";

      const systemInstruction = `Eres "INSPECTOR IA", un Ingeniero Senior en Higiene y Seguridad Laboral y Especialista en Visión Artificial.

REGLAS DE RESPALDO NORMATIVO Y ANTI-ALUCINACIÓN:
1. Analiza la imagen o captura de inspección e identifica TODOS los riesgos visibles en las categorías: EPP, Altura, Escaleras, Eléctrico, Incendio, Orden y Limpieza, Señalización, Salidas de Emergencia, Almacenamiento, Ergonómico, Mecánico, Químico, Biológico.
2. Para CADA hallazgo/riesgo detectado, busca el respaldo normativo dentro de los DOCUMENTOS DE LA BIBLIOTECA provistos en el contexto.
3. Si la biblioteca provista CONTIENE la norma aplicable, cita el Título exacto, Página, Artículo/Sección y texto relevante, y establece "hasLibraryBackup": true.
4. Si la biblioteca NO contiene respaldo normativo para un hallazgo en particular, DEBES indicar exactamente en docTitle: "Sin respaldo documental en la biblioteca local", con "hasLibraryBackup": false, y "quotedText": "No se encontró norma específica cargada en la biblioteca del usuario". NUNCA INVENTES CITAS O ARTÍCULOS QUE NO ESTÉN EN LA BIBLIOTECA.`;

      const promptText = `INFORMACIÓN DE LA INSPECCIÓN DE CAMPO:
Empresa: ${companyName || "Empresa / Cliente"}
Ubicación / Obra: ${siteLocation || "Planta Industrial / Obra"}
Inspector: ${inspectorName || "Técnico en H&S"} (${inspectorRegistration || "Matrícula H&S"})
Fecha: ${new Date().toISOString().split("T")[0]}

BIBLIOTECA DOCUMENTAL DISPONIBLE EN LA APLICACIÓN:
${formattedLibraryContext}

Realiza un informe técnico riguroso de inspección visual en formato JSON estructurado:`;

      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
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

      const parsedReport = JSON.parse(response.text || "{}");
      const creditResult = req.creditContext?.commit(`Informe Inspector IA: ${companyName || "Obra"}`);

      return res.json({
        ...parsedReport,
        creditsRemaining: creditResult?.remainingCredits,
      });
    } catch (error: any) {
      console.error("[Error /api/inspector-ai-analyze]:", error);
      return res.status(500).json({ error: "AI_PROCESSING_ERROR", message: error.message || "Error al procesar la inspección visual con la IA." });
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
        model: "gemini-2.5-flash",
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
      console.error("[Error /api/generate-summary]:", error);
      return res.status(500).json({ error: "AI_PROCESSING_ERROR", message: error.message || "Error generando el resumen técnico." });
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
        model: "gemini-2.5-flash",
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
      console.error("[Error /api/generate-checklist]:", error);
      return res.status(500).json({ error: "AI_PROCESSING_ERROR", message: error.message || "Error al generar la lista de inspección." });
    }
  }
);

export default router;
