import { getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { AuthVerifier, AuthenticatedIdentity } from "./types";
import { PlatformUserRole } from "../../src/types/tenant";

let firebaseAdminApp: App | null = null;

function getFirebaseAdminApp(): App {
  if (!firebaseAdminApp) {
    const existingApps = getApps();
    if (existingApps.length > 0 && existingApps[0]) {
      firebaseAdminApp = existingApps[0];
    } else {
      // In Google Cloud Run and standard GCP environments, Application Default Credentials (ADC) are used automatically.
      const projectId =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GCLOUD_PROJECT ||
        "ai-studio-safetyia-f7213253-86cf-449b-8822-f4afb5c24a1e";
      firebaseAdminApp = initializeApp({
        projectId,
      });
    }
  }
  return firebaseAdminApp;
}

export class FirebaseAdminAuthVerifier implements AuthVerifier {
  async verifyIdToken(token: string): Promise<AuthenticatedIdentity> {
    if (!token || typeof token !== "string" || token.trim() === "") {
      throw new Error("Token de autenticación vacío o no proporcionado.");
    }

    try {
      const app = getFirebaseAdminApp();
      const auth = getAuth(app);
      const decoded = await auth.verifyIdToken(token.trim(), true);

      const identity: AuthenticatedIdentity = {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified,
        tokenIssuedAt: decoded.iat,
        tokenExpiration: decoded.exp,
        platformRole: (decoded.platformRole as PlatformUserRole) || undefined,
        customClaims: decoded,
      };

      return identity;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al verificar el token de Firebase.";
      throw new Error(`Fallo de verificación de identidad: ${errorMessage}`);
    }
  }
}
