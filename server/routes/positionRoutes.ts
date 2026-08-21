import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import { canAccessPosition, canAccessCompany, canAccessEstablishment, canAccessSector } from "../authorization/guards";
import { createPositionSchema, updatePositionSchema } from "../authorization/validation";
import * as positionService from "../services/positionService";
import * as companyService from "../services/companyService";
import * as establishmentService from "../services/establishmentService";
import * as sectorService from "../services/sectorService";
import { logStructured } from "../utils/logger";

const router = Router();

// Apply auth & tenant context to all position routes
router.use(requireAuth);
router.use(requireTenantContext);

/**
 * GET /api/v2/positions
 * Lists positions filtered by authorized companyId, establishmentId, and sectorId.
 */
router.get("/", requirePermission("position:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const companyId = req.query.companyId as string | undefined;
  const establishmentId = req.query.establishmentId as string | undefined;
  const sectorId = req.query.sectorId as string | undefined;

  if (companyId) {
    const parentCompany = await companyService.getCompanyById(companyId, context.orgId);
    if (!parentCompany || !canAccessCompany(context, parentCompany, "company:read")) {
      res.status(404).json({
        error: "Empresa no encontrada o no accesible",
        code: "COMPANY_NOT_FOUND",
      });
      return;
    }
  }

  if (establishmentId) {
    const parentEstablishment = await establishmentService.getEstablishmentById(establishmentId, context.orgId);
    if (!parentEstablishment || !canAccessEstablishment(context, parentEstablishment, "establishment:read")) {
      res.status(404).json({
        error: "Establecimiento no encontrado o no accesible",
        code: "ESTABLISHMENT_NOT_FOUND",
      });
      return;
    }
  }

  if (sectorId) {
    const parentSector = await sectorService.getSectorById(sectorId, context.orgId);
    if (!parentSector || !canAccessSector(context, parentSector, "sector:read")) {
      res.status(404).json({
        error: "Sector no encontrado o no accesible",
        code: "SECTOR_NOT_FOUND",
      });
      return;
    }
  }

  const positions = await positionService.listPositions(
    context.orgId,
    companyId,
    establishmentId,
    sectorId,
    context.assignedCompanyIds
  );

  res.json({ positions });
});

/**
 * GET /api/v2/positions/:id
 * Retrieves a single position by ID with strict tenant isolation.
 */
router.get("/:id", requirePermission("position:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const position = await positionService.getPositionById(id, context.orgId);

  if (!position || !canAccessPosition(context, position, "position:read")) {
    res.status(404).json({
      error: "Puesto de trabajo no encontrado",
      code: "POSITION_NOT_FOUND",
    });
    return;
  }

  res.json({ position });
});

/**
 * POST /api/v2/positions
 * Creates a new position under an authorized Sector, Establishment, and Company.
 */
