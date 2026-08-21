import React, { useState } from 'react';
import { CheckSquare, Sparkles, Download, Check, X, Minus, User, MapPin, Calendar, FileText } from 'lucide-react';
import { ChecklistInspection, ChecklistItem, InspectionStatus } from '../types/safety';
import { db } from '../services/db';
import { exportChecklistPDF } from '../services/pdfExporter';

const CATEGORIES = [
  { name: 'Extintores', icon: '🧯', norm: 'Dec. 351/79 Cap 18 - IRAM 3517' },
  { name: 'Electricidad', icon: '⚡', norm: 'Dec. 351/79 Cap 14 - Disyuntor / Puesta a tierra' },
  { name: 'Escaleras', icon: '🪜', norm: 'Ley 19.587 Cap 5 - Inclinación / Jaula' },
  { name: 'EPP', icon: '🥽', norm: 'Ley 19.587 Cap 8 - EPP Homologado IRAM' },
  { name: 'Construcción', icon: '🏗️', norm: 'Dec. 911/96 - Redes / Andamios / Excavación' },
  { name: 'Trabajo en altura', icon: '🦺', norm: 'Dec. 911/96 Art 54 - Arnés / Anclaje 22KN' },
  { name: 'Espacios confinados', icon: '🕳️', norm: 'Res. SRT 953/10 - Medición de gases / Vigía' },
  { name: 'Riesgo químico', icon: '🧪', norm: 'Res. SRT 295/03 - FSD / SGA / Ventilación' },
  { name: 'Riesgo biológico', icon: '🦠', norm: 'Ley 19.587 Cap 10 - Residuos patogénicos' },
  { name: 'Riesgo ergonómico', icon: '🧘', norm: 'Res. SRT 295/03 - NIOSH 25kg / NAM' },
];

export const ChecklistsScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Extintores');
  const [inspectorName, setInspectorName] = useState('');
  const [location, setLocation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeInspection, setActiveInspection] = useState<ChecklistInspection | null>(null);
  const [savedChecklists, setSavedChecklists] = useState<ChecklistInspection[]>(db.getChecklists());

  const handleGenerateChecklist = async (categoryName: string) => {
    setSelectedCategory(categoryName);
    setIsGenerating(true);

    try {
      // Find default relevant text from local DB for context
      const relevantChunks = db.searchRelevantChunks(categoryName, 3);
      const normsText = relevantChunks.map((c) => `${c.docTitle}: ${c.text}`).join('\n');

      const data = await db.callAiApi<any>('/api/generate-checklist', {
        category: categoryName,
        relevantNormsText: normsText,
      });

      const newInspection: ChecklistInspection = {
        id: `chk_${Date.now()}`,
        templateId: `tpl_${categoryName}`,
        title: data.title || `Checklist de Inspección: ${categoryName}`,
        category: categoryName,
        inspectorName: inspectorName || 'Auditor SySAT',
        location: location || 'Planta Principal',
        date: new Date().toLocaleDateString('es-AR'),
        items: (data.items || []).map((item: any) => ({
          ...item,
          status: 'cumple' as InspectionStatus,
          notes: '',
        })),
        overallObservations: 'Inspección de rutina completada sin novedades críticas.',
      };

      setActiveInspection(newInspection);
      db.saveChecklist(newInspection);
      setSavedChecklists(db.getChecklists());
    } catch (err: any) {
      alert('Error generando lista: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateItemStatus = (itemId: string, status: InspectionStatus) => {
    if (!activeInspection) return;

    const updatedItems = activeInspection.items.map((item) =>
      item.id === itemId ? { ...item, status } : item
    );

    const updatedInspection = { ...activeInspection, items: updatedItems };
    setActiveInspection(updatedInspection);
    db.saveChecklist(updatedInspection);
    setSavedChecklists(db.getChecklists());
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    if (!activeInspection) return;

    const updatedItems = activeInspection.items.map((item) =>
      item.id === itemId ? { ...item, notes } : item
    );

    const updatedInspection = { ...activeInspection, items: updatedItems };
    setActiveInspection(updatedInspection);
    db.saveChecklist(updatedInspection);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <div className="flex items-center gap-2 text-teal-500 text-xs font-bold uppercase tracking-wider">
          <CheckSquare className="w-4 h-4" />
          <span>Auditoría de Campo y Control Técnico</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Checklists de Inspección
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Selecciona cualquiera de las 10 áreas de riesgo normativo para generar una lista de auditoría interactiva exportable a PDF.
        </p>
      </div>

      {/* Inspector Details Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-teal-500" />
            <span>Nombre del Auditor / Técnico:</span>
          </label>
          <input
            type="text"
            placeholder="Ej: Ing. Juan Pérez (Mat. 4821)"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-500" />
            <span>Ubicación / Sector / Planta:</span>
          </label>
          <input
            type="text"
            placeholder="Ej: Sector Depósito Central - Nave B"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* 10 Category Cards Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            onClick={() => handleGenerateChecklist(cat.name)}
            disabled={isGenerating}
            className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
              selectedCategory === cat.name && activeInspection
                ? 'bg-teal-500/15 border-teal-500 text-teal-400 shadow-lg'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-500/50'
            }`}
          >
            <span className="text-2xl mb-1">{cat.icon}</span>
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {cat.name}
              </h3>
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                {cat.norm}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Active Interactive Checklist Table */}
      {isGenerating ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-300 space-y-3">
          <Sparkles className="w-8 h-8 text-teal-400 mx-auto animate-spin" />
          <p className="text-sm font-bold">Generando lista de verificación basada en normativa local...</p>
        </div>
      ) : activeInspection ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-bold">
                Auditoría Activa: {activeInspection.category}
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {activeInspection.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auditor: {activeInspection.inspectorName} • Sector: {activeInspection.location} • Fecha: {activeInspection.date}
              </p>
            </div>

            <button
              onClick={() => exportChecklistPDF(activeInspection)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 self-start sm:self-center"
            >
              <Download className="w-4 h-4" />
              <span>Exportar PDF Oficial</span>
            </button>
          </div>

          {/* Interactive Inspection Table */}
          <div className="space-y-3">
            {activeInspection.items.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.aspect}
                    </h4>
                  </div>
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium pl-8">
                    {item.normativeRef}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-8">
                    {item.guidance}
                  </p>
                </div>

                {/* Status Toggle Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pl-8 md:pl-0">
                  <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
                    <button
                      onClick={() => handleUpdateItemStatus(item.id, 'cumple')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        item.status === 'cumple'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-emerald-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Cumple</span>
                    </button>

                    <button
                      onClick={() => handleUpdateItemStatus(item.id, 'no_cumple')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        item.status === 'no_cumple'
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-rose-400'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>No Cumple</span>
                    </button>

                    <button
                      onClick={() => handleUpdateItemStatus(item.id, 'no_aplica')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        item.status === 'no_aplica'
                          ? 'bg-slate-700 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>N/A</span>
                    </button>
                  </div>

                  {/* Notes Field */}
                  <input
                    type="text"
                    placeholder="Notas / Observaciones..."
                    value={item.notes || ''}
                    onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                    className="w-full sm:w-48 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
