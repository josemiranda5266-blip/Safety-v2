import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Building, MapPin, ExternalLink, Calendar, Search, AlertTriangle, ArrowRight } from 'lucide-react';
import { inspectionService } from '../../../services/inspectionService';
import { Inspection, Finding } from '../../../types/safety';
import { useTenant } from '../../../context/TenantContext';

export const InspectionsScreen: React.FC = () => {
  const { activeCompany, establishments } = useTenant();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInspections();
  }, [activeCompany?.id]);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const data = await inspectionService.getInspections();
      // Filter by active company if selected
      const filtered = activeCompany ? data.filter(i => i.companyId === activeCompany.id) : data;
      setInspections(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getEstablishmentName = (id: string) => {
    return establishments.find(e => e.id === id)?.name || id;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-orange-500" />
            <span>Inspecciones de Campo y Auditorías</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registro y seguimiento de auditorías preventivas y listas de control.
          </p>
        </div>
        
        {activeCompany && (
          <button
            onClick={() => {
              // Navigating to InspectorIA as the tool for new inspections
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'inspector_ia' }));
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Inspección (InspectorIA)</span>
          </button>
        )}
      </div>

      {!activeCompany && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 text-sm">
          Estás viendo todas las inspecciones de tu organización. Para registrar una nueva, selecciona una empresa en la barra superior.
        </div>
      )}

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando inspecciones...</div>
      ) : inspections.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sin Inspecciones</h3>
          <p className="text-slate-500 dark:text-slate-400">No hay inspecciones registradas para este contexto.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Tipo / Estado</th>
                <th className="px-4 py-3">Hallazgos</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {inspections.map(i => (
                <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-medium">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {i.date}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 dark:text-white">{getEstablishmentName(i.establishmentId)}</div>
                    {!activeCompany && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3" /> {i.companyId}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        {i.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        i.status === 'Closed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        i.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {i.status === 'Closed' ? 'Cerrada' : i.status === 'In Progress' ? 'En Progreso' : 'Abierta'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${i.findings.length > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                      <span className="font-bold">{i.findings.length} desvíos</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'inspector_ia' }))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Ver Detalle <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
