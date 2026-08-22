import { dbFirestore } from './firebase';
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
};