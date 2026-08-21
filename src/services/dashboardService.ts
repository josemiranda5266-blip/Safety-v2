import { getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { dbFirestore } from './firebase';
import { Incident, Inspection, HygieneMeasurement, TrainingActivity, EPPAssignment, LegalRequirement } from '../types/safety';

export const dashboardService = {
  async getDashboardData() {
    // In a real app, you'd filter by companyId
    const incidentsSnap = await getDocs(collection(dbFirestore, 'incidents'));
    const inspectionsSnap = await getDocs(collection(dbFirestore, 'inspections'));
    const measurementsSnap = await getDocs(collection(dbFirestore, 'hygieneMeasurements'));
    const trainingsSnap = await getDocs(collection(dbFirestore, 'trainingActivities'));
    const eppSnap = await getDocs(collection(dbFirestore, 'eppAssignments'));
    const legalSnap = await getDocs(collection(dbFirestore, 'legalRequirements'));

    const incidents = incidentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Incident));
    const inspections = inspectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inspection));
    const measurements = measurementsSnap.docs.map(d => ({ id: d.id, ...d.data() } as HygieneMeasurement));
    const trainings = trainingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TrainingActivity));
    const eppAssignments = eppSnap.docs.map(d => ({ id: d.id, ...d.data() } as EPPAssignment));
    const legalRequirements = legalSnap.docs.map(d => ({ id: d.id, ...d.data() } as LegalRequirement));

    // Calculate metrics
    const accidents = incidents.filter(i => i.type === 'Accidente').length;
    const nearMisses = incidents.filter(i => i.type === 'CasiAccidente').length;
    
    // Weighted compliance calculation
    const totalLegal = legalRequirements.length;
    const compliant = legalRequirements.filter(l => l.status === 'CUMPLE').length;
    const weightedCompliance = totalLegal > 0 ? (compliant / totalLegal) * 100 : 100;

    return {
      accidents,
      nearMisses,
      inspections: inspections.length,
      trainings: trainings.length,
      measurements: measurements.length,
      compliance: weightedCompliance,
      // Add more as needed
    };
  }
};
