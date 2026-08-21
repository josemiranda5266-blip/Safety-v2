import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Building2, 
  MapPin, 
  Layers, 
  ShieldCheck, 
  Activity,
  Wind
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { Position } from '../../types/tenant';

interface PositionsScreenProps {
  onOpenCreatePosition: () => void;
  onEditPosition: (position: Position) => void;
}

export const PositionsScreen: React.FC<PositionsScreenProps> = ({
  onOpenCreatePosition,
  onEditPosition,
}) => {
  const { 
    positions, 
    sectors, 
    establishments, 
    companies, 
    activeCompany, 
    activeCompanyId, 
    deletePosition 
  } = useTenant();

  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter based on active company
  const scopedPositions = positions.filter((p) => {
    const matchesCompany = !activeCompanyId || p.companyId === activeCompanyId;
    const matchesSearch = 
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCompany && matchesSearch;
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el puesto "${name}"?`)) {
      setDeletingId(id);
      try {
        await deletePosition(id);
      } catch (err: any) {
        alert(err.message || 'Error al eliminar puesto');
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
            <Briefcase className="w-7 h-7 text-purple-500" />
            <span>Puestos de Trabajo y Tareas</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeCompany 
              ? `Roles operativos y perfiles de riesgo de ${activeCompany.legalName}`
              : 'Definición de requerimientos de salud, EPP y exámenes periódicos (Res. SRT 37/10)'}
          </p>
        </div>

        <button
          id="btn-add-position"
          onClick={onOpenCreatePosition}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Puesto</span>
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
            placeholder="Buscar por Nombre del Puesto o Descripción..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>
      </div>

      {/* Positions Grid */}
      {scopedPositions.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <Briefcase className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            {search ? 'No se encontraron puestos coincidentes' : 'No hay puestos de trabajo registrados'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeCompany 
              ? `Crea los puestos de trabajo para vincular trabajadores y asignar EPPs en ${activeCompany.legalName}.`
              : 'Comienza definiendo los puestos y sus requisitos médicos y de protección.'}
          </p>
          <button
            onClick={onOpenCreatePosition}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
          >
            Registrar Puesto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scopedPositions.map((pos) => {
            const parentComp = companies.find((c) => c.id === pos.companyId);
            const parentEst = establishments.find((e) => e.id === pos.establishmentId);
            const parentSec = sectors.find((s) => s.id === pos.sectorId);

            return (
              <div
                key={pos.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm transition-all"
              >
                {/* Header */}
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                    {pos.title}
                  </h3>
                  <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {parentSec?.name || 'Sector General'}
                      </span>
                      <span>•</span>
                      <span className="truncate">{parentEst?.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">{parentComp?.legalName}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {pos.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {pos.description}
                  </p>
                )}

                {/* Surveillance & PPE badges */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  {pos.requiresAnnualAudiometry && (
                    <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <span>Audiometría Anual</span>
                    </div>
                  )}

                  {pos.requiresRespiratoryProtection && (
                    <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                      <Wind className="w-3 h-3" />
                      <span>Protección Respiratoria</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEditPosition(pos)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Editar Puesto"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(pos.id, pos.title)}
                    disabled={deletingId === pos.id}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Eliminar Puesto"
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
