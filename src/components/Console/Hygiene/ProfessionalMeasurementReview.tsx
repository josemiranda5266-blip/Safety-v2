import { useMemo, useState } from 'react';
import { HygieneMeasurement, LightingMeasurementData } from '../../../types/safety';
import { calculateLightingMeasurement } from '../../../services/lightingMeasurement';
import { evaluateLightingMeasurement } from '../../../services/lightingEvaluation';
import { hygieneService } from '../../../services/hygieneService';
import { MeasurementAuditTimeline } from './MeasurementAuditTimeline';

type Props = { measurement: HygieneMeasurement; onReviewed: () => Promise<void> | void };

export function ProfessionalMeasurementReview({ measurement, onReviewed }: Props) {
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lighting = (measurement.rawData as { lighting?: LightingMeasurementData } | undefined)?.lighting;

  const preview = useMemo(() => {
    if (!lighting) return null;
    try { return calculateLightingMeasurement({ sourceType: lighting.sourceType, lightingSystem: lighting.lightingSystem, taskDescription: lighting.taskDescription, points: lighting.points.map(({ id, ...point }) => point) }); }
    catch { return null; }
  }, [lighting]);

  const evaluation = preview && measurement.normativeEvaluationSnapshot && measurement.protocolType === 'lighting'
    ? evaluateLightingMeasurement(preview, measurement.normativeEvaluationSnapshot) : null;

  const decide = async (decision: 'approved' | 'changes_requested') => {
    setSaving(true); setError(null);
    try {
      if (decision === 'changes_requested' && !comments.trim()) throw new Error('Debe explicar los cambios solicitados.');
      await hygieneService.reviewMeasurement(measurement.id, decision, comments.trim() || undefined);
      await onReviewed();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible registrar la revisión.'); }
    finally { setSaving(false); }
  };

  if (measurement.status !== 'pending_review') return null;

  return <section className="mt-4 rounded-2xl border border-violet-200 dark:border-violet-900 bg-white dark:bg-slate-900 p-5 space-y-5">
    <div><h3 className="font-extrabold">Revisión profesional</h3><p className="text-sm text-slate-500">Revise el contexto técnico y documental antes de tomar una decisión.</p></div>
    <div className="grid sm:grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><b>Empresa:</b> {measurement.context.companyId}</div>
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><b>Establecimiento:</b> {measurement.context.establishmentId}</div>
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><b>Protocolo:</b> {measurement.protocolType}</div>
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><b>Fecha:</b> {measurement.measurementDate}</div>
    </div>
    <div className="text-sm rounded-xl border p-3"><b>Instrumentos asociados:</b> {measurement.instrumentIds?.length || 0}</div>
    {evaluation && <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 p-4 space-y-2"><div className="font-bold">Evaluación asistida</div><div className="text-xs text-slate-500">{evaluation.normativeReference} · versión {evaluation.normativeVersion}</div>{evaluation.criteria.map((criterion) => <div key={criterion.criterionId} className="text-sm"><b>{criterion.code} — {criterion.title}</b>{criterion.observations.map((observation, index) => <div key={index} className="text-slate-600 dark:text-slate-300">• {observation}</div>)}</div>)}</div>}
    {measurement.normativeEvaluationSnapshot && <div className="text-sm rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><b>Snapshot normativo:</b> {measurement.normativeEvaluationSnapshot.reference} · versión {measurement.normativeEvaluationSnapshot.version}</div>}
    <div><label className="text-sm font-bold">Comentarios de revisión<textarea value={comments} onChange={(event) => setComments(event.target.value)} rows={4} placeholder="Observaciones, fundamento técnico o cambios requeridos…" className="mt-1 w-full rounded-xl border p-3 bg-transparent"/></label></div>
    {error && <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"><h4 className="font-bold mb-3">Historial documental</h4><MeasurementAuditTimeline measurementId={measurement.id}/></div>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => decide('changes_requested')} className="border border-amber-300 text-amber-800 px-4 py-2 rounded-xl font-bold disabled:opacity-50">Solicitar cambios</button><button type="button" disabled={saving} onClick={() => decide('approved')} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50">{saving ? 'Registrando...' : 'Aprobar revisión'}</button></div>
    <p className="text-xs text-slate-500">La decisión queda registrada en el historial documental. Esta interfaz asiste el proceso y no reemplaza las responsabilidades profesionales ni la firma que corresponda.</p>
  </section>;
}
