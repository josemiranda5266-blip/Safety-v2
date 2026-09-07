import { getApps, initializeApp, App, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseProjectId, getAuthConfig } from "./config";

let cachedFirestore: Firestore | null = null;
let cachedAdminApp: App | null = null;
let cachedStorageBucket: any = null;

export function parsePrivateKey(rawKey: string): string {
  if (!rawKey || typeof rawKey !== "string") {
    throw new Error("Invalid private key: not a string or empty");
  }

  let key = rawKey.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  key = key.replace(/\\n/g, "\n");

  if (!key.includes("BEGIN PRIVATE KEY")) {
    throw new Error("Invalid private key: missing BEGIN PRIVATE KEY header");
  }
  if (!key.includes("END PRIVATE KEY")) {
    throw new Error("Invalid private key: missing END PRIVATE KEY footer");
  }

  return key;
}

/**
 * Resolves Firebase Admin credentials exclusively from explicit Firebase
 * environment variables. Safety-v2 no longer depends on
 * GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials.
 *
 * Required credentials for the server:
 * - FIREBASE_PROJECT_ID (or GCLOUD_PROJECT / GOOGLE_CLOUD_PROJECT)
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY
 *
 * This keeps Google AI Studio from treating GOOGLE_APPLICATION_CREDENTIALS
 * as a required project secret and prevents accidental credential discovery
 * from the execution environment.
 */
export function resolveAdminCredentials(): {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  source: string;
} {
  const envProject =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;
  const envEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const envKey = process.env.FIREBASE_PRIVATE_KEY;

  if (envEmail && envEmail.trim() !== "" && envKey && envKey.trim() !== "") {
    const projectId = envProject || getFirebaseProjectId();
    const privateKey = parsePrivateKey(envKey);

    return {
      projectId: projectId.trim(),
      clientEmail: envEmail.trim(),
      privateKey,
      source: "firebase_env",
    };
  }

  const missing: string[] = [];
  if (!envProject) missing.push("FIREBASE_PROJECT_ID");
  if (!envEmail) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!envKey) missing.push("FIREBASE_PRIVATE_KEY");

  throw new Error(
    `Firebase Admin credentials are not configured. Missing: ${missing.join(", ")}. ` +
      "Configure the Firebase environment variables on the server; GOOGLE_APPLICATION_CREDENTIALS is not used by Safety-v2."
  );
}

export function getAdminApp(): App {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    cachedAdminApp = existingApps[0];
    return cachedAdminApp;
  }

  const creds = resolveAdminCredentials();

  if (!creds.projectId || !creds.clientEmail || !creds.privateKey) {
    throw new Error(
      "Firebase Admin credentials are incomplete. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required."
    );
  }

  try {
    cachedAdminApp = initializeApp({
      projectId: creds.projectId,
      credential: cert({
        projectId: creds.projectId,
        clientEmail: creds.clientEmail,
        privateKey: creds.privateKey,
      }),
    });

    console.log(`[Firebase Admin] FIREBASE_CONFIG_SOURCE=${creds.source}`);
    console.log(`[Firebase Admin] FIREBASE_CREDENTIALS_VALIDATED=true`);
  } catch (err: any) {
    const message = err?.message || "Unknown Firebase Admin initialization error";
    throw new Error(`Failed to initialize Firebase Admin SDK: ${message}`);
  }

  return cachedAdminApp;
}

export function setAdminAppForTesting(app: App | null): void {
  cachedAdminApp = app;
}

/**
 * Returns the Firebase Admin Firestore instance.
 * Uses only the explicitly configured Firebase Admin application.
 */
export function getAdminFirestore(): Firestore {
  if (cachedFirestore) {
    return cachedFirestore;
  }

  let firestoreDatabaseId: string | undefined = process.env.FIRESTORE_DATABASE_ID;

  // Attempt to read the non-secret database identifier from the local
  // Firebase applet configuration when it is not provided as an env var.
  if (!firestoreDatabaseId) {
    try {
      const configPath = `${process.cwd()}/firebase-applet-config.json`;
      const fs = require("fs") as typeof import("fs");
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.firestoreDatabaseId) {
          firestoreDatabaseId = parsed.firestoreDatabaseId;
        }
      }
    } catch {
      // Optional local configuration; ignore when unavailable.
    }
  }

  const app = getAdminApp();

  cachedFirestore =
    firestoreDatabaseId && firestoreDatabaseId !== "(default)"
      ? getFirestore(app, firestoreDatabaseId)
      : getFirestore(app);

  return cachedFirestore;
}

export function setAdminFirestoreForTesting(firestore: Firestore | null): void {
  cachedFirestore = firestore;
}

/**
 * Returns the Firebase Admin Storage Bucket instance.
 */
export function getAdminStorageBucket(): any {
  if (cachedStorageBucket) {
    return cachedStorageBucket;
  }

  const app = getAdminApp();
  const storage = getStorage(app);
  const projectId = getFirebaseProjectId();
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.GCS_BUCKET_NAME ||
    `${projectId}.appspot.com`;

  cachedStorageBucket = storage.bucket(bucketName);
  return cachedStorageBucket;
}

export function setAdminStorageBucketForTesting(bucket: any): void {
  cachedStorageBucket = bucket;
}
