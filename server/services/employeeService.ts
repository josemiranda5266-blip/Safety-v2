import { Employee } from "../../src/types/tenant";
import { getAdminFirestore } from "../auth/firestoreAdmin";

export async function listEmployees(
  orgId: string,
  companyId?: string,
  establishmentId?: string,
  allowedCompanyIds?: string[]
): Promise<Employee[]> {
  if (allowedCompanyIds && allowedCompanyIds.length === 0) {
    return [];
  }
  const db = getAdminFirestore();
  let query = db.collection("employees").where("orgId", "==", orgId).where("active", "==", true);

  if (companyId) {
    query = query.where("companyId", "==", companyId);
  }
  if (establishmentId) {
    query = query.where("establishmentId", "==", establishmentId);
  }

  const snapshot = await query.get();
  const result: Employee[] = [];
  snapshot.docs.forEach((doc) => {
    const emp = { id: doc.id, ...doc.data() } as Employee;
    if (!allowedCompanyIds || allowedCompanyIds.includes(emp.companyId)) {
      result.push(emp);
    }
  });
  return result;
}

export async function getEmployeeById(id: string, orgId?: string): Promise<Employee | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const doc = await db.collection("employees").doc(id).get();
  if (!doc.exists) return undefined;
  const emp = { id: doc.id, ...doc.data() } as Employee;
  if (orgId && emp.orgId !== orgId) {
    return undefined; // Fail-closed
  }
  return emp;
}

export async function createEmployee(data: {
  id?: string;
  companyId: string;
  establishmentId: string;
  sectorId?: string;
  positionId?: string;
  orgId: string;
  cuil: string;
  firstName: string;
  lastName: string;
  hireDate?: string;
  isContractorStaff?: boolean;
  contractorId?: string;
}): Promise<Employee> {
  const now = new Date().toISOString();
  const id = data.id || `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const employee: Employee = {
    id,
    companyId: data.companyId,
    establishmentId: data.establishmentId,
    sectorId: data.sectorId,
    positionId: data.positionId,
    orgId: data.orgId,
    cuil: data.cuil,
    firstName: data.firstName,
    lastName: data.lastName,
    hireDate: data.hireDate,
    active: true,
    isContractorStaff: data.isContractorStaff || false,
    contractorId: data.contractorId,
    createdAt: now,
    updatedAt: now,
  };

  const db = getAdminFirestore();
  await db.collection("employees").doc(id).set(employee);
  return employee;
}

export async function updateEmployee(
  id: string,
  updates: Partial<Omit<Employee, "id" | "orgId" | "companyId" | "createdAt">>,
  orgId?: string
): Promise<Employee | undefined> {
  if (!id) return undefined;
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(id);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return undefined;

      const existing = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && existing.orgId !== orgId) {
        return undefined; // Fail-closed
      }

      const updated: Employee = {
        ...existing,
        ...updates,
        id: existing.id, // Immutable
        orgId: existing.orgId, // Immutable
        companyId: existing.companyId, // Immutable
        createdAt: existing.createdAt, // Immutable
        updatedAt: new Date().toISOString(),
      };

      transaction.set(docRef, updated, { merge: true });
      return updated;
    });
  } catch (error) {
    console.error("Error updating employee in transaction:", error);
    return undefined;
  }
}

export async function deleteEmployee(id: string, orgId?: string): Promise<boolean> {
  if (!id) return false;
  const db = getAdminFirestore();
  const docRef = db.collection("employees").doc(id);

  try {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) return false;

      const existing = { id: doc.id, ...doc.data() } as Employee;
      if (orgId && existing.orgId !== orgId) {
        return false; // Fail-closed
      }

      existing.active = false;
      existing.updatedAt = new Date().toISOString();
      transaction.set(docRef, existing, { merge: true });
      return true;
    });
  } catch (error) {
    console.error("Error deleting employee in transaction:", error);
    return false;
  }
}

export async function clearEmployeeStore(): Promise<void> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("employees").get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
