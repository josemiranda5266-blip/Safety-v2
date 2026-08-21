import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  RefreshCw, 
  FileText, 
  Building2, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Grid, 
  List,
  Eye
} from 'lucide-react';
import { 
  ProfessionalDocument, 
  DocumentCategory, 
  DOCUMENT_CATEGORIES, 
  DocumentScope, 
  ExpirationAlertLevel 
} from '../../../types/documentManagement';
import { getAlertLevelStyle } from '../../../utils/expirationEngine';
import { useTenant } from '../../../context/TenantContext';

interface DocumentsExplorerProps {
  documents: ProfessionalDocument[];
  isLoading: boolean;
  onOpenUploadModal: () => void;
  onSelectDocument: (doc: ProfessionalDocument) => void;
  onRenewDocument: (doc: ProfessionalDocument) => void;
  onDownloadDocument: (doc: ProfessionalDocument) => void;
}

export const DocumentsExplorer: React.FC<DocumentsExplorerProps> = ({
  documents,
  isLoading,
  onOpenUploadModal,
  onSelectDocument,
  onRenewDocument,
  onDownloadDocument,
}) => {
  const { companies, activeCompanyId, setActiveCompanyId } = useTenant();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState<DocumentScope | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [selectedAlertLevel, setSelectedAlertLevel] = useState<ExpirationAlertLevel | 'all'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter documents in memory for ultra-fast response
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Company filter
      if (activeCompanyId && doc.companyId && doc.companyId !== activeCompanyId) {
        return false;
      }

      // Scope
      if (selectedScope !== 'all' && doc.scope !== selectedScope) {
        return false;
      }

      // Category
      if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
        return false;
      }

      // Alert Level
      if (selectedAlertLevel !== 'all' && doc.expirationAlertLevel !== selectedAlertLevel) {
        return false;
      }

      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = doc.title?.toLowerCase().includes(q);
        const matchFilename = doc.filename?.toLowerCase().includes(q);
        const matchNumber = doc.documentNumber?.toLowerCase().includes(q);
        const matchResponsible = doc.responsibleName?.toLowerCase().includes(q);
        const matchOrganism = doc.issuingOrganism?.toLowerCase().includes(q);
        const matchEmployee = doc.employeeName?.toLowerCase().includes(q);
        const matchTags = doc.tags?.some((t) => t.toLowerCase().includes(q));

        if (!matchTitle && !matchFilename && !matchNumber && !matchResponsible && !matchOrganism && !matchEmployee && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [documents, activeCompanyId, selectedScope, selectedCategory, selectedAlertLevel, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Controls & Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, póliza, responsable, organismo, etiqueta o trabajador..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder:text-slate-400 shadow-sm"
          />
        </div>

        {/* View Toggle & Upload Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Vista en Tabla"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Vista en Tarjetas"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenUploadModal}
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Documento</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-orange-500" />
          <span>Filtros Normativos y Alcance</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Scope Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Alcance
            </label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todos los Alcances</option>
              <option value="company">Empresa</option>
              <option value="establishment">Establecimiento / Planta</option>
              <option value="employee">Trabajador (Legajo)</option>
              <option value="organization">Organización General</option>
            </select>
          </div>

          {/* Category Filter (12 Categorías) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todas las Categorías ({DOCUMENT_CATEGORIES.length})</option>
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Expiration Filter Engine */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Estado de Vencimiento
            </label>
            <select
              value={selectedAlertLevel}
              onChange={(e) => setSelectedAlertLevel(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todos los Estados</option>
              <option value="expired">⚠️ Vencidos</option>
              <option value="critical_7d">🔴 Crítico (≤ 7 días)</option>
              <option value="urgent_15d">🟠 Urgente (≤ 15 días)</option>
              <option value="warning_30d">🟡 Advertencia (≤ 30 días)</option>
              <option value="notice_90d">🔵 Aviso (≤ 90 días)</option>
              <option value="valid">🟢 Vigentes (&gt; 90 días)</option>
              <option value="no_expiry">⚪ Sin vencimiento</option>
            </select>
          </div>

          {/* Company Context Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Empresa
            </label>
            <select
              value={activeCompanyId || ''}
              onChange={(e) => setActiveCompanyId(e.target.value || null)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Todas las Empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legalName || c.tradeName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-500">
          Mostrando {filteredDocuments.length} de {documents.length} documentos
        </span>
      </div>

      {/* Documents Render */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Cargando repositorio documental...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No se encontraron documentos con los filtros seleccionados
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Puedes cambiar los criterios de búsqueda o subir un nuevo documento técnico para comenzar.
          </p>
          <button
            onClick={onOpenUploadModal}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Subir Primer Documento
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Documento / Título</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Alcance / Asignación</th>
                  <th className="py-3 px-3">Emisión</th>
                  <th className="py-3 px-3">Vencimiento</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocuments.map((doc) => {
                  const alertStyle = getAlertLevelStyle(doc.expirationAlertLevel);
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => onSelectDocument(doc)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {doc.title}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {doc.filename} • v{doc.version || 1}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {doc.category}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                          {doc.employeeName || doc.establishmentName || doc.companyName || 'General'}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">
                          {doc.scope}
                        </p>
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                        {doc.issueDate || '—'}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {doc.expirationDate ? (
                          <div>
                            <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                              {doc.expirationDate}
                            </span>
                            {doc.daysUntilExpiration !== null && doc.daysUntilExpiration !== undefined && (
                              <p className={`text-[10px] font-bold ${alertStyle.textClass}`}>
                                {doc.daysUntilExpiration < 0
                                  ? `(Hace ${Math.abs(doc.daysUntilExpiration)}d)`
                                  : `(En ${doc.daysUntilExpiration}d)`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Permanente</span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${alertStyle.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${alertStyle.dotClass}`} />
                          {alertStyle.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onDownloadDocument(doc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Descargar archivo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRenewDocument(doc)}
                            className="p-1.5 rounded-lg text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                            title="Renovar versión"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectDocument(doc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const alertStyle = getAlertLevelStyle(doc.expirationAlertLevel);
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px] border border-slate-200 dark:border-slate-700">
                      {doc.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${alertStyle.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${alertStyle.dotClass}`} />
                      {alertStyle.label}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                    {doc.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{doc.companyName || 'General'}</span>
                  </p>

                  {doc.employeeName && (
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Legajo: {doc.employeeName}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Vencimiento</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      {doc.expirationDate || 'Permanente'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDownloadDocument(doc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Descargar"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRenewDocument(doc)}
                      className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                      title="Renovar versión"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
