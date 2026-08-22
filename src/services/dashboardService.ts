import { getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
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

    const incidents = incidentsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Incident));
    const inspections = inspectionsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Inspection));
    const measurements = measurementsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as HygieneMeasurement));
    const trainings = trainingsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as TrainingActivity));
    const legalRequirements = legalSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as LegalRequirement));
    const capas = capaSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as any));

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
