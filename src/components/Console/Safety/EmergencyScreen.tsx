import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Users, Map, FileText, Calendar, ShieldCheck, Siren } from 'lucide-react';
import { emergencyService } from '../../../services/emergencyService';
import { EmergencyPlan } from '../../../types/safety';
import { useTenant } from '../../../context/TenantContext';

export const EmergencyScreen: React.FC = () => {
  const { activeCompany } = useTenant();
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await emergencyService.getPlans(activeCompany?.id);
      setPlans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Siren className="w-6 h-6 text-yellow-500" />
            <span>Planes de Emergencia y Evacuación</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión de roles, simulacros y planimetrías de evacuación.
          </p>
        </div>
        
        {activeCompany && (
          <button className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl font-bold transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nuevo Plan
          </button>
        )}
      </div>

      {!activeCompany && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 text-sm">
          Selecciona una empresa para gestionar sus planes de contingencia y roles de evacuación.
        </div>
      )}

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando planes de emergencia...</div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Sin Planes Registrados</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            {activeCompany ? 'No se han definido roles ni planes de emergencia.' : 'Selecciona una empresa.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:border-yellow-300 dark:hover:border-yellow-700/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.planName}</h3>
                <span className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border border-yellow-200 dark:border-yellow-800/50">
                  Activo
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-slate-400" /> Escenarios
                  </div>
                  <ul className="text-xs text-slate-500 pl-5 list-disc space-y-0.5">
                    {plan.scenarios.map((s, i) => <li key={i} className="truncate">{s}</li>)}
                  </ul>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Users className="w-4 h-4 text-slate-400" /> Brigadas
                  </div>
                  <ul className="text-xs text-slate-500 pl-5 list-disc space-y-0.5">
                    {plan.brigades.map((b, i) => <li key={i} className="truncate">{b}</li>)}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors">
                  <Map className="w-4 h-4" /> Planos
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors">
                  <Calendar className="w-4 h-4" /> Simulacros ({plan.drills?.length || 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
