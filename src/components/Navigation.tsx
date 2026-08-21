import React from 'react';
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
  ChevronRight
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
  | 'ppe'
  | 'trainings'
  | 'documentation'
  | 'calendar'
  | 'reports'
  | 'settings'
  // Existing modules preserved
  | 'chat' 
  | 'upload' 
  | 'inspector_ia'
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

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  docsCount,
  onOpenCreateCompany,
}) => {
  const { activeCompany, companies, establishments, sectors, positions, canAccess } = useTenant();

  // Sidebar Menu Items based on requirement:
  // Inicio, Empresas, Establecimientos, Sectores, Puestos, Trabajadores, Inspecciones, Acciones correctivas, EPP, Capacitaciones, Documentación, Calendario, Informes
  const primaryMenuItems = ([
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'home', label: 'Consola', icon: ShieldAlert },
    { id: 'companies', label: 'Empresas', icon: Building2, badge: companies.length },
    { id: 'establishments', label: 'Establecimientos', icon: MapPin, badge: establishments.length },
    { id: 'sectors', label: 'Sectores', icon: Layers, badge: sectors.length },
    { id: 'positions', label: 'Puestos', icon: Briefcase, badge: positions.length },
    { id: 'employees', label: 'Trabajadores', icon: Users },
    { id: 'inspections', label: 'Inspecciones', icon: FileCheck },
    { id: 'corrective_actions', label: 'Acciones Correctivas', icon: AlertTriangle },
    { id: 'ppe', label: 'EPP', icon: HardHat },
    { id: 'trainings', label: 'Capacitaciones', icon: GraduationCap },
    { id: 'documentation', label: 'Documentación', icon: FileText },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'reports', label: 'Informes', icon: BarChart3 },
  ] as { id: TabType; label: string; icon: any; badge?: string | number }[]).filter(item => canAccess(item.id));

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand Title */}
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                  Safety <span className="text-orange-500">IA</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 rounded-full">
                  V2 Consola
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Higiene, Seguridad y Salud Ocupacional
              </p>
            </div>
          </div>

          {/* Global Company Selector in Header */}
          <div className="flex-1 max-w-sm hidden sm:block">
            <CompanySelector onOpenCreateCompany={onOpenCreateCompany} />
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-orange-500/20 ml-1">
              HS
            </div>
          </div>
        </div>

        {/* Mobile Company Selector row */}
        <div className="px-4 pb-2 sm:hidden border-t border-slate-100 dark:border-slate-800 pt-2">
          <CompanySelector onOpenCreateCompany={onOpenCreateCompany} />
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
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px]">Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('companies')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'companies' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px]">Empresas</span>
          </button>

          <button
            onClick={() => setActiveTab('establishments')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'establishments' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-[10px]">Plantas</span>
          </button>

          <button
            onClick={() => setActiveTab('sectors')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'sectors' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px]">Sectores</span>
          </button>

          <button
            onClick={() => setActiveTab('positions')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'positions' ? 'text-orange-500 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span className="text-[10px]">Puestos</span>
          </button>
        </div>
      </nav>

      {/* Desktop Side Navigation Bar (Hierarchical Sidebar Req 4) */}
      <aside className="hidden md:flex fixed top-16 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 p-4 flex-col justify-between z-30 text-white overflow-y-auto">
        <div className="space-y-1">
          {/* Active Company Breadcrumb Indicator in Sidebar */}
          {activeCompany ? (
            <div className="mb-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-400">
                Empresa en Contexto
              </span>
              <p className="font-extrabold text-white truncate">
                {activeCompany.legalName}
              </p>
            </div>
          ) : (
            <div className="mb-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Consola Multiempresa
              </span>
              <p className="font-bold text-slate-300">
                Vista Consolidada
              </p>
            </div>
          )}

          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Estructura SG-SST
          </div>

          {primaryMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-900/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                    isActive ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="pt-3 border-t border-slate-800 space-y-1">
          <button
            onClick={() => setActiveTab('settings')}
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
