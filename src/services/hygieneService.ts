import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';
import { HygieneMeasurement, HygieneInstrument } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const hygieneService = {
  async addMeasurement(measurement: Omit<HygieneMeasurement, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(dbFirestore, 'hygieneMeasurements'), measurement);
    await auditService.logAction('ADD_HYGIENE_MEASUREMENT', 'Hygiene', docRef.id, auth.currentUser?.uid || 'system', measurement);
    return docRef.id;
  },

  async getMeasurements(): Promise<HygieneMeasurement[]> {
    const snapshot = await getDocs(query(collection(dbFirestore, 'hygieneMeasurements')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HygieneMeasurement));
  },
  
  async addInstrument(instrument: Omit<HygieneInstrument, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(dbFirestore, 'hygieneInstruments'), instrument);
    await auditService.logAction('ADD_HYGIENE_INSTRUMENT', 'Hygiene', docRef.id, auth.currentUser?.uid || 'system', instrument);
    return docRef.id;
  },

  async getInstruments(): Promise<HygieneInstrument[]> {
    const snapshot = await getDocs(query(collection(dbFirestore, 'hygieneInstruments')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HygieneInstrument));
  }
};
