import { AuthVerifier } from "./types";
import { FirebaseAdminAuthVerifier } from "./firebaseAdminVerifier";
import { MockAuthVerifier } from "./mockAuthVerifier";
import { validateAuthConfig } from "./config";

let currentAuthVerifier: AuthVerifier | null = null;

export function getAuthVerifier(): AuthVerifier {
  // Validate central configuration
  validateAuthConfig();

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // Fail-Closed: check for any bypass or mock environment variables
    for (const key of Object.keys(process.env)) {
      const upperKey = key.toUpperCase();
      if (upperKey.includes("BYPASS") || upperKey.includes("MOCK")) {
        throw new Error(
          `CRITICAL SECURITY VIOLATION: Production environment contains bypass or mock configuration variable: ${key}. Fail closed.`
        );
      }
    }

    if (currentAuthVerifier && !(currentAuthVerifier instanceof FirebaseAdminAuthVerifier)) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: Mock verifier detected in production environment. Refusing to operate."
      );
    }

    if (!currentAuthVerifier) {
      currentAuthVerifier = new FirebaseAdminAuthVerifier();
    }
    return currentAuthVerifier;
  }

  if (currentAuthVerifier) {
    return currentAuthVerifier;
  }

  const authDevMode = process.env.AUTH_DEV_MODE === "true";

  if (process.env.NODE_ENV === "test" || authDevMode) {
    currentAuthVerifier = new MockAuthVerifier();
  } else {
    // In local dev by default, attempt Firebase Admin
    currentAuthVerifier = new FirebaseAdminAuthVerifier();
  }

  return currentAuthVerifier;
}

export function setGlobalAuthVerifier(verifier: AuthVerifier): void {
  if (process.env.NODE_ENV === "production" && !(verifier instanceof FirebaseAdminAuthVerifier)) {
    throw new Error("CRITICAL SECURITY VIOLATION: Cannot set non-production AuthVerifier when NODE_ENV is production.");
  }
  currentAuthVerifier = verifier;
}

export function resetGlobalAuthVerifier(): void {
  currentAuthVerifier = null;
}

