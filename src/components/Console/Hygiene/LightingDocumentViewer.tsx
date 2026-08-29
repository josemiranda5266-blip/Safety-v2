import { useEffect, useState } from 'react';
import { Eye, FileText, X } from 'lucide-react';
import { hygieneService } from '../../../services/hygieneService';

type Section = { key: string; title: string; data: Record<string, unknown> };
type Representation = { documentId: string; templateKey: string; templateVersion: string; generatedAt: string; sections: Section[]; disclaimer: string };

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function LightingDocumentViewer({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [representation, setRepresentation] = useState<Representation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try { setRepresentation(await hygieneService.getDocumentRepresentation(documentId)); }
      catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar el documento.'); }
    })();
  }, [documentId]);

  return <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 overflow-y-auto">
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl min-h-full">
      <div className="sticky top-0 flex items-center justify-between border-b p-4 bg-white dark:bg-slate-900 z-10">
        <div className="flex items-center gap-2"><FileText className="w-5 h-5"/><div><h2 className="font-extrabold">Protocolo de Iluminación</h2><p className="text-xs text-slate-500">Plantilla v{representation?.templateVersion ?? '…'}</p></div></div>
        <button type="button" onClick={onClose} className="p-2 rounded-lg border" aria-label="Cerrar documento"><X className="w-4 h-4"/></button>
      </div>
      <div className="p-6 space-y-6">
        {!representation && !error && <div className="text-sm text-slate-500">Preparando representación documental…</div>}
        {error && <div className="rounded-xl bg-red-50 text-red-700 p-4 text-sm">{error}</div>}
        {representation && <>
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 p-4 text-sm"><div className="font-bold">Documento {representation.documentId}</div><div className="text-slate-500 mt-1">Generado: {new Date(representation.generatedAt).toLocaleString()}</div></div>
          {representation.sections.map((section) => <section key={section.key} className="border rounded-2xl p-5"><h3 className="font-extrabold mb-4">{section.title}</h3><dl className="grid gap-3">{Object.entries(section.data).map(([key, value]) => <div key={key} className="grid md:grid-cols-3 gap-2 text-sm border-b last:border-b-0 pb-3 last:pb-0"><dt className="font-semibold text-slate-600 dark:text-slate-300">{key}</dt><dd className="md:col-span-2 whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">{formatValue(value)}</dd></div>)}</dl></section>)}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-100">{representation.disclaimer}</div>
        </>}
      </div>
    </div>
  </div>;
}

export { Eye };