import fs from "fs";
import path from "path";

/**
 * Centralized Firebase & Auth Configuration Manager for Safety IA V2.
 * 
 * Strict Fail-Closed Rule:
 * In production (NODE_ENV === "production"), FIREBASE_PROJECT_ID is mandatory.
 * No hardcoded fallback Project IDs are permitted.
 */

export interface AuthConfig {
  firebaseProjectId?: string;
  isProduction: boolean;
  authDevMode: boolean;
}

export function getAuthConfig(): AuthConfig {
  const isProduction = process.env.NODE_ENV === "production";
  const authDevMode = process.env.AUTH_DEV_MODE === "true";
  let firebaseProjectId: string | undefined = undefined;

  if (isProduction) {
    firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  } else {
    firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

    if (!firebaseProjectId && process.env.IS_RUNNING_TESTS !== "true") {
      try {
        const configPath = path.join(process.cwd(), "firebase-applet-config.json");
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed.projectId) {
            firebaseProjectId = parsed.projectId;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return {
    firebaseProjectId,
    isProduction,
    authDevMode,
  };
}

export function getFirebaseProjectId(): string {
  const config = getAuthConfig();

  if (config.isProduction) {
    if (!config.firebaseProjectId || config.firebaseProjectId.trim() === "") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: FIREBASE_PROJECT_ID environment variable is strictly required in production mode. Fail closed."
      );
    }
    return config.firebaseProjectId.trim();
  }

  // In test / development environment:
  if (config.firebaseProjectId && config.firebaseProjectId.trim() !== "") {
    return config.firebaseProjectId.trim();
  }

  // Explicit return for dev/test when not configured
  return "safetyia-dev-placeholder";
}

export function validateAuthConfig(): void {
  const config = getAuthConfig();
  if (config.isProduction) {
    if (config.authDevMode) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: AUTH_DEV_MODE cannot be enabled when NODE_ENV is production."
      );
    }
    if (!config.firebaseProjectId || config.firebaseProjectId.trim() === "") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: FIREBASE_PROJECT_ID is missing in production environment."
      );
    }
  }
}
