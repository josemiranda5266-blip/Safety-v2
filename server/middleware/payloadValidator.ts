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

export function validateBase64ImageMagicBytes(base64Str: string): { valid: boolean; detectedMime?: string; error?: string } {
  if (!base64Str || typeof base64Str !== "string") {
    return { valid: false, error: "Base64 de imagen no proporcionado" };
  }
  const cleanBase64 = base64Str.includes(",") ? base64Str.split(",")[1] : base64Str;
  try {
    const buffer = Buffer.from(cleanBase64.slice(0, 64), "base64");
    if (buffer.length < 4) {
      return { valid: false, error: "Datos de imagen insuficientes o corruptos" };
    }
    // JPEG: 0xFF 0xD8 0xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { valid: true, detectedMime: "image/jpeg" };
    }
    // PNG: 0x89 0x50 0x4E 0x47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { valid: true, detectedMime: "image/png" };
    }
    // WEBP: RIFF...WEBP
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer.length >= 12 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return { valid: true, detectedMime: "image/webp" };
    }
    // PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return { valid: true, detectedMime: "application/pdf" };
    }
    return { valid: false, error: "Firma de bytes mágicos de imagen no válida. Formatos permitidos: JPEG, PNG, WEBP." };
  } catch (e) {
    return { valid: false, error: "Formato Base64 inválido" };
  }
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
      message: `Tipo de archivo no admitido (${mimeType}). Formatos aceptados: JPEG, PNG, WEBP.`,
    });
  }

  // Base64 size check ~15MB max
  if (imageBase64.length > 15 * 1024 * 1024) {
    return res.status(400).json({
      error: "PAYLOAD_TOO_LARGE",
      message: "La imagen adjunta excede el tamaño máximo permitido de 15MB.",
    });
  }

  // Server-side Magic Byte Validation
  const magicValidation = validateBase64ImageMagicBytes(imageBase64);
  if (!magicValidation.valid) {
    return res.status(400).json({
      error: "INVALID_IMAGE_BYTES",
      message: magicValidation.error || "Firma de imagen inválida.",
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
