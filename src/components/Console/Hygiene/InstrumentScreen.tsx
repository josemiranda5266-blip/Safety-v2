import React, { useEffect, useState } from 'react';
import { hygieneService } from '../../../services/hygieneService';
import { HygieneInstrument } from '../../../types/safety';

export const InstrumentScreen: React.FC = () => {
  const [instruments, setInstruments] = useState<HygieneInstrument[]>([]);

  useEffect(() => {
    hygieneService.getInstruments().then(setInstruments);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Instrumentos de Calibración</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {instruments.map(i => (
          <div key={i.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="font-medium text-white">{i.brand} {i.model}</p>
            <p className="text-sm text-slate-400">Serie: {i.serialNumber}</p>
            <p className={`text-sm mt-2 ${new Date(i.calibrationExpiry) < new Date() ? 'text-red-400' : 'text-green-400'}`}>
              Vencimiento: {i.calibrationExpiry}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
