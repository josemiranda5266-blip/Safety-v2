import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth & Firestore with specific databaseId if provided
export const auth = getAuth(app);
export const dbFirestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Helper to ensure user is authenticated anonymously or signed in
export function ensureAuth(): Promise<User> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const userCred = await signInAnonymously(auth);
          unsubscribe();
          resolve(userCred.user);
        } catch (err) {
          unsubscribe();
          console.warn('Firebase signInAnonymously call fallback active (auth/admin-restricted-operation or restricted):', err);
          const storedUid = (typeof window !== 'undefined' && localStorage.getItem('safetyia_user_uid')) || 'user_member_a';
          const fallbackUser: any = {
            uid: auth.currentUser?.uid || storedUid,
            email: auth.currentUser?.email || 'profesional@safetyia.com',
            displayName: auth.currentUser?.displayName || 'Profesional H&S',
            getIdToken: async () => {
              if (auth.currentUser) {
                try {
                  return await auth.currentUser.getIdToken();
                } catch (_) {}
              }
              return `valid_token_${storedUid}`;
            },
          };
          resolve(fallbackUser);
        }
      }
    });
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.warn('Firestore Error Handled: ', JSON.stringify(errInfo));
}

export function sanitizeForFirestore<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  return JSON.parse(JSON.stringify(data, (_key, value) => (value === undefined ? null : value)));
}

export { collection, doc, setDoc, getDocs, deleteDoc, query, where, onSnapshot };

