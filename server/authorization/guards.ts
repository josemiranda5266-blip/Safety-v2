import { AuthorizationContext, Permission, MEMBERSHIP_ROLE_PERMISSIONS } from "./types";
import { Company, Establishment, Employee } from "../../src/types/tenant";

/**
 * Checks if the given AuthorizationContext has the requested Permission.
 */
export function hasPermission(context: AuthorizationContext, permission: Permission): boolean {
  if (context.platformRole === "platform_admin") {
    return true;
  }

  const rolePerms = MEMBERSHIP_ROLE_PERMISSIONS[context.membershipRole];
  if (!rolePerms) {
    return false;
  }

  return rolePerms.includes(permission);
}

/**
 * Zero-Trust Company Access Validator:
 * 1. Checks tenant isolation (Company.orgId === Context.orgId).
 * 2. Checks permission (e.g. company:read, company:update, company:delete).
 * 3. Checks assignedCompanyIds restriction if configured for this member.
 */
export function canAccessCompany(
  context: AuthorizationContext,
  company: Company,
  requiredPermission: Permission = "company:read"
): boolean {
  // 1. Strict Tenant Isolation
  if (company.orgId !== context.orgId) {
    return false;
  }

  // 2. Role Permission Check
  if (!hasPermission(context, requiredPermission)) {
    return false;
  }

  // 3. Granular Company Assignment Restriction
  if (
    context.assignedCompanyIds &&
    context.assignedCompanyIds.length > 0 &&
    !context.assignedCompanyIds.includes(company.id)
  ) {
    return false;
  }

  return true;
}

/**
 * Zero-Trust Establishment Access Validator:
 * 1. Checks tenant isolation (Establishment.orgId === Context.orgId).
 * 2. Checks role permission.
 * 3. Checks assignedCompanyIds restriction on the parent company.
 */
export function canAccessEstablishment(
  context: AuthorizationContext,
  establishment: Establishment,
  requiredPermission: Permission = "establishment:read"
): boolean {
  // 1. Strict Tenant Isolation
  if (establishment.orgId !== context.orgId) {
    return false;
  }

  // 2. Role Permission Check
  if (!hasPermission(context, requiredPermission)) {
    return false;
  }

  // 3. Parent Company Assignment Check
  if (
    context.assignedCompanyIds &&
    context.assignedCompanyIds.length > 0 &&
    !context.assignedCompanyIds.includes(establishment.companyId)
  ) {
    return false;
  }

  return true;
}

/**
 * Zero-Trust Employee Access Validator:
 * 1. Checks tenant isolation (Employee.orgId === Context.orgId).
 * 2. Checks role permission.
 * 3. Checks assignedCompanyIds restriction on the parent company.
 */
export function canAccessEmployee(
  context: AuthorizationContext,
  employee: Employee,
  requiredPermission: Permission = "employee:read"
): boolean {
  // 1. Strict Tenant Isolation
  if (employee.orgId !== context.orgId) {
    return false;
  }

  // 2. Role Permission Check
  if (!hasPermission(context, requiredPermission)) {
    return false;
  }

  // 3. Parent Company Assignment Check
  if (
    context.assignedCompanyIds &&
    context.assignedCompanyIds.length > 0 &&
    !context.assignedCompanyIds.includes(employee.companyId)
  ) {
    return false;
  }

  return true;
}
