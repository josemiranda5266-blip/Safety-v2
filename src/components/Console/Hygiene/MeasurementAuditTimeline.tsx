import { useEffect, useState } from "react";
import { auditEventLabel, HygieneMeasurementAuditEvent, listMeasurementAuditEvents } from "../../../services/hygieneAuditService";

interface Props { measurementId: string; }

export function MeasurementAuditTimeline({ measurementId }: Props) {
  const [events, setEvents] = useState<HygieneMeasurementAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listMeasurementAuditEvents(measurementId)
      .then((items) => { if (active) setEvents(items); })
      .catch(() => { if (active) setError("No fue posible cargar el historial de la medición."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [measurementId]);

  if (loading) return <div className="text-sm text-slate-500">Cargando historial…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!events.length) return <div className="text-sm text-slate-500">Todavía no hay eventos registrados.</div>;

  return <div className="space-y-4">
    {events.map((event) => (
      <div key={event.id} className="relative border-l-2 border-slate-200 dark:border-slate-700 pl-4 pb-1">
        <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-indigo-500" />
        <div className="font-bold text-sm">{auditEventLabel(event.type)}</div>
        <div className="text-xs text-slate-500">{new Date(event.occurredAt).toLocaleString()}</div>
        {event.fromStatus && event.toStatus && <div className="text-xs mt-1 text-slate-600 dark:text-slate-300">{event.fromStatus} → {event.toStatus}</div>}
        {event.metadata?.comments ? <div className="text-sm mt-2">{String(event.metadata.comments)}</div> : null}
      </div>
    ))}
  </div>;
}
