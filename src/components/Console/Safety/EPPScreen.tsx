import React, { useEffect, useState } from 'react';
import { eppService } from '../../../services/eppService';
import { EPPItem, EPPAssignment } from '../../../types/safety';

export const EPPScreen: React.FC = () => {
  const [catalog, setCatalog] = useState<EPPItem[]>([]);
  const [assignments, setAssignments] = useState<EPPAssignment[]>([]);

  useEffect(() => {
    eppService.getCatalog().then(setCatalog);
    eppService.getAssignments().then(setAssignments);
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Catálogo de EPP</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {catalog.map(item => (
            <div key={item.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="font-medium text-white">{item.name}</p>
              <p className="text-xs text-slate-400">{item.category}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Asignaciones</h3>
        <table className="w-full text-left text-sm text-slate-300">
            <thead>
                <tr>
                    <th>Trabajador</th>
                    <th>Elemento</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                {assignments.map(a => (
                    <tr key={a.id}>
                        <td>{a.workerName}</td>
                        <td>{a.itemName}</td>
                        <td>{a.date}</td>
                        <td>{a.status}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};
