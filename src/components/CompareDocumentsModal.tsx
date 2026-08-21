import React, { useState } from 'react';
import { X, Scale, Sparkles, CheckCircle2, AlertTriangle, FileText, Download } from 'lucide-react';
import { DocumentItem, DocComparisonResult } from '../types/safety';
import { db } from '../services/db';

interface CompareDocumentsModalProps {
  onClose: () => void;
  documents: DocumentItem[];
}

export const CompareDocumentsModal: React.FC<CompareDocumentsModalProps> = ({
  onClose,
  documents,
}) => {
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [topicQuery, setTopicQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<DocComparisonResult | null>(null);

  const toggleDocSelection = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((d) => d !== id));
    } else {
      if (selectedDocIds.length >= 4) {
        alert('Puedes comparar hasta 4 documentos simultáneamente.');
        return;
      }
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  const handleRunComparison = async () => {
    if (selectedDocIds.length < 2) {
      alert('Selecciona al menos 2 documentos para comparar.');
      return;
    }

    setIsLoading(true);

    try {
      const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id));
      const docTitles = selectedDocs.map((d) => d.title);

      // Collect relevant chunks from selected documents
      const allChunks = db.getChunks().filter((c) => selectedDocIds.includes(c.docId));

      const data = await db.callAiApi<any>('/api/compare-documents', {
        docTitles,
        topicQuery: topicQuery || 'Análisis comparativo técnico y legal',
        documentChunks: allChunks.slice(0, 15),
      });

      const resultObj: DocComparisonResult = {
        id: `comp_${Date.now()}`,
        docTitles,
        queryTopic: topicQuery || 'Comparación General',
        summaryComparison: data.summaryComparison || 'Resumen comparativo generado.',
        similarities: data.similarities || [],
        differences: data.differences || [],
        normativeDetails: data.normativeDetails || [],
        date: new Date().toLocaleDateString('es-AR'),
      };

      setComparisonResult(resultObj);
      db.saveDocComparison(resultObj);
    } catch (err: any) {
      console.error('Error en comparación:', err);
      alert('Ocurrió un error al comparar los documentos: ' + (err.message || 'Error del servidor'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 text-white space-y-6 relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            <span>Matriz Comparativa Normativa</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            Comparar Leyes, Decretos y Procedimientos
          </h2>
          <p className="text-xs text-slate-400">
            Selecciona 2 o más documentos de tu biblioteca para analizar diferencias, similitudes y exigencias técnicas en paralelo.
          </p>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Step 1: Select Documents */}
          {!comparisonResult && (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Selecciona al menos 2 documentos ({selectedDocIds.length} seleccionados):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1">
                {documents.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocSelection(doc.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                        <div className="truncate">
                          <p className="text-xs font-bold truncate">{doc.title}</p>
                          <span className="text-[10px] text-slate-400">{doc.category}</span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border shrink-0 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'border-slate-600 text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 2: Enfoque de Comparación */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  2. Enfoque o tema específico de comparación (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Exigencias para trabajo en altura, EPP obligatorio, inspecciones periódicas..."
                  value={topicQuery}
                  onChange={(e) => setTopicQuery(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleRunComparison}
                disabled={selectedDocIds.length < 2 || isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin text-slate-950" />
                    <span>Analizando concordancias y discrepancias normativas...</span>
                  </>
                ) : (
                  <>
                    <Scale className="w-5 h-5" />
                    <span>Ejecutar Comparación Técnica con IA</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Comparison Results View */}
          {comparisonResult && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400">Análisis Comparativo</span>
                  <h3 className="text-base font-bold text-white">
                    {comparisonResult.docTitles.join('  VS  ')}
                  </h3>
                  <p className="text-xs text-slate-300 italic">Enfoque: {comparisonResult.queryTopic}</p>
                </div>

                <button
                  onClick={() => setComparisonResult(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
                >
                  Nueva Comparación
                </button>
              </div>

              {/* Summary */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Resumen Ejecutivo Comparativo</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {comparisonResult.summaryComparison}
                </p>
              </div>

              {/* Similarities & Differences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Similarities */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Coincidencias y Puntos de Acuerdo</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {comparisonResult.similarities.map((sim, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{sim}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Differences */}
                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
                  <h4 className="font-bold text-sm text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Diferencias y Niveles de Exigencia</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {comparisonResult.differences.map((diff, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{diff}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Comparative Table Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Detalle por Norma</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comparisonResult.normativeDetails.map((detail, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-xs space-y-2"
                    >
                      <h5 className="font-bold text-amber-400 text-sm">{detail.docTitle}</h5>
                      <div className="space-y-1">
                        <p className="text-slate-300"><strong className="text-white">Posición / Alcance:</strong> {detail.position}</p>
                        <p className="text-slate-300"><strong className="text-white">Requisitos Clave:</strong> {detail.requirements}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
