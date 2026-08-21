import React from 'react';
import { 
  FileText, 
  Bot, 
  BookOpen, 
  Star, 
  FileCheck, 
  CheckSquare, 
  Camera, 
  Settings, 
  Moon, 
  Sun,
  ShieldAlert,
  History,
  HardDrive,
  Building2
} from 'lucide-react';

export type TabType = 
  | 'home' 
  | 'upload' 
  | 'chat' 
  | 'inspector_ia'
  | 'normative_center'
  | 'library' 
  | 'favorites' 
  | 'summaries' 
  | 'checklists' 
  | 'image_analysis' 
  | 'history'
  | 'settings';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  docsCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  docsCount,
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand Title for Mobile */}
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                  Safety <span className="text-orange-500">IA</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 rounded-full">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Higiene y Seguridad Laboral
              </p>
            </div>
          </div>

          {/* Top Search & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('library')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Ver Biblioteca de Documentos"
            >
              <BookOpen className="w-3.5 h-3.5 text-orange-500" />
              <span className="font-bold">{docsCount}</span>
              <span className="hidden md:inline text-slate-500 dark:text-slate-400">normas</span>
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20 ml-1">
              HS
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navigation Bar for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 md:hidden pb-safe">
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'home' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            <span className="text-[10px]">Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'chat' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span className="text-[10px]">Consultar</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className="flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 -mt-5 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[10px] mt-1 text-orange-500 font-semibold">Cargar</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'library' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px]">Biblioteca</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'favorites' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Star className="w-5 h-5" />
            <span className="text-[10px]">Favoritos</span>
          </button>
        </div>
      </nav>

      {/* Desktop Side Navigation Bar (Sleek Sidebar) */}
      <aside className="hidden md:flex fixed top-16 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 p-4 flex-col justify-between z-30 text-white">
        <div className="space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Módulos Principales
          </div>

          <button
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'home'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            <span>Panel Principal</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'chat'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span>Asistente IA</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Cargar Docs</span>
          </button>

          <button
            onClick={() => setActiveTab('inspector_ia')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
              activeTab === 'inspector_ia'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-lg shadow-orange-950/40 scale-[1.02]'
                : 'bg-orange-950/30 text-orange-400 border-orange-500/30 hover:bg-orange-900/40 hover:text-orange-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-orange-400" />
              <span>Inspector IA</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-orange-500 text-slate-950 rounded-md">
              Módulo
            </span>
          </button>

          <button
            onClick={() => setActiveTab('normative_center')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'normative_center'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-900/30'
                : 'text-amber-400 hover:bg-slate-800 hover:text-amber-300'
            }`}
          >
            <Building2 className="w-5 h-5 text-amber-400" />
            <span>Centro Normativo</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'library'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Biblioteca Técnica</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'favorites'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Star className="w-5 h-5" />
            <span>Favoritos</span>
          </button>

          <button
            onClick={() => setActiveTab('summaries')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'summaries'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileCheck className="w-5 h-5" />
            <span>Resúmenes</span>
          </button>

          <button
            onClick={() => setActiveTab('checklists')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'checklists'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span>Checklists</span>
          </button>

          <button
            onClick={() => setActiveTab('image_analysis')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'image_analysis'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Analizar Foto</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <History className="w-5 h-5" />
            <span>Historial</span>
          </button>
        </div>

        {/* Sidebar Footer Info Card */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <HardDrive className="w-3 h-3 text-orange-400" />
              <span>Base Local Indexada</span>
            </p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-1.5 rounded-full w-[70%]" />
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {docsCount} Docs • Indexación RAG
            </p>
          </div>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configuración</span>
          </button>
        </div>
      </aside>
    </>
  );
};

