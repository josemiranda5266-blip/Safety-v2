import React, { useState, useEffect } from 'react';
import { iperService } from '../../../services/iperService';
import { IPERMatrix, IPEREntry } from '../../../types/safety';
import { useTenant } from '../../../context/TenantContext';
import { ShieldAlert, Plus, Save, AlertTriangle, ArrowRight, Activity, AlertCircle } from 'lucide-react';

export const IPERScreen: React.FC = () => {
  const { activeCompany, establishments, activeOrgId } = useTenant();
  const [matrices, setMatrices] = useState<IPERMatrix[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id, activeOrgId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetched = await iperService.getMatrices(activeCompany?.id);
      setMatrices(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: number) => {
    if (level >= 16) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'; // Intolerable
    if (level >= 9) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'; // Importante
    if (level >= 4) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'; // Moderado
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'; // Tolerable
  };

  const getRiskLabel = (level: number) => {
    if (level >= 16) return 'Crítico';
    if (level >= 9) return 'Alto';
    if (level >= 4) return 'Medio';
    return 'Bajo';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
            <span>Matriz de Riesgos (IPER)</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Identificación de Peligros y Evaluación de Riesgos por puesto de trabajo.
          </p>
        </div>
        
        {activeCompany && (
          <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm transition-colors">
            <Plus className="w-5 h-5" />
            <span>Nueva Matriz IPER</span>
          </button>
        )}
      </div>

      {!activeCompany && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            Selecciona una empresa en el menú superior para gestionar o visualizar sus Matrices IPER.
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando matrices IPER...</div>
      ) : matrices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <Activity className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Sin Matrices</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeCompany ? 'No hay matrices de riesgos registradas para esta empresa.' : 'Selecciona un contexto para ver los riesgos.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {matrices.map(matrix => {
            const currentVersion = matrix.versions.find(v => v.version === matrix.currentVersion) || matrix.versions[0];
            const estab = establishments.find(e => e.id === matrix.establishmentId);
            
            return (
              <div key={matrix.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Matriz IPER - Sector: {matrix.sectorId}</h3>
                    <p className="text-xs text-slate-500 mt-1">Establecimiento: {estab?.name || matrix.establishmentId}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold">
                      v{currentVersion?.version || 1}.0
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">Act. {new Date(currentVersion?.date || '').toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-3">Tarea / Actividad</th>
                        <th className="px-4 py-3">Peligro</th>
                        <th className="px-4 py-3">Riesgo</th>
                        <th className="px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800">Riesgo Inicial</th>
                        <th className="px-4 py-3 border-l border-slate-200 dark:border-slate-800">Controles Propuestos</th>
                        <th className="px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800">Riesgo Residual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {currentVersion?.entries?.length > 0 ? currentVersion.entries.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{entry.taskName}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                              <span>{entry.hazard}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">{entry.risk}</td>
                          
                          {/* Initial Eval */}
                          <td className="px-4 py-3 text-center border-l border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskColor(entry.initialEvaluation.level)}`}>
                                {getRiskLabel(entry.initialEvaluation.level)} ({entry.initialEvaluation.level})
                              </span>
                              <span className="text-[9px] text-slate-400">P:{entry.initialEvaluation.probability} x S:{entry.initialEvaluation.severity}</span>
                            </div>
                          </td>

                          {/* Controls */}
                          <td className="px-4 py-3 border-l border-slate-100 dark:border-slate-800 text-xs">
                            <ul className="list-disc pl-3 space-y-0.5 text-slate-600 dark:text-slate-400">
                              {entry.controls.engineering?.map((c, i) => <li key={i}>{c}</li>)}
                              {entry.controls.administrative?.map((c, i) => <li key={i}>{c}</li>)}
                              {entry.controls.ppe?.map((c, i) => <li key={`ppe-${i}`}>EPP: {c}</li>)}
                              {(!entry.controls.engineering?.length && !entry.controls.administrative?.length && !entry.controls.ppe?.length) && 
                                <li className="text-slate-400 italic">Sin controles</li>
                              }
                            </ul>
                          </td>

                          {/* Residual Eval */}
                          <td className="px-4 py-3 text-center border-l border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskColor(entry.residualEvaluation.level)}`}>
                                {getRiskLabel(entry.residualEvaluation.level)} ({entry.residualEvaluation.level})
                              </span>
                              <span className="text-[9px] text-slate-400">P:{entry.residualEvaluation.probability} x S:{entry.residualEvaluation.severity}</span>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                            No hay riesgos identificados en esta matriz.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
