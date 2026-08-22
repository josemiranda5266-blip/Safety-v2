import React, { useState, useEffect, useCallback } from 'react';
import { 
  FolderLock, 
  BarChart3, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  Plus, 
  RefreshCw,
  FolderOpen,
  ShieldCheck,
  Building2,
  FileCheck,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ProfessionalDocument, 
  DocumentDashboardMetrics, 
  DocumentCalendarEvent, 
  DocumentCategory 
} from '../../../types/documentManagement';
import { documentManagementService } from '../../../services/documentManagementService';
import { useTenant } from '../../../context/TenantContext';
import { DocumentsExplorer } from './DocumentsExplorer';
import { DocumentsDashboard } from './DocumentsDashboard';
import { DocumentsAlerts } from './DocumentsAlerts';
import { DocumentsCalendar } from './DocumentsCalendar';
import { DocumentsTemplates } from './DocumentsTemplates';
import { DocumentManagerModal } from './DocumentManagerModal';
import { DocumentDetailModal } from './DocumentDetailModal';
import { DocumentRenewModal } from './DocumentRenewModal';

interface DocumentsScreenProps {
  initialTab?: 'explorer' | 'dashboard' | 'alerts' | 'calendar' | 'templates';
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ initialTab = 'explorer' }) => {
  const { activeOrg, activeCompanyId } = useTenant();

  const [activeTab, setActiveTab] = useState<'explorer' | 'dashboard' | 'alerts' | 'calendar' | 'templates'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([]);
  const [metrics, setMetrics] = useState<DocumentDashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<ProfessionalDocument[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<DocumentCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<ProfessionalDocument | null>(null);
  const [renewDocument, setRenewDocument] = useState<ProfessionalDocument | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [docsData, metricsData, alertsData, eventsData] = await Promise.all([
        documentManagementService.getDocuments({ includeDeleted: false }),
        documentManagementService.getDashboardMetrics(),
        documentManagementService.getAlerts(),
        documentManagementService.getCalendarEvents(),
      ]);

      setDocuments(docsData);
      setMetrics(metricsData);
      setAlerts(alertsData);
      setCalendarEvents(eventsData);
    } catch (err) {
      console.error('[DocumentsScreen] Error loading documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, activeCompanyId]);

  const handleDocumentCreated = (newDoc: ProfessionalDocument) => {
    setDocuments((prev) => [newDoc, ...prev]);
    loadData();
  };

  const handleDocumentUpdated = (updatedDoc: ProfessionalDocument) => {
    setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
    if (selectedDocument?.id === updatedDoc.id) {
      setSelectedDocument(updatedDoc);
    }
    loadData();
  };

  const handleDocumentDeleted = (deletedId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
    if (selectedDocument?.id === deletedId) {
      setSelectedDocument(null);
    }
    loadData();
  };

  const handleFilterByCategoryFromDashboard = (category: DocumentCategory) => {
    setActiveTab('explorer');
  };

  const handleFilterByStatusFromDashboard = (alertLevel: string) => {
    setActiveTab('explorer');
  };

  const handleDownload = async (doc: ProfessionalDocument) => {
    try {
      await documentManagementService.downloadDocument(doc.id, doc.filename);
    } catch (err: any) {
      alert(err.message || 'Error al descargar archivo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <FolderLock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Gestor Documental Profesional
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600 border border-orange-500/20 uppercase tracking-wider">
                Fase 3 • SRT / ART
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Control técnico, archivo seguro en Storage, metadatos en Firestore y motor de vencimientos (90, 30, 15, 7 días)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Subir Documento</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl px-4 shadow-sm">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'explorer'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Repositorio & Filtros</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
            {documents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'dashboard'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Dashboard & KPIs</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Centro de Alertas</span>
          {alerts.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
              {alerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'calendar'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Calendario de Vencimientos</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Plantillas & Modelos SRT</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'explorer' && (
        <DocumentsExplorer
          documents={documents}
          isLoading={isLoading}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onSelectDocument={(doc) => setSelectedDocument(doc)}
          onRenewDocument={(doc) => setRenewDocument(doc)}
          onDownloadDocument={(doc) => handleDownload(doc)}
        />
      )}

      {activeTab === 'dashboard' && (
        <DocumentsDashboard
          metrics={metrics}
          isLoading={isLoading}
          onFilterByCategory={handleFilterByCategoryFromDashboard}
          onFilterByStatus={handleFilterByStatusFromDashboard}
        />
      )}

      {activeTab === 'alerts' && (
        <DocumentsAlerts
          alerts={alerts}
          isLoading={isLoading}
          onRenewDocument={(doc) => setRenewDocument(doc)}
          onSelectDocument={(doc) => setSelectedDocument(doc)}
          onDownloadDocument={(doc) => handleDownload(doc)}
        />
      )}

      {activeTab === 'calendar' && (
        <DocumentsCalendar
          events={calendarEvents}
          documents={documents}
          isLoading={isLoading}
          onSelectDocument={(doc) => setSelectedDocument(doc)}
        />
      )}

      {activeTab === 'templates' && (
        <DocumentsTemplates />
      )}

      {/* Modals */}
      {isUploadModalOpen && (
        <DocumentManagerModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleDocumentCreated}
        />
      )}

      {selectedDocument && (
        <DocumentDetailModal
          isOpen={Boolean(selectedDocument)}
          onClose={() => setSelectedDocument(null)}
          document={selectedDocument}
          onDocumentUpdated={handleDocumentUpdated}
          onDocumentDeleted={handleDocumentDeleted}
        />
      )}

      {renewDocument && (
        <DocumentRenewModal
          isOpen={Boolean(renewDocument)}
          onClose={() => setRenewDocument(null)}
          document={renewDocument}
          onSuccess={handleDocumentUpdated}
        />
      )}
    </div>
  );
};
