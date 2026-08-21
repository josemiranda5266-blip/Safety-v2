import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import {
  createDocument,
  listDocuments,
  getDocumentById,
  deleteDocument,
  getDocumentChunks,
  getDocumentFileBuffer,
  validateDocumentUpload,
} from "../services/documentService";

const router = Router();

// Apply Auth and Tenant Context to all document routes
router.use(requireAuth);
router.use(requireTenantContext);

/**
 * GET /api/v2/documents
 * List all documents belonging to the user's active tenant organization.
 */
router.get("/", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const docs = await listDocuments(context.orgId);
    res.json({ documents: docs });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error consultando documentos",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * GET /api/v2/documents/:documentId
 * Get a specific document metadata and chunks, strictly guarded by tenant context (IDOR protection).
 */
router.get("/:documentId", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const { documentId } = req.params;

    const document = await getDocumentById(context.orgId, documentId);

    if (!document) {
      res.status(404).json({
        error: "Documento no encontrado",
        code: "DOCUMENT_NOT_FOUND",
      });
      return;
    }

    const chunks = await getDocumentChunks(context.orgId, documentId);

    res.json({ document, chunks });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error obteniendo el documento",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * GET /api/v2/documents/:documentId/download
 * Downloads the original file from Storage using authoritative server metadata (IDOR protected).
 */
router.get("/:documentId/download", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const { documentId } = req.params;

    const fileData = await getDocumentFileBuffer(context.orgId, documentId);

    if (!fileData) {
      res.status(404).json({
        error: "Documento o archivo físico no encontrado",
        code: "DOCUMENT_NOT_FOUND",
      });
      return;
    }

    res.setHeader("Content-Type", fileData.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileData.filename)}"`
    );
    res.setHeader("Content-Length", fileData.buffer.length);
    res.send(fileData.buffer);
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al descargar el archivo",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * POST /api/v2/documents/upload
 * Creates and stores a document in persistent Firebase Storage/Firestore with strict validation.
 */
router.post("/upload", requirePermission("document:create"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const uid = req.userUid!;

    // 1. Validate payload server-side
    const validation = validateDocumentUpload(req.body);
    if (!validation.valid) {
      res.status(400).json({
        error: validation.error,
        code: validation.code,
      });
      return;
    }

    const {
      mimeType,
      title,
      category,
      pageCount,
      chunks,
      summary,
      author,
      issuingOrganism,
      tags,
    } = req.body;

    // 2. Create document record & store physical file in Storage
    const documentRecord = await createDocument({
      orgId: context.orgId, // Server enforces authoritative tenant ID
      uid,
      filename: validation.sanitizedFilename!,
      fileBuffer: validation.fileBuffer!,
      mimeType,
      title,
      category,
      pageCount,
      chunks,
      summary,
      author,
      issuingOrganism,
      tags,
    });

    res.status(201).json({
      message: "Documento subido e indexado correctamente",
      document: documentRecord,
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al procesar la subida del documento",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * DELETE /api/v2/documents/:documentId
 * Deletes a document and its Storage object within the user's active tenant organization.
 */
router.delete("/:documentId", requirePermission("document:delete"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const { documentId } = req.params;

    const success = await deleteDocument(context.orgId, documentId);

    if (!success) {
      res.status(404).json({
        error: "Documento no encontrado",
        code: "DOCUMENT_NOT_FOUND",
      });
      return;
    }

    res.json({
      success: true,
      message: "Documento eliminado correctamente",
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al eliminar el documento",
      code: err.code || "SERVER_ERROR",
    });
  }
});

export default router;
