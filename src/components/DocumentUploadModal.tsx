import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  FileCheck, 
  AlertCircle, 
  X, 
  Sparkles, 
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  AlertTriangle,
  History,
  RotateCcw
} from 'lucide-react';
import { CategoryType, DocumentItem, DocChunk } from '../types/safety';
import { processUploadedFile } from '../services/fileProcessor';
import { db } from '../services/db';

interface DocumentUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<CategoryType>('Decreto');
  const [issuingOrganism, setIssuingOrganism] = useState<string>('Superintendencia de Riesgos del Trabajo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successDocTitle, setSuccessDocTitle] = useState<string | null>(null);

  // Duplicate / Versioning state
  const [duplicateDoc, setDuplicateDoc] = useState<DocumentItem | null>(null);
  const [processedResult, setProcessedResult] = useState<{ document: DocumentItem; chunks: DocChunk[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg(null);
      setDuplicateDoc(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMsg(null);
      setDuplicateDoc(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setErrorMsg('Por favor selecciona un archivo para subir.');
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setStageText('Analizando metadatos y duplicados...');
    setErrorMsg(null);

    try {
      // Check for duplicate document
      const existing = db.checkDuplicateDocument(selectedFile.name, selectedFile.size);

      const result = await processUploadedFile(
        selectedFile,
        category,
        (prog, stage) => {
          setProgress(prog);
          setStageText(stage);
        }
      );

      result.document.issuingOrganism = issuingOrganism;
      result.document.status = 'Vigente';

      if (existing) {
        setIsProcessing(false);
        setDuplicateDoc(existing);
        setProcessedResult(result);
        return;
      }

      // Save document and chunks to local DB
      db.addDocument(result.document, result.chunks);

      setSuccessDocTitle(result.document.title);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Error al procesar archivo:', err);
      setErrorMsg(err.message || 'Ocurrió un error procesando el archivo.');
      setIsProcessing(false);
    }
  };

  const handleResolveDuplicate = (mode: 'cancel' | 'replace' | 'new_version') => {
    if (mode === 'cancel') {
      setDuplicateDoc(null);
      setProcessedResult(null);
      setIsProcessing(false);
      return;
    }

    if (duplicateDoc && processedResult) {
      db.updateDocumentVersion(
        duplicateDoc.id,
        processedResult.document,
        processedResult.chunks,
        mode
      );

      setSuccessDocTitle(
        mode === 'new_version'
          ? `${processedResult.document.title} (Versión ${duplicateDoc.version + 1})`
          : processedResult.document.title
      );

      setTimeout(() => {
        onSuccess();
      }, 1500);
    }
  };

  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />;
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return <ImageIcon className="w-8 h-8 text-rose-400" />;
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return <FileText className="w-8 h-8 text-sky-400" />;
    return <FileCode className="w-8 h-8 text-amber-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative text-white space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Centro de Normativa Inteligente</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            Cargar Documento Técnico o Legal
          </h2>
          <p className="text-xs text-slate-400">
            Indexación automática RAG con control de duplicados, versión y organismo emisor.
          </p>
        </div>

        {/* Success State View */}
        {successDocTitle ? (
          <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-white">
              ¡Documento Importado e Indexado!
            </h3>
            <p className="text-xs text-slate-300">
              "{successDocTitle}" está listo en la base documental para consultas con la IA.
            </p>
          </div>
        ) : duplicateDoc ? (
          /* Duplicate Detection Decision UI */
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-white">
                  Este documento ya existe en la biblioteca
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Se detectó un documento existente con el mismo nombre o hash:
                </p>
                <div className="mt-2 p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs space-y-1">
                  <p className="font-bold text-amber-400">{duplicateDoc.title}</p>
                  <p className="text-slate-400">
                    Versión Actual: <span className="text-white font-bold">v{duplicateDoc.version}</span> • Categoría: {duplicateDoc.category} • Páginas: {duplicateDoc.pageCount}
                  </p>
                  <p className="text-slate-400">
                    Subido el: {new Date(duplicateDoc.uploadDate).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-200">
              ¿Qué deseas hacer con la nueva versión importada?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleResolveDuplicate('cancel')}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>Cancelar</span>
              </button>

              <button
                type="button"
                onClick={() => handleResolveDuplicate('replace')}
                className="px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Reemplazar</span>
              </button>

              <button
                type="button"
                onClick={() => handleResolveDuplicate('new_version')}
                className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <History className="w-4 h-4" />
                <span>Nueva v{duplicateDoc.version + 1}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Category & Organism Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryType)}
                  disabled={isProcessing}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="Ley">Ley</option>
                  <option value="Decreto">Decreto</option>
                  <option value="Resolución SRT">Resolución SRT</option>
                  <option value="Norma IRAM">Norma IRAM</option>
                  <option value="Norma ISO">Norma ISO</option>
                  <option value="Manual">Manual de Seguridad / EPP</option>
                  <option value="Procedimiento">Procedimiento (PTS)</option>
                  <option value="Instructivo">Instructivo Técnico</option>
                  <option value="Apunte">Apunte / Estudio</option>
                  <option value="Formulario">Formulario / Registro</option>
                  <option value="Informe">Informe Técnico</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Organismo Emisor
                </label>
                <input
                  type="text"
                  value={issuingOrganism}
                  onChange={(e) => setIssuingOrganism(e.target.value)}
                  disabled={isProcessing}
                  placeholder="Ej: SRT, Poder Ejecutivo, IRAM, ISO..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Drag & Drop File Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-500/60 bg-emerald-500/5'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.png,.jpg,.jpeg"
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex justify-center">{getFileIcon(selectedFile.name)}</div>
                  <p className="text-sm font-semibold text-white break-all">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-xs text-rose-400 hover:underline pt-1 inline-block"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Arrastra y suelta tu archivo aquí o haz clic para examinar
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      PDF, Word, Excel, PowerPoint, TXT, PNG o JPG (Máx. 50 MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Processing Progress Bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300 font-medium">
                  <span>{stageText}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={!selectedFile || isProcessing}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                <span>{isProcessing ? 'Procesando...' : 'Importar a la Biblioteca'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

