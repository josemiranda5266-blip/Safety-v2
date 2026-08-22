import { dbFirestore } from './firebase';
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
};