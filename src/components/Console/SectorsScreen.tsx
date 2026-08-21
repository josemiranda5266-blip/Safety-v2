import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Building2, 
  MapPin, 
  Volume2, 
  ShieldAlert,
  Briefcase
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { Sector } from '../../types/tenant';

interface SectorsScreenProps {
  onOpenCreateSector: () => void;
  onEditSector: (sector: Sector) => void;
}

export const SectorsScreen: React.FC<SectorsScreenProps> = ({
  onOpenCreateSector,
  onEditSector,
}) => {
  const { 
    sectors, 
    establishments, 
    companies, 
    activeCompany, 
    activeCompanyId, 
    positions, 
    deleteSector 
  } = useTenant();

  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter based on active company
  const scopedSectors = sectors.filter((s) => {
    const matchesCompany = !activeCompanyId || s.companyId === activeCompanyId;
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
      (s.responsibleName && s.responsibleName.toLowerCase().includes(search.toLowerCase()));
    return matchesCompany && matchesSearch;
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el sector "${name}"?`)) {
      setDeletingId(id);
      try {
        await deleteSector(id);
      } catch (err: any) {
        alert(err.message || 'Error al eliminar sector');
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
            <Layers className="w-7 h-7 text-blue-500" />
            <span>Sectores y Áreas Operativas</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeCompany 
              ? `Subdivisiones y naves industriales de ${activeCompany.legalName}`
              : 'Gestión de áreas de trabajo, niveles sonoros y exigencias de EPP'}
          </p>
        </div>

        <button
          id="btn-add-sector"
          onClick={onOpenCreateSector}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Sector</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Nombre del Sector, Responsable o Descripción..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Sectors Grid */}
      {scopedSectors.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <Layers className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            {search ? 'No se encontraron sectores coincidentes' : 'No hay sectores registrados'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeCompany 
              ? `Define las áreas de trabajo para los establecimientos de ${activeCompany.legalName}.`
              : 'Crea los sectores para clasificar puestos y evaluar riesgos higiénicos.'}
          </p>
          <button
            onClick={onOpenCreateSector}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
          >
            Registrar Sector
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scopedSectors.map((sec) => {
            const parentComp = companies.find((c) => c.id === sec.companyId);
            const parentEst = establishments.find((e) => e.id === sec.establishmentId);
            const sectorPositions = positions.filter((p) => p.sectorId === sec.id);

            return (
              <div
                key={sec.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm transition-all"
              >
                {/* Header */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                      {sec.name}
                    </h3>
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {parentEst?.name || 'Establecimiento no asignado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">{parentComp?.legalName}</span>
                    </div>
                  </div>
                </div>

                {/* Description & Responsible */}
                {sec.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {sec.description}
                  </p>
                )}

                {/* Risk Indicators */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  {sec.noiseLevelEstimatedDBA ? (
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                      sec.noiseLevelEstimatedDBA >= 85 
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      <Volume2 className="w-3 h-3" />
                      <span>{sec.noiseLevelEstimatedDBA} dBA</span>
                    </div>
                  ) : null}

                  {sec.requiresSpecificPPE && (
                    <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      <span>EPP Obligatorio</span>
                    </div>
                  )}

                  <div className="ml-auto text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sectorPositions.length} puestos</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEditSector(sec)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Editar Sector"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(sec.id, sec.name)}
                    disabled={deletingId === sec.id}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Eliminar Sector"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
