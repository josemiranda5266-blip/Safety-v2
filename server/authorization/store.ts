import { Organization, Membership } from "../../src/types/tenant";
import {
  AuthorizationRepository,
  InMemoryAuthorizationRepository,
} from "./repository";
import { FirestoreAuthorizationRepository } from "./firestoreRepository";

// Current active repository instance
// Can be InMemoryAuthorizationRepository or FirestoreAuthorizationRepository
let currentAuthRepository: AuthorizationRepository = new InMemoryAuthorizationRepository();

export function getAuthorizationRepository(): AuthorizationRepository {
  return currentAuthRepository;
}

export function setAuthorizationRepository(repo: AuthorizationRepository): void {
  currentAuthRepository = repo;
}

/**
 * Initializes Firestore as the active Authorization repository.
 */
export function useFirestoreAuthorizationRepository(): FirestoreAuthorizationRepository {
  const repo = new FirestoreAuthorizationRepository();
  currentAuthRepository = repo;
  return repo;
}

export async function getOrganization(orgId: string): Promise<Organization | undefined> {
  return await currentAuthRepository.organizations.getById(orgId);
}

export async function saveOrganization(org: Organization): Promise<Organization> {
  return await currentAuthRepository.organizations.save(org);
}

export async function getMembership(orgId: string, userId: string): Promise<Membership | undefined> {
  return await currentAuthRepository.memberships.getByOrgAndUser(orgId, userId);
}

export async function getMembershipById(membershipId: string): Promise<Membership | undefined> {
  return await currentAuthRepository.memberships.getById(membershipId);
}

export async function getMembershipsByUser(userId: string): Promise<Membership[]> {
  return await currentAuthRepository.memberships.getByUser(userId);
}

export async function saveMembership(membership: Membership): Promise<Membership> {
  return await currentAuthRepository.memberships.save(membership);
}

export async function getOrganizations(): Promise<Organization[]> {
  return await currentAuthRepository.organizations.getAll();
}

export async function getAllMemberships(): Promise<Membership[]> {
  return await currentAuthRepository.memberships.getAll();
}

export async function clearStore(): Promise<void> {
  await currentAuthRepository.clear();
}
