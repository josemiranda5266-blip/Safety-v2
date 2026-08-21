import { AuthorizationContext } from "./types";
import { getMembershipsByUser, getMembership, getOrganization, saveOrganization, saveMembership } from "./store";
import { Organization, Membership } from "../../src/types/tenant";

/**
 * Resolves the authoritative AuthorizationContext for an authenticated user.
 * Never trusts role, orgId, or companyIds from frontend.
 */
export function resolveAuthorizationContext(
  userId: string,
  userEmail: string = "usuario@safetyia.com",
  requestedOrgId?: string
): AuthorizationContext | null {
  if (!userId) {
    return null;
  }

  // 1. If explicit orgId is requested, verify user's active membership in that org
  if (requestedOrgId) {
    const membership = getMembership(requestedOrgId, userId);
    if (!membership || !membership.active) {
      return null;
    }

    const org = getOrganization(requestedOrgId);
    if (!org) {
      return null;
    }

    return {
      userId,
      userEmail: membership.userEmail || userEmail,
      orgId: org.id,
      membershipId: membership.id,
      membershipRole: membership.role,
      platformRole: membership.role === "owner" ? "consultant_admin" : "professional",
      assignedCompanyIds: membership.assignedCompanyIds,
    };
  }

  // 2. Otherwise find user's active memberships
  const userMemberships = getMembershipsByUser(userId);

  if (userMemberships.length > 0) {
    const primaryMembership = userMemberships[0];
    const org = getOrganization(primaryMembership.orgId);
    if (org) {
      return {
        userId,
        userEmail: primaryMembership.userEmail || userEmail,
        orgId: org.id,
        membershipId: primaryMembership.id,
        membershipRole: primaryMembership.role,
        platformRole: primaryMembership.role === "owner" ? "consultant_admin" : "professional",
        assignedCompanyIds: primaryMembership.assignedCompanyIds,
      };
    }
  }

  // 3. If the user has no organization yet, bootstrap a default personal Organization & Owner Membership
  const now = new Date().toISOString();
  const defaultOrgId = `org_${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
  
  let org = getOrganization(defaultOrgId);
  if (!org) {
    org = {
      id: defaultOrgId,
      name: "Estudio H&S Personal",
      ownerUid: userId,
      plan: "free",
      planStatus: "active",
      contactEmail: userEmail,
      createdAt: now,
    };
    saveOrganization(org);
  }

  const membershipId = `mem_${defaultOrgId}_${userId.slice(0, 8)}`;
  let membership = getMembership(defaultOrgId, userId);
  if (!membership) {
    membership = {
      id: membershipId,
      orgId: defaultOrgId,
      userId,
      userEmail,
      role: "owner",
      active: true,
      invitedAt: now,
      joinedAt: now,
    };
    saveMembership(membership);
  }

  return {
    userId,
    userEmail,
    orgId: org.id,
    membershipId: membership.id,
    membershipRole: membership.role,
    platformRole: "consultant_admin",
    assignedCompanyIds: undefined,
  };
}
