import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import { canAccessEmployee, canAccessCompany, canAccessEstablishment } from "../authorization/guards";
import { 
  createEmployeeSchema, 
  updateEmployeeSchema,
  createPpeDeliverySchema,
  createTrainingRecordSchema,
  createAccidentRecordSchema,
  createDocumentRecordSchema,
  createTimelineEventSchema,
  medicalFitnessSchema,
  transferEmployeeSchema,
  terminateEmployeeSchema
} from "../authorization/validation";
import * as employeeService from "../services/employeeService";
import * as companyService from "../services/companyService";
import * as establishmentService from "../services/establishmentService";
import * as sectorService from "../services/sectorService";
import * as positionService from "../services/positionService";
import { logStructured } from "../utils/logger";

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
  const includeInactive = req.query.includeInactive === "true";

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
    context.assignedCompanyIds,
    includeInactive
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
 * Creates a new employee record. Validates parent company, establishment, sector, and position hierarchy.
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

  // 4. Verify sector if provided
  if (parseResult.data.sectorId) {
    const parentSector = await sectorService.getSectorById(parseResult.data.sectorId, context.orgId);
    if (!parentSector || parentSector.establishmentId !== parentEstablishment.id || parentSector.companyId !== parentCompany.id) {
      res.status(400).json({
        error: "El sector no pertenece al establecimiento o empresa especificados",
        code: "SECTOR_ESTABLISHMENT_MISMATCH",
      });
      return;
    }
  }

  // 5. Verify position if provided
  if (parseResult.data.positionId) {
    const parentPosition = await positionService.getPositionById(parseResult.data.positionId, context.orgId);
    if (!parentPosition || parentPosition.establishmentId !== parentEstablishment.id || parentPosition.companyId !== parentCompany.id) {
      res.status(400).json({
        error: "El puesto no pertenece al establecimiento o empresa especificados",
        code: "POSITION_ESTABLISHMENT_MISMATCH",
      });
      return;
    }
    if (parseResult.data.sectorId && parentPosition.sectorId !== parseResult.data.sectorId) {
      res.status(400).json({
        error: "El puesto no pertenece al sector especificado",
        code: "POSITION_SECTOR_MISMATCH",
      });
      return;
    }
  }

  const newEmployee = await employeeService.createEmployee({
    ...parseResult.data,
    orgId: context.orgId, // Server enforces authoritative tenant ID
  });

  logStructured("info", "employee_created", {
    orgId: context.orgId,
    userId: context.userId,
    employeeId: newEmployee.id,
    companyId: newEmployee.companyId,
    establishmentId: newEmployee.establishmentId,
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

  // Validate sector if updated
  if (parseResult.data.sectorId) {
    const sector = await sectorService.getSectorById(parseResult.data.sectorId, context.orgId);
    if (!sector || sector.establishmentId !== employee.establishmentId || sector.companyId !== employee.companyId) {
      res.status(400).json({
        error: "El sector no pertenece al establecimiento del empleado",
        code: "SECTOR_ESTABLISHMENT_MISMATCH",
      });
      return;
    }
  }

  // Validate position if updated
  if (parseResult.data.positionId) {
    const position = await positionService.getPositionById(parseResult.data.positionId, context.orgId);
    if (!position || position.establishmentId !== employee.establishmentId || position.companyId !== employee.companyId) {
      res.status(400).json({
        error: "El puesto no pertenece al establecimiento del empleado",
        code: "POSITION_ESTABLISHMENT_MISMATCH",
      });
      return;
    }
  }

  const updated = await employeeService.updateEmployee(id, parseResult.data as any, context.orgId);
  res.json({ employee: updated });
});

/**
 * DELETE /api/v2/employees/:id
 * Soft-deletes an employee record within the authorized tenant (baja lógica).
 */
router.delete("/:id", requirePermission("employee:delete"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const { id } = req.params;
  const { reason, terminationDate } = req.body || {};

  const employee = await employeeService.getEmployeeById(id, context.orgId);
  if (!employee || !canAccessEmployee(context, employee, "employee:delete")) {
    res.status(404).json({
      error: "Empleado no encontrado",
      code: "EMPLOYEE_NOT_FOUND",
    });
    return;
  }

  await employeeService.deleteEmployee(id, context.orgId, reason, terminationDate);
  res.json({ success: true, message: "Baja de empleado registrada correctamente" });
});

/**
 * POST /api/v2/employees/:id/terminate
 * Specific endpoint for termination / baja lógica with formal reason.
 */
router.post("/:id/terminate", requirePermission("employee:delete"), async (req: TenantRequest, res: Response) => {
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

  const parseResult = terminateEmployeeSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de baja inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  await employeeService.deleteEmployee(
    id, 
    context.orgId, 
    parseResult.data.terminationReason, 
    parseResult.data.terminationDate
  );

  const updatedEmployee = await employeeService.getEmployeeById(id, context.orgId);
  res.json({ success: true, employee: updatedEmployee });
});

/**
 * POST /api/v2/employees/:id/ppe
 * Records an EPP delivery under Res. SRT 299/11 with timeline entry.
 */
