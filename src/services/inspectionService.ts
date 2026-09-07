import { dbFirestore, sanitizeForFirestore } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { InspectionReport, FindingStatus } from '../types/safety';
import { auditService } from './auditService';
import { auth } from './firebase';
import { tenantApi } from './tenantApi';
import { isPersonalMode } from '../utils/personalMode';

function sanitizeAuditDetails(details: any) {
  if (!details || typeof details !== 'object') return details;
  const copy = JSON.parse(JSON.stringify(details));
  if (copy.inspectorSignatureUrl) copy.inspectorSignatureUrl = '[SIGNATURE_OMITTED]';
  if (Array.isArray(copy.findings)) {
    copy.findings = copy.findings.map((f: any) => ({
      ...f,
      photoUrl: f.photoUrl && f.photoUrl.length > 100 ? '[IMAGE_DATA_OMITTED]' : f.photoUrl,
      verifications: Array.isArray(f.verifications)
        ? f.verifications.map((v: any) => ({ ...v, photoUrl: v.photoUrl && v.photoUrl.length > 100 ? '[IMAGE_DATA_OMITTED]' : v.photoUrl }))
        : f.verifications,
    }));
  }
  return copy;
}

const testStore = new Map<string, InspectionReport>();
const PERSONAL_STORAGE_KEY = 'safety_ia_inspection_reports_v1';

function readPersonalReports(): InspectionReport[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PERSONAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePersonalReports(reports: InspectionReport[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(reports));
  }
}

