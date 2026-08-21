import { Router, Response } from "express";
import { requireAuth, TenantRequest } from "../authorization/middleware";
import { getMembershipsByUser, getOrganization, saveOrganization, saveMembership, getOrganizations } from "../authorization/store";
import { listCompanies } from "../services/companyService";
import { Organization, Membership } from "../../src/types/tenant";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/v2/tenant/my-context
 * Returns the current authenticated user's authorized organizations and memberships.
 * If user has no organizations in the store, automatically provisions an initial default organization and owner membership.
 */
router.get("/my-context", async (req: TenantRequest, res: Response) => {
  const userId = req.userUid!;
  const userEmail = req.identity?.email || req.userEmail || "profesional@safetyia.com";
  const userName = req.identity?.displayName || "Profesional H&S";

  try {
    let memberships = await getMembershipsByUser(userId);
    memberships = memberships.filter((m) => m.active);

    // If user has no active memberships, auto-provision default workspace organization
    if (memberships.length === 0) {
      const now = new Date().toISOString();
      const defaultOrgId = `org_${userId.slice(0, 8)}_${Math.random().toString(36).slice(2, 6)}`;
      const defaultOrg: Organization = {
        id: defaultOrgId,
        name: "Mi Consultora H&S",
        ownerUid: userId,
        plan: "pro",
        planStatus: "active",
        contactEmail: userEmail,
        createdAt: now,
        updatedAt: now,
      };

      const defaultMembership: Membership = {
        id: `mem_${userId.slice(0, 8)}_${Math.random().toString(36).slice(2, 6)}`,
        orgId: defaultOrgId,
        userId: userId,
        userEmail: userEmail,
        userName: userName,
        role: "owner",
        active: true,
        invitedAt: now,
        joinedAt: now,
      };

      await saveOrganization(defaultOrg);
      await saveMembership(defaultMembership);

      memberships = [defaultMembership];
    }

    const organizations: Organization[] = [];
    for (const mem of memberships) {
      const org = await getOrganization(mem.orgId);
      if (org) {
        organizations.push(org);
      }
    }

    res.json({
      userId,
      userEmail,
      userName,
      memberships,
      organizations,
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Error al recuperar contexto multi-tenant",
      details: error.message,
    });
  }
});

export default router;
