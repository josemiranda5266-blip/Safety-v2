import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../../services/dashboardService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const DashboardScreen: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    dashboardService.getDashboardData().then(setData);
  }, []);

  if (!data) return <div className="text-white">Cargando...</div>;

  const kpis = [
    { name: 'Accidentes', value: data.accidents },
    { name: 'Incidentes', value: data.nearMisses },
    { name: 'Inspecciones', value: data.inspections },
    { name: 'Capacitaciones', value: data.trainings },
    { name: 'Mediciones', value: data.measurements },
    { name: 'Cumplimiento', value: `${data.compliance.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Inteligencia de Gestión</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <p className="text-slate-400 text-sm">{kpi.name}</p>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-96">
        <h3 className="text-lg font-semibold text-white mb-4">Evolución Semestral</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[{name: 'Ene', value: 5}, {name: 'Feb', value: 8}, {name: 'Mar', value: 3}]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
