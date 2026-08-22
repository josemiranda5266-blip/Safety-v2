import React, { useState } from 'react';
import { ShieldCheck, GraduationCap, Calendar, Users, AlertTriangle, ShieldAlert } from 'lucide-react';
import { EPPScreen } from './EPPScreen';
import { TrainingScreen } from './TrainingScreen';
import { IncidentScreen } from './IncidentScreen';
import { EmergencyScreen } from './EmergencyScreen';

interface SafetyScreenProps {
  initialTab?: 'epp' | 'training' | 'incident' | 'emergency';
}

export const SafetyScreen: React.FC<SafetyScreenProps> = ({ initialTab = 'epp' }) => {
  const [activeTab, setActiveTab] = useState<'epp' | 'training' | 'incident' | 'emergency'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Seguridad</h1>
      </div>

      <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('epp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'epp' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <ShieldCheck className="w-4 h-4" /> EPP
        </button>
        <button
          onClick={() => setActiveTab('training')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'training' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <GraduationCap className="w-4 h-4" /> Capacitaciones
        </button>
        <button
          onClick={() => setActiveTab('incident')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'incident' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <AlertTriangle className="w-4 h-4" /> Incidentes
        </button>
        <button
          onClick={() => setActiveTab('emergency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'emergency' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <ShieldAlert className="w-4 h-4" /> Emergencias
        </button>
      </div>

      {activeTab === 'epp' && <EPPScreen />}
      {activeTab === 'training' && <TrainingScreen />}
      {activeTab === 'incident' && <IncidentScreen />}
      {activeTab === 'emergency' && <EmergencyScreen />}
    </div>
  );
};
