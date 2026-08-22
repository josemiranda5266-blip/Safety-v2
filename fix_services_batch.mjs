import fs from 'fs';

const trainingService = `import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { TrainingActivity } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const trainingService = {
  getOrgId() {
    return localStorage.getItem('safetyia_active_org_id');
  },
  getCollectionRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'trainingActivities');
  },
  async createActivity(activity: Omit<TrainingActivity, 'id'>, companyId: string): Promise<string> {
    const docRef = await addDoc(this.getCollectionRef(), { ...activity, companyId });
    await auditService.logAction('CREATE_TRAINING', 'Training', docRef.id, auth.currentUser?.uid || 'system', activity);
    return docRef.id;
  },
  async getActivities(companyId?: string): Promise<TrainingActivity[]> {
    if (!this.getOrgId()) return [];
    let q = query(this.getCollectionRef());
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as TrainingActivity));
  }
};`;

const incidentService = `import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Incident } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const incidentService = {
  getOrgId() {
    return localStorage.getItem('safetyia_active_org_id');
  },
  getCollectionRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'incidents');
  },
  async createIncident(incident: Omit<Incident, 'id'>, companyId: string): Promise<string> {
    const docRef = await addDoc(this.getCollectionRef(), { ...incident, companyId });
    await auditService.logAction('CREATE_INCIDENT', 'Incident', docRef.id, auth.currentUser?.uid || 'system', incident);
    return docRef.id;
  },
  async getIncidents(companyId?: string): Promise<Incident[]> {
    if (!this.getOrgId()) return [];
    let q = query(this.getCollectionRef());
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Incident));
  },
  async updateIncident(incidentId: string, updates: Partial<Incident>): Promise<void> {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    const docRef = doc(dbFirestore, 'organizations', orgId, 'incidents', incidentId);
    await updateDoc(docRef, updates);
    await auditService.logAction('UPDATE_INCIDENT', 'Incident', incidentId, auth.currentUser?.uid || 'system', updates);
  }
};`;

const emergencyService = `import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { EmergencyPlan } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const emergencyService = {
  getOrgId() {
    return localStorage.getItem('safetyia_active_org_id');
  },
  getCollectionRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'emergencyPlans');
  },
  async createPlan(plan: Omit<EmergencyPlan, 'id'>, companyId: string): Promise<string> {
    const docRef = await addDoc(this.getCollectionRef(), { ...plan, companyId });
    await auditService.logAction('CREATE_EMERGENCY_PLAN', 'Emergency', docRef.id, auth.currentUser?.uid || 'system', plan);
    return docRef.id;
  },
  async getPlans(companyId?: string): Promise<EmergencyPlan[]> {
    if (!this.getOrgId()) return [];
    let q = query(this.getCollectionRef());
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as EmergencyPlan));
  }
};`;

const hygieneService = `import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { HygieneMeasurement, HygieneInstrument } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const hygieneService = {
  getOrgId() {
    return localStorage.getItem('safetyia_active_org_id');
  },
  getMeasurementsRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'hygieneMeasurements');
  },
  getInstrumentsRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'hygieneInstruments');
  },

  async addMeasurement(measurement: Omit<HygieneMeasurement, 'id'>, companyId: string): Promise<string> {
    const docRef = await addDoc(this.getMeasurementsRef(), { ...measurement, companyId });
    await auditService.logAction('ADD_HYGIENE_MEASUREMENT', 'Hygiene', docRef.id, auth.currentUser?.uid || 'system', measurement);
    return docRef.id;
  },
  async getMeasurements(companyId?: string): Promise<HygieneMeasurement[]> {
    if (!this.getOrgId()) return [];
    let q = query(this.getMeasurementsRef());
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as HygieneMeasurement));
  },
  
  async addInstrument(instrument: Omit<HygieneInstrument, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getInstrumentsRef(), instrument);
    await auditService.logAction('ADD_HYGIENE_INSTRUMENT', 'Hygiene', docRef.id, auth.currentUser?.uid || 'system', instrument);
    return docRef.id;
  },
  async getInstruments(): Promise<HygieneInstrument[]> {
    if (!this.getOrgId()) return [];
    const snapshot = await getDocs(query(this.getInstrumentsRef()));
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as HygieneInstrument));
  }
};`;

fs.writeFileSync('src/services/trainingService.ts', trainingService);
fs.writeFileSync('src/services/incidentService.ts', incidentService);
fs.writeFileSync('src/services/emergencyService.ts', emergencyService);
fs.writeFileSync('src/services/hygieneService.ts', hygieneService);
