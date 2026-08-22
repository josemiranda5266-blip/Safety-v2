import React, { useEffect, useState } from 'react';
import { hygieneService } from '../../../services/hygieneService';
import { HygieneMeasurement } from '../../../types/safety';
import { useTenant } from '../../../context/TenantContext';
import { Microscope, Activity, Calendar, AlertTriangle, FileText, CheckCircle, XCircle } from 'lucide-react';

export const MeasurementScreen: React.FC = () => {
  const { activeCompany } = useTenant();
  const [measurements, setMeasurements] = useState<HygieneMeasurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await hygieneService.getMeasurements(activeCompany?.id);
      setMeasurements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!activeCompany && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 text-sm">
          Selecciona una empresa para gestionar sus protocolos y mediciones (iluminación, ruido, etc.).
        </div>
      )}

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando mediciones...</div>
      ) : measurements.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <Microscope className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Sin Protocolos Registrados</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            {activeCompany ? 'No hay registros de mediciones higiénicas para esta empresa.' : 'Selecciona una empresa.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Agente / Sector</th>
                <th className="px-4 py-3">Valor vs Límite</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3 text-right">Protocolo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {measurements.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(m.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-indigo-500" /> {m.agent}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Profesional: {m.professionalName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{m.value} {m.unit}</span>
                      <span className="text-xs text-slate-400">/ {m.applicableLimit} {m.unit}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.result === 'Aceptable' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">
                        <CheckCircle className="w-3.5 h-3.5" /> Aceptable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded text-xs font-bold">
                        <XCircle className="w-3.5 h-3.5" /> No Aceptable
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.reportUrl ? (
                      <a href={m.reportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold text-xs">
                        <FileText className="w-3.5 h-3.5" /> Ver PDF
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Sin PDF</span>
                    )}
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
