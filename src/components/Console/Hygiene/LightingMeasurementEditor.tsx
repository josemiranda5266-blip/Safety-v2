import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, Scale } from 'lucide-react';
import { HygieneMeasurement, LightingMeasurementData, LightingMeasurementPoint } from '../../../types/safety';
import { NormativeProtocolVersionRecord } from '../../../services/normativeCatalogService';
import { calculateLightingMeasurement } from '../../../services/lightingMeasurement';
import { hygieneService } from '../../../services/hygieneService';
import { evaluateLightingMeasurement } from '../../../services/lightingEvaluation';
import { MeasurementAuditTimeline } from './MeasurementAuditTimeline';
import { ProfessionalMeasurementReview } from './ProfessionalMeasurementReview';
import { GeneratedDocumentsPanel } from './GeneratedDocumentsPanel';

type Props = { measurement: HygieneMeasurement; onSaved: () => Promise<void> | void };

const emptyPoint = (): Omit<LightingMeasurementPoint, 'id'> => ({ name: '', pointType: 'work_surface', lux: 0 });

export const LightingMeasurementEditor: React.FC<Props> = ({ measurement, onSaved }) => {
  const existing = (measurement.rawData as { lighting?: LightingMeasurementData } | undefined)?.lighting;
  const [sourceType, setSourceType] = useState(existing?.sourceType || 'mixed');
  const [lightingSystem, setLightingSystem] = useState(existing?.lightingSystem || '');
  const [taskDescription, setTaskDescription] = useState(existing?.taskDescription || '');
  const [points, setPoints] = useState<Array<Omit<LightingMeasurementPoint, 'id'>>>(existing?.points.map(({ id, ...point }) => point) || [emptyPoint()]);
  const [saving, setSaving] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [associatingNormative, setAssociatingNormative] = useState(false);
  const [normativeVersions, setNormativeVersions] = useState<NormativeProtocolVersionRecord[]>([]);
  const [selectedNormativeVersionId, setSelectedNormativeVersionId] = useState(measurement.normativeEvaluationSnapshot?.normativeProtocolVersionId || '');
  const [selectedCriterionId, setSelectedCriterionId] = useState(measurement.normativeEvaluationSnapshot?.selectedCriterionId || '');
  const [loadingNormativeVersions, setLoadingNormativeVersions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadNormativeVersions = async () => {
      setLoadingNormativeVersions(true);
      try {
        const versions = await hygieneService.getLightingNormativeVersions();
        if (cancelled) return;
        setNormativeVersions(versions);
        if (!selectedNormativeVersionId && versions.length === 1) setSelectedNormativeVersionId(versions[0].id);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar las versiones normativas activas.');
      } finally {
        if (!cancelled) setLoadingNormativeVersions(false);
      }
    };
    void loadNormativeVersions();
    return () => { cancelled = true; };
  }, [measurement.id]);

  const selectedNormativeVersion = normativeVersions.find((item) => item.id === selectedNormativeVersionId);
  const selectedCriterion = selectedNormativeVersion?.criteria.find((criterion) => criterion.id === selectedCriterionId);
  const snapshotCriterion = measurement.normativeEvaluationSnapshot?.criteriaSnapshot.find((criterion) => criterion.id === measurement.normativeEvaluationSnapshot?.selectedCriterionId);

  const submissionRequirements = [
    { label: 'Empresa', complete: Boolean(measurement.context?.companyId) },
    { label: 'Establecimiento', complete: Boolean(measurement.context?.establishmentId) },
    { label: 'Instrumento asociado', complete: Boolean(measurement.instrumentIds?.length) },
    { label: 'Normativa asociada', complete: Boolean(measurement.normativeEvaluationSnapshot) },
    { label: 'Criterio normativo', complete: Boolean(measurement.normativeEvaluationSnapshot?.selectedCriterionId || measurement.normativeEvaluationSnapshot?.criteriaSnapshot.length === 0) },
    { label: 'Puntos de medición', complete: points.filter((point) => point.name.trim()).length > 0 },
  ];
  const canSubmit = measurement.status === 'in_progress' && submissionRequirements.every((item) => item.complete);

  const associateNormative = async () => {
    if (!selectedNormativeVersionId) { setError('Selecciona una versión normativa activa.'); return; }
    if (selectedNormativeVersion && selectedNormativeVersion.criteria.length > 0 && !selectedCriterionId) { setError('Selecciona el criterio normativo aplicable antes de congelar la normativa.'); return; }
    setAssociatingNormative(true); setError(null);
    try {
      await hygieneService.saveNormativeSnapshot(measurement.id, selectedNormativeVersionId, selectedCriterionId || undefined);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asociar la versión normativa de Iluminación.');
    } finally { setAssociatingNormative(false); }
  };

  const submitForReview = async () => {
    setSubmitting(true); setError(null);
    try {
      await hygieneService.submitForReview(measurement.id);
      await onSaved();
    } catch (err) {
      const responseError = err as any;
      const validationErrors = responseError?.validation?.errors;
      setError(Array.isArray(validationErrors) ? validationErrors.map((item: any) => item.message).join(' ') : (err instanceof Error ? err.message : 'No se pudo enviar la medición a revisión.'));
    } finally { setSubmitting(false); }
  };

  const preview = useMemo(() => {
    try {
      return calculateLightingMeasurement({ sourceType, lightingSystem, taskDescription, points: points.filter((point) => point.name.trim() && Number(point.lux) >= 0) });
    } catch { return null; }
  }, [sourceType, lightingSystem, taskDescription, points]);

  const updatePoint = (index: number, field: keyof Omit<LightingMeasurementPoint, 'id'>, value: string | number) => {
    setPoints((current) => current.map((point, i) => i === index ? { ...point, [field]: value } : point));
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const validPoints = points.filter((point) => point.name.trim());
      if (!validPoints.length) throw new Error('Agrega al menos un punto de medición identificado.');
      if (validPoints.some((point) => !Number.isFinite(Number(point.lux)) || Number(point.lux) < 0)) throw new Error('Todos los puntos deben tener un valor de lux válido.');
      const data = calculateLightingMeasurement({ sourceType, lightingSystem, taskDescription, points: validPoints });
      await hygieneService.saveLightingData(measurement.id, data);
      await onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar la medición.'); }
    finally { setSaving(false); }
  };

  if (measurement.status === 'pending_review') return <ProfessionalMeasurementReview measurement={measurement} onReviewed={onSaved} />;

  return <><div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900 p-5 space-y-5">
    <div><h3 className="font-extrabold text-slate-900 dark:text-white">Editor de Iluminación</h3><p className="text-sm text-slate-500 mt-1">Carga de datos técnicos y cálculo de indicadores descriptivos.</p></div>
    <div className="grid md:grid-cols-2 gap-4">
      <label className="text-sm font-medium">Tipo de iluminación<select value={sourceType} onChange={(e) => setSourceType(e.target.value as 'natural'|'artificial'|'mixed')} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"><option value="natural">Natural</option><option value="artificial">Artificial</option><option value="mixed">Mixta</option></select></label>
      <label className="text-sm font-medium">Sistema de iluminación<input value={lightingSystem} onChange={(e) => setLightingSystem(e.target.value)} placeholder="Ej. LED industrial" className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"/></label>
      <label className="text-sm font-medium md:col-span-2">Descripción de tarea<textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"/></label>
    </div>
    <div><div className="flex items-center justify-between mb-3"><h4 className="font-bold">Puntos de medición</h4><button type="button" onClick={() => setPoints((current) => [...current, emptyPoint()])} className="flex items-center gap-1 text-sm font-bold text-indigo-600"><Plus className="w-4 h-4"/> Agregar punto</button></div>
      <div className="space-y-3">{points.map((point, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
        <input value={point.name} onChange={(e) => updatePoint(index, 'name', e.target.value)} placeholder="Nombre / ubicación" className="rounded-lg border p-2 bg-transparent"/>
        <select value={point.pointType} onChange={(e) => updatePoint(index, 'pointType', e.target.value)} className="rounded-lg border p-2 bg-transparent"><option value="general">General</option><option value="work_surface">Superficie de trabajo</option><option value="task_area">Área de tarea</option><option value="other">Otro</option></select>
        <input type="number" min="0" step="0.01" value={point.lux} onChange={(e) => updatePoint(index, 'lux', Number(e.target.value))} placeholder="Lux" className="rounded-lg border p-2 bg-transparent"/>
        <input value={point.locationDescription || ''} onChange={(e) => updatePoint(index, 'locationDescription', e.target.value)} placeholder="Detalle ubicación" className="rounded-lg border p-2 bg-transparent"/>
        <button type="button" disabled={points.length === 1} onClick={() => setPoints((current) => current.filter((_, i) => i !== index))} className="flex items-center justify-center rounded-lg border text-red-600 disabled:opacity-30"><Trash2 className="w-4 h-4"/></button>
      </div>)}</div>
    </div>
    {preview && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Promedio', preview.averageLux],['Mínimo', preview.minimumLux],['Máximo', preview.maximumLux],['Relación mín/máx', preview.uniformityRatio]].map(([label,value]) => <div key={String(label)} className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 p-3"><div className="text-xs text-slate-500">{label}</div><div className="font-extrabold text-lg">{value}</div></div>)}</div>}
    <div className="text-xs text-slate-500 rounded-lg bg-slate-50 dark:bg-slate-800 p-3">Los indicadores mostrados son cálculos descriptivos. Esta pantalla no emite por sí misma una declaración automática de cumplimiento normativo.</div>
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 p-4 space-y-3">
      <div><h4 className="font-extrabold">Criterio normativo</h4><p className="text-sm text-slate-500">La versión y el criterio se consultan desde el catálogo normativo activo del servidor y se congelan en la medición.</p></div>
      {measurement.normativeEvaluationSnapshot ? <>
        <div className="grid sm:grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">Referencia: <strong>{measurement.normativeEvaluationSnapshot.reference} · v{measurement.normativeEvaluationSnapshot.version}</strong></div><div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">Criterio congelado: <strong>{snapshotCriterion?.code || measurement.normativeEvaluationSnapshot.selectedCriterionId || 'No especificado'}</strong></div></div>
        {snapshotCriterion && <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 p-3 text-sm"><div className="font-bold">{snapshotCriterion.title}</div>{snapshotCriterion.applicability && <div className="text-slate-600 dark:text-slate-300 mt-1">Aplicabilidad: {snapshotCriterion.applicability}</div>}{typeof snapshotCriterion.parameters.requiredLux === 'number' && <div className="mt-1">Valor requerido: <strong>{snapshotCriterion.parameters.requiredLux} lux</strong></div>}</div>}
      </> : <>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm font-medium">Versión normativa<select value={selectedNormativeVersionId} onChange={(e) => { setSelectedNormativeVersionId(e.target.value); setSelectedCriterionId(''); }} disabled={loadingNormativeVersions} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"><option value="">{loadingNormativeVersions ? 'Cargando versiones...' : normativeVersions.length ? 'Seleccionar versión...' : 'No hay versiones activas'}</option>{normativeVersions.map((version) => <option key={version.id} value={version.id}>{version.reference} · v{version.version}</option>)}</select></label>
          <label className="text-sm font-medium">Criterio específico<select value={selectedCriterionId} onChange={(e) => setSelectedCriterionId(e.target.value)} disabled={!selectedNormativeVersion || selectedNormativeVersion.criteria.length === 0} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"><option value="">Seleccionar criterio...</option>{selectedNormativeVersion?.criteria.map((criterion) => <option key={criterion.id} value={criterion.id}>{criterion.code} — {criterion.title}</option>)}</select></label>
        </div>
        {selectedCriterion && <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm"><div className="font-bold">{selectedCriterion.title}</div>{selectedCriterion.applicability && <div className="text-slate-600 dark:text-slate-300 mt-1">Aplicabilidad: {selectedCriterion.applicability}</div>}{typeof selectedCriterion.parameters.requiredLux === 'number' && <div className="mt-1">Valor requerido: <strong>{selectedCriterion.parameters.requiredLux} lux</strong></div>}</div>}
        <button type="button" disabled={associatingNormative || loadingNormativeVersions || !selectedNormativeVersionId || Boolean(selectedNormativeVersion?.criteria.length && !selectedCriterionId)} onClick={associateNormative} className="flex items-center gap-2 bg-slate-900 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50"><Scale className="w-4 h-4"/>{associatingNormative ? 'Congelando...' : 'Asociar y congelar criterio'}</button>
      </>}
      {measurement.normativeEvaluationSnapshot && <div className="text-xs text-slate-500">Evaluado: {new Date(measurement.normativeEvaluationSnapshot.evaluatedAt).toLocaleString()} · Criterios congelados: {measurement.normativeEvaluationSnapshot.criteriaSnapshot.length}</div>}
    </div>
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-extrabold">Estado documental</h4><p className="text-sm text-slate-500">Estado actual: <span className="font-bold">{measurement.status}</span></p></div></div>
      {measurement.status === 'in_progress' && <><div className="grid sm:grid-cols-2 gap-2">{submissionRequirements.map((item) => <div key={item.label} className="text-sm rounded-lg bg-slate-50 dark:bg-slate-800 p-2">{item.complete ? '✓' : '⚠'} {item.label}</div>)}</div><button type="button" disabled={submitting || !canSubmit} onClick={submitForReview} className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50">{submitting ? 'Enviando...' : 'Enviar a revisión'}</button>{!canSubmit && <p className="text-xs text-amber-700">Complete los requisitos pendientes antes de enviar la medición.</p>}</>}
      {measurement.status === 'pending_review' && <p className="text-sm text-amber-700">La medición fue enviada y está pendiente de revisión profesional.</p>}
      {measurement.status === 'validated' && <p className="text-sm text-emerald-700">La medición fue validada. Los cambios posteriores deben seguir el flujo documental correspondiente.</p>}
    </div>
    <details className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4"><summary className="cursor-pointer font-bold">Historial documental</summary><div className="mt-4"><MeasurementAuditTimeline measurementId={measurement.id} /></div></details>

    {showEvaluation && preview && measurement.normativeEvaluationSnapshot && (() => {
      const evaluation = evaluateLightingMeasurement(preview, measurement.normativeEvaluationSnapshot);
      return <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 p-4 space-y-3">
        <div><h4 className="font-extrabold">Evaluación asistida</h4><p className="text-xs text-slate-500">{evaluation.normativeReference} · versión {evaluation.normativeVersion}</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">{[['Promedio', evaluation.summary.averageLux],['Mínimo', evaluation.summary.minimumLux],['Máximo', evaluation.summary.maximumLux],['Puntos', evaluation.summary.pointsMeasured]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2"><div className="text-xs text-slate-500">{label}</div><div className="font-bold">{value}</div></div>)}</div>
        <div className="space-y-2">{evaluation.criteria.map((criterion) => <div key={criterion.criterionId} className="text-sm rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><div className="font-bold">{criterion.code} — {criterion.title}</div>{criterion.observations.map((item, i) => <div key={i} className="text-slate-600 dark:text-slate-300 mt-1">• {item}</div>)}</div>)}</div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">Resultado: requiere revisión profesional. La aplicación no emite una declaración automática de cumplimiento.</div>
      </div>;
    })()}
    {showEvaluation && !measurement.normativeEvaluationSnapshot && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Para realizar la evaluación asistida primero debe asociarse una versión normativa a esta medición.</div>}
    {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowEvaluation((current) => !current)} className="border border-indigo-200 text-indigo-700 font-bold px-4 py-2 rounded-xl">Evaluación asistida</button><button type="button" disabled={saving} onClick={save} className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-60"><Save className="w-4 h-4"/>{saving ? 'Guardando...' : 'Guardar datos de iluminación'}</button></div>
  </div>{measurement.status === 'validated' && <GeneratedDocumentsPanel measurement={measurement} onGenerated={onSaved}/>}</>;
};
