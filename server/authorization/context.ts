import { AuthorizationContext } from "./types";
import { getMembershipsByUser, getMembership, getOrganization } from "./store";
import { PlatformUserRole } from "../../src/types/tenant";

/**
 * Resolves the authoritative AuthorizationContext for an authenticated user.
 * Strictly verifies active memberships against the active repository (In-Memory or Firestore).
 * Pure resolver: NEVER creates Organizations or Memberships, and NEVER infers platformRole from membershipRole.
 */
export async function resolveAuthorizationContext(
  userId: string,
  userEmail: string = "usuario@safetyia.com",
  requestedOrgId?: string,
  explicitPlatformRole?: PlatformUserRole
): Promise<AuthorizationContext | null> {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return null;
  }

  // 1. If explicit orgId is requested (e.g. from x-org-id selector header), verify active membership
  if (requestedOrgId && typeof requestedOrgId === "string" && requestedOrgId.trim() !== "") {
    const targetOrgId = requestedOrgId.trim();
    const membership = await getMembership(targetOrgId, userId);
    if (!membership || !membership.active) {
      return null;
    }

    const org = await getOrganization(targetOrgId);
    if (!org) {
      return null;
    }

    return {
      userId,
      userEmail: membership.userEmail || userEmail,
      orgId: org.id,
      membershipId: membership.id,
      membershipRole: membership.role,
      platformRole: explicitPlatformRole,
      assignedCompanyIds: membership.assignedCompanyIds,
    };
  }

  // 2. Otherwise query user's active memberships
  const userMemberships = (await getMembershipsByUser(userId)).filter((m) => m.active);

  if (userMemberships.length > 0) {
    const primaryMembership = userMemberships[0];
    const org = await getOrganization(primaryMembership.orgId);
    if (org) {
      return {
        userId,
        userEmail: primaryMembership.userEmail || userEmail,
        orgId: org.id,
        membershipId: primaryMembership.id,
        membershipRole: primaryMembership.role,
        platformRole: explicitPlatformRole,
        assignedCompanyIds: primaryMembership.assignedCompanyIds,
      };
    }
  }

  // 3. If user has no active membership in any organization, return null (403 forbidden)
  return null;
}
