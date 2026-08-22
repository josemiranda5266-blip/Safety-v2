import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Briefcase, 
  Users, 
  FileCheck, 
  AlertTriangle, 
  ShieldAlert, 
  GraduationCap, 
  FileText, 
  Calendar, 
  BarChart3, 
  Settings, 
  Moon, 
  Sun,
  LayoutDashboard,
  HardHat,
  ChevronRight,
  Camera,
  Bot,
  Sparkles,
  MessageSquare,
  Eye,
  ListChecks,
  Scale,
  BookOpen,
  FolderGit2,
  FileSpreadsheet,
  Microscope,
  Menu,
  X,
  Zap,
  HelpCircle
} from 'lucide-react';
import { CompanySelector } from './Console/CompanySelector';
import { useTenant } from '../context/TenantContext';

export type TabType = 
  | 'dashboard'
  | 'home' 
  | 'companies'
  | 'establishments'
  | 'sectors'
  | 'positions'
  | 'employees'
  | 'inspections'
  | 'corrective_actions'
  | 'iper'
  | 'hygiene'
  | 'normative'
  | 'ppe'
  | 'trainings'
  | 'documentation'
  | 'calendar'
  | 'reports'
  | 'settings'
  // AI & Technical Modules
  | 'inspector_ia'
  | 'chat' 
  | 'upload' 
  | 'normative_center'
  | 'library' 
  | 'favorites' 
  | 'summaries' 
  | 'checklists' 
  | 'image_analysis' 
  | 'history';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  docsCount: number;
  onOpenCreateCompany?: () => void;
}

