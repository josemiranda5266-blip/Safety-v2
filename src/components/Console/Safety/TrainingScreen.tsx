import React, { useEffect, useState } from 'react';
import { trainingService } from '../../../services/trainingService';
import { TrainingActivity } from '../../../types/safety';
import { useTenant } from '../../../context/TenantContext';
import { GraduationCap, Users, Calendar, Clock, MapPin, Plus, FileSignature } from 'lucide-react';

export const TrainingScreen: React.FC = () => {
  const { activeCompany } = useTenant();
  const [activities, setActivities] = useState<TrainingActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await trainingService.getActivities(activeCompany?.id);
      setActivities(data);
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
            <GraduationCap className="w-6 h-6 text-indigo-500" />
            <span>Capacitaciones y Formación</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registro de asistencias y evaluación de actividades formativas.
          </p>
        </div>
        
        {activeCompany && (
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Nueva Capacitación
          </button>
        )}
      </div>

      {!activeCompany && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 text-sm">
          Selecciona una empresa para gestionar sus planes de capacitación y firmas de asistencia.
        </div>
      )}

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando capacitaciones...</div>
      ) : activities.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Sin Actividades</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            {activeCompany ? 'No hay registros de capacitación para esta empresa.' : 'Selecciona una empresa.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activities.map(a => {
            const attendedCount = a.attendees.filter(at => at.attended).length;
            const totalCount = a.attendees.length;
            const percentage = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;
            
            return (
              <div key={a.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{a.topic}</h3>
                    <span className="shrink-0 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded text-xs font-bold">
                      {a.durationHours} hrs
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{new Date(a.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Capacitador: <span className="font-medium text-slate-900 dark:text-white">{a.trainer}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{a.establishmentName}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Asistencia</span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                      {attendedCount} de {totalCount} trabajadores
                    </span>
                    <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-xs font-bold flex items-center gap-1">
                      <FileSignature className="w-3.5 h-3.5"/> Planilla
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
