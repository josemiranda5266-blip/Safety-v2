import { Organization, Membership } from "../../src/types/tenant";

export interface OrganizationRepository {
  getById(id: string): Promise<Organization | undefined> | Organization | undefined;
  save(org: Organization): Promise<Organization> | Organization;
  getAll(): Promise<Organization[]> | Organization[];
  clear(): Promise<void> | void;
}

export interface MembershipRepository {
  getByOrgAndUser(orgId: string, userId: string): Promise<Membership | undefined> | Membership | undefined;
  getById(id: string): Promise<Membership | undefined> | Membership | undefined;
  getByUser(userId: string): Promise<Membership[]> | Membership[];
  save(membership: Membership): Promise<Membership> | Membership;
  getAll(): Promise<Membership[]> | Membership[];
  clear(): Promise<void> | void;
}

export interface AuthorizationRepository {
  organizations: OrganizationRepository;
  memberships: MembershipRepository;
  clear(): Promise<void> | void;
}

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private readonly store = new Map<string, Organization>();

  getById(id: string): Organization | undefined {
    return this.store.get(id);
  }

  save(org: Organization): Organization {
    this.store.set(org.id, org);
    return org;
  }

  getAll(): Organization[] {
    return Array.from(this.store.values());
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryMembershipRepository implements MembershipRepository {
  private readonly store = new Map<string, Membership>();

  getByOrgAndUser(orgId: string, userId: string): Membership | undefined {
    for (const membership of this.store.values()) {
      if (membership.orgId === orgId && membership.userId === userId && membership.active) {
        return membership;
      }
    }
    return undefined;
  }

  getById(id: string): Membership | undefined {
    return this.store.get(id);
  }

  getByUser(userId: string): Membership[] {
    const list: Membership[] = [];
    for (const m of this.store.values()) {
      if (m.userId === userId && m.active) {
        list.push(m);
      }
    }
    return list;
  }

  save(membership: Membership): Membership {
    this.store.set(membership.id, membership);
    return membership;
  }

  getAll(): Membership[] {
    return Array.from(this.store.values());
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryAuthorizationRepository implements AuthorizationRepository {
  public readonly organizations: OrganizationRepository;
  public readonly memberships: MembershipRepository;

  constructor() {
    this.organizations = new InMemoryOrganizationRepository();
    this.memberships = new InMemoryMembershipRepository();
  }

  clear(): void {
    this.organizations.clear();
    this.memberships.clear();
  }
}
