import { Request, Response, NextFunction } from "express";

export function validateChatPayload(req: Request, res: Response, next: NextFunction) {
  const { question } = req.body;
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "La pregunta es requerida y debe ser un texto no vacío." });
  }

  if (question.length > 4000) {
    return res.status(400).json({ error: "PAYLOAD_TOO_LARGE", message: "La pregunta excede el límite máximo de 4.000 caracteres." });
  }

  next();
}

export function validateImagePayload(req: Request, res: Response, next: NextFunction) {
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Se requiere la imagen codificada en base64." });
  }

  // Check valid image MIME
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"];
  if (mimeType && !allowedMimes.includes(mimeType)) {
    return res.status(400).json({
      error: "INVALID_MIME_TYPE",
      message: `Tipo de archivo no admitido (${mimeType}). Formatos aceptados: JPEG, PNG, WEBP, PDF.`,
    });
  }

  // Base64 size check ~15MB
  if (imageBase64.length > 20 * 1024 * 1024) {
    return res.status(400).json({
      error: "PAYLOAD_TOO_LARGE",
      message: "La imagen adjunta excede el tamaño máximo permitido de 15MB.",
    });
  }

  next();
}

export function validateComparisonPayload(req: Request, res: Response, next: NextFunction) {
  const { docTitles } = req.body;
  if (!docTitles || !Array.isArray(docTitles) || docTitles.length < 2) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Se requieren al menos dos documentos para realizar la comparación normativa.",
    });
  }

  next();
}
