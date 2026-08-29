import { getAdminFirestore } from "../auth/firestoreAdmin";

export type HygieneMeasurementAuditEventType =
  | "created" | "updated" | "normative_snapshot_attached"
  | "submitted_for_review" | "review_approved" | "changes_requested"
  | "validated" | "closed" | "cancelled" | "archived";

export interface HygieneMeasurementAuditEvent {
  id: string;
  orgId: string;
  measurementId: string;
  type: HygieneMeasurementAuditEventType;
  actorId: string;
  occurredAt: string;
  fromStatus?: string;
  toStatus?: string;
  metadata?: Record<string, unknown>;
}

const collection = "hygieneMeasurementAuditEvents";
const newId = () => `hmae_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export async function recordMeasurementAuditEvent(
  input: Omit<HygieneMeasurementAuditEvent, "id" | "occurredAt"> & { occurredAt?: string },
): Promise<HygieneMeasurementAuditEvent> {
  const event: HygieneMeasurementAuditEvent = {
    ...input,
    id: newId(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
  await getAdminFirestore().collection(collection).doc(event.id).set(event);
  return event;
}

export async function listMeasurementAuditEvents(orgId: string, measurementId: string): Promise<HygieneMeasurementAuditEvent[]> {
  const snapshot = await getAdminFirestore()
    .collection(collection)
    .where("orgId", "==", orgId)
    .where("measurementId", "==", measurementId)
    .orderBy("occurredAt", "asc")
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as HygieneMeasurementAuditEvent));
}
