import { getAdminFirestore } from "../auth/firestoreAdmin";

export type HygieneInstrumentStatus = "active" | "maintenance" | "calibration_due" | "out_of_service" | "retired";
export type HygieneMeasurementStatus = "draft" | "in_progress" | "pending_review" | "validated" | "closed" | "cancelled" | "archived";

export interface HygieneInstrumentRecord {
  id: string; orgId: string; category: string; instrumentType: string; brand: string; model: string; serialNumber: string;
  calibrationDate?: string | null; calibrationExpiry?: string | null; certificateUrl?: string | null;
  status: HygieneInstrumentStatus; notes?: string | null; active: boolean;
  createdBy: string; createdAt: string; updatedBy: string; updatedAt: string;
}

export interface HygieneInstrumentSnapshot {
  id: string; category: string; instrumentType: string; brand: string; model: string; serialNumber: string;
  calibrationDate?: string | null; calibrationExpiry?: string | null; certificateUrl?: string | null; capturedAt: string;
}

export interface HygieneMeasurementReview { status: "pending" | "approved" | "changes_requested"; reviewedBy?: string; reviewedAt?: string; comments?: string | null; }

export interface HygieneMeasurementRecord {
  id: string; orgId: string;
  context: { companyId: string; establishmentId: string; sectorId?: string; positionId?: string; employeeId?: string };
  protocolType: string; measurementDate: string; instrumentIds: string[]; instrumentSnapshots?: HygieneInstrumentSnapshot[]; notes?: string | null;
  rawData?: Record<string, unknown>; review?: HygieneMeasurementReview; normativeEvaluationSnapshot?: { normativeProtocolVersionId: string; reference: string; version: string; evaluatedAt: string; selectedCriterionId?: string; criteriaSnapshot: Array<{ id: string; code: string; title: string; description?: string; unit?: string; parameters: Record<string, string | number | boolean>; applicability?: string }> }; status: HygieneMeasurementStatus; active: boolean;
  createdBy: string; createdAt: string; updatedBy: string; updatedAt: string;
}

const instruments = "hygieneInstruments";
const measurements = "hygieneMeasurements";
const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export async function listInstruments(orgId: string): Promise<HygieneInstrumentRecord[]> {
  const snapshot = await getAdminFirestore().collection(instruments).where("orgId", "==", orgId).where("active", "==", true).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as HygieneInstrumentRecord));
}
export async function getInstrumentById(id: string, orgId: string): Promise<HygieneInstrumentRecord | undefined> {
  const doc = await getAdminFirestore().collection(instruments).doc(id).get();
  if (!doc.exists) return undefined;
  const item = { id: doc.id, ...doc.data() } as HygieneInstrumentRecord;
  return item.orgId === orgId ? item : undefined;
}
export async function createInstrument(data: Omit<HygieneInstrumentRecord, "id" | "active" | "createdAt" | "updatedAt">): Promise<HygieneInstrumentRecord> {
  const now = new Date().toISOString();
  const item: HygieneInstrumentRecord = { ...data, id: newId("hin"), active: true, createdAt: now, updatedAt: now };
  await getAdminFirestore().collection(instruments).doc(item.id).set(item);
  return item;
}
export async function updateInstrument(id: string, orgId: string, updatedBy: string, updates: Partial<Omit<HygieneInstrumentRecord, "id" | "orgId" | "createdBy" | "createdAt" | "updatedBy" | "updatedAt" | "active">>): Promise<HygieneInstrumentRecord | undefined> {
  const db = getAdminFirestore(); const ref = db.collection(instruments).doc(id);
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref); if (!doc.exists) return undefined;
    const existing = { id: doc.id, ...doc.data() } as HygieneInstrumentRecord; if (existing.orgId !== orgId) return undefined;
    const item = { ...existing, ...updates, id: existing.id, orgId: existing.orgId, createdBy: existing.createdBy, createdAt: existing.createdAt, active: existing.active, updatedBy, updatedAt: new Date().toISOString() };
    tx.set(ref, item, { merge: true }); return item;
  });
}

export async function listMeasurements(orgId: string, companyId?: string): Promise<HygieneMeasurementRecord[]> {
  let query = getAdminFirestore().collection(measurements).where("orgId", "==", orgId).where("active", "==", true);
  if (companyId) query = query.where("context.companyId", "==", companyId);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as HygieneMeasurementRecord));
}
export async function getMeasurementById(id: string, orgId: string): Promise<HygieneMeasurementRecord | undefined> {
  const doc = await getAdminFirestore().collection(measurements).doc(id).get();
  if (!doc.exists) return undefined;
  const item = { id: doc.id, ...doc.data() } as HygieneMeasurementRecord;
  return item.orgId === orgId ? item : undefined;
}
export async function createMeasurement(data: Omit<HygieneMeasurementRecord, "id" | "active" | "createdAt" | "updatedAt">): Promise<HygieneMeasurementRecord> {
  const now = new Date().toISOString();
  const item: HygieneMeasurementRecord = { ...data, id: newId("hms"), active: true, createdAt: now, updatedAt: now };
  await getAdminFirestore().collection(measurements).doc(item.id).set(item);
  return item;
}
export async function updateMeasurement(id: string, orgId: string, updatedBy: string, updates: Partial<Omit<HygieneMeasurementRecord, "id" | "orgId" | "context" | "createdBy" | "createdAt" | "updatedBy" | "updatedAt" | "active">>): Promise<HygieneMeasurementRecord | undefined> {
  const db = getAdminFirestore(); const ref = db.collection(measurements).doc(id);
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref); if (!doc.exists) return undefined;
    const existing = { id: doc.id, ...doc.data() } as HygieneMeasurementRecord; if (existing.orgId !== orgId) return undefined;
    const immutableStatuses: HygieneMeasurementStatus[] = ["validated", "closed"];
    if (immutableStatuses.includes(existing.status)) {
      const attemptedKeys = Object.keys(updates).filter((key) => key !== "status");
      if (attemptedKeys.length) throw new Error("MEASUREMENT_LOCKED");
    }
    const allowedTransitions: Record<HygieneMeasurementStatus, HygieneMeasurementStatus[]> = { draft: ["in_progress", "cancelled"], in_progress: ["draft", "pending_review", "cancelled"], pending_review: ["in_progress", "validated", "cancelled"], validated: ["closed"], closed: [], cancelled: ["draft", "archived"], archived: [] };
    if (updates.status && !allowedTransitions[existing.status].includes(updates.status)) throw new Error("INVALID_MEASUREMENT_STATUS_TRANSITION");
    const item = { ...existing, ...updates, id: existing.id, orgId: existing.orgId, context: existing.context, createdBy: existing.createdBy, createdAt: existing.createdAt, active: existing.active, updatedBy, updatedAt: new Date().toISOString() };
    tx.set(ref, item, { merge: true }); return item;
  });
}
