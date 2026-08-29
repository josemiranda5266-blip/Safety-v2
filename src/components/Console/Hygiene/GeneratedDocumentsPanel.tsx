import { useEffect, useState } from 'react';
import { FileText, Plus, RefreshCw } from 'lucide-react';
import { hygieneService } from '../../../services/hygieneService';
import { HygieneMeasurement } from '../../../types/safety';

type Props = { measurement: HygieneMeasurement; onGenerated?: () => Promise<void> | void };

export function GeneratedDocumentsPanel({ measurement, onGenerated }: Props) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setDocuments(await hygieneService.getGeneratedDocuments(measurement.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar los documentos.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [measurement.id]);

  const generate = async () => {
    setGenerating(true); setError(null);
    try {
      await hygieneService.generateDocument(measurement.id, measurement.protocolType + '_protocol', '1.0.0');
      await load();
      await onGenerated?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible generar el documento.'); }
    finally { setGenerating(false); }
  };

  const canGenerate = measurement.status === 'validated';

  return <section className="mt-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 p-5 space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="font-extrabold flex items-center gap-2"><FileText className="w-5 h-5"/>Documentos generados</h3><p className="text-sm text-slate-500 mt-1">Cada documento conserva un snapshot reproducible de la medición validada y su versión de plantilla.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="p-2 rounded-lg border" aria-label="Actualizar documentos"><RefreshCw className="w-4 h-4"/></button>
    </div>
    {canGenerate ? <button type="button" disabled={generating} onClick={generate} className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50"><Plus className="w-4 h-4"/>{generating ? 'Generando...' : 'Generar documento'}</button> : <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">El documento solo puede generarse después de la validación profesional.</div>}
    {error && <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
    {loading ? <div className="text-sm text-slate-500">Cargando documentos...</div> : documents.length ? <div className="space-y-2">{documents.map((document) => <div key={document.id} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm"><div className="font-bold">{document.templateKey} <span className="text-slate-500 font-normal">v{document.templateVersion}</span></div><div className="text-xs text-slate-500 mt-1">Generado: {document.generatedAt ? new Date(document.generatedAt).toLocaleString() : '—'} · Estado: {document.status}</div><div className="text-xs text-slate-500 mt-1">ID: {document.id}</div></div>)}</div> : <div className="text-sm text-slate-500">Todavía no hay documentos generados para esta medición.</div>}
    <p className="text-xs text-slate-500">La generación actual crea una entidad documental trazable. La exportación a PDF y cualquier firma profesional se incorporarán como fases posteriores.</p>
  </section>;
}