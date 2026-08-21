import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { inspectionService } from '../../../services/inspectionService';
import { Inspection } from '../../../types/safety';

export const InspectionsScreen: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);

  useEffect(() => {
    inspectionService.getInspections().then(setInspections);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Inspecciones de Campo</h2>
        <button className="flex items-center gap-2 bg-orange-600 px-4 py-2 rounded-lg text-white font-medium hover:bg-orange-700">
          <Plus className="w-4 h-4" /> Nueva Inspección
        </button>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <table className="w-full text-left text-sm text-slate-300">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Hallazgos</th>
                </tr>
            </thead>
            <tbody>
                {inspections.map(i => (
                    <tr key={i.id}>
                        <td>{i.date}</td>
                        <td>{i.type}</td>
                        <td>{i.status}</td>
                        <td>{i.findings.length}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};
