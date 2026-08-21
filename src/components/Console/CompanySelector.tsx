import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Check, 
  ChevronDown, 
  Layers, 
  ShieldCheck, 
  MapPin, 
  Briefcase, 
  Sparkles,
  Building,
  ArrowRight
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

interface CompanySelectorProps {
  onOpenCreateCompany?: () => void;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({ onOpenCreateCompany }) => {
  const { 
    companies, 
    activeCompany, 
    activeCompanyId, 
    setActiveCompanyId, 
    establishments, 
    sectors, 
    positions,
    activeOrg,
    loading 
  } = useTenant();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Compute counts for active company
  const compEstablishments = establishments.filter((e) => !activeCompanyId || e.companyId === activeCompanyId);
  const compSectors = sectors.filter((s) => !activeCompanyId || s.companyId === activeCompanyId);
  const compPositions = positions.filter((p) => !activeCompanyId || p.companyId === activeCompanyId);

  return (
    <div className="relative">
      <button
        id="global-company-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all text-left max-w-xs sm:max-w-md w-full group"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
          activeCompany 
            ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' 
            : 'bg-slate-700 text-slate-200'
        }`}>
          {activeCompany ? (
            <Building2 className="w-4 h-4" />
          ) : (
            <Layers className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              {activeCompany ? 'Empresa Activa' : 'Vista Global'}
            </span>
            {activeCompany && (
              <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded">
                CUIT: {activeCompany.cuit}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {activeCompany ? activeCompany.legalName : `Todas las empresas (${companies.length})`}
          </p>
        </div>

        <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
            {/* Header info */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Organización H&S
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                  {activeOrg?.plan.toUpperCase() || 'PRO'}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                {activeOrg?.name || 'Mi Consultora H&S'}
              </p>
            </div>

            {/* List Option: All Companies (Global View) */}
            <button
              id="select-all-companies-btn"
              onClick={() => {
                setActiveCompanyId(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                !activeCompanyId 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold">Vista Global (Consolidada)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Todas las empresas ({companies.length})
                  </div>
                </div>
              </div>
              {!activeCompanyId && <Check className="w-4 h-4 text-amber-500" />}
            </button>

            {/* Company Items */}
            <div className="max-h-60 overflow-y-auto space-y-1 py-1">
              {companies.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No hay empresas registradas aún.
                </div>
              ) : (
                companies.map((comp) => {
                  const estCount = establishments.filter((e) => e.companyId === comp.id).length;
                  const isSelected = activeCompanyId === comp.id;
                  return (
                    <button
                      key={comp.id}
                      id={`select-company-${comp.id}`}
                      onClick={() => {
                        setActiveCompanyId(comp.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {comp.legalName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold truncate">{comp.legalName}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>CUIT: {comp.cuit}</span>
                            <span>•</span>
                            <span>{estCount} estab.</span>
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-500 shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Action: Create Company */}
            {onOpenCreateCompany && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  id="open-create-company-modal-btn"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCreateCompany();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Empresa Cliente</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
