import { AuthVerifier, AuthenticatedIdentity } from "./types";
import { PlatformUserRole } from "../../src/types/tenant";

export interface MockTokenPayload {
  uid: string;
  email?: string;
  displayName?: string;
  emailVerified?: boolean;
  issuedAtSeconds?: number;
  expiresAtSeconds?: number;
  platformRole?: PlatformUserRole;
}

export class MockAuthVerifier implements AuthVerifier {
  private tokenRegistry = new Map<string, MockTokenPayload>();

  constructor() {
    // Seed standard test tokens
    const nowSeconds = Math.floor(Date.now() / 1000);
    this.registerToken("valid_token_owner_a", {
      uid: "user_owner_a",
      email: "owner@alpha.com",
      displayName: "Owner Alpha",
      emailVerified: true,
      issuedAtSeconds: nowSeconds - 60,
      expiresAtSeconds: nowSeconds + 3600,
    });
    this.registerToken("valid_token_member_a", {
      uid: "user_member_a",
      email: "pro@alpha.com",
      displayName: "Pro Alpha",
      emailVerified: true,
      issuedAtSeconds: nowSeconds - 60,
      expiresAtSeconds: nowSeconds + 3600,
    });
    this.registerToken("valid_token_restricted_a", {
      uid: "user_restricted_a",
      email: "restricted@alpha.com",
      displayName: "Restricted Pro Alpha",
      emailVerified: true,
      issuedAtSeconds: nowSeconds - 60,
      expiresAtSeconds: nowSeconds + 3600,
    });
    this.registerToken("valid_token_auditor_a", {
      uid: "user_auditor_a",
      email: "auditor@alpha.com",
      displayName: "Auditor Alpha",
      emailVerified: true,
      issuedAtSeconds: nowSeconds - 60,
      expiresAtSeconds: nowSeconds + 3600,
    });
    this.registerToken("valid_token_owner_b", {
      uid: "user_owner_b",
      email: "owner@beta.com",
      displayName: "Owner Beta",
      emailVerified: true,
      issuedAtSeconds: nowSeconds - 60,
      expiresAtSeconds: nowSeconds + 3600,
    });
    this.registerToken("valid_token_stranger", {
      uid: "user_stranger_no_org",
      email: "stranger@external.com",
      displayName: "Stranger No Org",
      emailVerified: true,
      issuedAtSeconds: nowSeconds - 60,
      expiresAtSeconds: nowSeconds + 3600,
    });
    this.registerToken("expired_token", {
      uid: "user_expired",
      email: "expired@test.com",
      issuedAtSeconds: nowSeconds - 7200,
      expiresAtSeconds: nowSeconds - 3600, // Expired 1 hour ago
    });
  }

  registerToken(token: string, payload: MockTokenPayload): void {
    this.tokenRegistry.set(token, payload);
  }

  clearTokens(): void {
    this.tokenRegistry.clear();
  }

  async verifyIdToken(token: string): Promise<AuthenticatedIdentity> {
    if (!token || typeof token !== "string" || token.trim() === "") {
      throw new Error("Token vacío");
    }

    const trimmed = token.trim();
    const payload = this.tokenRegistry.get(trimmed);

    if (!payload) {
      // If formatted as `test_token_<uid>`, dynamically parse for convenience in testing if valid
      if (trimmed.startsWith("test_token_")) {
        const uid = trimmed.replace("test_token_", "");
        const nowSeconds = Math.floor(Date.now() / 1000);
        return {
          uid,
          email: `${uid}@safetyia.com`,
          emailVerified: true,
          tokenIssuedAt: nowSeconds - 10,
          tokenExpiration: nowSeconds + 3600,
        };
      }
      throw new Error("Token inválido o no reconocido.");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.expiresAtSeconds && payload.expiresAtSeconds < nowSeconds) {
      throw new Error("Token de autenticación expirado.");
    }

    return {
      uid: payload.uid,
      email: payload.email,
      displayName: payload.displayName,
      emailVerified: payload.emailVerified,
      tokenIssuedAt: payload.issuedAtSeconds,
      tokenExpiration: payload.expiresAtSeconds,
      platformRole: payload.platformRole,
    };
  }
}
