import React, { useEffect, useState } from 'react';
import { hygieneService } from '../../../services/hygieneService';
import { CreateHygieneInstrumentInput, HygieneInstrument, HygieneInstrumentCategory } from '../../../types/safety';
import { Ruler, AlertTriangle, FileText, Calendar, Plus, Wrench, CircleCheck, X } from 'lucide-react';
import { useTenant } from '../../../context/TenantContext';

const categories: { value: HygieneInstrumentCategory; label: string }[] = [
  { value: 'lighting', label: 'Iluminación' }, { value: 'noise', label: 'Ruido' },
  { value: 'grounding', label: 'Puesta a tierra' }, { value: 'thermal_stress', label: 'Estrés térmico' },
  { value: 'vibration', label: 'Vibraciones' }, { value: 'chemical', label: 'Contaminantes químicos' },
  { value: 'gas', label: 'Gases' }, { value: 'air_velocity', label: 'Velocidad de aire' },
  { value: 'electrical', label: 'Eléctrico' }, { value: 'distance', label: 'Distancia' }, { value: 'other', label: 'Otro' },
];

const emptyForm = (): CreateHygieneInstrumentInput => ({
  category: 'other', instrumentType: '', brand: '', model: '', serialNumber: '',
  status: 'active', calibrationDate: '', calibrationExpiry: '', certificateUrl: '', notes: '',
});

const statusLabel: Record<string, string> = {
  active: 'Activo', maintenance: 'Mantenimiento', calibration_due: 'Calibración pendiente',
  out_of_service: 'Fuera de servicio', retired: 'Retirado',
};

