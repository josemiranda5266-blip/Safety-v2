import { Employee } from "../../src/types/tenant";

// In-memory persistent store for Employee domain (Zero medical data)
const employeesStore = new Map<string, Employee>();

export function listEmployees(
  orgId: string,
  companyId?: string,
  establishmentId?: string,
  allowedCompanyIds?: string[]
): Employee[] {
  const result: Employee[] = [];
  for (const emp of employeesStore.values()) {
    if (emp.orgId === orgId && emp.active) {
      if (companyId && emp.companyId !== companyId) {
        continue;
      }
      if (establishmentId && emp.establishmentId !== establishmentId) {
        continue;
      }
      if (!allowedCompanyIds || allowedCompanyIds.length === 0 || allowedCompanyIds.includes(emp.companyId)) {
        result.push(emp);
      }
    }
  }
  return result;
}

export function getEmployeeById(id: string): Employee | undefined {
  return employeesStore.get(id);
}

export function createEmployee(data: {
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
}): Employee {
  const now = new Date().toISOString();
  const id = `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

  employeesStore.set(id, employee);
  return employee;
}

export function updateEmployee(
  id: string,
  updates: Partial<Omit<Employee, "id" | "orgId" | "companyId" | "createdAt">>
): Employee | undefined {
  const existing = employeesStore.get(id);
  if (!existing) {
    return undefined;
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

  employeesStore.set(id, updated);
  return updated;
}

export function deleteEmployee(id: string): boolean {
  const existing = employeesStore.get(id);
  if (!existing) {
    return false;
  }
  existing.active = false;
  existing.updatedAt = new Date().toISOString();
  employeesStore.set(id, existing);
  return true;
}

export function clearEmployeeStore(): void {
  employeesStore.clear();
}
