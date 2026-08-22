import React, { useEffect, useState } from 'react';
import { eppService } from '../../../services/eppService';
import { EPPItem, EPPAssignment } from '../../../types/safety';
import { useTenant } from '../../../context/TenantContext';
import { HardHat, ShieldCheck, FileSignature, Database, FileText, CheckCircle, Clock, Plus } from 'lucide-react';

export const EPPScreen: React.FC = () => {
  const { activeCompany } = useTenant();
  const [catalog, setCatalog] = useState<EPPItem[]>([]);
  const [assignments, setAssignments] = useState<EPPAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedCatalog = await eppService.getCatalog();
      setCatalog(fetchedCatalog);
      const fetchedAssignments = await eppService.getAssignments(activeCompany?.id);
      setAssignments(fetchedAssignments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await eppService.seedCatalog();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <HardHat className="w-6 h-6 text-orange-500" />
            <span>Elementos de Protección Personal (Res. 299/11)</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión de EPP, constancias de entrega y control de renovaciones.
          </p>
        </div>
        
        {catalog.length === 0 ? (
          <button 
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-xl font-bold hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
          >
            <Database className="w-4 h-4" /> 
            {seeding ? 'Cargando Catálogo...' : 'Cargar Catálogo Base'}
          </button>
        ) : activeCompany && (
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm transition-colors">
            <FileSignature className="w-4 h-4" /> Registrar Entrega
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando EPPs...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Col 1: Catálogo */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-500" /> Catálogo Autorizado
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {catalog.length === 0 ? (
                <div className="text-sm text-slate-500 p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center">
                  Catálogo de EPP vacío.
                </div>
              ) : catalog.map(item => (
                <div key={item.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-start justify-between group">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2 & 3: Entregas */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" /> Historial de Entregas
            </h3>
            
            {!activeCompany ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                <HardHat className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Selecciona una Empresa</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                  Selecciona una empresa en el menú superior para ver su historial de entrega de indumentaria y EPP.
                </p>
              </div>
            ) : assignments.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
                <FileSignature className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Sin Entregas Registradas</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mb-6">
                  No hay registros de entrega para {activeCompany.tradeName || activeCompany.legalName}. Comienza a registrar entregas para generar la constancia (Res. 299/11).
                </p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm transition-colors">
                  <Plus className="w-4 h-4" /> Nueva Entrega
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-3">Trabajador</th>
                      <th className="px-4 py-3">Elemento Entregado</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Estado / Firma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {assignments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {a.workerName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{a.itemName}</div>
                          <div className="text-xs text-slate-500">Cant: {a.quantity}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(a.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {a.signatureUrl ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                              <CheckCircle className="w-3.5 h-3.5"/> Firmado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
                              <Clock className="w-3.5 h-3.5"/> Pendiente Firma
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
