import * as hygieneService from "./hygieneService";
import * as audit from "./hygieneAuditService";

function eventType(fromStatus: hygieneService.HygieneMeasurementStatus | undefined, toStatus: hygieneService.HygieneMeasurementStatus, changed: string[]): audit.HygieneMeasurementAuditEventType {
  if (!fromStatus) return "created";
  if (changed.includes("normativeEvaluationSnapshot")) return "normative_snapshot_attached";
  if (toStatus === "pending_review") return "submitted_for_review";
  if (toStatus === "validated") return "validated";
  if (toStatus === "closed") return "closed";
  if (toStatus === "cancelled") return "cancelled";
  if (toStatus === "archived") return "archived";
  return changed.length ? "updated" : "updated";
}

export async function createMeasurementWithAudit(
  data: Omit<hygieneService.HygieneMeasurementRecord, "id" | "active" | "createdAt" | "updatedAt">,
) {
  const measurement = await hygieneService.createMeasurement(data);
  await audit.recordMeasurementAuditEvent({
    orgId: measurement.orgId,
    measurementId: measurement.id,
    actorId: data.createdBy,
    type: "created",
    toStatus: measurement.status,
  });
  return measurement;
}

export interface MeasurementAuditContext {
  eventType?: audit.HygieneMeasurementAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function updateMeasurementWithAudit(
  id: string,
  orgId: string,
  actorId: string,
  updates: Parameters<typeof hygieneService.updateMeasurement>[3],
  auditContext: MeasurementAuditContext = {},
) {
  const before = await hygieneService.getMeasurementById(id, orgId);
  if (!before) return undefined;
  const measurement = await hygieneService.updateMeasurement(id, orgId, actorId, updates);
  if (!measurement) return undefined;
  const changed = Object.keys(updates);
  await audit.recordMeasurementAuditEvent({
    orgId,
    measurementId: id,
    actorId,
    type: auditContext.eventType ?? eventType(before.status, measurement.status, changed),
    fromStatus: before.status,
    toStatus: measurement.status,
    metadata: { changedFields: changed, ...(auditContext.metadata ?? {}) },
  });
  return measurement;
}
