import { getAdminFirestore } from "../auth/firestoreAdmin";

export type NormativeRecordStatus = "draft" | "active" | "superseded" | "repealed" | "archived";
export interface NormativeCriterionRecord {
  id: string; code: string; title: string; description?: string;
  unit?: string; parameters: Record<string, string | number | boolean>; applicability?: string;
}
export interface NormativeProtocolVersionRecord {
  id: string; protocolType: string; reference: string; title: string; version: string;
  status: NormativeRecordStatus; effectiveFrom?: string; effectiveTo?: string;
  source: { issuingAuthority: string; documentTitle: string; officialUrl?: string; documentId?: string; publishedAt?: string; retrievedAt?: string };
  criteria: NormativeCriterionRecord[]; notes?: string; createdAt: string; updatedAt: string;
}

const collection = "normativeProtocolVersions";

export async function listNormativeProtocolVersions(protocolType?: string): Promise<NormativeProtocolVersionRecord[]> {
  let query = getAdminFirestore().collection(collection).orderBy("updatedAt", "desc");
  if (protocolType) query = query.where("protocolType", "==", protocolType);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as NormativeProtocolVersionRecord));
}

export async function getNormativeProtocolVersion(id: string): Promise<NormativeProtocolVersionRecord | undefined> {
  const doc = await getAdminFirestore().collection(collection).doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as NormativeProtocolVersionRecord) : undefined;
}

export async function createNormativeProtocolVersion(input: Omit<NormativeProtocolVersionRecord, "id" | "createdAt" | "updatedAt">): Promise<NormativeProtocolVersionRecord> {
  const now = new Date().toISOString();
  const id = `npv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const item = { ...input, id, createdAt: now, updatedAt: now };
  await getAdminFirestore().collection(collection).doc(id).set(item);
  return item;
}

export async function updateNormativeProtocolVersion(id: string, updates: Partial<Omit<NormativeProtocolVersionRecord, "id" | "createdAt" | "updatedAt">>): Promise<NormativeProtocolVersionRecord | undefined> {
  const ref = getAdminFirestore().collection(collection).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return undefined;
  const item = { ...(existing.data() as NormativeProtocolVersionRecord), ...updates, id, updatedAt: new Date().toISOString() };
  await ref.set(item, { merge: true });
  return item;
}
