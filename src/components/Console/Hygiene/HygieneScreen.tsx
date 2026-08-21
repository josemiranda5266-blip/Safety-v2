import React, { useState } from 'react';
import { Microscope, Ruler, ClipboardList } from 'lucide-react';
import { MeasurementScreen } from './MeasurementScreen';
import { InstrumentScreen } from './InstrumentScreen';

export const HygieneScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'measurements' | 'instruments'>('measurements');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Higiene Industrial</h1>
      </div>

      <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('measurements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'measurements' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Microscope className="w-4 h-4" /> Mediciones
        </button>
        <button
          onClick={() => setActiveTab('instruments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'instruments' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Ruler className="w-4 h-4" /> Instrumentos
        </button>
      </div>

      {activeTab === 'measurements' && <MeasurementScreen />}
      {activeTab === 'instruments' && <InstrumentScreen />}
    </div>
  );
};
