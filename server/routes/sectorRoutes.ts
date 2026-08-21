import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import { canAccessSector, canAccessCompany, canAccessEstablishment } from "../authorization/guards";
import { createSectorSchema, updateSectorSchema } from "../authorization/validation";
import * as sectorService from "../services/sectorService";
import * as companyService from "../services/companyService";
import * as establishmentService from "../services/establishmentService";
import { logStructured } from "../utils/logger";

const router = Router();

// Apply auth & tenant context to all sector routes
router.use(requireAuth);
router.use(requireTenantContext);

/**
 * GET /api/v2/sectors
 * Lists sectors filtered by authorized companyId and establishmentId.
 */
router.get("/", requirePermission("sector:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const companyId = req.query.companyId as string | undefined;
  const establishmentId = req.query.establishmentId as string | undefined;

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

  const sectors = await sectorService.listSectors(
    context.orgId,
    companyId,
    establishmentId,
    context.assignedCompanyIds
  );

  res.json({ sectors });
});

/**
 * GET /api/v2/sectors/:id
 * Retrieves a single sector by ID with strict tenant isolation.
 */
router.get("/:id", requirePermission("sector:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const sector = await sectorService.getSectorById(id, context.orgId);

  if (!sector || !canAccessSector(context, sector, "sector:read")) {
    res.status(404).json({
      error: "Sector no encontrado",
      code: "SECTOR_NOT_FOUND",
    });
    return;
  }

  res.json({ sector });
});

/**
 * POST /api/v2/sectors
 * Creates a new sector under an authorized Establishment and Company.
 */
router.post("/", requirePermission("sector:create"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;

  const parseResult = createSectorSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de sector inválidos",
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

  // 3. Verify parent establishment belongs to the specified company
  if (parentEstablishment.companyId !== parseResult.data.companyId) {
    res.status(400).json({
      error: "El establecimiento no pertenece a la empresa especificada",
      code: "ESTABLISHMENT_COMPANY_MISMATCH",
    });
    return;
  }

  const newSector = await sectorService.createSector({
    ...parseResult.data,
    orgId: context.orgId, // Server authoritative
  });

  logStructured("info", "sector_created", {
    orgId: context.orgId,
    userId: context.userId,
    sectorId: newSector.id,
    companyId: newSector.companyId,
    establishmentId: newSector.establishmentId,
  });

  res.status(201).json({ sector: newSector });
});

/**
 * PATCH /api/v2/sectors/:id
 * Updates an existing sector within the authorized tenant.
 */
router.patch("/:id", requirePermission("sector:update"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const existingSector = await sectorService.getSectorById(id, context.orgId);
  if (!existingSector || !canAccessSector(context, existingSector, "sector:update")) {
    res.status(404).json({
      error: "Sector no encontrado o no accesible para modificación",
      code: "SECTOR_NOT_FOUND",
    });
    return;
  }

  const parseResult = updateSectorSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de actualización inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const updatedSector = await sectorService.updateSector(id, parseResult.data, context.orgId);
  if (!updatedSector) {
    res.status(500).json({
      error: "No se pudo actualizar el sector",
      code: "UPDATE_FAILED",
    });
    return;
  }

  logStructured("info", "sector_updated", {
    orgId: context.orgId,
    userId: context.userId,
    sectorId: id,
  });

  res.json({ sector: updatedSector });
});

/**
 * DELETE /api/v2/sectors/:id
 * Soft-deletes a sector within the authorized tenant.
 */
router.delete("/:id", requirePermission("sector:delete"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const existingSector = await sectorService.getSectorById(id, context.orgId);
  if (!existingSector || !canAccessSector(context, existingSector, "sector:delete")) {
    res.status(404).json({
      error: "Sector no encontrado o no accesible para eliminación",
      code: "SECTOR_NOT_FOUND",
    });
    return;
  }

  const success = await sectorService.deleteSector(id, context.orgId);
  if (!success) {
    res.status(500).json({
      error: "No se pudo eliminar el sector",
      code: "DELETE_FAILED",
    });
    return;
  }

  logStructured("info", "sector_deleted", {
    orgId: context.orgId,
    userId: context.userId,
    sectorId: id,
  });

  res.json({ message: "Sector eliminado correctamente" });
});

export default router;
