import fs from 'fs';

const serviceCode = `import { getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { dbFirestore } from './firebase';
import { Incident, Inspection, HygieneMeasurement, TrainingActivity, EPPAssignment, LegalRequirement } from '../types/safety';

export const dashboardService = {
  getOrgId() {
    return localStorage.getItem('safetyia_active_org_id');
  },
  getCollectionRef(colName: string) {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, colName);
  },

  async getDashboardData(companyId?: string) {
    if (!this.getOrgId()) return null;

    let incidentsQ = query(this.getCollectionRef('incidents'));
    let inspectionsQ = query(this.getCollectionRef('inspections'));
    let measurementsQ = query(this.getCollectionRef('hygieneMeasurements'));
    let trainingsQ = query(this.getCollectionRef('trainingActivities'));
    let legalQ = query(this.getCollectionRef('legalRequirements'));
    let capaQ = query(this.getCollectionRef('capa'));

    if (companyId) {
      incidentsQ = query(incidentsQ, where('companyId', '==', companyId));
      inspectionsQ = query(inspectionsQ, where('companyId', '==', companyId));
      measurementsQ = query(measurementsQ, where('companyId', '==', companyId));
      trainingsQ = query(trainingsQ, where('companyId', '==', companyId));
      legalQ = query(legalQ, where('companyId', '==', companyId));
      capaQ = query(capaQ, where('companyId', '==', companyId));
    }

    const [incidentsSnap, inspectionsSnap, measurementsSnap, trainingsSnap, legalSnap, capaSnap] = await Promise.all([
      getDocs(incidentsQ),
      getDocs(inspectionsQ),
      getDocs(measurementsQ),
      getDocs(trainingsQ),
      getDocs(legalQ),
      getDocs(capaQ)
    ]);

    const incidents = incidentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Incident));
    const inspections = inspectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inspection));
    const measurements = measurementsSnap.docs.map(d => ({ id: d.id, ...d.data() } as HygieneMeasurement));
    const trainings = trainingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TrainingActivity));
    const legalRequirements = legalSnap.docs.map(d => ({ id: d.id, ...d.data() } as LegalRequirement));
    const capas = capaSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // Calculate metrics
    const accidents = incidents.filter(i => i.type === 'Accidente').length;
    const nearMisses = incidents.filter(i => i.type === 'CasiAccidente' || i.type === 'Incidente').length;
    
    // CAPA stats
    const openCapas = capas.filter(c => c.status !== 'Cerrada').length;
    const closedCapas = capas.filter(c => c.status === 'Cerrada').length;
    
    // Inspections findings
    let totalFindings = 0;
    inspections.forEach(i => {
      totalFindings += (i.findings || []).length;
    });

    // Weighted compliance calculation
    const totalLegal = legalRequirements.length;
    const compliant = legalRequirements.filter(l => l.status === 'CUMPLE').length;
    const weightedCompliance = totalLegal > 0 ? Math.round((compliant / totalLegal) * 100) : 0;

    // Monthly incidents trend (mocked logic for real data mapping if dates exist)
    const monthlyTrend = [
      { name: 'Ene', accidentes: 0, incidentes: 0 },
      { name: 'Feb', accidentes: 0, incidentes: 0 },
      { name: 'Mar', accidentes: 0, incidentes: 0 },
      { name: 'Abr', accidentes: 0, incidentes: 0 },
      { name: 'May', accidentes: 0, incidentes: 0 },
      { name: 'Jun', accidentes: 0, incidentes: 0 }
    ];
    
    // Distribute actual incidents in trend (simplified logic just taking the month index)
    incidents.forEach(inc => {
      const d = new Date(inc.date);
      if(d.getFullYear() === new Date().getFullYear()) {
        const m = d.getMonth();
        if(m < 6) { // Just populate first 6 months for demo purposes
          if (inc.type === 'Accidente') monthlyTrend[m].accidentes += 1;
          else monthlyTrend[m].incidentes += 1;
        }
      }
    });

    return {
      accidents,
      nearMisses,
      inspections: inspections.length,
      trainings: trainings.length,
      measurements: measurements.length,
      compliance: weightedCompliance,
      openCapas,
      closedCapas,
      totalFindings,
      monthlyTrend
    };
  }
};
`;

const screenCode = `import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../../services/dashboardService';
import { useTenant } from '../../../context/TenantContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, LineChart, Line } from 'recharts';
import { Activity, AlertTriangle, ShieldCheck, Target, Users, Microscope, CheckCircle, Clock } from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const { activeCompany, activeOrg } = useTenant();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id, activeOrg?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const stats = await dashboardService.getDashboardData(activeCompany?.id);
      setData(stats);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) return (
    <div className="flex items-center justify-center h-64 text-slate-500">
      <div className="animate-pulse flex flex-col items-center gap-2">
        <Activity className="w-8 h-8 text-indigo-500" />
        <span>Procesando KPI's...</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-indigo-500" />
            <span>Inteligencia de Gestión (KPIs)</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Métricas de {activeCompany ? activeCompany.tradeName || activeCompany.legalName : 'toda la organización'}.
          </p>
        </div>
        <div className="text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-4 py-2 rounded-xl font-bold border border-indigo-100 dark:border-indigo-800/50">
          Cumplimiento Legal: {data.compliance}%
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Cards */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-500">Accidentes</span>
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.accidents}</span>
            <span className="text-xs text-slate-400 ml-2">YTD</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-500">Casi Accidentes</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-500">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.nearMisses}</span>
            <span className="text-xs text-slate-400 ml-2">Reportes</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-500">Desvíos / CAPA</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.openCapas}</span>
              <span className="text-xs text-rose-500 font-bold ml-1">Abiertas</span>
            </div>
            <div className="text-xs text-emerald-500 font-bold mb-1">
              {data.closedCapas} Cerradas
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-500">Actividad</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">{data.trainings}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cursos</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">{data.inspections}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Auditorías</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-[400px]">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Frecuencia de Accidentabilidad (YTD)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={data.monthlyTrend}>
              <defs>
                <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}/>
              <Area type="monotone" name="Accidentes" dataKey="accidentes" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorAcc)" />
              <Area type="monotone" name="Incidentes" dataKey="incidentes" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm h-[400px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Gestión de Hallazgos y CAPA</h3>
          
          <div className="flex-1 flex flex-col justify-center items-center">
            {/* A simple placeholder layout instead of adding more complex pie charts to keep imports clean, visualizing ratio */}
            <div className="w-full max-w-sm mb-8">
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-emerald-600 dark:text-emerald-400">Desvíos Cerrados ({data.closedCapas})</span>
                <span className="text-rose-600 dark:text-rose-400">Abiertos ({data.openCapas})</span>
              </div>
              <div className="w-full h-4 bg-rose-100 dark:bg-rose-900/30 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-1000" 
                  style={{ width: \`\${data.closedCapas + data.openCapas > 0 ? (data.closedCapas / (data.closedCapas + data.openCapas)) * 100 : 0}%\`}}
                ></div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-3 font-medium">
                Tasa de Cierre de Acciones Correctivas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mt-4">
               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{data.compliance}%</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cumplimiento Legal</div>
               </div>
               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                  <Microscope className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{data.measurements}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mediciones Hig.</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/services/dashboardService.ts', serviceCode);
fs.writeFileSync('src/components/Console/Dashboard/DashboardScreen.tsx', screenCode);
