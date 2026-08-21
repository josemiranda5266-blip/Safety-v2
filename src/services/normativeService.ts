import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { Norma, LegalRequirement } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const normativeService = {
  async addNorma(norma: Omit<Norma, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(dbFirestore, 'normas'), norma);
    await auditService.logAction('ADD_NORMA', 'Normative', docRef.id, auth.currentUser?.uid || 'system', norma);
    return docRef.id;
  },

  async getNormas(): Promise<Norma[]> {
    const snapshot = await getDocs(collection(dbFirestore, 'normas'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Norma));
  },
  
  async getLegalMatrix(companyId: string): Promise<LegalRequirement[]> {
    const q = query(collection(dbFirestore, 'legalRequirements'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LegalRequirement));
  },

  async updateCompliance(requirementId: string, status: LegalRequirement['status'], notes: string): Promise<void> {
    const docRef = doc(dbFirestore, 'legalRequirements', requirementId);
    await updateDoc(docRef, { status, notes, lastChecked: new Date().toISOString() });
    await auditService.logAction('UPDATE_COMPLIANCE', 'Normative', requirementId, auth.currentUser?.uid || 'system', { status });
  }
};
