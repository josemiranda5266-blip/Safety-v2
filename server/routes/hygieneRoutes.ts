import { Router, Response } from "express";
import { requireAuth, requireTenantContext, requirePermission, TenantRequest } from "../authorization/middleware";
import { canAccessCompany, canAccessEstablishment, canAccessSector, canAccessPosition, canAccessEmployee } from "../authorization/guards";
import { createHygieneInstrumentSchema, updateHygieneInstrumentSchema, createHygieneMeasurementSchema, updateHygieneMeasurementSchema } from "../authorization/validation";
import * as hygieneService from "../services/hygieneService";
import { getNormativeProtocolVersion } from "../services/normativeCatalogService";
import * as hygieneAuditService from "../services/hygieneAuditService";
import * as companyService from "../services/companyService";
import * as establishmentService from "../services/establishmentService";
import * as sectorService from "../services/sectorService";
import * as positionService from "../services/positionService";
import * as employeeService from "../services/employeeService";

const router = Router();
router.use(requireAuth);
router.use(requireTenantContext);

async function validateMeasurementContext(context: NonNullable<TenantRequest["authContext"]>, value: {
  companyId: string; establishmentId: string; sectorId?: string; positionId?: string; employeeId?: string;
}): Promise<string | undefined> {
  const company = await companyService.getCompanyById(value.companyId, context.orgId);
  if (!company || !canAccessCompany(context, company, "hygiene:create")) return "COMPANY_NOT_FOUND";

  const establishment = await establishmentService.getEstablishmentById(value.establishmentId, context.orgId);
  if (!establishment || !canAccessEstablishment(context, establishment, "establishment:read") || establishment.companyId !== value.companyId) return "ESTABLISHMENT_MISMATCH";

  if (value.sectorId) {
    const sector = await sectorService.getSectorById(value.sectorId, context.orgId);
    if (!sector || !canAccessSector(context, sector, "sector:read") || sector.companyId !== value.companyId || sector.establishmentId !== value.establishmentId) return "SECTOR_MISMATCH";
  }
  if (value.positionId) {
    const position = await positionService.getPositionById(value.positionId, context.orgId);
    if (!position || !canAccessPosition(context, position, "position:read") || position.companyId !== value.companyId || position.establishmentId !== value.establishmentId || (value.sectorId && position.sectorId !== value.sectorId)) return "POSITION_MISMATCH";
  }
  if (value.employeeId) {
    const employee = await employeeService.getEmployeeById(value.employeeId, context.orgId);
    if (!employee || !canAccessEmployee(context, employee, "employee:read") || employee.companyId !== value.companyId || employee.establishmentId !== value.establishmentId || (value.sectorId && employee.sectorId !== value.sectorId) || (value.positionId && employee.positionId !== value.positionId)) return "EMPLOYEE_MISMATCH";
  }
  return undefined;
}

router.get("/instruments", requirePermission("hygiene:read"), async (req: TenantRequest, res: Response) => {
  const instruments = await hygieneService.listInstruments(req.authContext!.orgId);
  res.json({ instruments });
});

router.get("/instruments/:id", requirePermission("hygiene:read"), async (req: TenantRequest, res: Response) => {
  const instrument = await hygieneService.getInstrumentById(req.params.id, req.authContext!.orgId);
  if (!instrument) return res.status(404).json({ error: "Instrumento no encontrado", code: "INSTRUMENT_NOT_FOUND" });
  res.json({ instrument });
});

router.post("/instruments", requirePermission("hygiene:create"), async (req: TenantRequest, res: Response) => {
  const parsed = createHygieneInstrumentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos de instrumento inválidos", details: parsed.error.flatten() });
  const context = req.authContext!;
  const instrument = await hygieneService.createInstrument({ ...parsed.data, orgId: context.orgId, createdBy: context.userId, updatedBy: context.userId });
  res.status(201).json({ instrument });
});

router.patch("/instruments/:id", requirePermission("hygiene:update"), async (req: TenantRequest, res: Response) => {
  const parsed = updateHygieneInstrumentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos de actualización inválidos", details: parsed.error.flatten() });
  const context = req.authContext!;
  const instrument = await hygieneService.updateInstrument(req.params.id, context.orgId, context.userId, parsed.data);
  if (!instrument) return res.status(404).json({ error: "Instrumento no encontrado", code: "INSTRUMENT_NOT_FOUND" });
  res.json({ instrument });
});

router.get("/measurements", requirePermission("hygiene:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const companyId = typeof req.query.companyId === "string" ? req.query.companyId : undefined;
  if (companyId) {
    const company = await companyService.getCompanyById(companyId, context.orgId);
    if (!company || !canAccessCompany(context, company, "hygiene:read")) return res.status(404).json({ error: "Empresa no encontrada", code: "COMPANY_NOT_FOUND" });
  }
  const measurements = await hygieneService.listMeasurements(context.orgId, companyId);
  res.json({ measurements });
});

router.get("/measurements/:id", requirePermission("hygiene:read"), async (req: TenantRequest, res: Response) => {
  const measurement = await hygieneService.getMeasurementById(req.params.id, req.authContext!.orgId);
  if (!measurement) return res.status(404).json({ error: "Medición no encontrada", code: "MEASUREMENT_NOT_FOUND" });
  res.json({ measurement });
});

