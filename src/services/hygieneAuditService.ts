import { ensureAuth } from "./firebase";

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

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function listMeasurementAuditEvents(measurementId: string): Promise<HygieneMeasurementAuditEvent[]> {
  const user = await ensureAuth();
  const token = await user.getIdToken();
  const orgId = typeof localStorage !== "undefined" ? localStorage.getItem("safetyia_active_org_id") : null;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(orgId ? { "x-org-id": orgId, "X-Organization-Id": orgId } : {}),
  };

  const response = await fetch(`${API_BASE}/api/v2/hygiene/measurements/${encodeURIComponent(measurementId)}/audit-events`, {
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to fetch measurement audit events");
  }

  const data = await response.json();
  return data.events ?? [];
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
