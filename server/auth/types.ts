import { PlatformUserRole } from "../../src/types/tenant";

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
