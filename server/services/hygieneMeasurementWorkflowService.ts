import * as hygieneService from "./hygieneService";
import * as audit from "./hygieneAuditService";
import { calculateLightingMeasurement } from "../../src/services/lightingMeasurement";
import type { CreateLightingMeasurementData } from "../../src/types/safety";

function eventType(fromStatus: hygieneService.HygieneMeasurementStatus | undefined, toStatus: hygieneService.HygieneMeasurementStatus, changed: string[]): audit.HygieneMeasurementAuditEventType {
  if (!fromStatus) return "created";
  if (changed.includes("normativeEvaluationSnapshot")) return "normative_snapshot_attached";
  if (toStatus === "pending_review") return "submitted_for_review";
  if (toStatus === "validated") return "validated";
  if (toStatus === "closed") return "closed";
  if (toStatus === "cancelled") return "cancelled";
  if (toStatus === "archived") return "archived";
  return "updated";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function normalizeLightingRawData(rawData: unknown): Record<string, unknown> {
  const root = asRecord(rawData);
  const lighting = root && asRecord(root.lighting);
  if (!root || !lighting) throw new Error("INVALID_LIGHTING_RAW_DATA");

  const points = lighting.points;
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error("INVALID_LIGHTING_POINTS");
  }

  const normalizedPoints = points.map((value, index) => {
    const point = asRecord(value);
    if (!point || typeof point.name !== "string" || point.name.trim() === "") {
      throw new Error(`INVALID_LIGHTING_POINT_NAME:${index}`);
    }
    const lux = typeof point.lux === "number" ? point.lux : Number(point.lux);
    if (!Number.isFinite(lux)) throw new Error(`INVALID_LIGHTING_POINT_LUX:${index}`);
    return { ...point, name: point.name.trim(), lux };
  });

  const input = {
    ...lighting,
    points: normalizedPoints,
  } as unknown as CreateLightingMeasurementData;

  return {
    ...root,
    lighting: calculateLightingMeasurement(input),
  };
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

  if (
    updates.normativeEvaluationSnapshot !== undefined &&
    ["validated", "closed", "archived"].includes(before.status)
  ) {
    throw new Error("NORMATIVE_SNAPSHOT_LOCKED");
  }

  let effectiveUpdates = { ...updates };

  if (
    before.protocolType === "lighting" &&
    updates.rawData !== undefined &&
    asRecord(updates.rawData)?.lighting !== undefined
  ) {
    effectiveUpdates = {
      ...effectiveUpdates,
      rawData: normalizeLightingRawData(updates.rawData),
    };
  }

  if (updates.status === "validated" && !before.instrumentSnapshots?.length) {
    const capturedAt = new Date().toISOString();
    const instrumentSnapshots: hygieneService.HygieneInstrumentSnapshot[] = [];
    for (const instrumentId of before.instrumentIds) {
      const instrument = await hygieneService.getInstrumentById(instrumentId, orgId);
      if (!instrument) throw new Error(`INSTRUMENT_NOT_FOUND:${instrumentId}`);
      instrumentSnapshots.push({
        id: instrument.id,
        category: instrument.category,
        instrumentType: instrument.instrumentType,
        brand: instrument.brand,
        model: instrument.model,
        serialNumber: instrument.serialNumber,
        calibrationDate: instrument.calibrationDate ?? null,
        calibrationExpiry: instrument.calibrationExpiry ?? null,
        certificateUrl: instrument.certificateUrl ?? null,
        capturedAt,
      });
    }
    effectiveUpdates = { ...effectiveUpdates, instrumentSnapshots };
  }

  const measurement = await hygieneService.updateMeasurement(id, orgId, actorId, effectiveUpdates);
  if (!measurement) return undefined;
  const changed = Object.keys(effectiveUpdates);
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
