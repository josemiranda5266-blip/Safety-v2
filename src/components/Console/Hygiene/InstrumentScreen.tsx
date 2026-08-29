import React, { useEffect, useState } from 'react';
import { hygieneService } from '../../../services/hygieneService';
import { HygieneInstrument } from '../../../types/safety';
import { Ruler, AlertTriangle, FileText, Calendar, Plus, Wrench, CircleCheck } from 'lucide-react';
import { useTenant } from '../../../context/TenantContext';

const statusLabel: Record<string, string> = {
  active: 'Activo',
  maintenance: 'Mantenimiento',
  calibration_due: 'Calibración pendiente',
  out_of_service: 'Fuera de servicio',
  retired: 'Retirado',
};

export const InstrumentScreen: React.FC = () => {
  const { activeOrgId } = useTenant();
  const [instruments, setInstruments] = useState<HygieneInstrument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [activeOrgId]);

  const loadData = async () => {
    setLoading(true);
    try {
      setInstruments(await hygieneService.getInstruments());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isCalibrationExpired = (instrument: HygieneInstrument) =>
    Boolean(instrument.calibrationExpiry && new Date(instrument.calibrationExpiry) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Ruler className="w-6 h-6 text-indigo-500" />
            <span>Equipos e Instrumentos</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Inventario, trazabilidad, disponibilidad y control de calibración.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded-xl text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo Equipo
        </button>
      </div>

      {loading ? (
        <div className="text-center p-8 text-slate-500">Cargando instrumentos...</div>
      ) : instruments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <Ruler className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Sin Instrumentos</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            No hay instrumentos registrados en la organización actual.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instruments.map((i) => {
            const calibrationExpired = isCalibrationExpired(i);
            const unavailable = !i.active || ['maintenance', 'calibration_due', 'out_of_service', 'retired'].includes(i.status);
            return (
              <div key={i.id} className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-colors ${calibrationExpired || unavailable ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{i.brand} {i.model}</h3>
                    <p className="text-xs text-slate-500 mt-1">{i.category} · {i.instrumentType}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">S/N: {i.serialNumber}</p>
                  </div>
                  {unavailable || calibrationExpired ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <CircleCheck className="w-5 h-5 text-emerald-500" />}
                </div>

                <div className="text-xs mb-4">
                  <span className={`inline-flex px-2 py-1 rounded font-bold ${unavailable ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                    {statusLabel[i.status] || i.status}
                  </span>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Última calib.</span>
                    <span className="font-medium text-slate-900 dark:text-white">{i.calibrationDate ? new Date(i.calibrationDate).toLocaleDateString() : 'Sin registro'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5"/> Vencimiento</span>
                    <span className={`font-bold ${calibrationExpired ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {i.calibrationExpiry ? new Date(i.calibrationExpiry).toLocaleDateString() : 'No informado'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex">
                  {i.certificateUrl ? (
                    <a href={i.certificateUrl} target="_blank" rel="noreferrer" className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                      <FileText className="w-4 h-4"/> Certificado
                    </a>
                  ) : <span className="w-full py-2 text-center text-slate-400 text-xs italic">Sin certificado adjunto</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