router.post("/measurements", requirePermission("hygiene:create"), async (req: TenantRequest, res: Response) => {
  const parsed = createHygieneMeasurementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos de medición inválidos", details: parsed.error.flatten() });
  const context = req.authContext!;
  const contextError = await validateMeasurementContext(context, parsed.data.context);
  if (contextError) return res.status(400).json({ error: "Contexto jerárquico inválido", code: contextError });

  for (const instrumentId of parsed.data.instrumentIds) {
    const instrument = await hygieneService.getInstrumentById(instrumentId, context.orgId);
    if (!instrument || !instrument.active || instrument.status === "retired" || instrument.status === "out_of_service") {
      return res.status(400).json({ error: "Instrumento no disponible para medición", code: "INSTRUMENT_NOT_AVAILABLE", instrumentId });
    }
  }

  const measurement = await hygieneService.createMeasurement({
    ...parsed.data,
    orgId: context.orgId,
    status: "draft",
    createdBy: context.userId,
    updatedBy: context.userId,
  });
  res.status(201).json({ measurement });
});

router.get("/measurements/:id/audit-events", requirePermission("hygiene:read"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const measurement = await hygieneService.getMeasurementById(req.params.id, context.orgId);
  if (!measurement) return res.status(404).json({ error: "Medición no encontrada", code: "MEASUREMENT_NOT_FOUND" });
  const events = await hygieneAuditService.listMeasurementAuditEvents(context.orgId, req.params.id);
  res.json({ events });
});

router.post("/measurements/:id/review", requirePermission("hygiene:update"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const measurement = await hygieneService.getMeasurementById(req.params.id, context.orgId);
  if (!measurement) return res.status(404).json({ error: "Medición no encontrada", code: "MEASUREMENT_NOT_FOUND" });
  if (measurement.status !== "pending_review") return res.status(409).json({ error: "La medición debe estar pendiente de revisión", code: "MEASUREMENT_NOT_READY_FOR_REVIEW" });
  const decision = req.body?.decision;
  if (decision !== "approved" && decision !== "changes_requested") return res.status(400).json({ error: "Decisión de revisión inválida", code: "INVALID_REVIEW_DECISION" });
  const now = new Date().toISOString();
  const updated = await hygieneService.updateMeasurement(req.params.id, context.orgId, context.userId, {
    status: decision === "approved" ? "validated" : "in_progress",
    review: { status: decision, reviewedBy: context.userId, reviewedAt: now, comments: typeof req.body?.comments === "string" ? req.body.comments : null },
  });
  if (updated) await hygieneAuditService.recordMeasurementAuditEvent({ orgId: context.orgId, measurementId: updated.id, actorId: context.userId, type: decision === "approved" ? "review_approved" : "changes_requested", fromStatus: measurement.status, toStatus: updated.status, metadata: { comments: updated.review?.comments ?? null } });
  res.json({ measurement: updated });
});

router.post("/measurements/:id/normative-snapshot", requirePermission("hygiene:update"), async (req: TenantRequest, res: Response) => {
  const context = req.authContext!;
  const measurement = await hygieneService.getMeasurementById(req.params.id, context.orgId);
  if (!measurement) return res.status(404).json({ error: "Medición no encontrada", code: "MEASUREMENT_NOT_FOUND" });
  const normativeProtocolVersionId = typeof req.body?.normativeProtocolVersionId === "string" ? req.body.normativeProtocolVersionId : "";
  if (!normativeProtocolVersionId) return res.status(400).json({ error: "Se requiere normativeProtocolVersionId", code: "NORMATIVE_VERSION_REQUIRED" });
  const version = await getNormativeProtocolVersion(normativeProtocolVersionId);
  if (!version) return res.status(404).json({ error: "Versión normativa no encontrada", code: "NORMATIVE_VERSION_NOT_FOUND" });
  if (version.protocolType !== measurement.protocolType) return res.status(400).json({ error: "La versión normativa no corresponde al protocolo de la medición", code: "NORMATIVE_PROTOCOL_MISMATCH" });
  const snapshot = { normativeProtocolVersionId: version.id, reference: version.reference, version: version.version, evaluatedAt: new Date().toISOString(), criteriaSnapshot: version.criteria.map((criterion) => ({ ...criterion, parameters: { ...criterion.parameters } })) };
  const updated = await hygieneService.updateMeasurement(req.params.id, context.orgId, context.userId, { normativeEvaluationSnapshot: snapshot });
  res.json({ measurement: updated });
});

router.patch("/measurements/:id", requirePermission("hygiene:update"), async (req: TenantRequest, res: Response) => {
  const parsed = updateHygieneMeasurementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos de actualización inválidos", details: parsed.error.flatten() });
  const context = req.authContext!;
  if (parsed.data.instrumentIds) {
    for (const instrumentId of parsed.data.instrumentIds) {
      const instrument = await hygieneService.getInstrumentById(instrumentId, context.orgId);
      if (!instrument || !instrument.active || instrument.status === "retired" || instrument.status === "out_of_service") {
        return res.status(400).json({ error: "Instrumento no disponible para medición", code: "INSTRUMENT_NOT_AVAILABLE", instrumentId });
      }
    }
  }
  const measurement = await hygieneService.updateMeasurement(req.params.id, context.orgId, context.userId, parsed.data);
  if (!measurement) return res.status(404).json({ error: "Medición no encontrada", code: "MEASUREMENT_NOT_FOUND" });
  res.json({ measurement });
});

export default router;
