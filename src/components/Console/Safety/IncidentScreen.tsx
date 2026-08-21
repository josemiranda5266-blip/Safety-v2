import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { incidentService } from '../../../services/incidentService';
import { Incident } from '../../../types/safety';

export const IncidentScreen: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    incidentService.getIncidents().then(setIncidents);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Gestión de Incidentes y Accidentes</h2>
        <button className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-lg text-white font-medium hover:bg-red-700">
          <Plus className="w-4 h-4" /> Registrar Incidente
        </button>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <table className="w-full text-left text-sm text-slate-300">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Trabajador</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                {incidents.map(i => (
                    <tr key={i.id}>
                        <td>{i.date}</td>
                        <td>{i.type}</td>
                        <td>{i.workerName}</td>
                        <td>{i.status}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};
