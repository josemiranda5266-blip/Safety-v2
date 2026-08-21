import { getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getFirebaseProjectId, getAuthConfig } from "./config";
import fs from "fs";
import path from "path";

let cachedFirestore: Firestore | null = null;
let cachedAdminApp: App | null = null;

export function getAdminApp(): App {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    cachedAdminApp = existingApps[0];
    return cachedAdminApp;
  }

  const projectId = getFirebaseProjectId();
  cachedAdminApp = initializeApp({
    projectId,
  });

  return cachedAdminApp;
}

/**
 * Returns the Firebase Admin Firestore instance.
 * Strictly uses Firebase Admin SDK to interact with the project database.
 */
export function getAdminFirestore(): Firestore {
  if (cachedFirestore) {
    return cachedFirestore;
  }

  const config = getAuthConfig();
  let firestoreDatabaseId: string | undefined = process.env.FIRESTORE_DATABASE_ID;

  // Attempt to read databaseId from firebase-applet-config.json if not set in environment
  if (!firestoreDatabaseId) {
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.firestoreDatabaseId) {
          firestoreDatabaseId = parsed.firestoreDatabaseId;
        }
      }
    } catch {
      // ignore
    }
  }

  const app = getAdminApp();

  if (firestoreDatabaseId && firestoreDatabaseId !== "(default)") {
    cachedFirestore = getFirestore(app, firestoreDatabaseId);
  } else {
    cachedFirestore = getFirestore(app);
  }

  return cachedFirestore;
}

/**
 * Helper to inject or reset Firestore instance for testing.
 */
export function setAdminFirestoreForTesting(firestore: Firestore | null): void {
  cachedFirestore = firestore;
}
