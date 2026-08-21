import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus } from 'lucide-react';
import { emergencyService } from '../../../services/emergencyService';
import { EmergencyPlan } from '../../../types/safety';

export const EmergencyScreen: React.FC = () => {
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);

  useEffect(() => {
    emergencyService.getPlans().then(setPlans);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Plan de Emergencias</h2>
        <button className="flex items-center gap-2 bg-yellow-600 px-4 py-2 rounded-lg text-white font-medium hover:bg-yellow-700">
          <Plus className="w-4 h-4" /> Nuevo Plan
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white">{plan.planName}</h3>
            <p className="text-sm text-slate-400 mt-2">Escenarios: {plan.scenarios.join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
