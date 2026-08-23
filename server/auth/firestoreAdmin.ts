import { getApps, initializeApp, App, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseProjectId, getAuthConfig } from "./config";
import fs from "fs";
import path from "path";

let cachedFirestore: Firestore | null = null;
let cachedAdminApp: App | null = null;
let cachedStorageBucket: any = null;

export function parsePrivateKey(rawKey: string): string {
  if (!rawKey || typeof rawKey !== "string") {
    throw new Error("Invalid private key: not a string or empty");
  }
  let key = rawKey.trim();
  // Remove surrounding quotes if present
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  // Replace escaped \n with actual newlines
  key = key.replace(/\\n/g, "\n");

  if (!key.includes("BEGIN PRIVATE KEY")) {
    throw new Error("Invalid private key: missing BEGIN PRIVATE KEY header");
  }
  if (!key.includes("END PRIVATE KEY")) {
    throw new Error("Invalid private key: missing END PRIVATE KEY footer");
  }
  return key;
}

export function resolveAdminCredentials(): { projectId?: string; clientEmail?: string; privateKey?: string; source: string } {
  const isProduction = process.env.NODE_ENV === "production";
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const envEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const envKey = process.env.FIREBASE_PRIVATE_KEY;
  const envProject = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

  // 1. Check direct environment variables (CLIENT_EMAIL + PRIVATE_KEY)
  if (envEmail && envEmail.trim() !== "" && envKey && envKey.trim() !== "") {
    const projectId = envProject || getFirebaseProjectId();
    const privateKey = parsePrivateKey(envKey);
    return {
      projectId,
      clientEmail: envEmail.trim(),
      privateKey,
      source: "render_env",
    };
  }

  // 2. Check GOOGLE_APPLICATION_CREDENTIALS
  if (gac && gac.trim() !== "") {
    const gacTrimmed = gac.trim();
    let jsonContent: any = null;

    // Check if it's a file path
    if (fs.existsSync(gacTrimmed)) {
      try {
        const fileData = fs.readFileSync(gacTrimmed, "utf-8");
        jsonContent = JSON.parse(fileData);
      } catch (err: any) {
        throw new Error(`CRITICAL SECURITY CONFIGURATION ERROR: Failed to read or parse JSON from GOOGLE_APPLICATION_CREDENTIALS file path.`);
      }
      const projectId = jsonContent.project_id || jsonContent.project_id || envProject;
      const clientEmail = jsonContent.client_email;
      const privateKeyRaw = jsonContent.private_key;

      if (!projectId || !clientEmail || !privateKeyRaw) {
        throw new Error(`CRITICAL SECURITY CONFIGURATION ERROR: GOOGLE_APPLICATION_CREDENTIALS file JSON missing required fields (project_id, client_email, private_key).`);
      }

      return {
        projectId: projectId.trim(),
        clientEmail: clientEmail.trim(),
        privateKey: parsePrivateKey(privateKeyRaw),
        source: "gac_file",
      };
    } else if (gacTrimmed.startsWith("{")) {
      // JSON string directly in GOOGLE_APPLICATION_CREDENTIALS
      try {
        jsonContent = JSON.parse(gacTrimmed);
      } catch (err: any) {
        throw new Error(`CRITICAL SECURITY CONFIGURATION ERROR: Failed to parse JSON string in GOOGLE_APPLICATION_CREDENTIALS.`);
      }

      const projectId = jsonContent.project_id || envProject;
      const clientEmail = jsonContent.client_email;
      const privateKeyRaw = jsonContent.private_key;

      if (!projectId || !clientEmail || !privateKeyRaw) {
        throw new Error(`CRITICAL SECURITY CONFIGURATION ERROR: GOOGLE_APPLICATION_CREDENTIALS JSON string missing required fields.`);
      }

      return {
        projectId: projectId.trim(),
        clientEmail: clientEmail.trim(),
        privateKey: parsePrivateKey(privateKeyRaw),
        source: "gac_json",
      };
    } else if (isProduction) {
      throw new Error(`CRITICAL SECURITY CONFIGURATION ERROR: GOOGLE_APPLICATION_CREDENTIALS is set but is neither a valid file path nor a valid JSON string.`);
    }
  }

  if (isProduction) {
    const missing: string[] = [];
    if (!envProject) missing.push("FIREBASE_PROJECT_ID");
    if (!envEmail) missing.push("FIREBASE_CLIENT_EMAIL");
    if (!envKey) missing.push("FIREBASE_PRIVATE_KEY");
    throw new Error(`CRITICAL SECURITY CONFIGURATION ERROR: Missing required Firebase Admin credentials in production. Missing: ${missing.join(", ")}. Fail closed.`);
  }

  // Non-production fallback to ADC or applicationDefault
  return {
    projectId: envProject || "safetyia-dev-placeholder",
    source: "adc",
  };
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

  const isProduction = process.env.NODE_ENV === "production";
  const creds = resolveAdminCredentials();

  const options: any = { projectId: creds.projectId };

  if (creds.clientEmail && creds.privateKey) {
    try {
      options.credential = cert({
        projectId: creds.projectId!,
        clientEmail: creds.clientEmail,
        privateKey: creds.privateKey,
      });
    } catch (err: any) {
      if (isProduction) {
        throw new Error("CRITICAL SECURITY CONFIGURATION ERROR: Failed to construct Firebase Admin certificate credential in production.");
      }
      throw err;
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS.trim())) {
    options.credential = applicationDefault();
  } else {
    try {
      options.credential = applicationDefault();
    } catch {
      if (isProduction) {
        throw new Error("CRITICAL SECURITY CONFIGURATION ERROR: Application Default Credentials unavailable in production.");
      }
    }
  }

  try {
    cachedAdminApp = initializeApp(options);
    console.log(`[Firebase Admin] FIREBASE_CONFIG_SOURCE=${creds.source}`);
    console.log(`[Firebase Admin] FIREBASE_CREDENTIALS_VALIDATED=true`);
  } catch (err: any) {
    if (isProduction) {
      throw new Error("CRITICAL SECURITY CONFIGURATION ERROR: Failed to initialize Firebase Admin SDK in production. Fail closed.");
    }
    throw err;
  }

  return cachedAdminApp;
}

export function setAdminAppForTesting(app: App | null): void {
  cachedAdminApp = app;
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

/**
 * Helper to inject or reset Storage Bucket instance for testing.
 */
export function setAdminStorageBucketForTesting(bucket: any): void {
  cachedStorageBucket = bucket;
}

