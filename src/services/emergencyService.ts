import { dbFirestore } from './firebase';
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
};