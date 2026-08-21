import React, { useEffect, useState } from 'react';
import { trainingService } from '../../../services/trainingService';
import { TrainingActivity } from '../../../types/safety';

export const TrainingScreen: React.FC = () => {
  const [activities, setActivities] = useState<TrainingActivity[]>([]);

  useEffect(() => {
    trainingService.getActivities().then(setActivities);
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Actividades de Capacitación</h3>
        <table className="w-full text-left text-sm text-slate-300">
            <thead>
                <tr>
                    <th>Tema</th>
                    <th>Fecha</th>
                    <th>Capacitador</th>
                    <th>Asistentes</th>
                </tr>
            </thead>
            <tbody>
                {activities.map(a => (
                    <tr key={a.id}>
                        <td>{a.topic}</td>
                        <td>{a.date}</td>
                        <td>{a.trainer}</td>
                        <td>{a.attendees.filter(at => at.attended).length}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};
