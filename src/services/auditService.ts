import { dbFirestore } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuditLog } from '../types/safety';

export const auditService = {
  async logAction(action: string, entityType: AuditLog['entityType'], entityId: string, userId: string, details: any) {
    try {
      await addDoc(collection(dbFirestore, 'auditLogs'), {
        action,
        entityType,
        entityId,
        userId,
        details,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  },
};
