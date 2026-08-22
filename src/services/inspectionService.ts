import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Inspection, Finding } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const inspectionService = {
  getOrgId() {
    return localStorage.getItem('safetyia_active_org_id');
  },
  getCollectionRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'inspections');
  },
  getDocRef(id: string) {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return doc(dbFirestore, 'organizations', orgId, 'inspections', id);
  },

  async createInspection(inspection: Omit<Inspection, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getCollectionRef(), inspection);
    await auditService.logAction('CREATE_INSPECTION', 'Inspection', docRef.id, auth.currentUser?.uid || 'system', inspection);
    return docRef.id;
  },

  async getInspections(): Promise<Inspection[]> {
    if (!this.getOrgId()) return [];
    const snapshot = await getDocs(this.getCollectionRef());
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Inspection));
  },
  
  async updateFindingStatus(inspectionId: string, findingId: string, status: Finding['status']): Promise<void> {
    const inspectionRef = this.getDocRef(inspectionId);
    const inspectionSnap = await getDoc(inspectionRef);
    if (!inspectionSnap.exists()) {
      throw new Error("Inspection not found");
    }
    const inspectionData = inspectionSnap.data() as Inspection;
    const updatedFindings = (inspectionData.findings || []).map(f => {
      if (f.id === findingId) {
        return { ...f, status };
      }
      return f;
    });

    await updateDoc(inspectionRef, {
        findings: updatedFindings
    });
    await auditService.logAction('UPDATE_FINDING', 'Inspection', inspectionId, auth.currentUser?.uid || 'system', { findingId, status });
  }
};