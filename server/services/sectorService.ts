import { Sector } from "../../src/types/tenant";
import { getAdminFirestore } from "../auth/firestoreAdmin";

export async function listSectors(
  orgId: string,
  companyId?: string,
  establishmentId?: string,
  allowedCompanyIds?: string[]
): Promise<Sector[]> {
  if (allowedCompanyIds && allowedCompanyIds.length === 0) {
    return [];
  }
  const db = getAdminFirestore();
  let query = db.collection("sectors").where("orgId", "==", orgId);

  if (companyId) {
    query = query.where("companyId", "==", companyId);
  }
  if (establishmentId) {
    query = query.where("establishmentId", "==", establishmentId);
  }

  const snapshot = await query.get();
  const result: Sector[] = [];
  snapshot.docs.forEach((doc) => {
    const sector = { id: doc.id, ...doc.data() } as Sector;
    // Filter active (default true) and verify allowedCompanyIds
    if ((sector as any).active !== false) {
      if (!allowedCompanyIds || allowedCompanyIds.includes(sector.companyId)) {
        result.push(sector);
      }
    }
  });
  return result;
}

export async function getSectorById(id: string, orgId?: string): Promise<Sector | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const doc = await db.collection("sectors").doc(id).get();
  if (!doc.exists) return undefined;
  const sector = { id: doc.id, ...doc.data() } as Sector;
  if (orgId && sector.orgId !== orgId) {
    return undefined; // Fail-closed
  }
  return sector;
}

export async function createSector(data: {
  id?: string;
  establishmentId: string;
  companyId: string;
  orgId: string;
  name: string;
  description?: string;
  responsibleName?: string;
  noiseLevelEstimatedDBA?: number;
  requiresSpecificPPE?: boolean;
}): Promise<Sector> {
  const now = new Date().toISOString();
  const id = data.id || `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const sector: Sector = {
    id,
    establishmentId: data.establishmentId,
    companyId: data.companyId,
    orgId: data.orgId,
    name: data.name,
    description: data.description,
    responsibleName: data.responsibleName,
    noiseLevelEstimatedDBA: data.noiseLevelEstimatedDBA,
    requiresSpecificPPE: data.requiresSpecificPPE || false,
    active: true,
    createdAt: now,
    updatedAt: now,
  } as Sector;

  const db = getAdminFirestore();
  await db.collection("sectors").doc(id).set(sector);
  return sector;
}

export async function updateSector(
  id: string,
  updates: Partial<Omit<Sector, "id" | "orgId" | "companyId" | "establishmentId" | "createdAt">>,
  orgId?: string
): Promise<Sector | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const docRef = db.collection("sectors").doc(id);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;
      const existing = doc.data() as Sector;

      if (orgId && existing.orgId !== orgId) {
        return undefined; // Fail-closed
      }

      // Explicitly reject/strip immutable fields
      const {
        id: _id,
        orgId: _orgId,
        companyId: _companyId,
        establishmentId: _establishmentId,
        createdAt: _createdAt,
        ...safeUpdates
      } = updates as any;

      const updatedSector: Sector = {
        ...existing,
        ...safeUpdates,
        updatedAt: new Date().toISOString(),
      };

      transaction.set(docRef, updatedSector);
      return updatedSector;
    });
  } catch (error) {
    return undefined;
  }
}

export async function deleteSector(id: string, orgId?: string): Promise<boolean> {
  if (!id) return false;
  const db = getAdminFirestore();
  const docRef = db.collection("sectors").doc(id);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return false;
      const existing = doc.data() as Sector;

      if (orgId && existing.orgId !== orgId) {
        return false; // Fail-closed
      }

      // Soft-delete
      transaction.update(docRef, {
        active: false,
        updatedAt: new Date().toISOString(),
      });
      return true;
    });
  } catch (error) {
    return false;
  }
}

export async function clearSectorStore(): Promise<void> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("sectors").get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}


