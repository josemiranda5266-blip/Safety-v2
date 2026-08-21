import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocumentMetadata,
  renewDocumentVersion,
  softDeleteDocument,
  restoreDocument,
  hardDeleteDocument,
  getDocumentDashboardMetrics,
  getDocumentCalendarEvents,
  getDocumentChunks,
  getDocumentFileBuffer,
  validateDocumentUpload,
} from "../services/documentService";
import { DocumentFilterOptions, DocumentCategory, DocumentScope, ExpirationAlertLevel, DocumentStatus } from "../../src/types/documentManagement";

const router = Router();

// Apply Auth and Tenant Context to all document routes
router.use(requireAuth);
router.use(requireTenantContext);

/**
 * GET /api/v2/documents/metrics
 * Consolidated KPIs and expiration metrics for dashboard.
 */
router.get("/metrics", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const metrics = await getDocumentDashboardMetrics(context.orgId, context.assignedCompanyIds);
    res.json({ metrics });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al calcular métricas de documentos",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * GET /api/v2/documents/alerts
 * High priority expiring and expired document alerts.
 */
router.get("/alerts", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const docs = await listDocuments(
      context.orgId,
      { includeDeleted: false },
      context.assignedCompanyIds
    );

    // Filter only those that are expired or expiring within 90 days
    const alerts = docs.filter(
      (d) =>
        d.expirationAlertLevel === 'expired' ||
        d.expirationAlertLevel === 'critical_7d' ||
        d.expirationAlertLevel === 'urgent_15d' ||
        d.expirationAlertLevel === 'warning_30d' ||
        d.expirationAlertLevel === 'notice_90d'
    );

    res.json({ alerts, totalAlerts: alerts.length });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al obtener alertas de vencimiento",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * GET /api/v2/documents/calendar
 * Calendar events (vencimientos y emisiones) for monthly/weekly view.
 */
router.get("/calendar", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const events = await getDocumentCalendarEvents(context.orgId, context.assignedCompanyIds);
    res.json({ events });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al generar eventos de calendario",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * GET /api/v2/documents
 * List all documents with comprehensive filtering (scope, company, establishment, employee, category, expiration status, etc.)
 */
router.get("/", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const {
      scope,
      companyId,
      establishmentId,
      employeeId,
      category,
      alertLevel,
      status,
      search,
      includeDeleted,
    } = req.query;

    const filterOptions: DocumentFilterOptions = {
      scope: (scope as DocumentScope) || 'all',
      companyId: companyId ? String(companyId) : undefined,
      establishmentId: establishmentId ? String(establishmentId) : undefined,
      employeeId: employeeId ? String(employeeId) : undefined,
      category: (category as DocumentCategory) || 'all',
      alertLevel: (alertLevel as ExpirationAlertLevel) || 'all',
      status: (status as DocumentStatus) || 'all',
      searchQuery: search ? String(search) : undefined,
      includeDeleted: includeDeleted === 'true',
    };

    const docs = await listDocuments(context.orgId, filterOptions, context.assignedCompanyIds);
    res.json({ documents: docs, count: docs.length });
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
 * Get a specific document metadata, version history, and chunks (strictly guarded by tenant & company scope).
 */
router.get("/:documentId", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const { documentId } = req.params;

    const document = await getDocumentById(context.orgId, documentId, true, context.assignedCompanyIds);

    if (!document) {
      res.status(404).json({
        error: "Documento no encontrado",
        code: "DOCUMENT_NOT_FOUND",
      });
      return;
    }

    const chunks = await getDocumentChunks(context.orgId, documentId, context.assignedCompanyIds);

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
 * Downloads the original file or specific version from Storage (IDOR protected).
 */
router.get("/:documentId/download", requirePermission("document:read"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const { documentId } = req.params;
    const version = req.query.version ? parseInt(String(req.query.version), 10) : undefined;

    const fileData = await getDocumentFileBuffer(context.orgId, documentId, version, context.assignedCompanyIds);

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
 * Creates and stores a professional document with rich metadata in Firebase Storage & Firestore.
 */
router.post("/upload", requirePermission("document:create"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const uid = req.userUid!;
    const userRole = context.membershipRole;

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
      subCategory,
      scope,
      companyId,
      establishmentId,
      employeeId,
      documentNumber,
      issueDate,
      expirationDate,
      responsibleName,
      issuingOrganism,
      summary,
      notes,
      tags,
      chunks,
    } = req.body;

    // Validate Scoped Consultant permissions
    if (context.assignedCompanyIds !== undefined) {
      if (!companyId) {
        res.status(403).json({
          error: "Los consultores con permisos restringidos deben especificar una empresa para subir documentos",
          code: "FORBIDDEN_COMPANY_SCOPE",
        });
        return;
      }
      if (!context.assignedCompanyIds.includes(companyId)) {
        res.status(403).json({
          error: "No tiene permisos para subir documentos a la empresa especificada",
          code: "FORBIDDEN_COMPANY_SCOPE",
        });
        return;
      }
    }

    // 2. Create document record & store physical file in Storage
    const documentRecord = await createDocument({
      orgId: context.orgId,
      uid,
      userName: req.userDisplayName || req.userEmail || "Profesional H&S",
      filename: validation.sanitizedFilename!,
      fileBuffer: validation.fileBuffer!,
      mimeType,
      title,
      category: category || "Informes",
      subCategory,
      scope: scope || "company",
      companyId,
      establishmentId,
      employeeId,
      documentNumber,
      issueDate,
      expirationDate,
      responsibleName,
      issuingOrganism,
      summary,
      notes,
      tags,
      chunks,
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
 * PUT /api/v2/documents/:documentId
 * Updates document metadata (dates, responsible, status, category, etc.).
 */
router.put("/:documentId", requirePermission("document:create"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const { documentId } = req.params;

    const {
      title,
      category,
      subCategory,
      documentNumber,
      issueDate,
      expirationDate,
      responsibleName,
      issuingOrganism,
      status,
      notes,
      tags,
      summary,
    } = req.body;

    const updated = await updateDocumentMetadata(context.orgId, documentId, {
      title,
      category,
      subCategory,
      documentNumber,
      issueDate,
      expirationDate,
      responsibleName,
      issuingOrganism,
      status,
      notes,
      tags,
      summary,
    }, context.assignedCompanyIds);

    res.json({
      message: "Metadatos de documento actualizados",
      document: updated,
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al actualizar documento",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * POST /api/v2/documents/:documentId/renew
 * Uploads a new version of the document, updates expiration dates and retains full version history.
 */
router.post("/:documentId/renew", requirePermission("document:create"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const uid = req.userUid!;
    const { documentId } = req.params;

    const validation = validateDocumentUpload(req.body);
    if (!validation.valid) {
      res.status(400).json({
        error: validation.error,
        code: validation.code,
      });
      return;
    }

    const { mimeType, issueDate, expirationDate, changeNotes } = req.body;

    const renewed = await renewDocumentVersion({
      orgId: context.orgId,
      documentId,
      uid,
      userName: req.userDisplayName || req.userEmail || "Profesional H&S",
      filename: validation.sanitizedFilename!,
      fileBuffer: validation.fileBuffer!,
      mimeType,
      issueDate,
      expirationDate,
      changeNotes,
      assignedCompanyIds: context.assignedCompanyIds,
    });

    res.json({
      message: "Documento renovado y nueva versión archivada exitosamente",
      document: renewed,
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al renovar versión del documento",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * DELETE /api/v2/documents/:documentId
 * Soft delete (eliminación lógica) preserving legal audit trail.
 */
router.delete("/:documentId", requirePermission("document:delete"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const uid = req.userUid!;
    const { documentId } = req.params;

    const success = await softDeleteDocument(
      context.orgId,
      documentId,
      uid,
      req.userDisplayName || req.userEmail || "Profesional H&S",
      context.assignedCompanyIds
    );

    if (!success) {
      res.status(404).json({
        error: "Documento no encontrado o no disponible",
        code: "DOCUMENT_NOT_FOUND",
      });
      return;
    }

    res.json({
      success: true,
      message: "Documento dado de baja lógicamente (conservado para trazabilidad legal)",
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al dar de baja el documento",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * POST /api/v2/documents/:documentId/restore
 * Restores a soft-deleted document.
 */
router.post("/:documentId/restore", requirePermission("document:create"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const { documentId } = req.params;

    const success = await restoreDocument(context.orgId, documentId, context.assignedCompanyIds);

    if (!success) {
      res.status(404).json({
        error: "Documento no encontrado",
        code: "DOCUMENT_NOT_FOUND",
      });
      return;
    }

    res.json({
      success: true,
      message: "Documento restaurado correctamente",
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al restaurar el documento",
      code: err.code || "SERVER_ERROR",
    });
  }
});

/**
 * DELETE /api/v2/documents/:documentId/permanent
 * Permanent hard-delete (restricted to owner/admin).
 */
router.delete("/:documentId/permanent", requirePermission("document:delete"), async (req: TenantRequest, res: Response) => {
  try {
    const context = req.authContext!;
    const { documentId } = req.params;

    const success = await hardDeleteDocument(context.orgId, documentId, context.assignedCompanyIds);

    if (!success) {
      res.status(404).json({
        error: "Documento no encontrado",
        code: "DOCUMENT_NOT_FOUND",
      });
      return;
    }

    res.json({
      success: true,
      message: "Documento eliminado permanentemente",
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || "Error al eliminar permanentemente",
      code: err.code || "SERVER_ERROR",
    });
  }
});

export default router;
