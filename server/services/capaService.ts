import { getAdminFirestore } from "../auth/firestoreAdmin";
import { Timestamp } from "firebase-admin/firestore";

export interface CorrectiveAction {
  id: string;
  orgId: string;
  companyId: string;
  establishmentId?: string;
  sourceType: 'Inspección' | 'IPER' | 'Accidente' | 'Manual';
  sourceId?: string;
  riskLevel?: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  description: string;
  actionRequired: string;
  responsibleName: string;
  deadlineDate: string; // ISO format
  status: 'Pendiente' | 'En Progreso' | 'Completado' | 'Cerrado';
  completionDate?: string;
  evidenceNotes?: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export async function createCorrectiveAction(
  orgId: string,
  uid: string,
  data: Omit<CorrectiveAction, 'id' | 'orgId' | 'createdByUid' | 'createdAt' | 'updatedAt'>
): Promise<CorrectiveAction> {
  const db = getAdminFirestore();
  const now = new Date().toISOString();
  
  const capaRef = db.collection('organizations').doc(orgId).collection('corrective_actions').doc();
  const newAction: CorrectiveAction = {
    ...data,
    id: capaRef.id,
    orgId,
    createdByUid: uid,
    createdAt: now,
    updatedAt: now,
  };

  await capaRef.set(newAction);
  return newAction;
}

export async function listCorrectiveActions(
  orgId: string,
  companyId?: string,
  assignedCompanyIds?: string[]
): Promise<CorrectiveAction[]> {
  const db = getAdminFirestore();
  
  if (assignedCompanyIds && assignedCompanyIds.length === 0) {
    return [];
  }
  if (assignedCompanyIds && assignedCompanyIds.length > 0 && companyId) {
    if (!assignedCompanyIds.includes(companyId)) {
      throw { status: 403, message: "Acceso denegado a las acciones de esta empresa.", code: "FORBIDDEN_COMPANY_SCOPE" };
    }
  }

  let query: FirebaseFirestore.Query = db.collection('organizations').doc(orgId).collection('corrective_actions');
  
  if (companyId) {
    query = query.where('companyId', '==', companyId);
  } else if (assignedCompanyIds && assignedCompanyIds.length > 0) {
    query = query.where('companyId', 'in', assignedCompanyIds);
  }

  const snap = await query.get();
  return snap.docs.map(d => d.data() as CorrectiveAction);
}

export async function updateCorrectiveAction(
  orgId: string,
  id: string,
  uid: string,
  data: Partial<CorrectiveAction>,
  assignedCompanyIds?: string[]
): Promise<CorrectiveAction> {
  const db = getAdminFirestore();
  const capaRef = db.collection('organizations').doc(orgId).collection('corrective_actions').doc(id);
  const snap = await capaRef.get();
  
  if (!snap.exists) {
    throw { status: 404, message: "Acción correctiva no encontrada.", code: "NOT_FOUND" };
  }
  const existing = snap.data() as CorrectiveAction;

  if (assignedCompanyIds && assignedCompanyIds.length > 0) {
    if (!assignedCompanyIds.includes(existing.companyId)) {
      throw { status: 403, message: "Acceso denegado a esta acción.", code: "FORBIDDEN_COMPANY_SCOPE" };
    }
  }

  const updatedAction = {
    ...existing,
    ...data,
    id: existing.id,
    orgId: existing.orgId,
    companyId: existing.companyId,
    createdAt: existing.createdAt,
    createdByUid: existing.createdByUid,
    updatedAt: new Date().toISOString(),
  };

  await capaRef.update(updatedAction);
  return updatedAction;
}
