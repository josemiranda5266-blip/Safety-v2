import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  MapPin, 
  Layers, 
  Users, 
  ExternalLink,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { Company } from '../../types/tenant';

interface CompaniesScreenProps {
  onOpenCreateCompany: () => void;
  onEditCompany: (company: Company) => void;
}

export const CompaniesScreen: React.FC<CompaniesScreenProps> = ({
  onOpenCreateCompany,
  onEditCompany,
}) => {
  const { 
    companies, 
    activeCompanyId, 
    setActiveCompanyId, 
    establishments, 
    deleteCompany, 
    loading 
  } = useTenant();

  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredCompanies = companies.filter((c) => 
    c.legalName.toLowerCase().includes(search.toLowerCase()) ||
    c.cuit.includes(search) ||
    (c.tradeName && c.tradeName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas dar de baja a la empresa "${name}"?`)) {
      setDeletingId(id);
      try {
        await deleteCompany(id);
      } catch (err: any) {
        alert(err.message || 'Error al eliminar empresa');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-orange-500" />
            <span>Padrón de Empresas Clientes</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administración de razones sociales, CUITs, aseguradoras ART y asignación de consultoría.
          </p>
        </div>

        <button
          id="btn-add-company"
          onClick={onOpenCreateCompany}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Empresa</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Razón Social, CUIT o Nombre Fantasía..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
        </div>
      </div>

      {/* Companies List / Grid */}
      {filteredCompanies.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            {search ? 'No se encontraron empresas coincidentes' : 'No hay empresas registradas aún'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Comienza dando de alta la primera empresa para estructurar sus establecimientos y puestos de trabajo.
          </p>
          <button
            onClick={onOpenCreateCompany}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
          >
            Registrar Primera Empresa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((comp) => {
            const compEsts = establishments.filter((e) => e.companyId === comp.id);
            const totalWorkers = compEsts.reduce((acc, curr) => acc + (curr.totalWorkers || 0), 0);
            const isSelected = activeCompanyId === comp.id;

            return (
              <div
                key={comp.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-sm transition-all relative ${
                  isSelected 
                    ? 'border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Active Indicator Badge */}
                {isSelected && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>EMPRESA ACTIVA</span>
                  </div>
                )}

                {/* Company Header */}
                <div className="space-y-1 pr-16">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                    {comp.legalName}
                  </h3>
                  {comp.tradeName && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {comp.tradeName}
                    </p>
                  )}
                  <div className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-mono font-semibold">
                    CUIT: {comp.cuit}
                  </div>
                </div>

                {/* Metadata & ART */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {comp.artInsuranceName && (
                    <div className="flex items-center justify-between">
                      <span>ART:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {comp.artInsuranceName} {comp.artPolicyNumber ? `(#${comp.artPolicyNumber})` : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Establecimientos:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {compEsts.length} plantas
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Personal Estimado:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {totalWorkers} operarios
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setActiveCompanyId(comp.id)}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 cursor-default'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {isSelected ? 'Seleccionada' : 'Seleccionar Empresa'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCompany(comp)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                      title="Editar Empresa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id, comp.legalName)}
                      disabled={deletingId === comp.id}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Dar de baja"
                    >
                      <Trash2 className="w-4 h-4" />
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
