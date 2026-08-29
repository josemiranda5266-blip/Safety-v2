import { api } from "./api";

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

export async function listMeasurementAuditEvents(measurementId: string): Promise<HygieneMeasurementAuditEvent[]> {
  const response = await api.get(`/api/v2/hygiene/measurements/${measurementId}/audit-events`);
  return response.data.events ?? [];
}

export function auditEventLabel(type: HygieneMeasurementAuditEventType): string {
  const labels: Record<HygieneMeasurementAuditEventType, string> = {
    created: "Medición creada",
    updated: "Datos actualizados",
    normative_snapshot_attached: "Normativa asociada",
    submitted_for_review: "Enviada a revisión",
    review_approved: "Revisión profesional aprobada",
    changes_requested: "Cambios solicitados",
    validated: "Medición validada",
    closed: "Medición cerrada",
    cancelled: "Medición cancelada",
    archived: "Medición archivada",
  };
  return labels[type];
}
