import React, { useState, useEffect } from 'react';
import { Navigation, TabType } from './components/Navigation';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [docsCount, setDocsCount] = useState<number>(0);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);
  const [preselectedDocForSummary, setPreselectedDocForSummary] = useState<DocumentItem | null>(null);

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
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 md:pl-72 pb-24 md:pb-12">
        {activeTab === 'home' && (
          <HomeScreen
            setActiveTab={(tab) => {
              if (tab === 'upload') {
                setShowUploadModal(true);
              } else {
                setActiveTab(tab);
              }
            }}
            docsCount={docsCount}
            favoritesCount={favoritesCount}
            onQuickQuery={handleQuickQuery}
          />
        )}

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
