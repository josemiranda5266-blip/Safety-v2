import { Establishment } from "../../src/types/tenant";
import { getAdminFirestore } from "../auth/firestoreAdmin";

export async function listEstablishments(
  orgId: string,
  companyId?: string,
  allowedCompanyIds?: string[]
): Promise<Establishment[]> {
  const db = getAdminFirestore();
  let query = db.collection("establishments").where("orgId", "==", orgId).where("active", "==", true);

  if (companyId) {
    query = query.where("companyId", "==", companyId);
  }

  const snapshot = await query.get();
  const result: Establishment[] = [];
  snapshot.docs.forEach((doc) => {
    const est = { id: doc.id, ...doc.data() } as Establishment;
    if (!allowedCompanyIds || allowedCompanyIds.length === 0 || allowedCompanyIds.includes(est.companyId)) {
      result.push(est);
    }
  });
  return result;
}

export async function getEstablishmentById(id: string, orgId?: string): Promise<Establishment | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const doc = await db.collection("establishments").doc(id).get();
  if (!doc.exists) return undefined;
  const est = { id: doc.id, ...doc.data() } as Establishment;
  if (orgId && est.orgId !== orgId) {
    return undefined; // Fail-closed
  }
  return est;
}

export async function createEstablishment(data: {
  id?: string;
  companyId: string;
  orgId: string;
  name: string;
  code?: string;
  address: string;
  city: string;
  province: string;
  country?: string;
  postalCode?: string;
  surfaceM2?: number;
  totalWorkers?: number;
  installedPowerKW?: number;
  isConstructionSite?: boolean;
  isLegacyMigrated?: boolean;
}): Promise<Establishment> {
  const now = new Date().toISOString();
  const id = data.id || `est_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const establishment: Establishment = {
    id,
    companyId: data.companyId,
    orgId: data.orgId,
    name: data.name,
    code: data.code,
    address: data.address,
    city: data.city,
    province: data.province,
    country: data.country || "Argentina",
    postalCode: data.postalCode,
    surfaceM2: data.surfaceM2,
    totalWorkers: data.totalWorkers,
    installedPowerKW: data.installedPowerKW,
    isConstructionSite: data.isConstructionSite || false,
    isLegacyMigrated: data.isLegacyMigrated || false,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const db = getAdminFirestore();
  await db.collection("establishments").doc(id).set(establishment);
  return establishment;
}

export async function updateEstablishment(
  id: string,
  updates: Partial<Omit<Establishment, "id" | "orgId" | "companyId" | "createdAt">>,
  orgId?: string
): Promise<Establishment | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const docRef = db.collection("establishments").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return undefined;

  const existing = { id: doc.id, ...doc.data() } as Establishment;
  if (orgId && existing.orgId !== orgId) {
    return undefined; // Fail-closed
  }

  const updated: Establishment = {
    ...existing,
    ...updates,
    id: existing.id, // Immutable
    orgId: existing.orgId, // Immutable
    companyId: existing.companyId, // Immutable
    createdAt: existing.createdAt, // Immutable
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteEstablishment(id: string, orgId?: string): Promise<boolean> {
  if (!id) return false;
  const db = getAdminFirestore();
  const docRef = db.collection("establishments").doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  const existing = { id: doc.id, ...doc.data() } as Establishment;
  if (orgId && existing.orgId !== orgId) {
    return false; // Fail-closed
  }

  existing.active = false;
  existing.updatedAt = new Date().toISOString();
  await docRef.set(existing, { merge: true });
  return true;
}

export async function clearEstablishmentStore(): Promise<void> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("establishments").get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
