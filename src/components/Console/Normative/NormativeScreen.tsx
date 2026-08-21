import React, { useState, useEffect } from 'react';
import { normativeService } from '../../../services/normativeService';
import { Norma, LegalRequirement } from '../../../types/safety';

export const NormativeScreen: React.FC = () => {
  const [normas, setNormas] = useState<Norma[]>([]);
  const [matrix, setMatrix] = useState<LegalRequirement[]>([]);

  useEffect(() => {
    normativeService.getNormas().then(setNormas);
    // Assuming demo companyId
    normativeService.getLegalMatrix('demo-company-id').then(setMatrix);
  }, []);

  return (
    <div className="space-y-6 text-white">
      <h2 className="text-xl font-semibold">Motor Normativo Argentino</h2>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Matriz Legal</h3>
        <table className="w-full text-left text-sm text-slate-300">
          <thead>
            <tr>
              <th>Norma</th>
              <th>Requisito</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map(m => {
              const norma = normas.find(n => n.id === m.normaId);
              return (
                <tr key={m.id}>
                  <td>{norma?.norma}</td>
                  <td>{norma?.obligation}</td>
                  <td>{m.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