export const inspectionService = {
  getOrgId(): string | null {
    return tenantApi.getActiveOrgId() || (typeof localStorage !== 'undefined' ? localStorage.getItem('safetyia_active_org_id') : null) || 'org_personal_default';
  },

  getCollectionRef(orgId?: string) {
    return collection(dbFirestore, 'organizations', orgId || this.getOrgId()!, 'inspections');
  },

  getDocRef(id: string, orgId?: string) {
    return doc(dbFirestore, 'organizations', orgId || this.getOrgId()!, 'inspections', id);
  },

  async createInspection(inspection: Omit<InspectionReport, 'id'>, orgId?: string): Promise<string> {
    const targetOrgId = orgId || this.getOrgId()!;
    const reportId = `insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdByUid = isPersonalMode() ? 'personal_local_user' : (auth.currentUser?.uid || (inspection as any).createdBy || 'user_owner');
    const formattedReport = {
      ...inspection,
      id: reportId,
      organizationId: targetOrgId,
      createdBy: createdByUid,
      createdAt: inspection.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as InspectionReport;

    if (isPersonalMode() || process.env.IS_RUNNING_TESTS === 'true') {
      if (process.env.IS_RUNNING_TESTS === 'true') testStore.set(`${targetOrgId}/${reportId}`, formattedReport);
      else writePersonalReports([formattedReport, ...readPersonalReports()]);
      return reportId;
    }

    const docRef = await addDoc(this.getCollectionRef(targetOrgId), sanitizeForFirestore(formattedReport));
    await auditService.logAction('CREATE_INSPECTION', 'Inspection', docRef.id, createdByUid, sanitizeAuditDetails(formattedReport));
    return docRef.id;
  },

  async saveInspectionReport(report: InspectionReport, orgId?: string): Promise<string> {
    const targetOrgId = orgId || this.getOrgId()!;
    const reportId = report.id || `insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const formattedReport = {
      ...report,
      id: reportId,
      organizationId: targetOrgId,
      createdBy: isPersonalMode() ? 'personal_local_user' : (auth.currentUser?.uid || report.createdBy || 'user_owner'),
      createdAt: report.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as InspectionReport;

    if (isPersonalMode() || process.env.IS_RUNNING_TESTS === 'true') {
      if (process.env.IS_RUNNING_TESTS === 'true') testStore.set(`${targetOrgId}/${reportId}`, formattedReport);
      else {
        const reports = readPersonalReports().filter(r => r.id !== reportId);
        writePersonalReports([formattedReport, ...reports]);
      }
      return reportId;
    }

    await setDoc(this.getDocRef(reportId, targetOrgId), sanitizeForFirestore(formattedReport));
    await auditService.logAction('SAVE_INSPECTION', 'Inspection', reportId, formattedReport.createdBy, sanitizeAuditDetails(formattedReport));
    return reportId;
  },

  async getInspections(orgId?: string): Promise<InspectionReport[]> {
    const targetOrgId = orgId || this.getOrgId()!;
    if (isPersonalMode()) return readPersonalReports().filter(r => !r.organizationId || r.organizationId === targetOrgId);

    if (process.env.IS_RUNNING_TESTS === 'true') {
      return Array.from(testStore.entries())
        .filter(([key]) => key.startsWith(`${targetOrgId}/`))
        .map(([, value]) => JSON.parse(JSON.stringify(value)));
    }

    const snapshot = await getDocs(this.getCollectionRef(targetOrgId));
    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as InspectionReport));
  },

  async deleteInspection(id: string, orgId?: string): Promise<void> {
    const targetOrgId = orgId || this.getOrgId()!;
    if (isPersonalMode()) {
      writePersonalReports(readPersonalReports().filter(r => r.id !== id));
      return;
    }
    if (process.env.IS_RUNNING_TESTS === 'true') {
      testStore.delete(`${targetOrgId}/${id}`);
      return;
    }
    await deleteDoc(this.getDocRef(id, targetOrgId));
    await auditService.logAction('DELETE_INSPECTION', 'Inspection', id, auth.currentUser?.uid || 'user_owner', { id, organizationId: targetOrgId });
  },

  async updateFindingStatus(
    inspectionId: string,
    findingId: string,
    status: FindingStatus,
    orgId?: string,
    closingNotes?: string,
    verificationPhoto?: string
  ): Promise<void> {
    const targetOrgId = orgId || this.getOrgId()!;
    let inspectionData: InspectionReport | null = null;

    if (isPersonalMode()) {
      inspectionData = readPersonalReports().find(r => r.id === inspectionId) || null;
    } else if (process.env.IS_RUNNING_TESTS === 'true') {
      inspectionData = testStore.get(`${targetOrgId}/${inspectionId}`) || null;
    } else {
      const snap = await getDoc(this.getDocRef(inspectionId, targetOrgId));
      if (snap.exists()) inspectionData = { id: snap.id, ...(snap.data() as any) } as InspectionReport;
    }

    if (!inspectionData) throw new Error('Inspection not found');

    const updatedFindings = (inspectionData.findings || []).map(f => {
      if (f.id !== findingId) return f;
      const updated: any = { ...f, status };
      if (status === 'Corregido') {
        updated.closedDate = new Date().toISOString().split('T')[0];
        if (closingNotes) updated.closingNotes = closingNotes;
        if (verificationPhoto) {
          updated.verifications = [...(updated.verifications || []), {
            id: `verif-${Date.now()}`,
            photoUrl: verificationPhoto,
            date: new Date().toISOString(),
            notes: closingNotes || 'Foto de verificación agregada',
          }];
        }
      }
      return updated;
    });

    const updatedActionPlan = (inspectionData.actionPlan || []).map(a => a.findingId === findingId ? { ...a, status } : a);
    const allCorrected = updatedFindings.length > 0 && updatedFindings.every(f => f.status === 'Corregido');
    const updatedInspection = { ...inspectionData, findings: updatedFindings, actionPlan: updatedActionPlan, status: allCorrected ? 'Cerrada' : 'En Proceso', updatedAt: new Date().toISOString() } as InspectionReport;

    if (isPersonalMode()) {
      writePersonalReports(readPersonalReports().map(r => r.id === inspectionId ? updatedInspection : r));
      return;
    }
    if (process.env.IS_RUNNING_TESTS === 'true') {
      testStore.set(`${targetOrgId}/${inspectionId}`, updatedInspection);
      return;
    }
    await updateDoc(this.getDocRef(inspectionId, targetOrgId), sanitizeForFirestore({
      findings: updatedFindings,
      actionPlan: updatedActionPlan,
      status: updatedInspection.status,
      updatedAt: updatedInspection.updatedAt,
    }));
    await auditService.logAction('UPDATE_FINDING', 'Inspection', inspectionId, auth.currentUser?.uid || 'user_owner', { findingId, status, closingNotes: closingNotes || null, hasVerificationPhoto: !!verificationPhoto, organizationId: targetOrgId });
  },
};
