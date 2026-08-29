import React, { useEffect, useState } from 'react';
import { hygieneService } from '../../../services/hygieneService';
import { HygieneMeasurement } from '../../../types/safety';
import { useTenant } from '../../../context/TenantContext';
import { Microscope, Activity, Calendar, FileText, CheckCircle, Clock, CircleX } from 'lucide-react';

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  in_progress: 'En curso',
  pending_review: 'Pendiente de revisión',
  validated: 'Validada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
  archived: 'Archivada',
};

const statusIcon = (status: string) => {
  if (status === 'validated' || status === 'closed') return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === 'cancelled') return <CircleX className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
};

export const MeasurementScreen: React.FC = () => {
  const { activeCompany } = useTenant();
  const [measurements, setMeasurements] = useState<HygieneMeasurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [activeCompany?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      setMeasurements(await hygieneService.getMeasurements(activeCompany?.id));
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
          Selecciona una empresa para consultar sus mediciones y protocolos.
        </div>
      )}

      {loading ? <div className="text-center p-8 text-slate-500">Cargando mediciones...</div>
      : measurements.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <Microscope className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Sin Mediciones Registradas</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            {activeCompany ? 'No hay mediciones higiénicas para esta empresa.' : 'Selecciona una empresa.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Protocolo</th>
                <th className="px-4 py-3">Contexto</th>
                <th className="px-4 py-3">Instrumentos</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {measurements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {new Date(m.measurementDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-indigo-500" /> {m.protocolType}
                    </div>
                    {m.notes && <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{m.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div>Empresa: {m.context.companyId}</div>
                    <div>Establecimiento: {m.context.establishmentId}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-medium">{m.instrumentIds.length}</span> asociado(s)
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-bold">
                      {statusIcon(m.status)} {statusLabel[m.status] || m.status}
                    </span>
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
