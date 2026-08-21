import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  History,
  Download,
  Upload,
  RefreshCw,
  Clock,
  HardDrive,
  BarChart3,
  ShieldCheck,
  Tag,
  FileCode,
  Calendar,
  Eye,
  Trash2,
  ChevronRight,
  PieChart,
  HelpCircle,
  Database
} from 'lucide-react';
import { DocumentItem, CategoryType, LibraryStats, NormativeAlert } from '../types/safety';
import { db } from '../services/db';

interface NormativeCenterScreenProps {
  onOpenUpload: () => void;
  onSelectDocForSummary?: (doc: DocumentItem) => void;
}

export const NormativeCenterScreen: React.FC<NormativeCenterScreenProps> = ({
  onOpenUpload,
  onSelectDocForSummary,
}) => {
  const [stats, setStats] = useState<LibraryStats>(db.getLibraryStatistics());
  const [documents, setDocuments] = useState<DocumentItem[]>(db.getDocuments());
  const [activeCategory, setActiveCategory] = useState<string>('TODAS');
  const [activeStatus, setActiveStatus] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocForHistory, setSelectedDocForHistory] = useState<DocumentItem | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isBackupExporting, setIsBackupExporting] = useState(false);

  const reloadData = () => {
    setStats(db.getLibraryStatistics());
    setDocuments(db.getDocuments());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const categoriesList: { label: string; value: CategoryType | 'TODAS' }[] = [
    { label: 'Todas las Categorías', value: 'TODAS' },
    { label: 'Leyes', value: 'Ley' },
    { label: 'Decretos', value: 'Decreto' },
    { label: 'Resoluciones SRT', value: 'Resolución SRT' },
    { label: 'Normas IRAM', value: 'Norma IRAM' },
    { label: 'Normas ISO', value: 'Norma ISO' },
    { label: 'Manuales', value: 'Manual' },
    { label: 'Procedimientos', value: 'Procedimiento' },
    { label: 'Instructivos', value: 'Instructivo' },
    { label: 'Apuntes', value: 'Apunte' },
    { label: 'Formularios', value: 'Formulario' },
    { label: 'Informes', value: 'Informe' },
    { label: 'Otros', value: 'Otro' },
  ];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.issuingOrganism && doc.issuingOrganism.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCategory =
      activeCategory === 'TODAS' || doc.category === activeCategory;

    const matchesStatus =
      activeStatus === 'TODOS' || doc.status === activeStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Re-indexing individual document incrementally
  const handleReindexDoc = (docItem: DocumentItem) => {
    db.updateDocumentVersion(
      docItem.id,
      {
        ...docItem,
        summary: docItem.summary || `Resumen indexado de ${docItem.title}. Reindexación incremental completada.`,
        processingState: 'indexed',
      },
      db.getChunks().filter((c) => c.docId === docItem.id),
      'replace'
    );
    setActionSuccessMsg(`Reindexación completada para "${docItem.title}". Embeddings actualizados.`);
    reloadData();
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Resolve alert automatically
  const handleResolveAlert = (alert: NormativeAlert) => {
    const targetDoc = db.getDocumentById(alert.docId);
    if (targetDoc) {
      handleReindexDoc(targetDoc);
    }
  };

  // Export full JSON backup
  const handleExportBackup = () => {
    setIsBackupExporting(true);
    try {
      const jsonStr = db.exportFullDatabaseBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SafetyIA_CentroNormativa_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setActionSuccessMsg('Copia de seguridad completa exportada con éxito.');
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch (e: any) {
      alert('Error exportando backup: ' + e.message);
    } finally {
      setIsBackupExporting(false);
    }
  };

  // Import backup file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const res = db.importDatabaseBackup(content);
          if (res.success) {
            setActionSuccessMsg(res.message);
            reloadData();
            setTimeout(() => setActionSuccessMsg(null), 3500);
          } else {
            alert(res.message);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Módulo Oficial de Gestión
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                ● Sincronizado
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Centro de Normativa <span className="text-amber-500">Inteligente</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Plataforma central de control normativo para Higiene y Seguridad Laboral. Administra versiones, trazabilidad, alertas automáticas y exportación de respaldos.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportBackup}
              disabled={isBackupExporting}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center gap-2"
              title="Descargar copia de seguridad en JSON"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Exportar Respaldo</span>
            </button>

            <label className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs cursor-pointer transition-all flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Restaurar Base</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            <button
              onClick={onOpenUpload}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Nuevo Documento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Alert Banner */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Statistical Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Documentos</span>
          </p>
          <p className="text-2xl font-extrabold text-white">{stats.totalDocs}</p>
          <p className="text-[10px] text-slate-400">{stats.vigenteDocsCount} vigentes</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Páginas</span>
          </p>
          <p className="text-2xl font-extrabold text-white">{stats.totalPages}</p>
          <p className="text-[10px] text-slate-400">Texto indexado</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fragmentos RAG</span>
          </p>
          <p className="text-2xl font-extrabold text-white">{stats.totalChunks}</p>
          <p className="text-[10px] text-slate-400">Vectores calculados</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Embeddings</span>
          </p>
          <p className="text-2xl font-extrabold text-white">{stats.embeddingsGenerated}</p>
          <p className="text-[10px] text-slate-400">Motor Gemini 3.6</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-rose-400" />
            <span>Espacio Usado</span>
          </p>
          <p className="text-2xl font-extrabold text-white">
            {(stats.spaceUsedBytes / (1024 * 1024)).toFixed(1)} MB
          </p>
          <p className="text-[10px] text-slate-400">Almacenamiento local</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>Sincronización</span>
          </p>
          <p className="text-base font-extrabold text-emerald-400 truncate mt-1">
            {stats.lastSyncTimestamp}
          </p>
          <p className="text-[10px] text-slate-400">Firebase Firestore</p>
        </div>
      </div>

      {/* Dashboard Charts & System Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category & Year Breakdown Chart Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-white text-base">
                Dashboard de Distribución Normativa
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Categorías y Antigüedad
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Breakdown by Category */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Documentos por Categoría
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {stats.categoryBreakdown.map((cat, idx) => {
                  const percentage = Math.round((cat.count / (stats.totalDocs || 1)) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-200">{cat.category}</span>
                        <span className="text-amber-400 font-bold">
                          {cat.count} doc ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 8)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown by Year */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Normativas por Año de Sanción
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {stats.yearBreakdown.map((yearObj, idx) => {
                  const percentage = Math.round((yearObj.count / (stats.totalDocs || 1)) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-200">Año {yearObj.year}</span>
                        <span className="text-sky-400 font-bold">{yearObj.count} normas</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-500 to-teal-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 10)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* System Alerts & Maintenance Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">
                  Alertas de Sistema ({stats.alerts.length})
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold">
                Auto-detección
              </span>
            </div>

            {stats.alerts.length === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-emerald-300">
                  ¡Biblioteca 100% Optimizada!
                </p>
                <p className="text-[11px] text-slate-400">
                  Todos los documentos están indexados, con metadatos completos y sin errores.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {stats.alerts.map((alertItem) => (
                  <div
                    key={alertItem.id}
                    className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-amber-400">
                      <span className="truncate">{alertItem.docTitle}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 uppercase">
                        {alertItem.type}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-snug">
                      {alertItem.message}
                    </p>
                    <button
                      onClick={() => handleResolveAlert(alertItem)}
                      className="w-full py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Resolver con 1 Clic</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400 space-y-1">
            <p className="font-bold text-slate-200">Reindexación Incremental:</p>
            <p className="text-[11px]">
              Al editar o subir normas, Safety IA re-procesa únicamente los fragmentos nuevos sin alterar el resto de la base RAG.
            </p>
          </div>
        </div>
      </div>

      {/* Main Normative Explorer Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Explorer Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              <span>Explorador Documental por Categorías y Estado</span>
            </h3>
            <p className="text-xs text-slate-400">
              Filtra decretos, leyes, normas IRAM/ISO, manuales de EPP e instructivos técnicos.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por nombre, tag u organismo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Categories Tab Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categoriesList.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.value
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
            Estado:
          </span>
          {['TODOS', 'Vigente', 'Reemplazado', 'Derogado'].map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeStatus === status
                  ? status === 'Vigente'
                    ? 'bg-emerald-500 text-slate-950 font-extrabold'
                    : status === 'Reemplazado'
                    ? 'bg-amber-500 text-slate-950 font-extrabold'
                    : status === 'Derogado'
                    ? 'bg-rose-500 text-white font-extrabold'
                    : 'bg-white text-slate-950 font-extrabold'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Document Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4 hover:border-slate-600 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Status Badges */}
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold">
                    {doc.category}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        doc.status === 'Vigente'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : doc.status === 'Reemplazado'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {doc.status}
                    </span>

                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold">
                      v{doc.version || 1}
                    </span>
                  </div>
                </div>

                {/* Document Title */}
                <h4 className="font-bold text-white text-sm line-clamp-2 leading-snug">
                  {doc.title}
                </h4>

                {/* Organism & Date metadata */}
                <div className="text-[11px] text-slate-400 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{doc.issuingOrganism || doc.author}</span>
                  </p>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {doc.documentDate}
                    </span>
                    <span>•</span>
                    <span>{doc.pageCount} páginas</span>
                  </div>
                </div>

                {/* Summary snippet */}
                {doc.summary && (
                  <p className="text-xs text-slate-300 line-clamp-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                    {doc.summary}
                  </p>
                )}

                {/* Keywords & Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {doc.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 text-[10px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                {doc.versionHistory && doc.versionHistory.length > 0 ? (
                  <button
                    onClick={() => setSelectedDocForHistory(doc)}
                    className="text-amber-400 hover:underline text-[11px] font-semibold flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Historial ({doc.versionHistory.length})</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500">Sin versiones previas</span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReindexDoc(doc)}
                    className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                    title="Re-indexar incrementalmente este documento"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  {onSelectDocForSummary && (
                    <button
                      onClick={() => onSelectDocForSummary(doc)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <span>Resumen</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Version History Drawer Modal */}
      {selectedDocForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <History className="w-4 h-4" />
                <span>Historial de Versiones Trazable</span>
              </div>
              <button
                onClick={() => setSelectedDocForHistory(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-white">
                {selectedDocForHistory.title}
              </h3>
              <p className="text-xs text-slate-400">
                Versión Vigente Actual: <strong className="text-amber-400">v{selectedDocForHistory.version}</strong>
              </p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px]">
                  v{selectedDocForHistory.version} (Vigente)
                </span>
                <p className="text-slate-200 mt-1">Cargado: {new Date(selectedDocForHistory.uploadDate).toLocaleDateString('es-AR')}</p>
                <p className="text-slate-400">Tamaño: {(selectedDocForHistory.fileSize / 1024).toFixed(0)} KB</p>
              </div>

              {selectedDocForHistory.versionHistory?.map((hist, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs space-y-1"
                >
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-bold text-[10px]">
                    v{hist.version} (Archivado)
                  </span>
                  <p className="text-slate-300 mt-1">Fecha de reemplazo: {new Date(hist.uploadDate).toLocaleDateString('es-AR')}</p>
                  <p className="text-slate-400">{hist.note || 'Versión anterior conservada'}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedDocForHistory(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cerrar Historial
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
