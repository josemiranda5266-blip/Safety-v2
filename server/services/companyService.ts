import { Company } from "../../src/types/tenant";
import { getAdminFirestore } from "../auth/firestoreAdmin";

export async function listCompanies(orgId: string, allowedCompanyIds?: string[]): Promise<Company[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("companies")
    .where("orgId", "==", orgId)
    .where("active", "==", true)
    .get();

  const companies: Company[] = [];
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (!allowedCompanyIds || allowedCompanyIds.length === 0 || allowedCompanyIds.includes(doc.id)) {
      companies.push({ id: doc.id, ...data } as Company);
    }
  });
  return companies;
}

export async function getCompanyById(id: string, orgId?: string): Promise<Company | undefined> {
  if (!id || typeof id !== "string") return undefined;
  const db = getAdminFirestore();
  const doc = await db.collection("companies").doc(id).get();
  if (!doc.exists) return undefined;
  const company = { id: doc.id, ...doc.data() } as Company;
  if (orgId && company.orgId !== orgId) {
    return undefined; // Fail-closed
  }
  return company;
}

export async function createCompany(data: {
  id?: string;
  orgId: string;
  legalName: string;
  tradeName?: string;
  cuit: string;
  ciiuCode?: string;
  activityDescription?: string;
  artInsuranceName?: string;
  artPolicyNumber?: string;
  isLegacyMigrated?: boolean;
}): Promise<Company> {
  const now = new Date().toISOString();
  const id = data.id || `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const company: Company = {
    id,
    orgId: data.orgId,
    legalName: data.legalName,
    tradeName: data.tradeName,
    cuit: data.cuit,
    ciiuCode: data.ciiuCode,
    activityDescription: data.activityDescription,
    artInsuranceName: data.artInsuranceName,
    artPolicyNumber: data.artPolicyNumber,
    isLegacyMigrated: data.isLegacyMigrated || false,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const db = getAdminFirestore();
  await db.collection("companies").doc(id).set(company);
  return company;
}

export async function updateCompany(
  id: string,
  updates: Partial<Omit<Company, "id" | "orgId" | "createdAt">>,
  orgId?: string
): Promise<Company | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const docRef = db.collection("companies").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return undefined;

  const existing = { id: doc.id, ...doc.data() } as Company;
  if (orgId && existing.orgId !== orgId) {
    return undefined; // Fail-closed
  }

  const updated: Company = {
    ...existing,
    ...updates,
    id: existing.id, // Immutable
    orgId: existing.orgId, // Immutable
    createdAt: existing.createdAt, // Immutable
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteCompany(id: string, orgId?: string): Promise<boolean> {
  if (!id) return false;
  const db = getAdminFirestore();
  const docRef = db.collection("companies").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  const existing = { id: doc.id, ...doc.data() } as Company;
  if (orgId && existing.orgId !== orgId) {
    return false; // Fail-closed
  }

  // Soft-delete to preserve audit logs
  existing.active = false;
  existing.updatedAt = new Date().toISOString();
  await docRef.set(existing, { merge: true });
  return true;
}

export async function clearCompanyStore(): Promise<void> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("companies").get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