router.post("/:id/ppe", requirePermission("employee:update"), async (req: TenantRequest, res: Response) => {
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

  const parseResult = createPpeDeliverySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de entrega de EPP inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const result = await employeeService.addEmployeePpeDelivery(id, parseResult.data, context.orgId);
  if (!result) {
    res.status(500).json({ error: "Error al registrar entrega de EPP" });
    return;
  }

  res.status(201).json({ employee: result.employee, ppeDelivery: result.ppeDelivery });
});

/**
 * POST /api/v2/employees/:id/trainings
 * Records a training course attendance / certificate with timeline entry.
 */
router.post("/:id/trainings", requirePermission("employee:update"), async (req: TenantRequest, res: Response) => {
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

  const parseResult = createTrainingRecordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de capacitación inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const result = await employeeService.addEmployeeTraining(id, parseResult.data, context.orgId);
  if (!result) {
    res.status(500).json({ error: "Error al registrar capacitación" });
    return;
  }

  res.status(201).json({ employee: result.employee, training: result.training });
});

/**
 * POST /api/v2/employees/:id/accidents
 * Records an accident, incident, or unsafe act with timeline entry.
 */
router.post("/:id/accidents", requirePermission("employee:update"), async (req: TenantRequest, res: Response) => {
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

  const parseResult = createAccidentRecordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de siniestro/incidente inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const result = await employeeService.addEmployeeAccident(id, parseResult.data, context.orgId);
  if (!result) {
    res.status(500).json({ error: "Error al registrar siniestro" });
    return;
  }

  res.status(201).json({ employee: result.employee, accident: result.accident });
});

/**
 * POST /api/v2/employees/:id/documents
 * Adds a document record to worker's digital legajo.
 */
router.post("/:id/documents", requirePermission("employee:update"), async (req: TenantRequest, res: Response) => {
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

  const parseResult = createDocumentRecordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de documento inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const result = await employeeService.addEmployeeDocument(id, parseResult.data, context.orgId);
  if (!result) {
    res.status(500).json({ error: "Error al adjuntar documento a legajo" });
    return;
  }

  res.status(201).json({ employee: result.employee, document: result.document });
});

/**
 * PUT /api/v2/employees/:id/medical-fitness
 * Updates worker's medical fitness record (Apto Médico Res. SRT 37/10).
 */
router.put("/:id/medical-fitness", requirePermission("employee:update"), async (req: TenantRequest, res: Response) => {
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

  const parseResult = medicalFitnessSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de aptitud médica inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const updated = await employeeService.updateEmployeeMedicalFitness(id, parseResult.data, context.orgId);
  if (!updated) {
    res.status(500).json({ error: "Error al actualizar aptitud médica" });
    return;
  }

  res.json({ employee: updated });
});

/**
 * POST /api/v2/employees/:id/transfer
 * Records a role/sector/establishment/shift transfer with audit history and timeline.
 */
router.post("/:id/transfer", requirePermission("employee:update"), async (req: TenantRequest, res: Response) => {
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

  const parseResult = transferEmployeeSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de reasignación inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  let newPositionTitle = "";
  let newSectorName = "";

  // Validate new establishment if provided
  if (parseResult.data.newEstablishmentId) {
    const est = await establishmentService.getEstablishmentById(parseResult.data.newEstablishmentId, context.orgId);
    if (!est || est.companyId !== employee.companyId) {
      res.status(400).json({
        error: "El nuevo establecimiento no pertenece a la misma empresa",
        code: "ESTABLISHMENT_MISMATCH",
      });
      return;
    }
  }

  // Validate new sector if provided
  if (parseResult.data.newSectorId) {
    const sector = await sectorService.getSectorById(parseResult.data.newSectorId, context.orgId);
    if (!sector || sector.companyId !== employee.companyId) {
      res.status(400).json({
        error: "El nuevo sector no pertenece a la empresa",
        code: "SECTOR_MISMATCH",
      });
      return;
    }
    newSectorName = sector.name;
  }

  // Validate new position if provided
  if (parseResult.data.newPositionId) {
    const position = await positionService.getPositionById(parseResult.data.newPositionId, context.orgId);
    if (!position || position.companyId !== employee.companyId) {
      res.status(400).json({
        error: "El nuevo puesto no pertenece a la empresa",
        code: "POSITION_MISMATCH",
      });
      return;
    }
    newPositionTitle = position.title;
  }

  const updated = await employeeService.transferEmployee(
    id,
    {
      ...parseResult.data,
      newPositionTitle,
      newSectorName,
      registeredBy: context.userEmail || context.userId,
    },
    context.orgId
  );

  res.json({ employee: updated });
});

/**
 * POST /api/v2/employees/:id/timeline
 * Appends custom observation / inspection / event to timeline.
 */
router.post("/:id/timeline", requirePermission("employee:update"), async (req: TenantRequest, res: Response) => {
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

  const parseResult = createTimelineEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Datos de evento de línea de tiempo inválidos",
      details: parseResult.error.flatten(),
    });
    return;
  }

  const updated = await employeeService.addEmployeeTimelineEvent(
    id,
    {
      ...parseResult.data,
      authorName: parseResult.data.authorName || context.userEmail || "Especialista H&S",
    },
    context.orgId
  );

  res.status(201).json({ employee: updated });
});

export default router;
