import React, { useState, useEffect } from 'react';
import { Navigation, TabType } from './components/Navigation';
import { DashboardScreen } from './components/Console/Dashboard/DashboardScreen';
import { ConsoleDashboard } from './components/Console/ConsoleDashboard';
import { CompaniesScreen } from './components/Console/CompaniesScreen';
import { EstablishmentsScreen } from './components/Console/EstablishmentsScreen';
import { SectorsScreen } from './components/Console/SectorsScreen';
import { PositionsScreen } from './components/Console/PositionsScreen';
import { EmployeesScreen } from './components/Console/EmployeesScreen';
import { DocumentsScreen } from './components/Console/Documents/DocumentsScreen';
import { SafetyScreen } from './components/Console/Safety/SafetyScreen';
import { InspectionsScreen } from './components/Console/Inspections/InspectionsScreen';
import { IPERScreen } from './components/Console/IPER/IPERScreen';
import { HygieneScreen } from './components/Console/Hygiene/HygieneScreen';
import { NormativeScreen } from './components/Console/Normative/NormativeScreen';
import { ModulePlaceholder } from './components/Console/ModulePlaceholder';
import { CompanyModal, EstablishmentModal, SectorModal, PositionModal } from './components/Console/EntityModals';
import { auditService } from './services/auditService';
import { useTenant, TenantProvider } from './context/TenantContext';
import { Company, Establishment, Sector, Position } from './types/tenant';

// Existing legacy tools preserved
import { HomeScreen } from './components/HomeScreen';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { ChatScreen } from './components/ChatScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { NormativeCenterScreen } from './components/NormativeCenterScreen';
import { InspectorIAScreen } from './components/InspectorIA/InspectorIAScreen';
import { FavoritesScreen } from './components/FavoritesScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { SummariesScreen } from './components/SummariesScreen';
import { ChecklistsScreen } from './components/ChecklistsScreen';
import { ImageAnalysisScreen } from './components/ImageAnalysisScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { DocumentItem } from './types/safety';
import { db } from './services/db';

