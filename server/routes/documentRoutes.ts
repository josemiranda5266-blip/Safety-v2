import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import {
  createDocument,
  listDocuments,
  getDocumentById,
  deleteDocument,
  getDocumentChunks,
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
  const context = req.authContext!;
  const docs = await listDocuments(context.orgId);
  res.json({ documents: docs });
});

/**
 * GET /api/v2/documents/:documentId
 * Get a specific document metadata and chunks, strictly guarded by tenant context (IDOR protection).
 */
router.get("/:documentId", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
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
});

/**
 * POST /api/v2/documents/upload
 * Creates and stores a document in persistent Firebase Storage/Firestore, strictly assigned to the server-resolved tenant orgId.
 */
router.post("/upload", requirePermission("document:create"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const uid = req.userUid!;

  const {
    filename,
    fileBase64,
    mimeType = "application/pdf",
    title,
    category,
    pageCount,
    chunks,
    summary,
    author,
    issuingOrganism,
    tags,
  } = req.body;

  if (!filename || !fileBase64) {
    res.status(400).json({
      error: "Parametros faltantes",
      message: "Se requieren filename y fileBase64.",
    });
    return;
  }

  const fileBuffer = Buffer.from(fileBase64, "base64");

  const documentRecord = await createDocument({
    orgId: context.orgId, // Server enforces authoritative tenant ID
    uid,
    filename,
    fileBuffer,
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
});

/**
 * DELETE /api/v2/documents/:documentId
 * Deletes a document within the user's active tenant organization.
 */
router.delete("/:documentId", requirePermission("document:delete"), async (req: TenantRequest, res: Response) => {
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
});

export default router;
