import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { capaApi } from '../../services/capaApi';
import { CorrectiveAction } from '../../../server/services/capaService';
import { AlertTriangle, Plus, CheckCircle2, Clock, Calendar, Check, X } from 'lucide-react';

export const CapaScreen: React.FC = () => {
  const { activeCompany } = useTenant();
  const [capas, setCapas] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [description, setDescription] = useState('');
  const [actionRequired, setActionRequired] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [sourceType, setSourceType] = useState<CorrectiveAction['sourceType']>('Manual');
  const [riskLevel, setRiskLevel] = useState<CorrectiveAction['riskLevel']>('Medio');

  useEffect(() => {
    loadCapas();
  }, [activeCompany?.id]);

  const loadCapas = async () => {
    setLoading(true);
    try {
      if (activeCompany) {
        const data = await capaApi.getCorrectiveActions(activeCompany.id);
        setCapas(data);
      } else {
        const data = await capaApi.getCorrectiveActions();
        setCapas(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    try {
      await capaApi.createCorrectiveAction({
        companyId: activeCompany.id,
        description,
        actionRequired,
        responsibleName,
        deadlineDate,
        sourceType,
        riskLevel,
        status: 'Pendiente'
      });
      setIsModalOpen(false);
      resetForm();
      loadCapas();
    } catch (err) {
      console.error(err);
      alert('Error al crear la acción correctiva');
    }
  };

  const resetForm = () => {
    setDescription('');
    setActionRequired('');
    setResponsibleName('');
    setDeadlineDate('');
    setSourceType('Manual');
    setRiskLevel('Medio');
  };

  const handleUpdateStatus = async (id: string, status: CorrectiveAction['status']) => {
    try {
      await capaApi.updateCorrectiveAction(id, { status });
      loadCapas();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando acciones correctivas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-orange-500" />
            <span>Acciones Correctivas y Preventivas (CAPA)</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión y seguimiento de desvíos, hallazgos e incidentes.
          </p>
        </div>
        {activeCompany && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Acción</span>
          </button>
        )}
      </div>

      {!activeCompany && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 text-sm">
          Por favor, selecciona una empresa en la barra superior para agregar nuevas acciones correctivas.
        </div>
      )}

      {capas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Todo en orden</h3>
          <p className="text-slate-500 dark:text-slate-400">No hay acciones correctivas pendientes.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {capas.map((capa) => (
            <div key={capa.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  capa.riskLevel === 'Crítico' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  capa.riskLevel === 'Alto' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                  capa.riskLevel === 'Medio' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}>
                  {capa.riskLevel} Riesgo
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  capa.status === 'Cerrado' || capa.status === 'Completado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  capa.status === 'En Progreso' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {capa.status}
                </span>
              </div>
              
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white line-clamp-2">{capa.description}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{capa.actionRequired}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Origen</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{capa.sourceType}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Vencimiento</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{capa.deadlineDate}</p>
                </div>
              </div>
              
              {(capa.status === 'Pendiente' || capa.status === 'En Progreso') && (
                <div className="pt-2 flex gap-2">
                  <button onClick={() => handleUpdateStatus(capa.id, 'En Progreso')} className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 rounded-xl text-xs font-bold transition-colors">
                    Iniciar
                  </button>
                  <button onClick={() => handleUpdateStatus(capa.id, 'Completado')} className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400 rounded-xl text-xs font-bold transition-colors">
                    Completar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Nueva Acción Correctiva</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Descripción del Hallazgo</label>
                <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-white" rows={3}></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Acción Requerida</label>
                <textarea required value={actionRequired} onChange={(e) => setActionRequired(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-white" rows={3}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Responsable</label>
                  <input required type="text" value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Vencimiento</label>
                  <input required type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Origen</label>
                  <select value={sourceType} onChange={(e) => setSourceType(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-white">
                    <option value="Manual">Manual</option>
                    <option value="Inspección">Inspección</option>
                    <option value="IPER">IPER</option>
                    <option value="Accidente">Accidente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nivel de Riesgo</label>
                  <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-white">
                    <option value="Bajo">Bajo</option>
                    <option value="Medio">Medio</option>
                    <option value="Alto">Alto</option>
                    <option value="Crítico">Crítico</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700">Guardar Acción</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
