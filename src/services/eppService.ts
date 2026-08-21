import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { EPPAssignment, EPPItem } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const eppService = {
  async getCatalog(): Promise<EPPItem[]> {
    const q = query(collection(dbFirestore, 'eppCatalog'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EPPItem));
  },

  async assignEPP(assignment: Omit<EPPAssignment, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(dbFirestore, 'eppAssignments'), assignment);
    await auditService.logAction('ASSIGN_EPP', 'EPP', docRef.id, auth.currentUser?.uid || 'system', assignment);
    return docRef.id;
  },

  async getAssignments(): Promise<EPPAssignment[]> {
    const snapshot = await getDocs(collection(dbFirestore, 'eppAssignments'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EPPAssignment));
  },
};
