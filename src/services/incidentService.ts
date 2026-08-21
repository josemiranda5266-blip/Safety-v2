import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Incident } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const incidentService = {
  async createIncident(incident: Omit<Incident, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(dbFirestore, 'incidents'), incident);
    await auditService.logAction('CREATE_INCIDENT', 'Incident', docRef.id, auth.currentUser?.uid || 'system', incident);
    return docRef.id;
  },

  async getIncidents(): Promise<Incident[]> {
    const snapshot = await getDocs(collection(dbFirestore, 'incidents'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
  },
  
  async updateIncident(incidentId: string, updates: Partial<Incident>): Promise<void> {
    const docRef = doc(dbFirestore, 'incidents', incidentId);
    await updateDoc(docRef, updates);
    await auditService.logAction('UPDATE_INCIDENT', 'Incident', incidentId, auth.currentUser?.uid || 'system', updates);
  }
};
