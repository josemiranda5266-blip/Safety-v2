import { Organization, Membership } from "../../src/types/tenant";
import {
  AuthorizationRepository,
  InMemoryAuthorizationRepository,
} from "./repository";
import { FirestoreAuthorizationRepository } from "./firestoreRepository";
import { validateAuthConfig } from "../auth/config";

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

/**
 * Initializes the authorization repository depending on environment.
 * 
 * Strict Production Policy:
 * - NODE_ENV === "production" MUST use FirestoreAuthorizationRepository.
 * - InMemoryAuthorizationRepository is STRICTLY FORBIDDEN in production.
 * - Firestore health check MUST succeed before accepting traffic.
 * - If Firestore is unavailable or health check fails in production -> THROW CRITICAL SECURITY ERROR (Startup failure).
 */
export async function initializeAuthorizationRepository(
  overrideEnv?: string
): Promise<AuthorizationRepository> {
  const env = overrideEnv || process.env.NODE_ENV || "development";

  if (env === "production") {
    // 1. Validate auth config first (checks FIREBASE_PROJECT_ID, AUTH_DEV_MODE, etc.)
    validateAuthConfig();

    // 2. Select FirestoreAuthorizationRepository
    const repo = useFirestoreAuthorizationRepository();

    // 3. Strict guard: Production authorization repository CANNOT be InMemory
    if (getAuthorizationRepository() instanceof InMemoryAuthorizationRepository) {
      throw new Error(
        "CRITICAL SECURITY ERROR: Production authorization repository cannot be InMemory."
      );
    }

    // 4. Run real Firestore health check
    const isHealthy = repo.healthCheck ? await repo.healthCheck() : false;
    if (!isHealthy) {
      throw new Error(
        "CRITICAL SECURITY ERROR: Firestore authorization repository health check failed in production. Startup halted."
      );
    }

    return repo;
  }

  // Non-production (development, test) can use current repo or InMemory
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
