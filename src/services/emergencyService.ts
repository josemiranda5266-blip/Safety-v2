import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { EmergencyPlan } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const emergencyService = {
  async createPlan(plan: Omit<EmergencyPlan, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(dbFirestore, 'emergencyPlans'), plan);
    await auditService.logAction('CREATE_EMERGENCY_PLAN', 'Emergency', docRef.id, auth.currentUser?.uid || 'system', plan);
    return docRef.id;
  },

  async getPlans(): Promise<EmergencyPlan[]> {
    const snapshot = await getDocs(collection(dbFirestore, 'emergencyPlans'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmergencyPlan));
  }
};
