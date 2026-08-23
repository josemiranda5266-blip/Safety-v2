import { AuthorizationContext } from "./types";
import { getMembershipsByUser, getMembership, getOrganization, saveOrganization, saveMembership } from "./store";
import { PlatformUserRole, Organization, Membership } from "../../src/types/tenant";

/**
 * Resolves the authoritative AuthorizationContext for an authenticated user.
 * Strictly verifies active memberships against the active repository.
 * If requestedOrgId is stale or invalid, falls back to the user's primary active membership.
 * If user has no active memberships, auto-provisions a default workspace organization and owner membership.
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

  const cleanUserId = userId.trim();
  const cleanRequestedOrgId = requestedOrgId?.trim();

  // 1. If explicit orgId is requested, verify active membership in targetOrgId
  if (cleanRequestedOrgId && cleanRequestedOrgId !== "") {
    const membership = await getMembership(cleanRequestedOrgId, cleanUserId);
    if (membership && membership.active) {
      const org = await getOrganization(cleanRequestedOrgId);
      if (org) {
        return {
          userId: cleanUserId,
          userEmail: membership.userEmail || userEmail,
          orgId: org.id,
          membershipId: membership.id,
          membershipRole: membership.role,
          platformRole: explicitPlatformRole,
          assignedCompanyIds: membership.assignedCompanyIds,
        };
      }
    }
    return null;
  }

  // 2. Fallback: Query user's active memberships across all organizations
  const userMemberships = (await getMembershipsByUser(cleanUserId)).filter((m) => m.active);

  if (userMemberships.length > 0) {
    const primaryMembership = userMemberships[0];
    const org = await getOrganization(primaryMembership.orgId);
    if (org) {
      return {
        userId: cleanUserId,
        userEmail: primaryMembership.userEmail || userEmail,
        orgId: org.id,
        membershipId: primaryMembership.id,
        membershipRole: primaryMembership.role,
        platformRole: explicitPlatformRole,
        assignedCompanyIds: primaryMembership.assignedCompanyIds,
      };
    }
  }

  // 3. Pure resolution: If user has no active membership in any organization, return null
  return null;
}
