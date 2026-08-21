import { getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { AuthVerifier, AuthenticatedIdentity, validatePlatformUserRole } from "./types";
import { getFirebaseProjectId } from "./config";

let firebaseAdminApp: App | null = null;

function getFirebaseAdminApp(): App {
  if (!firebaseAdminApp) {
    const existingApps = getApps();
    if (existingApps.length > 0 && existingApps[0]) {
      firebaseAdminApp = existingApps[0];
    } else {
      // In Google Cloud Run and standard GCP environments, Application Default Credentials (ADC) are used automatically.
      // In production, getFirebaseProjectId() strictly fails closed if FIREBASE_PROJECT_ID is missing.
      const projectId = getFirebaseProjectId();
      firebaseAdminApp = initializeApp({
        projectId,
      });
    }
  }
  return firebaseAdminApp;
}

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
      const app = getFirebaseAdminApp();
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
      const errorMessage = err instanceof Error ? err.message : "Error al verificar el token de Firebase.";
      throw new Error(`Fallo de verificación de identidad: ${errorMessage}`);
    }
  }
}

