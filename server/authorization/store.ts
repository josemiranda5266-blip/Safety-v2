import { Organization, Membership } from "../../src/types/tenant";
import {
  AuthorizationRepository,
  InMemoryAuthorizationRepository,
} from "./repository";
import { FirestoreAuthorizationRepository } from "./firestoreRepository";
import { validateAuthConfig } from "../auth/config";

let currentAuthRepository: AuthorizationRepository = new InMemoryAuthorizationRepository();

export function getAuthorizationRepository(): AuthorizationRepository {
  return currentAuthRepository;
}

export function setAuthorizationRepository(repo: AuthorizationRepository): void {
  currentAuthRepository = repo;
}

export function useFirestoreAuthorizationRepository(): FirestoreAuthorizationRepository {
  const repo = new FirestoreAuthorizationRepository();
  currentAuthRepository = repo;
  return repo;
}

export function isPersonalMode(): boolean {
  return process.env.SAFETY_PERSONAL_MODE !== "false";
}

/**
 * Initializes the authorization repository depending on environment.
 * Personal mode intentionally has no Firebase authorization dependency.
 */
export async function initializeAuthorizationRepository(
  overrideEnv?: string
): Promise<AuthorizationRepository> {
  const env = overrideEnv || process.env.NODE_ENV || "development";

  // Personal single-user deployment: keep authorization services local and do not
  // require Firebase Admin credentials just to start the application.
  if (isPersonalMode()) {
    if (!(getAuthorizationRepository() instanceof InMemoryAuthorizationRepository)) {
      setAuthorizationRepository(new InMemoryAuthorizationRepository());
    }
    return getAuthorizationRepository();
  }

  if (env === "production") {
    validateAuthConfig();

    const repo = useFirestoreAuthorizationRepository();

    if (getAuthorizationRepository() instanceof InMemoryAuthorizationRepository) {
      throw new Error(
        "CRITICAL SECURITY ERROR: Production authorization repository cannot be InMemory."
      );
    }

    const isHealthy = repo.healthCheck ? await repo.healthCheck() : false;
    if (!isHealthy) {
      throw new Error(
        "CRITICAL SECURITY ERROR: Firestore authorization repository health check failed in production. Startup halted."
      );
    }

    return repo;
  }

  return getAuthorizationRepository();
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
