import React, { useState, useEffect } from 'react';
import { iperService } from '../../../services/iperService';
import { IPERMatrix } from '../../../types/safety';

export const IPERScreen: React.FC = () => {
  const [matrix, setMatrix] = useState<IPERMatrix | null>(null);

  useEffect(() => {
    // Assuming a demo sectorId
    iperService.getMatrix('demo-sector-id').then(setMatrix);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Matriz de Riesgos IPER</h2>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        {matrix ? (
            <div className="text-white">
                <p>Versión actual: {matrix.currentVersion}</p>
                {/* Table for IPER entries would go here */}
            </div>
        ) : (
            <p className="text-slate-400">No hay matriz IPER cargada para este sector.</p>
        )}
      </div>
    </div>
  );
};
