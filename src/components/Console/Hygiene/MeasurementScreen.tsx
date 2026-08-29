import React, { useEffect, useMemo, useState } from 'react';
import { hygieneService } from '../../../services/hygieneService';
import { CreateHygieneMeasurementInput, HygieneInstrument, HygieneMeasurement, HygieneMeasurementContext } from '../../../types/safety';
import { useTenant } from '../../../context/TenantContext';
import { Microscope, Activity, Calendar, CheckCircle, Clock, CircleX, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';

const protocols = [
  { value: 'lighting', label: 'Iluminación' },
  { value: 'noise', label: 'Ruido' },
  { value: 'grounding', label: 'Puesta a tierra' },
  { value: 'thermal_stress', label: 'Estrés térmico' },
  { value: 'vibration', label: 'Vibraciones' },
  { value: 'chemical', label: 'Contaminantes químicos' },
];

const statusLabel: Record<string, string> = { draft:'Borrador', in_progress:'En curso', pending_review:'Pendiente de revisión', validated:'Validada', closed:'Cerrada', cancelled:'Cancelada', archived:'Archivada' };
const statusIcon = (status: string) => status === 'validated' || status === 'closed' ? <CheckCircle className="w-3.5 h-3.5" /> : status === 'cancelled' ? <CircleX className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />;

const today = () => new Date().toISOString().slice(0, 10);

export const MeasurementScreen: React.FC = () => {
  const { activeCompany, establishments, sectors, positions, employees } = useTenant();
  const [measurements, setMeasurements] = useState<HygieneMeasurement[]>([]);
  const [instruments, setInstruments] = useState<HygieneInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<HygieneMeasurementContext>({ companyId: '', establishmentId: '' });
  const [protocolType, setProtocolType] = useState('');
  const [measurementDate, setMeasurementDate] = useState(today());
  const [instrumentIds, setInstrumentIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => { void loadData(); }, [activeCompany?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [measurementData, instrumentData] = await Promise.all([
        hygieneService.getMeasurements(activeCompany?.id),
        hygieneService.getInstruments(),
      ]);
      setMeasurements(measurementData);
      setInstruments(instrumentData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const resetWizard = () => {
    setStep(1); setError(null); setProtocolType(''); setMeasurementDate(today()); setInstrumentIds([]); setNotes('');
    setContext({ companyId: activeCompany?.id || '', establishmentId: '' });
  };

  const openWizard = () => {
    if (!activeCompany) { setError('Selecciona una empresa antes de crear una medición.'); return; }
    resetWizard(); setShowWizard(true);
  };

  const availableEstablishments = useMemo(() => establishments.filter((item) => item.companyId === context.companyId), [establishments, context.companyId]);
  const availableSectors = useMemo(() => sectors.filter((item) => !context.establishmentId || item.establishmentId === context.establishmentId), [sectors, context.establishmentId]);
  const availablePositions = useMemo(() => positions.filter((item) => !context.establishmentId || item.establishmentId === context.establishmentId), [positions, context.establishmentId]);
  const availableEmployees = useMemo(() => employees.filter((item) => !context.establishmentId || item.establishmentId === context.establishmentId), [employees, context.establishmentId]);

  const toggleInstrument = (id: string) => setInstrumentIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  const validateStep = () => {
    if (step === 1 && (!context.companyId || !context.establishmentId)) return 'Selecciona empresa y establecimiento.';
    if (step === 2 && (!protocolType || !measurementDate)) return 'Selecciona protocolo y fecha.';
    if (step === 3 && instrumentIds.length === 0) return 'Selecciona al menos un instrumento.';
    return null;
  };

  const next = () => { const validation = validateStep(); if (validation) { setError(validation); return; } setError(null); setStep((value) => Math.min(4, value + 1)); };
  const previous = () => { setError(null); setStep((value) => Math.max(1, value - 1)); };

  const submit = async () => {
    const validation = validateStep(); if (validation) { setError(validation); return; }
    setSaving(true); setError(null);
    try {
      const payload: CreateHygieneMeasurementInput = { context, protocolType, measurementDate, instrumentIds, notes: notes.trim() || undefined };
      await hygieneService.addMeasurement(payload);
      await loadData();
      setShowWizard(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la medición.'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Mediciones y Protocolos</h2><p className="text-sm text-slate-500 mt-1">Gestión jerárquica y trazable de mediciones de higiene.</p></div>
      <button onClick={openWizard} className="flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded-xl text-white font-bold"><Plus className="w-4 h-4"/> Nueva medición</button>
    </div>

    {!activeCompany && <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm">Selecciona una empresa para consultar o crear mediciones.</div>}
    {error && !showWizard && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

    {showWizard && <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6"><div><h3 className="font-extrabold text-slate-900 dark:text-white">Nueva medición</h3><p className="text-sm text-slate-500">Paso {step} de 4</p></div><button onClick={() => setShowWizard(false)} className="p-2"><X className="w-5 h-5"/></button></div>
      <div className="grid grid-cols-4 gap-2 mb-6">{[1,2,3,4].map((value) => <div key={value} className={`h-1.5 rounded ${value <= step ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}/>)}</div>

      {step === 1 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm font-medium">Empresa<input value={activeCompany?.name || context.companyId} disabled className="mt-1 w-full rounded-xl border p-2.5 bg-slate-50 dark:bg-slate-800"/></label>
        <label className="text-sm font-medium">Establecimiento<select value={context.establishmentId} onChange={(e) => setContext((current) => ({ ...current, establishmentId: e.target.value, sectorId: undefined, positionId: undefined, employeeId: undefined }))} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"><option value="">Seleccionar...</option>{availableEstablishments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-medium">Sector (opcional)<select value={context.sectorId || ''} onChange={(e) => setContext((current) => ({ ...current, sectorId: e.target.value || undefined }))} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"><option value="">No especificar</option>{availableSectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-medium">Puesto (opcional)<select value={context.positionId || ''} onChange={(e) => setContext((current) => ({ ...current, positionId: e.target.value || undefined }))} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"><option value="">No especificar</option>{availablePositions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-sm font-medium md:col-span-2">Trabajador (opcional)<select value={context.employeeId || ''} onChange={(e) => setContext((current) => ({ ...current, employeeId: e.target.value || undefined }))} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"><option value="">No especificar</option>{availableEmployees.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select></label>
      </div>}

      {step === 2 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm font-medium">Protocolo<select value={protocolType} onChange={(e) => setProtocolType(e.target.value)} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"><option value="">Seleccionar...</option>{protocols.map((protocol) => <option key={protocol.value} value={protocol.value}>{protocol.label}</option>)}</select></label>
        <label className="text-sm font-medium">Fecha de medición<input type="date" value={measurementDate} onChange={(e) => setMeasurementDate(e.target.value)} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"/></label>
      </div>}

      {step === 3 && <div><p className="text-sm text-slate-500 mb-3">Selecciona los instrumentos utilizados. Solo deben asociarse equipos disponibles y con calibración vigente.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{instruments.filter((item) => item.active && item.status === 'active').map((item) => { const checked = instrumentIds.includes(item.id); return <button type="button" key={item.id} onClick={() => toggleInstrument(item.id)} className={`text-left border rounded-xl p-4 ${checked ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800'}`}><div className="font-bold">{item.brand} {item.model}</div><div className="text-xs text-slate-500 mt-1">{item.category} · {item.instrumentType}</div><div className="text-xs font-mono mt-1">S/N: {item.serialNumber}</div></button>; })}</div></div>}

      {step === 4 && <div className="space-y-4"><div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-sm space-y-2"><div><strong>Empresa:</strong> {activeCompany?.name}</div><div><strong>Establecimiento:</strong> {availableEstablishments.find((item) => item.id === context.establishmentId)?.name || context.establishmentId}</div><div><strong>Protocolo:</strong> {protocols.find((item) => item.value === protocolType)?.label}</div><div><strong>Fecha:</strong> {measurementDate}</div><div><strong>Instrumentos:</strong> {instrumentIds.length}</div></div><label className="text-sm font-medium block">Observaciones iniciales<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border p-2.5 bg-transparent"/></label><p className="text-xs text-slate-500">La creación genera la entidad base. Los datos técnicos específicos del protocolo se incorporarán en el editor del protocolo correspondiente.</p></div>}

      {error && <div className="mt-5 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
      <div className="mt-6 flex justify-between"><button type="button" onClick={previous} disabled={step === 1 || saving} className="flex items-center gap-1 px-4 py-2 rounded-xl border font-bold disabled:opacity-40"><ChevronLeft className="w-4 h-4"/> Atrás</button>{step < 4 ? <button type="button" onClick={next} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold">Continuar <ChevronRight className="w-4 h-4"/></button> : <button type="button" disabled={saving} onClick={submit} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60">{saving ? 'Creando...' : 'Crear medición'}</button>}</div>
    </div>}

    {loading ? <div className="text-center p-8 text-slate-500">Cargando mediciones...</div> : measurements.length === 0 ? <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm"><Microscope className="w-12 h-12 text-slate-300 mx-auto mb-4"/><h3 className="font-bold text-lg mb-2">Sin Mediciones Registradas</h3><p className="text-slate-500 text-sm">{activeCompany ? 'Crea la primera medición para esta empresa.' : 'Selecciona una empresa.'}</p></div> : <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"><table className="w-full text-left text-sm"><thead><tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px]"><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Protocolo</th><th className="px-4 py-3">Contexto</th><th className="px-4 py-3">Instrumentos</th><th className="px-4 py-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{measurements.map((m) => <tr key={m.id}><td className="px-4 py-3 text-xs"><div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400"/>{new Date(m.measurementDate).toLocaleDateString()}</div></td><td className="px-4 py-3"><div className="font-bold flex items-center gap-1.5"><Activity className="w-4 h-4 text-indigo-500"/>{m.protocolType}</div></td><td className="px-4 py-3 text-xs text-slate-500"><div>Empresa: {m.context.companyId}</div><div>Establecimiento: {m.context.establishmentId}</div></td><td className="px-4 py-3 text-xs">{m.instrumentIds.length} asociado(s)</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs font-bold">{statusIcon(m.status)} {statusLabel[m.status] || m.status}</span></td></tr>)}</tbody></table></div>}
  </div>;
};