import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Calendar, Clock, MapPin, Activity, FileText } from 'lucide-react';
import { incidentService } from '../../../services/incidentService';
import { Incident } from '../../../types/safety';
import { useTenant } from '../../../context/TenantContext';

export const IncidentScreen: React.FC = () => {
  const { activeCompany } = useTenant();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await incidentService.getIncidents(activeCompany?.id);
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'Abierto': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case 'En Proceso': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Cerrado': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Vencido': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeColor = (type: Incident['type']) => {
    switch (type) {
      case 'Accidente': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'Incidente': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
      case 'CasiAccidente': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <span>Gestión de Accidentes e Incidentes</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registro, investigación (Árbol de Causas) y seguimiento (ART).
          </p>
        </div>
        
        {activeCompany && (
          <button className="flex items-center gap-2 bg-rose-600 px-4 py-2 rounded-xl text-white font-bold hover:bg-rose-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Registrar Evento
          </button>
        )}
      </div>

      {!activeCompany && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 text-sm">
          Selecciona una empresa para gestionar y registrar sus incidentes y accidentes.
        </div>
      )}

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando eventos...</div>
      ) : incidents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <Activity className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Sin Eventos</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            {activeCompany ? 'Excelente, no hay accidentes ni incidentes registrados en este contexto.' : 'Selecciona una empresa.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Clasificación</th>
                <th className="px-4 py-3">Trabajador Afectado</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Estado / ART</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {incidents.map(i => (
                <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(i.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3 h-3" /> {i.time}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getTypeColor(i.type)}`}>
                      {i.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 dark:text-white">{i.workerName}</div>
                    {i.bodyPart && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">Lesión: {i.bodyPart}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400 text-xs">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{i.location}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(i.status)}`}>
                        {i.status}
                      </span>
                      {i.artInvolved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                          <FileText className="w-3 h-3"/> Denunciado ART
                        </span>
                      )}
                    </div>
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
