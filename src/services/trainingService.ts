import { dbFirestore } from './firebase';
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
};