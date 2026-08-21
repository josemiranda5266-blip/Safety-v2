import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import { canAccessCompany } from "../authorization/guards";
import { createCompanySchema, updateCompanySchema } from "../authorization/validation";
import * as companyService from "../services/companyService";

const router = Router();

// Apply auth & tenant context to all company routes
router.use(requireAuth);
router.use(requireTenantContext);

/**
 * GET /api/v2/companies
 * Lists all active companies belonging to the user's authorized Organization.
 */
router.get("/", requirePermission("company:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const companies = await companyService.listCompanies(context.orgId, context.assignedCompanyIds);
  res.json({ companies });
});

/**
 * GET /api/v2/companies/:companyId
 * Retrieves a single company by ID with strict tenant isolation and IDOR protection.
 */
router.get("/:companyId", requirePermission("company:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { companyId } = req.params;

  const company = await companyService.getCompanyById(companyId, context.orgId);

  // Return 404 if company doesn't exist OR belongs to another tenant (avoids resource enumeration)
  if (!company || !canAccessCompany(context, company, "company:read")) {
    res.status(404).json({
      error: "Empresa no encontrada",
      code: "COMPANY_NOT_FOUND",
    });
    return;
  }

  res.json({ company });
});

/**
 * POST /api/v2/companies
 * Creates a new company strictly scoped to the context Organization.
 */
router.post("/", requirePermission("company:create"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;

  const parseResult = createCompanySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de empresa inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const newCompany = await companyService.createCompany({
    ...parseResult.data,
    orgId: context.orgId, // Server enforces authoritative tenant ID
  });

  res.status(201).json({ company: newCompany });
});

/**
 * PATCH /api/v2/companies/:companyId
 * Updates an existing company within the authorized tenant.
 */
router.patch("/:companyId", requirePermission("company:update"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { companyId } = req.params;

  const company = await companyService.getCompanyById(companyId, context.orgId);
  if (!company || !canAccessCompany(context, company, "company:update")) {
    res.status(404).json({
      error: "Empresa no encontrada",
      code: "COMPANY_NOT_FOUND",
    });
    return;
  }

  const parseResult = updateCompanySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de actualización inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const updated = await companyService.updateCompany(companyId, parseResult.data, context.orgId);
  res.json({ company: updated });
});

/**
 * DELETE /api/v2/companies/:companyId
 * Soft-deletes a company within the authorized tenant.
 */
router.delete("/:companyId", requirePermission("company:delete"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { companyId } = req.params;

  const company = await companyService.getCompanyById(companyId, context.orgId);
  if (!company || !canAccessCompany(context, company, "company:delete")) {
    res.status(404).json({
      error: "Empresa no encontrada",
      code: "COMPANY_NOT_FOUND",
    });
    return;
  }

  await companyService.deleteCompany(companyId, context.orgId);
  res.json({ success: true, message: "Empresa eliminada correctamente" });
});

export default router;
