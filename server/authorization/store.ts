import { Organization, Membership } from "../../src/types/tenant";
import {
  AuthorizationRepository,
  InMemoryAuthorizationRepository,
} from "./repository";

// Default in-memory repository instance for Phase 2
// In Phase 3, this can be swapped with FirestoreAuthorizationRepository without modifying consumers
let currentAuthRepository: AuthorizationRepository = new InMemoryAuthorizationRepository();

export function getAuthorizationRepository(): AuthorizationRepository {
  return currentAuthRepository;
}

export function setAuthorizationRepository(repo: AuthorizationRepository): void {
  currentAuthRepository = repo;
}

export function getOrganization(orgId: string): Organization | undefined {
  return currentAuthRepository.organizations.getById(orgId);
}

export function saveOrganization(org: Organization): Organization {
  return currentAuthRepository.organizations.save(org);
}

export function getMembership(orgId: string, userId: string): Membership | undefined {
  return currentAuthRepository.memberships.getByOrgAndUser(orgId, userId);
}

export function getMembershipById(membershipId: string): Membership | undefined {
  return currentAuthRepository.memberships.getById(membershipId);
}

export function getMembershipsByUser(userId: string): Membership[] {
  return currentAuthRepository.memberships.getByUser(userId);
}

export function saveMembership(membership: Membership): Membership {
  return currentAuthRepository.memberships.save(membership);
}

export function getOrganizations(): Organization[] {
  return currentAuthRepository.organizations.getAll();
}

export function getAllMemberships(): Membership[] {
  return currentAuthRepository.memberships.getAll();
}

export function clearStore(): void {
  currentAuthRepository.clear();
}

