import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import { canAccessEstablishment, canAccessCompany } from "../authorization/guards";
import { createEstablishmentSchema, updateEstablishmentSchema } from "../authorization/validation";
import * as establishmentService from "../services/establishmentService";
import * as companyService from "../services/companyService";

const router = Router();

// Apply auth & tenant context to all establishment routes
router.use(requireAuth);
router.use(requireTenantContext);

/**
 * GET /api/v2/establishments
 * Lists establishments filtered by authorized companyId and Organization.
 */
router.get("/", requirePermission("establishment:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const companyId = req.query.companyId as string | undefined;

  // If specific companyId is requested, verify access to that company
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

  const establishments = await establishmentService.listEstablishments(
    context.orgId,
    companyId,
    context.assignedCompanyIds
  );

  res.json({ establishments });
});

/**
 * GET /api/v2/establishments/:id
 * Retrieves a single establishment by ID with strict tenant validation.
 */
router.get("/:id", requirePermission("establishment:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const establishment = await establishmentService.getEstablishmentById(id, context.orgId);

  if (!establishment || !canAccessEstablishment(context, establishment, "establishment:read")) {
    res.status(404).json({
      error: "Establecimiento no encontrado",
      code: "ESTABLISHMENT_NOT_FOUND",
    });
    return;
  }

  res.json({ establishment });
});

/**
 * POST /api/v2/establishments
 * Creates a new establishment under an authorized Company in the context Organization.
 */
router.post("/", requirePermission("establishment:create"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;

  const parseResult = createEstablishmentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de establecimiento inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  // Verify parent company exists and belongs to context Organization
  const parentCompany = await companyService.getCompanyById(parseResult.data.companyId, context.orgId);
  if (!parentCompany || !canAccessCompany(context, parentCompany, "company:update")) {
    res.status(404).json({
      error: "La empresa especificada no existe o no pertenece a la organización autorizada",
      code: "PARENT_COMPANY_NOT_FOUND",
    });
    return;
  }

  const newEstablishment = await establishmentService.createEstablishment({
    ...parseResult.data,
    orgId: context.orgId, // Server enforces authoritative tenant ID
  });

  res.status(201).json({ establishment: newEstablishment });
});

/**
 * PATCH /api/v2/establishments/:id
 * Updates an existing establishment within the authorized tenant.
 */
router.patch("/:id", requirePermission("establishment:update"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const establishment = await establishmentService.getEstablishmentById(id, context.orgId);
  if (!establishment || !canAccessEstablishment(context, establishment, "establishment:update")) {
    res.status(404).json({
      error: "Establecimiento no encontrado",
      code: "ESTABLISHMENT_NOT_FOUND",
    });
    return;
  }

  const parseResult = updateEstablishmentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de actualización inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const updated = await establishmentService.updateEstablishment(id, parseResult.data, context.orgId);
  res.json({ establishment: updated });
});

/**
 * DELETE /api/v2/establishments/:id
 * Deletes an establishment within the authorized tenant.
 */
router.delete("/:id", requirePermission("establishment:delete"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const establishment = await establishmentService.getEstablishmentById(id, context.orgId);
  if (!establishment || !canAccessEstablishment(context, establishment, "establishment:delete")) {
    res.status(404).json({
      error: "Establecimiento no encontrado",
      code: "ESTABLISHMENT_NOT_FOUND",
    });
    return;
  }

  await establishmentService.deleteEstablishment(id, context.orgId);
  res.json({ success: true, message: "Establecimiento eliminado correctamente" });
});

export default router;
