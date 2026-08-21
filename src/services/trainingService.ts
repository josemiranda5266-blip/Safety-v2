import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { TrainingActivity } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const trainingService = {
  async createActivity(activity: Omit<TrainingActivity, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(dbFirestore, 'trainingActivities'), activity);
    await auditService.logAction('CREATE_TRAINING', 'Training', docRef.id, auth.currentUser?.uid || 'system', activity);
    return docRef.id;
  },

  async getActivities(): Promise<TrainingActivity[]> {
    const snapshot = await getDocs(collection(dbFirestore, 'trainingActivities'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingActivity));
  },
};