router.post("/", requirePermission("position:create"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;

  const parseResult = createPositionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de puesto de trabajo inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  // 1. Verify parent company
  const parentCompany = await companyService.getCompanyById(parseResult.data.companyId, context.orgId);
  if (!parentCompany || !canAccessCompany(context, parentCompany, "company:update")) {
    res.status(404).json({
      error: "La empresa especificada no existe o no pertenece a la organización autorizada",
      code: "PARENT_COMPANY_NOT_FOUND",
    });
    return;
  }

  // 2. Verify parent establishment
  const parentEstablishment = await establishmentService.getEstablishmentById(parseResult.data.establishmentId, context.orgId);
  if (!parentEstablishment || !canAccessEstablishment(context, parentEstablishment, "establishment:update")) {
    res.status(404).json({
      error: "El establecimiento especificado no existe o no pertenece a la organización autorizada",
      code: "PARENT_ESTABLISHMENT_NOT_FOUND",
    });
    return;
  }

  // 3. Verify parent sector
  const parentSector = await sectorService.getSectorById(parseResult.data.sectorId, context.orgId);
  if (!parentSector || !canAccessSector(context, parentSector, "sector:update")) {
    res.status(404).json({
      error: "El sector especificado no existe o no pertenece a la organización autorizada",
      code: "PARENT_SECTOR_NOT_FOUND",
    });
    return;
  }

  // 4. Verify hierarchy integrity
  if (parentEstablishment.companyId !== parseResult.data.companyId) {
    res.status(400).json({
      error: "El establecimiento no pertenece a la empresa especificada",
      code: "ESTABLISHMENT_COMPANY_MISMATCH",
    });
    return;
  }

  if (parentSector.establishmentId !== parseResult.data.establishmentId) {
    res.status(400).json({
      error: "El sector no pertenece al establecimiento especificado",
      code: "SECTOR_ESTABLISHMENT_MISMATCH",
    });
    return;
  }

  const newPosition = await positionService.createPosition({
    ...parseResult.data,
    orgId: context.orgId, // Server authoritative
  });

  logStructured("info", "position_created", {
    orgId: context.orgId,
    userId: context.userId,
    positionId: newPosition.id,
    companyId: newPosition.companyId,
    establishmentId: newPosition.establishmentId,
    sectorId: newPosition.sectorId,
  });

  res.status(201).json({ position: newPosition });
});

/**
 * PATCH /api/v2/positions/:id
 * Updates an existing position within the authorized tenant.
 */
router.patch("/:id", requirePermission("position:update"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const existingPosition = await positionService.getPositionById(id, context.orgId);
  if (!existingPosition || !canAccessPosition(context, existingPosition, "position:update")) {
    res.status(404).json({
      error: "Puesto de trabajo no encontrado o no accesible para modificación",
      code: "POSITION_NOT_FOUND",
    });
    return;
  }

  const parseResult = updatePositionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de actualización inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  // If changing sectorId, verify new sector exists and belongs to same establishment/company
  if (parseResult.data.sectorId && parseResult.data.sectorId !== existingPosition.sectorId) {
    const newSector = await sectorService.getSectorById(parseResult.data.sectorId, context.orgId);
    if (!newSector || !canAccessSector(context, newSector, "sector:update")) {
      res.status(404).json({
        error: "El nuevo sector especificado no existe o no es accesible",
        code: "TARGET_SECTOR_NOT_FOUND",
      });
      return;
    }
    if (newSector.establishmentId !== existingPosition.establishmentId) {
      res.status(400).json({
        error: "El nuevo sector debe pertenecer al mismo establecimiento",
        code: "SECTOR_ESTABLISHMENT_MISMATCH",
      });
      return;
    }
  }

  const updatedPosition = await positionService.updatePosition(id, parseResult.data, context.orgId);
  if (!updatedPosition) {
    res.status(500).json({
      error: "No se pudo actualizar el puesto de trabajo",
      code: "UPDATE_FAILED",
    });
    return;
  }

  logStructured("info", "position_updated", {
    orgId: context.orgId,
    userId: context.userId,
    positionId: id,
  });

  res.json({ position: updatedPosition });
});

/**
 * DELETE /api/v2/positions/:id
 * Soft-deletes a position within the authorized tenant.
 */
router.delete("/:id", requirePermission("position:delete"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const existingPosition = await positionService.getPositionById(id, context.orgId);
  if (!existingPosition || !canAccessPosition(context, existingPosition, "position:delete")) {
    res.status(404).json({
      error: "Puesto de trabajo no encontrado o no accesible para eliminación",
      code: "POSITION_NOT_FOUND",
    });
    return;
  }

  const success = await positionService.deletePosition(id, context.orgId);
  if (!success) {
    res.status(500).json({
      error: "No se pudo eliminar el puesto de trabajo",
      code: "DELETE_FAILED",
    });
    return;
  }

  logStructured("info", "position_deleted", {
    orgId: context.orgId,
    userId: context.userId,
    positionId: id,
  });

  res.json({ message: "Puesto de trabajo eliminado correctamente" });
});

export default router;
