import { dbFirestore, sanitizeForFirestore } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { InspectionReport, InspectionFinding, FindingStatus } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';
import { tenantApi } from './tenantApi';

export const inspectionService = {
  getOrgId(): string | null {
    return tenantApi.getActiveOrgId() || localStorage.getItem('safetyia_active_org_id');
  },

  getCollectionRef(orgId?: string) {
    const targetOrgId = orgId || this.getOrgId();
    if (!targetOrgId) throw new Error("No organization selected");
    return collection(dbFirestore, 'organizations', targetOrgId, 'inspections');
  },

  getDocRef(id: string, orgId?: string) {
    const targetOrgId = orgId || this.getOrgId();
    if (!targetOrgId) throw new Error("No organization selected");
    return doc(dbFirestore, 'organizations', targetOrgId, 'inspections', id);
  },

  async createInspection(inspection: Omit<InspectionReport, 'id'>, orgId?: string): Promise<string> {
    const targetOrgId = orgId || inspection.organizationId || this.getOrgId();
    if (!targetOrgId) throw new Error("No organization selected");

    const formattedReport = {
      ...inspection,
      organizationId: targetOrgId,
      createdBy: auth.currentUser?.uid || 'system',
      createdAt: inspection.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(this.getCollectionRef(targetOrgId), sanitizeForFirestore(formattedReport));
    await auditService.logAction('CREATE_INSPECTION', 'Inspection', docRef.id, auth.currentUser?.uid || 'system', formattedReport);
    return docRef.id;
  },

  async saveInspectionReport(report: InspectionReport, orgId?: string): Promise<string> {
    const targetOrgId = orgId || report.organizationId || this.getOrgId();
    if (!targetOrgId) throw new Error("No organization selected");

    const reportId = report.id || `insp_${Date.now()}`;
    const formattedReport: InspectionReport = {
      ...report,
      id: reportId,
      organizationId: targetOrgId,
      createdBy: report.createdBy || auth.currentUser?.uid || 'system',
      createdAt: report.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = doc(dbFirestore, 'organizations', targetOrgId, 'inspections', reportId);
    await setDoc(docRef, sanitizeForFirestore(formattedReport));
    await auditService.logAction('SAVE_INSPECTION', 'Inspection', reportId, auth.currentUser?.uid || 'system', formattedReport);
    return reportId;
  },

  async getInspections(orgId?: string): Promise<InspectionReport[]> {
    const targetOrgId = orgId || this.getOrgId();
    if (!targetOrgId) return [];

    const snapshot = await getDocs(this.getCollectionRef(targetOrgId));
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as any)
    } as InspectionReport));
  },

  async deleteInspection(id: string, orgId?: string): Promise<void> {
    const targetOrgId = orgId || this.getOrgId();
    if (!targetOrgId) throw new Error("No organization selected");

    const docRef = doc(dbFirestore, 'organizations', targetOrgId, 'inspections', id);
    await deleteDoc(docRef);
    await auditService.logAction('DELETE_INSPECTION', 'Inspection', id, auth.currentUser?.uid || 'system', { id });
  },

  async updateFindingStatus(inspectionId: string, findingId: string, status: FindingStatus, orgId?: string): Promise<void> {
    const targetOrgId = orgId || this.getOrgId();
    if (!targetOrgId) throw new Error("No organization selected");

    const inspectionRef = this.getDocRef(inspectionId, targetOrgId);
    const inspectionSnap = await getDoc(inspectionRef);
    if (!inspectionSnap.exists()) {
      throw new Error("Inspection not found");
    }

    const inspectionData = inspectionSnap.data() as InspectionReport;
    const updatedFindings = (inspectionData.findings || []).map(f => {
      if (f.id === findingId) {
        return { ...f, status };
      }
      return f;
    });

    await updateDoc(inspectionRef, sanitizeForFirestore({
      findings: updatedFindings,
      updatedAt: new Date().toISOString()
    }));
    await auditService.logAction('UPDATE_FINDING', 'Inspection', inspectionId, auth.currentUser?.uid || 'system', { findingId, status });
  }
};