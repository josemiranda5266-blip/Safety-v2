import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, arrayUnion } from 'firebase/firestore';
import { IPERMatrix, IPERVersion } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const iperService = {
  getOrgId() {
    return localStorage.getItem('safetyia_active_org_id');
  },
  getCollectionRef() {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', orgId, 'iperMatrices');
  },
  async getMatrices(companyId?: string, establishmentId?: string): Promise<IPERMatrix[]> {
    if (!this.getOrgId()) return [];
    let q = query(this.getCollectionRef());
    if (companyId) q = query(q, where('companyId', '==', companyId));
    if (establishmentId) q = query(q, where('establishmentId', '==', establishmentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as IPERMatrix));
  },
  async getMatrix(sectorId: string): Promise<IPERMatrix | null> {
    const q = query(this.getCollectionRef(), where('sectorId', '==', sectorId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...(snapshot.docs[0].data() as any) } as IPERMatrix;
  },
  async createMatrix(matrix: Omit<IPERMatrix, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getCollectionRef(), matrix);
    await auditService.logAction('CREATE_IPER_MATRIX', 'IPER', docRef.id, auth.currentUser?.uid || 'system', { companyId: matrix.companyId });
    return docRef.id;
  },
  async addVersion(matrixId: string, version: IPERVersion): Promise<void> {
    const orgId = this.getOrgId();
    if (!orgId) throw new Error("No organization selected");
    const matrixRef = doc(dbFirestore, 'organizations', orgId, 'iperMatrices', matrixId);
    await updateDoc(matrixRef, {
        versions: arrayUnion(version),
        currentVersion: version.version
    });
    await auditService.logAction('ADD_IPER_VERSION', 'IPER', matrixId, auth.currentUser?.uid || 'system', { version: version.version });
  }
};