import { dbFirestore } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuditLog } from '../types/safety';

const testAuditLogs: any[] = [];

export const auditService = {
  async logAction(action: string, entityType: AuditLog['entityType'], entityId: string, userId: string, details: any) {
    if (process.env.IS_RUNNING_TESTS === 'true') {
      testAuditLogs.push({ action, entityType, entityId, userId, details, timestamp: new Date().toISOString() });
      return;
    }
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
  getTestLogs() {
    return testAuditLogs;
  }
};
