import React, { useState } from 'react';
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Building2, 
  Layers, 
  Users, 
  CheckCircle2,
  HardHat,
  Zap,
  Maximize2
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { Establishment } from '../../types/tenant';

interface EstablishmentsScreenProps {
  onOpenCreateEstablishment: () => void;
  onEditEstablishment: (establishment: Establishment) => void;
}

export const EstablishmentsScreen: React.FC<EstablishmentsScreenProps> = ({
  onOpenCreateEstablishment,
  onEditEstablishment,
}) => {
  const { 
    establishments, 
    companies, 
    activeCompany, 
    activeCompanyId, 
    sectors, 
    deleteEstablishment 
  } = useTenant();

  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter based on active company if selected, plus search query
  const scopedEstablishments = establishments.filter((e) => {
    const matchesCompany = !activeCompanyId || e.companyId === activeCompanyId;
    const matchesSearch = 
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      e.province.toLowerCase().includes(search.toLowerCase()) ||
      (e.address && e.address.toLowerCase().includes(search.toLowerCase()));
    return matchesCompany && matchesSearch;
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el establecimiento "${name}"?`)) {
      setDeletingId(id);
      try {
        await deleteEstablishment(id);
      } catch (err: any) {
        alert(err.message || 'Error al eliminar establecimiento');
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
            <MapPin className="w-7 h-7 text-amber-500" />
            <span>Establecimientos y Plantas Operativas</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeCompany 
              ? `Centros de trabajo y sucursales de ${activeCompany.legalName}`
              : 'Padrón consolidado de establecimientos en todas las empresas'}
          </p>
        </div>

        <button
          id="btn-add-establishment"
          onClick={onOpenCreateEstablishment}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Establecimiento</span>
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
            placeholder="Buscar por Nombre, Dirección, Localidad o Provincia..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>

      {/* Grid */}
      {scopedEstablishments.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <MapPin className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            {search ? 'No se encontraron establecimientos coincidentes' : 'No hay establecimientos registrados'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeCompany 
              ? `Registra la primera planta o sede operativa para ${activeCompany.legalName}.`
              : 'Selecciona una empresa o registra un establecimiento para comenzar.'}
          </p>
          <button
            onClick={onOpenCreateEstablishment}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
          >
            Registrar Establecimiento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scopedEstablishments.map((est) => {
            const parentComp = companies.find((c) => c.id === est.companyId);
            const estSectors = sectors.filter((s) => s.establishmentId === est.id);

            return (
              <div
                key={est.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-sm transition-all relative"
              >
                {/* Header */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                      {est.name}
                    </h3>
                    {est.isConstructionSite && (
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded shrink-0 flex items-center gap-1">
                        <HardHat className="w-3 h-3" />
                        <span>OBRA</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {parentComp?.legalName || 'Empresa Desconocida'}
                    </span>
                  </div>
                </div>

                {/* Location Details */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-medium">
                    {est.address}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {est.city}, {est.province} {est.postalCode ? `(CP ${est.postalCode})` : ''}
                  </p>
                </div>

                {/* Technical Parameters */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{est.totalWorkers || 0} operarios</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>{estSectors.length} sectores</span>
                  </div>
                  {est.surfaceM2 && (
                    <div className="flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-purple-500" />
                      <span>{est.surfaceM2} m²</span>
                    </div>
                  )}
                  {est.installedPowerKW && (
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>{est.installedPowerKW} kW</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEditEstablishment(est)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Editar Establecimiento"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(est.id, est.name)}
                    disabled={deletingId === est.id}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Eliminar Establecimiento"
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
