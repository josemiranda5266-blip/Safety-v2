import { PlatformUserRole, MembershipRole } from "../../src/types/tenant";

export type Permission =
  // Organization permissions
  | "organization:read"
  | "organization:update"
  | "membership:manage"
  // Company permissions
  | "company:create"
  | "company:read"
  | "company:update"
  | "company:delete"
  // Establishment permissions
  | "establishment:create"
  | "establishment:read"
  | "establishment:update"
  | "establishment:delete"
  // Employee permissions
  | "employee:create"
  | "employee:read"
  | "employee:update"
  | "employee:delete"
  // Inspection & Compliance permissions
  | "inspection:create"
  | "inspection:read"
  | "inspection:update"
  | "compliance:read"
  // AI & Auditor permissions
  | "ai:use"
  | "auditor:read"
  // Document permissions
  | "document:create"
  | "document:read"
  | "document:update"
  | "document:delete";

export interface AuthorizationContext {
  userId: string;
  userEmail: string;
  orgId: string;
  membershipId: string;
  membershipRole: MembershipRole;
  platformRole?: PlatformUserRole;
  assignedCompanyIds?: string[]; // If defined and non-empty, member is restricted to these company IDs
}

/**
 * RBAC Matrix: Defines permissions granted to each MembershipRole within an Organization.
 */
export const MEMBERSHIP_ROLE_PERMISSIONS: Record<MembershipRole, Permission[]> = {
  owner: [
    "organization:read",
    "organization:update",
    "membership:manage",
    "company:create",
    "company:read",
    "company:update",
    "company:delete",
    "establishment:create",
    "establishment:read",
    "establishment:update",
    "establishment:delete",
    "employee:create",
    "employee:read",
    "employee:update",
    "employee:delete",
    "inspection:create",
    "inspection:read",
    "inspection:update",
    "compliance:read",
    "ai:use",
    "auditor:read",
    "document:create",
    "document:read",
    "document:update",
    "document:delete",
  ],
  admin: [
    "organization:read",
    "organization:update",
    "membership:manage",
    "company:create",
    "company:read",
    "company:update",
    "company:delete",
    "establishment:create",
    "establishment:read",
    "establishment:update",
    "establishment:delete",
    "employee:create",
    "employee:read",
    "employee:update",
    "employee:delete",
    "inspection:create",
    "inspection:read",
    "inspection:update",
    "compliance:read",
    "ai:use",
    "auditor:read",
    "document:create",
    "document:read",
    "document:update",
    "document:delete",
  ],
  member: [
    "organization:read",
    "company:create",
    "company:read",
    "company:update",
    "establishment:create",
    "establishment:read",
    "establishment:update",
    "employee:create",
    "employee:read",
    "employee:update",
    "inspection:create",
    "inspection:read",
    "inspection:update",
    "compliance:read",
    "ai:use",
    "document:create",
    "document:read",
    "document:update",
  ],
  auditor: [
    "organization:read",
    "company:read",
    "establishment:read",
    "employee:read",
    "inspection:read",
    "compliance:read",
    "auditor:read",
    "document:read",
  ],
};