export const InstrumentScreen: React.FC = () => {
  const { activeOrgId } = useTenant();
  const [instruments, setInstruments] = useState<HygieneInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateHygieneInstrumentInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void loadData(); }, [activeOrgId]);

  const loadData = async () => {
    setLoading(true);
    try { setInstruments(await hygieneService.getInstruments()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openForm = () => {
    setForm(emptyForm());
    setError(null);
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.instrumentType.trim() || !form.brand.trim() || !form.model.trim() || !form.serialNumber.trim()) {
      setError('Completa tipo de instrumento, marca, modelo y número de serie.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const clean: CreateHygieneInstrumentInput = {
        ...form,
        instrumentType: form.instrumentType.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        serialNumber: form.serialNumber.trim(),
        calibrationDate: form.calibrationDate || undefined,
        calibrationExpiry: form.calibrationExpiry || undefined,
        certificateUrl: form.certificateUrl?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };
      await hygieneService.addInstrument(clean);
      await loadData();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el instrumento.');
    } finally { setSaving(false); }
  };

  const isCalibrationExpired = (instrument: HygieneInstrument) =>
    Boolean(instrument.calibrationExpiry && new Date(instrument.calibrationExpiry) < new Date());

  const setField = <K extends keyof CreateHygieneInstrumentInput>(key: K, value: CreateHygieneInstrumentInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Ruler className="w-6 h-6 text-indigo-500" /><span>Equipos e Instrumentos</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Inventario, trazabilidad, disponibilidad y control de calibración.</p>
        </div>
        <button onClick={openForm} className="flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded-xl text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo Equipo
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div><h3 className="font-extrabold text-slate-900 dark:text-white">Registrar instrumento</h3><p className="text-sm text-slate-500 mt-1">El instrumento quedará asociado a la organización autorizada del usuario.</p></div>
            <button type="button" onClick={() => setShowForm(false)} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-medium">Categoría<select value={form.category} onChange={(e) => setField('category', e.target.value as HygieneInstrumentCategory)} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent">{categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
            <label className="text-sm font-medium">Tipo de instrumento<input value={form.instrumentType} onChange={(e) => setField('instrumentType', e.target.value)} placeholder="Ej. Luxómetro" className="mt-1 w-full rounded-xl border p-2.5 bg-transparent" /></label>
            <label className="text-sm font-medium">Marca<input value={form.brand} onChange={(e) => setField('brand', e.target.value)} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent" /></label>
            <label className="text-sm font-medium">Modelo<input value={form.model} onChange={(e) => setField('model', e.target.value)} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent" /></label>
            <label className="text-sm font-medium">Número de serie<input value={form.serialNumber} onChange={(e) => setField('serialNumber', e.target.value)} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent" /></label>
            <label className="text-sm font-medium">Estado<select value={form.status || 'active'} onChange={(e) => setField('status', e.target.value as CreateHygieneInstrumentInput['status'])} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"><option value="active">Activo</option><option value="maintenance">Mantenimiento</option><option value="calibration_due">Calibración pendiente</option><option value="out_of_service">Fuera de servicio</option><option value="retired">Retirado</option></select></label>
            <label className="text-sm font-medium">Fecha de calibración<input type="date" value={form.calibrationDate || ''} onChange={(e) => setField('calibrationDate', e.target.value)} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent" /></label>
            <label className="text-sm font-medium">Vencimiento de calibración<input type="date" value={form.calibrationExpiry || ''} onChange={(e) => setField('calibrationExpiry', e.target.value)} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent" /></label>
            <label className="text-sm font-medium md:col-span-2">URL del certificado (opcional)<input type="url" value={form.certificateUrl || ''} onChange={(e) => setField('certificateUrl', e.target.value)} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent" /></label>
            <label className="text-sm font-medium md:col-span-2">Observaciones<textarea value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} rows={3} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent" /></label>
            {error && <div className="md:col-span-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
            <div className="md:col-span-2 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} disabled={saving} className="px-4 py-2 rounded-xl border font-bold">Cancelar</button><button disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60">{saving ? 'Guardando...' : 'Registrar instrumento'}</button></div>
          </form>
        </div>
      )}

      {loading ? <div className="text-center p-8 text-slate-500">Cargando instrumentos...</div>
      : instruments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <Ruler className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" /><h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Sin Instrumentos</h3><p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">No hay instrumentos registrados en la organización actual.</p>
        </div>
      ) : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{instruments.map((i) => {
        const calibrationExpired = isCalibrationExpired(i);
        const unavailable = !i.active || ['maintenance', 'calibration_due', 'out_of_service', 'retired'].includes(i.status);
        return <div key={i.id} className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm ${calibrationExpired || unavailable ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className="flex justify-between items-start mb-3"><div><h3 className="font-bold text-slate-900 dark:text-white text-base">{i.brand} {i.model}</h3><p className="text-xs text-slate-500 mt-1">{i.category} · {i.instrumentType}</p><p className="text-xs text-slate-500 font-mono mt-1">S/N: {i.serialNumber}</p></div>{unavailable || calibrationExpired ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <CircleCheck className="w-5 h-5 text-emerald-500" />}</div>
          <div className="text-xs mb-4"><span className="inline-flex px-2 py-1 rounded font-bold bg-slate-100 dark:bg-slate-800">{statusLabel[i.status] || i.status}</span></div>
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800"><div className="flex items-center justify-between text-xs"><span className="text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Última calib.</span><span className="font-medium">{i.calibrationDate ? new Date(i.calibrationDate).toLocaleDateString() : 'Sin registro'}</span></div><div className="flex items-center justify-between text-xs"><span className="text-slate-500 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5"/> Vencimiento</span><span className={calibrationExpired ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>{i.calibrationExpiry ? new Date(i.calibrationExpiry).toLocaleDateString() : 'No informado'}</span></div></div>
          <div className="mt-4 flex">{i.certificateUrl ? <a href={i.certificateUrl} target="_blank" rel="noreferrer" className="w-full py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"><FileText className="w-4 h-4"/> Certificado</a> : <span className="w-full py-2 text-center text-slate-400 text-xs italic">Sin certificado adjunto</span>}</div>
        </div>;
      })}</div>}
    </div>
  );
};