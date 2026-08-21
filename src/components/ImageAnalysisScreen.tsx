import React, { useState, useRef } from 'react';
import { Camera, Upload, ShieldAlert, Sparkles, Download, AlertTriangle, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { HazardAnalysisResult } from '../types/safety';
import { db } from '../services/db';
import { exportHazardAnalysisPDF } from '../services/pdfExporter';

export const ImageAnalysisScreen: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<HazardAnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMimeType(file.type || 'image/jpeg');

      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    const base64Data = selectedImage.split(',')[1];

    try {
      // Get context of available norms in library
      const docs = db.getDocuments();
      const normsList = docs.map((d) => `${d.category}: ${d.title}`).join('\n');

      const data = await db.callAiApi<any>('/api/analyze-image', {
        imageBase64: base64Data,
        mimeType,
        availableNormsContext: normsList,
      });

      const result: HazardAnalysisResult = {
        id: `haz_${Date.now()}`,
        date: new Date().toLocaleDateString('es-AR'),
        imagePreviewUrl: selectedImage,
        overallAssessment: data.overallAssessment || 'Inspección visual completada.',
        riskLevel: data.riskLevel || 'Medio',
        hazards: data.hazards || [],
        recommendations: data.recommendations || [],
      };

      setAnalysisResult(result);
      await db.saveHazardAnalysis(result);
    } catch (err: any) {
      alert('Error en análisis visual: ' + (err.message || 'Inténtalo nuevamente.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'crítico':
      case 'critico':
      case 'alto':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'medio':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <div className="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-wider">
          <Camera className="w-4 h-4" />
          <span>Infección Inteligente por Imagen</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Análisis de Fotos de Riesgo
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Toma una fotografía de un puesto o sector de trabajo. La IA detectará actos o condiciones subestándares y los vinculará con la normativa aplicable de tu biblioteca.
        </p>
      </div>

      {/* Upload / Camera Action Zone */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
        />

        {selectedImage ? (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden max-h-96 border border-slate-800 bg-slate-950 flex justify-center">
              <img
                src={selectedImage}
                alt="Inspección visual"
                className="object-contain max-h-96"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setAnalysisResult(null);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/80 text-white text-xs font-semibold backdrop-blur-md hover:bg-rose-600 transition-colors"
              >
                Cambiar foto
              </button>
            </div>

            <button
              onClick={handleAnalyzePhoto}
              disabled={isAnalyzing}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-sm shadow-lg shadow-rose-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAnalyzing ? 'Detectando riesgos con Inteligencia Visión...' : 'Analizar Foto con IA'}</span>
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-rose-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-800/30 space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">
                Tomar foto o subir imagen del puesto de trabajo
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Haz clic aquí para seleccionar una imagen desde la galería o usar la cámara.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Result Report */}
      {analysisResult && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-rose-500/30 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getSeverityBadge(analysisResult.riskLevel)}`}>
                Riesgo Global: {analysisResult.riskLevel.toUpperCase()}
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1">
                Informe de Auditoría Fotográfica
              </h2>
              <p className="text-xs text-slate-400">
                Fecha de Inspección: {analysisResult.date}
              </p>
            </div>

            <button
              onClick={() => exportHazardAnalysisPDF(analysisResult)}
              className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 self-start sm:self-center"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Reporte PDF</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Evaluación General de la Imagen
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed">
              {analysisResult.overallAssessment}
            </p>
          </div>

          {/* Hazards Grid */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Puntos y Condiciones Subestándares Detectados</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisResult.hazards.map((h, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-bold text-sm text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      {h.hazardName}
                    </h5>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(h.severity)}`}>
                      {h.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {h.description}
                  </p>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
                    <p className="text-amber-400 font-bold text-[11px]">
                      📜 Normativa Incumplida: {h.applicableNorm}
                    </p>
                    <p className="text-emerald-400 text-[11px]">
                      🛠️ Medida Preventiva: {h.preventiveAction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
