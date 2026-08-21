import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import { canAccessEmployee, canAccessCompany, canAccessEstablishment } from "../authorization/guards";
import { createEmployeeSchema, updateEmployeeSchema } from "../authorization/validation";
import * as employeeService from "../services/employeeService";
import * as companyService from "../services/companyService";
import * as establishmentService from "../services/establishmentService";

const router = Router();

// Apply auth & tenant context to all employee routes
router.use(requireAuth);
router.use(requireTenantContext);

/**
 * GET /api/v2/employees
 * Lists employees filtered by authorized companyId/establishmentId.
 */
router.get("/", requirePermission("employee:read"), async (req: TenantRequest, res: Response) => {
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

  const employees = await employeeService.listEmployees(
    context.orgId,
    companyId,
    establishmentId,
    context.assignedCompanyIds
  );

  res.json({ employees });
});

/**
 * GET /api/v2/employees/:id
 * Retrieves a single employee by ID with strict tenant isolation.
 */
router.get("/:id", requirePermission("employee:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const employee = await employeeService.getEmployeeById(id, context.orgId);

  if (!employee || !canAccessEmployee(context, employee, "employee:read")) {
    res.status(404).json({
      error: "Empleado no encontrado",
      code: "EMPLOYEE_NOT_FOUND",
    });
    return;
  }

  res.json({ employee });
});

/**
 * POST /api/v2/employees
 * Creates a new employee record. Validates parent company and establishment.
 */
router.post("/", requirePermission("employee:create"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;

  const parseResult = createEmployeeSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de empleado inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  // 1. Verify parent company access
  const parentCompany = await companyService.getCompanyById(parseResult.data.companyId, context.orgId);
  if (!parentCompany || !canAccessCompany(context, parentCompany, "company:update")) {
    res.status(404).json({
      error: "La empresa especificada no existe o no pertenece a la organización autorizada",
      code: "PARENT_COMPANY_NOT_FOUND",
    });
    return;
  }

  // 2. Verify parent establishment access
  const parentEstablishment = await establishmentService.getEstablishmentById(parseResult.data.establishmentId, context.orgId);
  if (!parentEstablishment || !canAccessEstablishment(context, parentEstablishment, "establishment:update")) {
    res.status(404).json({
      error: "El establecimiento especificado no existe o no pertenece a la organización autorizada",
      code: "PARENT_ESTABLISHMENT_NOT_FOUND",
    });
    return;
  }

  // 3. Verify establishment belongs to company
  if (parentEstablishment.companyId !== parentCompany.id) {
    res.status(400).json({
      error: "El establecimiento no pertenece a la empresa especificada",
      code: "ESTABLISHMENT_COMPANY_MISMATCH",
    });
    return;
  }

  const newEmployee = await employeeService.createEmployee({
    ...parseResult.data,
    orgId: context.orgId, // Server enforces authoritative tenant ID
  });

  res.status(201).json({ employee: newEmployee });
});

/**
 * PATCH /api/v2/employees/:id
 * Updates an employee record within the authorized tenant.
 */
router.patch("/:id", requirePermission("employee:update"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const employee = await employeeService.getEmployeeById(id, context.orgId);
  if (!employee || !canAccessEmployee(context, employee, "employee:update")) {
    res.status(404).json({
      error: "Empleado no encontrado",
      code: "EMPLOYEE_NOT_FOUND",
    });
    return;
  }

  const parseResult = updateEmployeeSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de actualización inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const updated = await employeeService.updateEmployee(id, parseResult.data, context.orgId);
  res.json({ employee: updated });
});

/**
 * DELETE /api/v2/employees/:id
 * Soft-deletes an employee record within the authorized tenant.
 */
router.delete("/:id", requirePermission("employee:delete"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;

  const employee = await employeeService.getEmployeeById(id, context.orgId);
  if (!employee || !canAccessEmployee(context, employee, "employee:delete")) {
    res.status(404).json({
      error: "Empleado no encontrado",
      code: "EMPLOYEE_NOT_FOUND",
    });
    return;
  }

  await employeeService.deleteEmployee(id, context.orgId);
  res.json({ success: true, message: "Empleado eliminado correctamente" });
});

export default router;
