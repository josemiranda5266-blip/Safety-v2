import { Organization, Membership } from "../../src/types/tenant";

// In-memory persistent stores for Organization and Membership backend authority
const organizationsStore = new Map<string, Organization>();
const membershipsStore = new Map<string, Membership>();

export function getOrganization(orgId: string): Organization | undefined {
  return organizationsStore.get(orgId);
}

export function saveOrganization(org: Organization): Organization {
  organizationsStore.set(org.id, org);
  return org;
}

export function getMembership(orgId: string, userId: string): Membership | undefined {
  for (const membership of membershipsStore.values()) {
    if (membership.orgId === orgId && membership.userId === userId && membership.active) {
      return membership;
    }
  }
  return undefined;
}

export function getMembershipById(membershipId: string): Membership | undefined {
  return membershipsStore.get(membershipId);
}

export function getMembershipsByUser(userId: string): Membership[] {
  const list: Membership[] = [];
  for (const m of membershipsStore.values()) {
    if (m.userId === userId && m.active) {
      list.push(m);
    }
  }
  return list;
}

export function saveMembership(membership: Membership): Membership {
  membershipsStore.set(membership.id, membership);
  return membership;
}

export function clearStore(): void {
  organizationsStore.clear();
  membershipsStore.clear();
}