interface MenuItem {
  id: TabType;
  label: string;
  icon: any;
  badge?: string | number;
  isAI?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  docsCount,
  onOpenCreateCompany,
}) => {
  const { activeCompany, companies, establishments, sectors, positions, employees, canAccess } = useTenant();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Categorized Menu Sections
  const generalItems: MenuItem[] = ([
    { id: 'home', label: 'Consola SG-SST', icon: ShieldAlert },
    { id: 'dashboard', label: 'Dashboard KPIs', icon: LayoutDashboard },
  ] as MenuItem[]).filter(item => canAccess(item.id));

  const structureItems: MenuItem[] = ([
    { id: 'companies', label: 'Empresas', icon: Building2, badge: companies.length },
    { id: 'establishments', label: 'Establecimientos', icon: MapPin, badge: establishments.length },
    { id: 'sectors', label: 'Sectores', icon: Layers, badge: sectors.length },
    { id: 'positions', label: 'Puestos', icon: Briefcase, badge: positions.length },
    { id: 'employees', label: 'Nómina de Trabajadores', icon: Users, badge: employees.length },
  ] as MenuItem[]).filter(item => canAccess(item.id));

  const managementItems: MenuItem[] = ([
    { id: 'inspections', label: 'Inspecciones de Campo', icon: FileCheck },
    { id: 'corrective_actions', label: 'Acciones Correctivas (CAPA)', icon: AlertTriangle },
    { id: 'iper', label: 'Matriz IPER (Riesgos)', icon: ShieldAlert },
    { id: 'hygiene', label: 'Higiene & Mediciones SRT', icon: Microscope },
    { id: 'ppe', label: 'EPP & Indumentaria', icon: HardHat },
    { id: 'trainings', label: 'Capacitaciones', icon: GraduationCap },
    { id: 'documentation', label: 'Documentación SG-SST', icon: FileText, badge: docsCount > 0 ? docsCount : undefined },
    { id: 'calendar', label: 'Calendario & Vencimientos', icon: Calendar },
    { id: 'reports', label: 'Informes Técnicos', icon: BarChart3 },
  ] as MenuItem[]).filter(item => canAccess(item.id));

  const aiToolsItems: MenuItem[] = ([
    { id: 'inspector_ia', label: 'Inspector IA', icon: Camera, isAI: true, badge: 'PRO' },
    { id: 'chat', label: 'Asistente Normativo IA', icon: Sparkles, isAI: true },
    { id: 'image_analysis', label: 'Análisis Visual de Riesgos', icon: Eye, isAI: true },
    { id: 'checklists', label: 'Checklists de Campo', icon: ListChecks },
    { id: 'normative', label: 'Centro Normativo & Matriz', icon: Scale },
    { id: 'library', label: 'Biblioteca Técnica', icon: BookOpen },
    { id: 'summaries', label: 'Resúmenes Ejecutivos', icon: FileSpreadsheet },
  ] as MenuItem[]).filter(item => canAccess(item.id));

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setMobileDrawerOpen(false);
  };

  const renderNavGroup = (title: string, items: MenuItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1 pt-2">
        <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {title}
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? item.isAI
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-900/30'
                    : 'bg-orange-500 text-white shadow-md shadow-orange-900/30'
                  : item.isAI
                  ? 'text-amber-400/90 hover:bg-amber-500/10 hover:text-amber-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.isAI ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {item.isAI && (
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    IA
                  </span>
                )}
                {item.badge !== undefined && !item.isAI && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                    isActive ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand Title & Mobile Menu Trigger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition-colors"
              title="Abrir Menú de Módulos"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div 
              onClick={() => handleSelectTab('home')}
              className="flex items-center gap-2.5 cursor-pointer group shrink-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                    Safety <span className="text-orange-500">IA</span>
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 rounded-full">
                    V2 Consola
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden lg:block">
                  Higiene, Seguridad y Salud Ocupacional
                </p>
              </div>
            </div>
          </div>

          {/* Global Company Selector in Header */}
          <div className="flex-1 max-w-xs sm:max-w-sm hidden md:block">
            <CompanySelector onOpenCreateCompany={onOpenCreateCompany} />
          </div>

          {/* Quick Header IA Action Shortcuts */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Inspector IA Quick Button */}
            <button
              id="header-inspector-ia-btn"
              onClick={() => handleSelectTab('inspector_ia')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 sm:gap-2 transition-all shadow-sm active:scale-95 ${
                activeTab === 'inspector_ia'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-orange-500/30'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
              title="Abrir Inspector IA con Cámara y Detección de Riesgos"
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span className="hidden xs:inline sm:inline">Inspector IA</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PRO
              </span>
            </button>

            {/* AI Assistant Quick Button */}
            <button
              id="header-chat-ia-btn"
              onClick={() => handleSelectTab('chat')}
              className={`hidden sm:flex px-3 py-2 rounded-xl font-bold text-xs items-center gap-1.5 transition-all active:scale-95 ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white shadow-blue-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
              title="Consultar Asistente Normativo IA"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Asistente</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Profile / Role Badge */}
            <div 
              onClick={() => handleSelectTab('settings')}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-orange-500/20 cursor-pointer hover:scale-105 transition-transform"
              title="Configuración de Perfil"
            >
              HS
            </div>
          </div>
        </div>

        {/* Mobile Company Selector row */}
        <div className="px-4 pb-2 md:hidden border-t border-slate-100 dark:border-slate-800 pt-2">
          <CompanySelector onOpenCreateCompany={onOpenCreateCompany} />
        </div>
      </header>

      {/* Mobile Drawer Slide-Over */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 p-4 h-full flex flex-col justify-between overflow-y-auto z-10 animate-slide-in">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-orange-500" />
                  <span className="font-bold text-white text-sm">Menú de Módulos</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderNavGroup('General', generalItems)}
              {renderNavGroup('Estructura', structureItems)}
              {renderNavGroup('Gestión SG-SST', managementItems)}
              {renderNavGroup('Herramientas IA', aiToolsItems)}
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => handleSelectTab('settings')}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <Settings className="w-4 h-4" />
                <span>Configuración y Preferencias</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 md:hidden pb-safe">
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          <button
            onClick={() => handleSelectTab('home')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'home' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px]">Inicio</span>
          </button>

          <button
            onClick={() => handleSelectTab('companies')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'companies' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-[10px]">Empresas</span>
          </button>

          <button
            onClick={() => handleSelectTab('inspector_ia')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'inspector_ia' ? 'text-amber-400 font-extrabold' : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px] font-bold">Inspector IA</span>
          </button>

          <button
            onClick={() => handleSelectTab('employees')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'employees' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px]">Nómina</span>
          </button>

          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px]">Más</span>
          </button>
        </div>
      </nav>

      {/* Desktop Side Navigation Bar (Hierarchical Multi-Section Sidebar) */}
      <aside className="hidden md:flex fixed top-16 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 p-3.5 flex-col justify-between z-30 text-white overflow-y-auto space-y-4">
        <div className="space-y-3">
          {/* Active Company Breadcrumb Indicator in Sidebar */}
          {activeCompany ? (
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-400">
                Empresa en Contexto
              </span>
              <p className="font-extrabold text-white truncate">
                {activeCompany.legalName}
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Consola Multiempresa
              </span>
              <p className="font-bold text-slate-300">
                Vista Consolidada
              </p>
            </div>
          )}

          {/* Nav Groups */}
          {renderNavGroup('Principal', generalItems)}
          {renderNavGroup('Estructura Organizacional', structureItems)}
          {renderNavGroup('Gestión SG-SST', managementItems)}
          {renderNavGroup('Inteligencia Artificial & IA', aiToolsItems)}
        </div>

        {/* Sidebar Footer */}
        <div className="pt-3 border-t border-slate-800 space-y-1">
          <button
            onClick={() => handleSelectTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-orange-500 text-white'
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

