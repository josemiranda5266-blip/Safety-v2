import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../../services/dashboardService';
import { useTenant } from '../../../context/TenantContext';
import { Activity, AlertTriangle, ShieldCheck, Target, Users, Microscope, CheckCircle, Clock } from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const { activeCompany, activeOrg } = useTenant();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id, activeOrg?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const stats = await dashboardService.getDashboardData(activeCompany?.id);
      setData(stats);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) return (
    <div className="flex items-center justify-center h-64 text-slate-500">
      <div className="animate-pulse flex flex-col items-center gap-2">
        <Activity className="w-8 h-8 text-indigo-500" />
        <span>Procesando KPI's...</span>
      </div>
    </div>
  );

  const monthlyTrend = Array.isArray(data.monthlyTrend) ? data.monthlyTrend : [];
  const maxTrend = Math.max(1, ...monthlyTrend.flatMap((item: any) => [Number(item.accidentes) || 0, Number(item.incidentes) || 0]));
  const totalCapas = (Number(data.closedCapas) || 0) + (Number(data.openCapas) || 0);
  const closureRate = totalCapas > 0 ? ((Number(data.closedCapas) || 0) / totalCapas) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-indigo-500" />
            <span>Inteligencia de Gestión (KPIs)</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Métricas de {activeCompany ? activeCompany.tradeName || activeCompany.legalName : 'toda la organización'}.
          </p>
        </div>
        <div className="text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-4 py-2 rounded-xl font-bold border border-indigo-100 dark:border-indigo-800/50">
          Cumplimiento Legal: {data.compliance}%
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
          <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-slate-500">Accidentes</span><div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500"><AlertTriangle className="w-4 h-4" /></div></div>
          <div><span className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.accidents}</span><span className="text-xs text-slate-400 ml-2">YTD</span></div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
          <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-slate-500">Casi Accidentes</span><div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-500"><Target className="w-4 h-4" /></div></div>
          <div><span className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.nearMisses}</span><span className="text-xs text-slate-400 ml-2">Reportes</span></div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
          <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-slate-500">Desvíos / CAPA</span><div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500"><ShieldCheck className="w-4 h-4" /></div></div>
          <div className="flex items-end gap-3"><div><span className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.openCapas}</span><span className="text-xs text-rose-500 font-bold ml-1">Abiertas</span></div><div className="text-xs text-emerald-500 font-bold mb-1">{data.closedCapas} Cerradas</div></div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
          <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-slate-500">Actividad</span><div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-500"><Users className="w-4 h-4" /></div></div>
          <div className="grid grid-cols-2 gap-2 text-center"><div><div className="text-xl font-extrabold text-slate-900 dark:text-white">{data.trainings}</div><div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cursos</div></div><div><div className="text-xl font-extrabold text-slate-900 dark:text-white">{data.inspections}</div><div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Auditorías</div></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Frecuencia de Accidentabilidad (YTD)</h3>
            <div className="flex gap-4 text-xs font-bold"><span>● Accidentes</span><span>● Incidentes</span></div>
          </div>
          <div className="h-[290px] flex items-end gap-2 border-b border-slate-200 dark:border-slate-700 px-2">
            {monthlyTrend.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">Sin datos mensuales disponibles</div>
            ) : monthlyTrend.map((item: any, index: number) => {
              const accidents = Number(item.accidentes) || 0;
              const incidents = Number(item.incidentes) || 0;
              const accidentHeight = `${Math.max(3, (accidents / maxTrend) * 100)}%`;
              const incidentHeight = `${Math.max(3, (incidents / maxTrend) * 100)}%`;
              return (
                <div key={`${item.name || 'month'}-${index}`} className="flex-1 h-full flex flex-col justify-end items-center gap-1 min-w-0">
                  <div className="flex items-end justify-center gap-1 w-full h-full">
                    <div title={`Accidentes: ${accidents}`} className="w-2/5 max-w-6 rounded-t bg-red-400" style={{ height: accidentHeight }} />
                    <div title={`Incidentes: ${incidents}`} className="w-2/5 max-w-6 rounded-t bg-amber-400" style={{ height: incidentHeight }} />
                  </div>
                  <span className="text-[10px] text-slate-500 truncate max-w-full">{item.name || index + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-[400px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Gestión de Hallazgos y CAPA</h3>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="w-full max-w-sm mb-8">
              <div className="flex justify-between text-sm font-bold mb-2"><span className="text-emerald-600 dark:text-emerald-400">Desvíos Cerrados ({data.closedCapas})</span><span className="text-rose-600 dark:text-rose-400">Abiertos ({data.openCapas})</span></div>
              <div className="w-full h-4 bg-rose-100 dark:bg-rose-900/30 rounded-full overflow-hidden flex"><div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${closureRate}%` }} /></div>
              <p className="text-center text-xs text-slate-500 mt-3 font-medium">Tasa de Cierre de Acciones Correctivas</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center border border-slate-100 dark:border-slate-800"><CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" /><div className="text-2xl font-extrabold text-slate-900 dark:text-white">{data.compliance}%</div><div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cumplimiento Legal</div></div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center border border-slate-100 dark:border-slate-800"><Microscope className="w-6 h-6 text-indigo-500 mx-auto mb-2" /><div className="text-2xl font-extrabold text-slate-900 dark:text-white">{data.measurements}</div><div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mediciones Hig.</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
