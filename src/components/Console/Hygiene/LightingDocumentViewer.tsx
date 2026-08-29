import { useEffect, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { hygieneService } from '../../../services/hygieneService';
import type { HygieneDocumentRepresentation } from '../../../types/hygieneDocument';

type Instrument = {
  id?: string;
  instrumentType?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  calibrationDate?: string | null;
  calibrationExpiry?: string | null;
  status?: string;
};

const labels: Record<string, string> = {
  measurementId: 'Identificador de medición', protocolType: 'Protocolo', measurementDate: 'Fecha de medición', companyId: 'Empresa', establishmentId: 'Establecimiento', sectorId: 'Sector', positionId: 'Puesto', employeeId: 'Trabajador',
  sourceType: 'Tipo de iluminación', lightingSystem: 'Sistema de iluminación', taskDescription: 'Descripción de tarea', averageLux: 'Iluminancia promedio (lux)', minimumLux: 'Iluminancia mínima (lux)', maximumLux: 'Iluminancia máxima (lux)', uniformityRatio: 'Relación mín/máx', calculationVersion: 'Versión del cálculo', calculatedAt: 'Calculado el', generatedAt: 'Fecha de generación', generatedBy: 'Generado por', templateKey: 'Plantilla', templateVersion: 'Versión de plantilla'
};
function labelFor(key: string) { return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()); }
function formatValue(value: unknown): string { if (value === null || value === undefined || value === '') return '—'; if (typeof value === 'object') return JSON.stringify(value, null, 2); return String(value); }

export function LightingDocumentViewer({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [representation, setRepresentation] = useState<HygieneDocumentRepresentation | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { void (async () => { try { setRepresentation(await hygieneService.getDocumentRepresentation(documentId)); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar el documento.'); } })(); }, [documentId]);
  return <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 overflow-y-auto"><div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl min-h-full">
    <div className="sticky top-0 flex items-center justify-between border-b p-4 bg-white dark:bg-slate-900 z-10"><div className="flex items-center gap-2"><FileText className="w-5 h-5"/><div><h2 className="font-extrabold">Protocolo de Iluminación</h2><p className="text-xs text-slate-500">Plantilla v{representation?.templateVersion ?? '…'}</p></div></div><button type="button" onClick={onClose} className="p-2 rounded-lg border" aria-label="Cerrar documento"><X className="w-4 h-4"/></button></div>
    <div className="p-6 space-y-6">{!representation && !error && <div className="text-sm text-slate-500">Preparando representación documental…</div>}{error && <div className="rounded-xl bg-red-50 text-red-700 p-4 text-sm">{error}</div>}
      {representation && <><div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 p-4 text-sm"><div className="font-bold">Documento {representation.documentId}</div><div className="text-slate-500 mt-1">Generado: {new Date(representation.generatedAt).toLocaleString()}</div></div>
        {representation.sections.map((section) => { const points = section.key === 'measurement_points' && Array.isArray(section.data.points) ? section.data.points as Array<Record<string, unknown>> : null; const instruments = section.key === 'instruments' && Array.isArray(section.data.instruments) ? section.data.instruments as Instrument[] : null; return <section key={section.key} className="border rounded-2xl p-5"><h3 className="font-extrabold mb-4">{section.title}</h3>
          {points ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Punto</th><th className="p-2">Tipo</th><th className="p-2">Ubicación</th><th className="p-2">Iluminancia</th><th className="p-2">Observaciones</th></tr></thead><tbody>{points.map((point, index) => <tr key={String(point.id ?? index)} className="border-b"><td className="p-2">{formatValue(point.name)}</td><td className="p-2">{formatValue(point.pointType)}</td><td className="p-2">{formatValue(point.locationDescription)}</td><td className="p-2 font-semibold">{formatValue(point.lux)} lux</td><td className="p-2">{formatValue(point.observations)}</td></tr>)}</tbody></table></div> : instruments ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Tipo</th><th className="p-2">Marca / modelo</th><th className="p-2">N.º de serie</th><th className="p-2">Calibración</th><th className="p-2">Vencimiento</th><th className="p-2">Estado</th></tr></thead><tbody>{instruments.map((instrument, index) => <tr key={instrument.id ?? index} className="border-b"><td className="p-2">{formatValue(instrument.instrumentType)}</td><td className="p-2">{formatValue([instrument.brand, instrument.model].filter(Boolean).join(' '))}</td><td className="p-2 font-semibold">{formatValue(instrument.serialNumber)}</td><td className="p-2">{formatValue(instrument.calibrationDate)}</td><td className="p-2">{formatValue(instrument.calibrationExpiry)}</td><td className="p-2">{formatValue(instrument.status)}</td></tr>)}</tbody></table></div> : <dl className="grid gap-3">{Object.entries(section.data).map(([key, value]) => <div key={key} className="grid md:grid-cols-3 gap-2 text-sm border-b last:border-b-0 pb-3 last:pb-0"><dt className="font-semibold text-slate-600 dark:text-slate-300">{labelFor(key)}</dt><dd className="md:col-span-2 whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">{formatValue(value)}</dd></div>)}</dl>}
        </section>; })}<div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-100">{representation.disclaimer}</div></>}
    </div></div></div>;
}
