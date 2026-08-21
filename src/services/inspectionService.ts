import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { Inspection, Finding } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const inspectionService = {
  async createInspection(inspection: Omit<Inspection, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(dbFirestore, 'inspections'), inspection);
    await auditService.logAction('CREATE_INSPECTION', 'Inspection', docRef.id, auth.currentUser?.uid || 'system', inspection);
    return docRef.id;
  },

  async getInspections(): Promise<Inspection[]> {
    const snapshot = await getDocs(collection(dbFirestore, 'inspections'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspection));
  },
  
  async updateFindingStatus(inspectionId: string, findingId: string, status: Finding['status']): Promise<void> {
    const inspectionRef = doc(dbFirestore, 'inspections', inspectionId);
    // Note: Simplification for demo, in production would use array-update or subcollection
    await updateDoc(inspectionRef, {
        "findings": [] // Placeholder for update logic
    });
    await auditService.logAction('UPDATE_FINDING', 'Inspection', inspectionId, auth.currentUser?.uid || 'system', { findingId, status });
  }
};
