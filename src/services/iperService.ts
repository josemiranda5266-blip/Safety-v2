import { dbFirestore } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, arrayUnion } from 'firebase/firestore';
import { IPERMatrix, IPERVersion } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';

export const iperService = {
  async getMatrix(sectorId: string): Promise<IPERMatrix | null> {
    const q = query(collection(dbFirestore, 'iperMatrices'), where('sectorId', '==', sectorId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as IPERMatrix;
  },

  async addVersion(matrixId: string, version: IPERVersion): Promise<void> {
    const matrixRef = doc(dbFirestore, 'iperMatrices', matrixId);
    await updateDoc(matrixRef, {
        versions: arrayUnion(version),
        currentVersion: version.version
    });
    await auditService.logAction('ADD_IPER_VERSION', 'IPER', matrixId, auth.currentUser?.uid || 'system', { version: version.version });
  }
};
