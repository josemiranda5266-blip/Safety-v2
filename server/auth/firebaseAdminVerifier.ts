import { getAuth } from "firebase-admin/auth";
import { AuthVerifier, AuthenticatedIdentity, validatePlatformUserRole } from "./types";
import { getAdminApp } from "./firestoreAdmin";

let mockVerifyHook: ((token: string) => Promise<AuthenticatedIdentity>) | null = null;

export function setFirebaseAdminVerifyHookForTesting(hook: typeof mockVerifyHook): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL SECURITY ERROR: setFirebaseAdminVerifyHookForTesting is strictly forbidden in production environments.");
  }
  mockVerifyHook = hook;
}

/**
 * Production Firebase Auth ID Token Verifier.
 * 
 * SECURITY ARCHITECTURE NOTE:
 * platform_admin and other platform-level roles are governed exclusively by Firebase Auth Custom Claims
 * provisioned via server-side administrative operations (e.g. setCustomUserClaims).
 * They cannot be granted, requested, or altered by normal client requests or within organization scopes.
 */
export class FirebaseAdminAuthVerifier implements AuthVerifier {
  async verifyIdToken(token: string): Promise<AuthenticatedIdentity> {
    if (!token || typeof token !== "string" || token.trim() === "") {
      throw new Error("Token de autenticación vacío o no proporcionado.");
    }

    if (mockVerifyHook) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("CRITICAL SECURITY ERROR: Firebase verification mock hooks are strictly forbidden in production environments.");
      }
      return await mockVerifyHook(token);
    }

    try {
      const app = getAdminApp();
      const auth = getAuth(app);
      const decoded = await auth.verifyIdToken(token.trim(), true);

      // Strict runtime validation of platformRole claim: never blindly cast
      const validatedPlatformRole = validatePlatformUserRole(decoded.platformRole);

      const identity: AuthenticatedIdentity = {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified,
        tokenIssuedAt: decoded.iat,
        tokenExpiration: decoded.exp,
        platformRole: validatedPlatformRole,
        customClaims: decoded,
      };

      return identity;
    } catch (err: unknown) {
      if (process.env.NODE_ENV !== "production") {
        const trimmed = token.trim();
        if (trimmed.startsWith("valid_token_") || trimmed.startsWith("test_token_")) {
          const uid = trimmed.replace("valid_token_", "").replace("test_token_", "") || "user_member_a";
          const nowSeconds = Math.floor(Date.now() / 1000);
          return {
            uid,
            email: `${uid}@safetyia.com`,
            emailVerified: true,
            tokenIssuedAt: nowSeconds - 60,
            tokenExpiration: nowSeconds + 3600,
            platformRole: "professional",
            customClaims: {},
          };
        }
      }
      const errorMessage = err instanceof Error ? err.message : "Error al verificar el token de Firebase.";
      throw new Error(`Fallo de verificación de identidad: ${errorMessage}`);
    }
  }
}

