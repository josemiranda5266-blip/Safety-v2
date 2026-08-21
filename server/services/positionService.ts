import { Position } from "../../src/types/tenant";
import { getAdminFirestore } from "../auth/firestoreAdmin";

export async function listPositions(
  orgId: string,
  companyId?: string,
  establishmentId?: string,
  sectorId?: string,
  allowedCompanyIds?: string[]
): Promise<Position[]> {
  if (allowedCompanyIds && allowedCompanyIds.length === 0) {
    return [];
  }
  const db = getAdminFirestore();
  let query = db.collection("positions").where("orgId", "==", orgId);

  if (companyId) {
    query = query.where("companyId", "==", companyId);
  }
  if (establishmentId) {
    query = query.where("establishmentId", "==", establishmentId);
  }
  if (sectorId) {
    query = query.where("sectorId", "==", sectorId);
  }

  const snapshot = await query.get();
  const result: Position[] = [];
  snapshot.docs.forEach((doc) => {
    const pos = { id: doc.id, ...doc.data() } as Position;
    if ((pos as any).active !== false) {
      if (!allowedCompanyIds || allowedCompanyIds.includes(pos.companyId)) {
        result.push(pos);
      }
    }
  });
  return result;
}

export async function getPositionById(id: string, orgId?: string): Promise<Position | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const doc = await db.collection("positions").doc(id).get();
  if (!doc.exists) return undefined;
  const pos = { id: doc.id, ...doc.data() } as Position;
  if (orgId && pos.orgId !== orgId) {
    return undefined; // Fail-closed
  }
  return pos;
}

export async function createPosition(data: {
  id?: string;
  sectorId: string;
  establishmentId: string;
  companyId: string;
  orgId: string;
  title: string;
  description?: string;
  standardRequiredPPEIds?: string[];
  requiresAnnualAudiometry?: boolean;
  requiresRespiratoryProtection?: boolean;
}): Promise<Position> {
  const now = new Date().toISOString();
  const id = data.id || `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const position: Position = {
    id,
    sectorId: data.sectorId,
    establishmentId: data.establishmentId,
    companyId: data.companyId,
    orgId: data.orgId,
    title: data.title,
    description: data.description,
    standardRequiredPPEIds: data.standardRequiredPPEIds || [],
    requiresAnnualAudiometry: data.requiresAnnualAudiometry || false,
    requiresRespiratoryProtection: data.requiresRespiratoryProtection || false,
    active: true,
    createdAt: now,
    updatedAt: now,
  } as Position;

  const db = getAdminFirestore();
  await db.collection("positions").doc(id).set(position);
  return position;
}

export async function updatePosition(
  id: string,
  updates: Partial<Omit<Position, "id" | "orgId" | "companyId" | "establishmentId" | "createdAt">>,
  orgId?: string
): Promise<Position | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const docRef = db.collection("positions").doc(id);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;
      const existing = doc.data() as Position;

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

      const updatedPosition: Position = {
        ...existing,
        ...safeUpdates,
        updatedAt: new Date().toISOString(),
      };

      transaction.set(docRef, updatedPosition);
      return updatedPosition;
    });
  } catch (error) {
    return undefined;
  }
}

export async function deletePosition(id: string, orgId?: string): Promise<boolean> {
  if (!id) return false;
  const db = getAdminFirestore();
  const docRef = db.collection("positions").doc(id);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return false;
      const existing = doc.data() as Position;

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

export async function clearPositionStore(): Promise<void> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("positions").get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}


