import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Calendar, 
  Building2, 
  MapPin, 
  User, 
  Tag, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Hash, 
  Info,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useTenant } from '../../../context/TenantContext';
import { 
  DocumentCategory, 
  DOCUMENT_CATEGORIES, 
  DocumentScope, 
  ProfessionalDocument 
} from '../../../types/documentManagement';
import { documentManagementService } from '../../../services/documentManagementService';

interface DocumentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoc: ProfessionalDocument) => void;
  initialScope?: DocumentScope;
  initialCompanyId?: string;
  initialEstablishmentId?: string;
  initialEmployeeId?: string;
  initialCategory?: DocumentCategory;
}

export const DocumentManagerModal: React.FC<DocumentManagerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialScope = 'company',
  initialCompanyId,
  initialEstablishmentId,
  initialEmployeeId,
  initialCategory = 'ART',
}) => {
  const { companies, establishments, activeCompanyId } = useTenant();

  const [scope, setScope] = useState<DocumentScope>(initialScope);
  const [companyId, setCompanyId] = useState<string>(initialCompanyId || activeCompanyId || (companies[0]?.id || ''));
  const [establishmentId, setEstablishmentId] = useState<string>(initialEstablishmentId || '');
  const [employeeId, setEmployeeId] = useState<string>(initialEmployeeId || '');
  
  const [category, setCategory] = useState<DocumentCategory>(initialCategory);
  const [subCategory, setSubCategory] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [hasNoExpiry, setHasNoExpiry] = useState<boolean>(false);
  const [responsibleName, setResponsibleName] = useState<string>('');
  const [issuingOrganism, setIssuingOrganism] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Filter establishments based on selected company
  const availableEstablishments = establishments.filter(
    (e) => !companyId || e.companyId === companyId
  );

  const handleAnalyzeWithAI = async () => {
    if (!selectedFile && !fileBase64 && !title) {
      setErrorMsg('Selecciona primero un archivo o escribe un título preliminar para que la IA extraiga los metadatos.');
      return;
    }

    setIsAnalyzingAI(true);
    setErrorMsg(null);
    setAiSuccessMsg(null);

    try {
      const selectedComp = companies.find((c) => c.id === companyId);
      const companyContext = selectedComp
        ? {
            companyName: selectedComp.tradeName || selectedComp.legalName,
            activity: selectedComp.activityDescription,
          }
        : undefined;

      const token = localStorage.getItem('auth_token') || 'dev-token';
      const res = await fetch('/api/analyze-hs-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: selectedFile?.name || title,
          fileBase64: fileBase64 || undefined,
          mimeType: selectedFile?.type || 'application/pdf',
          sampleText: `${title} ${notes}`.trim() || undefined,
          companyContext,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al analizar el documento con IA.');
      }

      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.category && DOCUMENT_CATEGORIES.includes(data.category as DocumentCategory)) {
        setCategory(data.category as DocumentCategory);
      }
      if (data.subCategory) setSubCategory(data.subCategory);
      if (data.documentNumber) setDocumentNumber(data.documentNumber);
      if (data.issueDate) setIssueDate(data.issueDate);
      if (data.hasNoExpiry) {
        setHasNoExpiry(true);
        setExpirationDate('');
      } else if (data.expirationDate) {
        setHasNoExpiry(false);
        setExpirationDate(data.expirationDate);
      }
      if (data.responsibleName) setResponsibleName(data.responsibleName);
      if (data.issuingOrganism) setIssuingOrganism(data.issuingOrganism);
      if (data.notes || data.summary) setNotes(data.summary || data.notes);
      if (data.tags && Array.isArray(data.tags)) setTagsInput(data.tags.join(', '));

      setAiSuccessMsg(`✨ Metadatos autocompletados: Categoría clasificada como "${data.category}".`);
    } catch (err: any) {
      console.error('Error in handleAnalyzeWithAI:', err);
      setErrorMsg(err.message || 'No se pudo completar el análisis con IA.');
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleFile = (file: File) => {
    setErrorMsg(null);
    const validExtensions = ['.pdf', '.docx', '.xlsx', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      setErrorMsg(`Tipo de archivo no permitido (${ext}). Se aceptan: PDF, DOCX, XLSX, TXT.`);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('El archivo excede el tamaño máximo permitido de 15MB.');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Clean = result.includes(',') ? result.split(',')[1] : result;
      setFileBase64(base64Clean);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileBase64) {
      setErrorMsg('Por favor selecciona un archivo para subir.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('El título del documento es obligatorio.');
      return;
    }

    if (!responsibleName.trim()) {
      setErrorMsg('El nombre del responsable técnico o emisor es obligatorio.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const newDoc = await documentManagementService.uploadDocument({
        filename: selectedFile.name,
        fileBase64,
        mimeType: selectedFile.type || 'application/pdf',
        title: title.trim(),
        category,
        subCategory: subCategory.trim() || undefined,
        scope,
        companyId: scope !== 'organization' ? companyId || undefined : undefined,
        establishmentId: (scope === 'establishment' || scope === 'employee') ? establishmentId || undefined : undefined,
        employeeId: scope === 'employee' ? employeeId || undefined : undefined,
        documentNumber: documentNumber.trim() || undefined,
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        expirationDate: hasNoExpiry ? undefined : (expirationDate || undefined),
        responsibleName: responsibleName.trim(),
        issuingOrganism: issuingOrganism.trim() || undefined,
        notes: notes.trim() || undefined,
        tags,
      });

      onSuccess(newDoc);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la subida del documento.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Subir Documento Técnico H&S
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gestión, clasificación y control normativo de vencimientos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Drag & Drop File Zone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Archivo Digital (PDF, DOCX, XLSX, TXT - Máx 15MB) *
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-orange-500 bg-orange-500/10'
                  : selectedFile
                  ? 'border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-orange-400 bg-slate-50 dark:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.xlsx,.txt"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-6 h-6" />
                  <div className="text-left">
                    <p className="text-slate-900 dark:text-white font-bold">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Documento'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Arrastra tu archivo aquí o <span className="text-orange-500 hover:underline">haz clic para examinar</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Los archivos se resguardan de forma segura en almacenamiento especializado.
                  </p>
                </div>
              )}
            </div>

            {/* AI Smart Extraction Bar */}
            <div className="mt-2.5 flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-500/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {isAnalyzingAI
                    ? 'Analizando documento con IA (extrayendo fechas, emisor y categoría)...'
                    : '¿Quieres que la IA autocomplete el título, categoría, fechas y tags?'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzingAI}
                className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-sm disabled:opacity-50"
              >
                {isAnalyzingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analizando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Autocompletar con IA</span>
                  </>
                )}
              </button>
            </div>

            {aiSuccessMsg && (
              <div className="mt-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{aiSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* 2. Scope & Category Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scope Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-orange-500" />
                Alcance del Documento *
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as DocumentScope)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="company">Documento de Empresa</option>
                <option value="establishment">Documento de Establecimiento / Planta</option>
                <option value="employee">Documento de Trabajador (Legajo)</option>
                <option value="organization">General / Organización</option>
              </select>
            </div>

            {/* Category Selection (Required 12 Categories) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                Categoría Normativa *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Relational Attachments depending on scope */}
          {scope !== 'organization' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Empresa Asociada *
                  </label>
                  <select
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value);
                      setEstablishmentId('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="">Seleccione Empresa...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName || c.tradeName} (CUIT: {c.cuit})
                      </option>
                    ))}
                  </select>
                </div>

                {(scope === 'establishment' || scope === 'employee') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Establecimiento / Planta
                    </label>
                    <select
                      value={establishmentId}
                      onChange={(e) => setEstablishmentId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Todos / Sin especificar</option>
                      {availableEstablishments.map((est) => (
                        <option key={est.id} value={est.id}>
                          {est.name} ({est.city || est.address})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {scope === 'employee' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> ID o Referencia de Trabajador
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Ej: emp_1724... o CUIL del trabajador"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* 4. Title, Document Number, Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                Título Descriptivo *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Protocolo de Medición de Puesta a Tierra Res SRT 900/15"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-slate-500" />
                N° de Póliza / Certificado
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ej: POL-992384-A"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 5. Dates & Motor de Vencimientos Configuration */}
          <div className="p-4 rounded-xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="w-4 h-4" /> Control y Motor de Vencimientos
              </span>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasNoExpiry}
                  onChange={(e) => {
                    setHasNoExpiry(e.target.checked);
                    if (e.target.checked) setExpirationDate('');
                  }}
                  className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
                Sin fecha de vencimiento (Permanente)
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Fecha de Emisión / Inicio *
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  Fecha de Vencimiento / Renovación
                </label>
                <input
                  type="date"
                  value={expirationDate}
                  disabled={hasNoExpiry}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-orange-500 ${
                    hasNoExpiry
                      ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  }`}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-orange-500" />
              El motor disparará alertas automáticas a los 90, 30, 15 y 7 días previos al vencimiento.
            </p>
          </div>

          {/* 6. Responsible & Issuing Organism */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-500" />
                Responsable Técnico / Emisor *
              </label>
              <input
                type="text"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Ej: Lic. Martín Rossi (Mat. 10442)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                Organismo Emisor / ART / Entidad
              </label>
              <input
                type="text"
                value={issuingOrganism}
                onChange={(e) => setIssuingOrganism(e.target.value)}
                placeholder="Ej: Prevención ART / SRT / Municipalidad"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 7. Tags & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-slate-500" />
                Etiquetas / Tags (separadas por coma)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ej: SRT 900/15, Electricidad, Protocolo Anual"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Observaciones Técnicas
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas de auditoría o seguimiento"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isUploading}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/25 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Procesando y Guardando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Guardar Documento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