function AppContent() {
  const { userRole, canAccess } = useTenant();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  useEffect(() => {
    auditService.logAction('TAB_ACCESS', 'Navigation', activeTab, 'user', { role: userRole });
  }, [activeTab, userRole]);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [docsCount, setDocsCount] = useState<number>(0);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);
  const [preselectedDocForSummary, setPreselectedDocForSummary] = useState<DocumentItem | null>(null);

  // Modals state for CRUD
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [isEstablishmentModalOpen, setIsEstablishmentModalOpen] = useState(false);
  const [editingEstablishment, setEditingEstablishment] = useState<Establishment | null>(null);

  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);

  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const refreshCounts = () => {
    setDocsCount(db.getDocuments().length);
    setFavoritesCount(db.getFavorites().length);
  };

  useEffect(() => {
    refreshCounts();
  }, [activeTab, showUploadModal]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleQuickQuery = (query: string) => {
    setInitialQuery(query);
    setActiveTab('chat');
  };

  const handleSelectDocForSummary = (doc: DocumentItem) => {
    setPreselectedDocForSummary(doc);
    setActiveTab('summaries');
  };

  return (
    <div className={`min-h-screen font-sans bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors ${isDarkMode ? 'dark' : ''}`}>
      {/* Top Header & Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'upload') {
            setShowUploadModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        docsCount={docsCount}
        onOpenCreateCompany={() => {
          setEditingCompany(null);
          setIsCompanyModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 md:pl-72 pb-24 md:pb-12">
        {/* H&S Professional Console Primary Screens (Phase 1) */}
        {canAccess('dashboard') && activeTab === 'dashboard' && (
          <DashboardScreen />
        )}
        
        {canAccess('home') && activeTab === 'home' && (
          <ConsoleDashboard
            onNavigateTab={(tab) => setActiveTab(tab as TabType)}
            onOpenCreateCompany={() => {
              setEditingCompany(null);
              setIsCompanyModalOpen(true);
            }}
            onOpenCreateEstablishment={() => {
              setEditingEstablishment(null);
              setIsEstablishmentModalOpen(true);
            }}
            onOpenCreateSector={() => {
              setEditingSector(null);
              setIsSectorModalOpen(true);
            }}
            onOpenCreatePosition={() => {
              setEditingPosition(null);
              setIsPositionModalOpen(true);
            }}
          />
        )}

        {activeTab === 'companies' && (
          <CompaniesScreen
            onOpenCreateCompany={() => {
              setEditingCompany(null);
              setIsCompanyModalOpen(true);
            }}
            onEditCompany={(company) => {
              setEditingCompany(company);
              setIsCompanyModalOpen(true);
            }}
          />
        )}

        {activeTab === 'establishments' && (
          <EstablishmentsScreen
            onOpenCreateEstablishment={() => {
              setEditingEstablishment(null);
              setIsEstablishmentModalOpen(true);
            }}
            onEditEstablishment={(establishment) => {
              setEditingEstablishment(establishment);
              setIsEstablishmentModalOpen(true);
            }}
          />
        )}

        {activeTab === 'sectors' && (
          <SectorsScreen
            onOpenCreateSector={() => {
              setEditingSector(null);
              setIsSectorModalOpen(true);
            }}
            onEditSector={(sector) => {
              setEditingSector(sector);
              setIsSectorModalOpen(true);
            }}
          />
        )}

        {activeTab === 'positions' && (
          <PositionsScreen
            onOpenCreatePosition={() => {
              setEditingPosition(null);
              setIsPositionModalOpen(true);
            }}
            onEditPosition={(position) => {
              setEditingPosition(position);
              setIsPositionModalOpen(true);
            }}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeesScreen />
        )}

        {(activeTab === 'documentation' || activeTab === 'calendar') && (
          <DocumentsScreen />
        )}

        {(activeTab === 'ppe' || activeTab === 'trainings') && (
          <SafetyScreen />
        )}

        {activeTab === 'inspections' && (
          <InspectionsScreen />
        )}

        {activeTab === 'iper' && (
          <IPERScreen />
        )}

        {activeTab === 'hygiene' && (
          <HygieneScreen />
        )}
        
        {activeTab === 'normative' && (
          <NormativeScreen />
        )}

        {/* Roadmap Modules with Context Placeholders */}
        {(activeTab === 'corrective_actions' ||
          activeTab === 'reports') && (
          <ModulePlaceholder
            moduleKey={activeTab}
            onNavigateHome={() => setActiveTab('home')}
          />
        )}

        {/* Existing Technical & AI Utilities preserved */}
        {activeTab === 'chat' && (
          <ChatScreen
            initialQuery={initialQuery}
            onClearInitialQuery={() => setInitialQuery(undefined)}
          />
        )}

        {activeTab === 'inspector_ia' && <InspectorIAScreen />}

        {activeTab === 'normative_center' && (
          <NormativeCenterScreen
            onOpenUpload={() => setShowUploadModal(true)}
            onSelectDocForSummary={handleSelectDocForSummary}
          />
        )}

        {activeTab === 'library' && (
          <LibraryScreen
            onOpenUpload={() => setShowUploadModal(true)}
            onSelectDocForSummary={handleSelectDocForSummary}
          />
        )}

        {activeTab === 'favorites' && <FavoritesScreen />}

        {activeTab === 'history' && (
          <HistoryScreen
            onSelectQueryToAsk={(q) => {
              setInitialQuery(q);
              setActiveTab('chat');
            }}
          />
        )}

        {activeTab === 'summaries' && (
          <SummariesScreen preselectedDoc={preselectedDocForSummary} />
        )}

        {activeTab === 'checklists' && <ChecklistsScreen />}

        {activeTab === 'image_analysis' && <ImageAnalysisScreen />}

        {activeTab === 'settings' && (
          <SettingsScreen
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            onDataReset={refreshCounts}
          />
        )}
      </main>

      {/* Entity CRUD Modals */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        initialData={editingCompany}
      />

      <EstablishmentModal
        isOpen={isEstablishmentModalOpen}
        onClose={() => setIsEstablishmentModalOpen(false)}
        initialData={editingEstablishment}
      />

      <SectorModal
        isOpen={isSectorModalOpen}
        onClose={() => setIsSectorModalOpen(false)}
        initialData={editingSector}
      />

      <PositionModal
        isOpen={isPositionModalOpen}
        onClose={() => setIsPositionModalOpen(false)}
        initialData={editingPosition}
      />

      {/* Upload Document Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            refreshCounts();
            setActiveTab('library');
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <TenantProvider>
      <AppContent />
    </TenantProvider>
  );
}
