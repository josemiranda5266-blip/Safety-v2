import { PlatformUserRole } from "../../src/types/tenant";

export const ALLOWED_PLATFORM_ROLES: readonly PlatformUserRole[] = [
  "platform_admin",
  "consultant_admin",
  "professional",
  "auditor_read_only",
] as const;

/**
 * Validates whether a value is a genuine PlatformUserRole at runtime.
 * Returns undefined if missing or invalid. Never casts arbitrary strings.
 */
export function validatePlatformUserRole(role: unknown): PlatformUserRole | undefined {
  if (typeof role === "string" && (ALLOWED_PLATFORM_ROLES as readonly string[]).includes(role)) {
    return role as PlatformUserRole;
  }
  return undefined;
}

export interface AuthenticatedIdentity {
  uid: string;
  email?: string;
  displayName?: string;
  emailVerified?: boolean;
  tokenIssuedAt?: number;
  tokenExpiration?: number;
  platformRole?: PlatformUserRole;
  customClaims?: Record<string, unknown>;
}

export interface AuthVerifier {
  verifyIdToken(token: string): Promise<AuthenticatedIdentity>;
}

