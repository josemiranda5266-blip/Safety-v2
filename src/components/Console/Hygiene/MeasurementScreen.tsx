import React, { useEffect, useState } from 'react';
import { hygieneService } from '../../../services/hygieneService';
import { HygieneMeasurement } from '../../../types/safety';

export const MeasurementScreen: React.FC = () => {
  const [measurements, setMeasurements] = useState<HygieneMeasurement[]>([]);

  useEffect(() => {
    hygieneService.getMeasurements().then(setMeasurements);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Registro de Mediciones</h3>
      <table className="w-full text-left text-sm text-slate-300">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Agente</th>
            <th>Valor</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {measurements.map(m => (
            <tr key={m.id}>
              <td>{m.date}</td>
              <td>{m.agent}</td>
              <td>{m.value} {m.unit}</td>
              <td>{m.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
