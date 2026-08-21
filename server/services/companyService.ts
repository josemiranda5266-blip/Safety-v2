import { Company } from "../../src/types/tenant";

// In-memory persistent store for Company domain
const companiesStore = new Map<string, Company>();

export function listCompanies(orgId: string, allowedCompanyIds?: string[]): Company[] {
  const result: Company[] = [];
  for (const company of companiesStore.values()) {
    if (company.orgId === orgId && company.active) {
      if (!allowedCompanyIds || allowedCompanyIds.length === 0 || allowedCompanyIds.includes(company.id)) {
        result.push(company);
      }
    }
  }
  return result;
}

export function getCompanyById(id: string): Company | undefined {
  return companiesStore.get(id);
}

export function createCompany(data: {
  orgId: string;
  legalName: string;
  tradeName?: string;
  cuit: string;
  ciiuCode?: string;
  activityDescription?: string;
  artInsuranceName?: string;
  artPolicyNumber?: string;
  isLegacyMigrated?: boolean;
}): Company {
  const now = new Date().toISOString();
  const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

  companiesStore.set(id, company);
  return company;
}

export function updateCompany(
  id: string,
  updates: Partial<Omit<Company, "id" | "orgId" | "createdAt">>
): Company | undefined {
  const existing = companiesStore.get(id);
  if (!existing) {
    return undefined;
  }

  const updated: Company = {
    ...existing,
    ...updates,
    id: existing.id, // Immutable
    orgId: existing.orgId, // Immutable
    createdAt: existing.createdAt, // Immutable
    updatedAt: new Date().toISOString(),
  };

  companiesStore.set(id, updated);
  return updated;
}

export function deleteCompany(id: string): boolean {
  const existing = companiesStore.get(id);
  if (!existing) {
    return false;
  }
  // Soft-delete to preserve audit logs
  existing.active = false;
  existing.updatedAt = new Date().toISOString();
  companiesStore.set(id, existing);
  return true;
}

export function clearCompanyStore(): void {
  companiesStore.clear();
}
