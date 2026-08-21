import React, { useState } from 'react';
import { FileCheck, Sparkles, Download, Trash2, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DocumentItem, SummaryResult } from '../types/safety';
import { db } from '../services/db';
import { exportSummaryPDF } from '../services/pdfExporter';

interface SummariesScreenProps {
  preselectedDoc?: DocumentItem | null;
}

export const SummariesScreen: React.FC<SummariesScreenProps> = ({ preselectedDoc }) => {
  const [documents] = useState<DocumentItem[]>(db.getDocuments());
  const [selectedDocId, setSelectedDocId] = useState<string>(preselectedDoc?.id || '');
  const [customText, setCustomText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [summariesHistory, setSummariesHistory] = useState<SummaryResult[]>(db.getSummaries());
  const [activeSummary, setActiveSummary] = useState<SummaryResult | null>(null);

  const handleGenerateSummary = async () => {
    let docTitle = 'Documento Personalizado';
    let docText = customText;

    if (selectedDocId) {
      const doc = documents.find((d) => d.id === selectedDocId);
      if (doc) {
        docTitle = doc.title;
        docText = doc.content;
      }
    }

    if (!docText.trim()) {
      alert('Por favor selecciona un documento o ingresa el texto a resumir.');
      return;
    }

    setIsGenerating(true);

    try {
      const data = await db.callAiApi<any>('/api/generate-summary', {
        documentTitle: docTitle,
        documentText: docText,
      });

      const summaryResult: SummaryResult = {
        id: `sum_${Date.now()}`,
        docId: selectedDocId || undefined,
        docTitle,
        date: new Date().toLocaleDateString('es-AR'),
        shortSummary: data.shortSummary,
        technicalSummary: data.technicalSummary,
        keyPoints: data.keyPoints || [],
        legalObligations: data.legalObligations || [],
        recommendations: data.recommendations || [],
      };

      db.saveSummary(summaryResult);
      setSummariesHistory(db.getSummaries());
      setActiveSummary(summaryResult);
    } catch (err: any) {
      alert('Error en la generación: ' + (err.message || 'Inténtalo de nuevo.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSummary = (id: string) => {
    db.deleteSummary(id);
    setSummariesHistory(db.getSummaries());
    if (activeSummary?.id === id) setActiveSummary(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <div className="flex items-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider">
          <FileCheck className="w-4 h-4" />
          <span>Síntesis Inteligente de Normativas</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Resúmenes Técnicos
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Genera automáticamente resúmenes ejecutivos, puntos clave, obligaciones legales y recomendaciones especializadas.
        </p>
      </div>

      {/* Selector & Generator Box */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>Seleccionar Fuente para Resumir</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Elegir de la Biblioteca Local:
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                setCustomText('');
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- O seleccionar un documento --</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.category}] {d.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              O pegar texto libre:
            </label>
            <input
              type="text"
              placeholder="Ej: Texto de un procedimiento o manual..."
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                setSelectedDocId('');
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={isGenerating || (!selectedDocId && !customText.trim())}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isGenerating ? 'Analizando norma y generando resumen...' : 'Generar Resumen con IA'}</span>
        </button>
      </div>

      {/* Active Generated Summary Result */}
      {activeSummary && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-indigo-500/30 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold">
                Resumen Generado
              </span>
              <h3 className="text-xl font-extrabold text-white mt-1">
                {activeSummary.docTitle}
              </h3>
            </div>

            <button
              onClick={() => exportSummaryPDF(activeSummary)}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>
          </div>

          {/* Short Summary Box */}
          <div className="p-4 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 space-y-1">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Resumen Corto / Ejecutivo
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed">
              {activeSummary.shortSummary}
            </p>
          </div>

          {/* Technical Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-indigo-400">
              Análisis Técnico Estructurado
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {activeSummary.technicalSummary}
            </p>
          </div>

          {/* Bullet Lists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                📌 Puntos Importantes
              </h5>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                {activeSummary.keyPoints.map((kp, idx) => (
                  <li key={idx}>{kp}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                ⚖️ Obligaciones Legales
              </h5>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                {activeSummary.legalObligations.map((lo, idx) => (
                  <li key={idx}>{lo}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                🛠️ Recomendaciones del Profesional
              </h5>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                {activeSummary.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Historic Summaries List */}
      {summariesHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Historial de Resúmenes Guardados
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summariesHistory.map((sum) => (
              <div
                key={sum.id}
                onClick={() => setActiveSummary(sum)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  activeSummary?.id === sum.id
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/50'
                }`}
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {sum.docTitle}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generado el {sum.date}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportSummaryPDF(sum);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-indigo-400 transition-colors"
                    title="Descargar PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSummary(sum.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
