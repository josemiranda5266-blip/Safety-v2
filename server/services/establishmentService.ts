import { Establishment } from "../../src/types/tenant";

// In-memory persistent store for Establishment domain
const establishmentsStore = new Map<string, Establishment>();

export function listEstablishments(
  orgId: string,
  companyId?: string,
  allowedCompanyIds?: string[]
): Establishment[] {
  const result: Establishment[] = [];
  for (const est of establishmentsStore.values()) {
    if (est.orgId === orgId && est.active) {
      if (companyId && est.companyId !== companyId) {
        continue;
      }
      if (!allowedCompanyIds || allowedCompanyIds.length === 0 || allowedCompanyIds.includes(est.companyId)) {
        result.push(est);
      }
    }
  }
  return result;
}

export function getEstablishmentById(id: string): Establishment | undefined {
  return establishmentsStore.get(id);
}

export function createEstablishment(data: {
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
}): Establishment {
  const now = new Date().toISOString();
  const id = `est_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

  establishmentsStore.set(id, establishment);
  return establishment;
}

export function updateEstablishment(
  id: string,
  updates: Partial<Omit<Establishment, "id" | "orgId" | "companyId" | "createdAt">>
): Establishment | undefined {
  const existing = establishmentsStore.get(id);
  if (!existing) {
    return undefined;
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

  establishmentsStore.set(id, updated);
  return updated;
}

export function deleteEstablishment(id: string): boolean {
  const existing = establishmentsStore.get(id);
  if (!existing) {
    return false;
  }
  existing.active = false;
  existing.updatedAt = new Date().toISOString();
  establishmentsStore.set(id, existing);
  return true;
}

export function clearEstablishmentStore(): void {
  establishmentsStore.clear();
}
