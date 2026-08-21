import { AuthVerifier } from "./types";
import { FirebaseAdminAuthVerifier } from "./firebaseAdminVerifier";
import { MockAuthVerifier } from "./mockAuthVerifier";

let currentAuthVerifier: AuthVerifier | null = null;

export function getAuthVerifier(): AuthVerifier {
  if (currentAuthVerifier) {
    // Safety check: if in production, never allow non-FirebaseAdmin verifier
    if (process.env.NODE_ENV === "production" && !(currentAuthVerifier instanceof FirebaseAdminAuthVerifier)) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: Mock verifier detected in production environment. Refusing to operate."
      );
    }
    return currentAuthVerifier;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const authDevMode = process.env.AUTH_DEV_MODE === "true";

  if (isProduction) {
    if (authDevMode) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: AUTH_DEV_MODE cannot be enabled when NODE_ENV is production."
      );
    }
    currentAuthVerifier = new FirebaseAdminAuthVerifier();
  } else if (process.env.NODE_ENV === "test" || authDevMode) {
    currentAuthVerifier = new MockAuthVerifier();
  } else {
    // In local dev by default, attempt Firebase Admin with fallback to Mock if unconfigured
    currentAuthVerifier = new FirebaseAdminAuthVerifier();
  }

  return currentAuthVerifier;
}

export function setGlobalAuthVerifier(verifier: AuthVerifier): void {
  if (process.env.NODE_ENV === "production" && !(verifier instanceof FirebaseAdminAuthVerifier)) {
    throw new Error("Cannot set non-production AuthVerifier when NODE_ENV is production.");
  }
  currentAuthVerifier = verifier;
}

export function resetGlobalAuthVerifier(): void {
  currentAuthVerifier = null;
}
