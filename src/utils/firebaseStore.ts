/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { StudentProfile, CustomNote } from '../types';

// Safe initialization to prevent "duplicate default app" warnings and missing service crashes
export const app = (() => {
  try {
    return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (err) {
    console.warn('[Firebase App] Initialization failed:', err);
    return null as any;
  }
})();

export const db = (() => {
  if (!app) return null;
  try {
    if (firebaseConfig.firestoreDatabaseId) {
      try {
        return getFirestore(app, firebaseConfig.firestoreDatabaseId);
      } catch (e) {
        console.warn('[Firestore] Named database access failed, falling back to default instance:', e);
        return getFirestore(app);
      }
    }
    return getFirestore(app);
  } catch (err) {
    console.warn('[Firestore] Service is not available:', err);
    return null;
  }
})();

export const auth = (() => {
  if (!app) return null;
  try {
    return getAuth(app);
  } catch (err) {
    console.warn('[Firebase Auth] Service is not available:', err);
    return null;
  }
})();

export function getDb() {
  return db;
}

export function getAuthInstance() {
  return auth;
}

// Error Operation Enum
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Structured error format required by platform skills
interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Handle and map Firestore errors with rich contextual metadata in JSON format
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Service Error]:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate liveness/connectivity with Firestore on application startup
 */
export async function testFirestoreConnection() {
  const currentDb = getDb();
  if (!currentDb) {
    console.warn('[Firestore Service] Firestore database instance is not available.');
    return;
  }
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore network timeout')), 3000)
    );
    await Promise.race([
      getDocFromServer(doc(currentDb, 'test', 'connection')),
      timeoutPromise
    ]);
    console.log('[Firestore Service] Initial boot liveness check succeeded.');
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network connection.");
    } else {
      console.warn("[Firestore Service] Operating in cached/offline mode:", error?.message || error);
    }
  }
}

/**
 * Save or update student profile in Firestore
 */
export async function syncProfileToFirestore(userId: string, profile: StudentProfile): Promise<void> {
  const currentDb = getDb();
  if (!currentDb) return;
  const path = `profiles/${userId}`;
  try {
    const cleanProfile = {
      name: profile.name,
      email: profile.email || '',
      university: profile.university,
      year: profile.year,
      subjects: profile.subjects || [],
      claudeApiKey: profile.claudeApiKey || '',
      dailyGoalHours: profile.dailyGoalHours || 2,
      theme: profile.theme || 'dark',
      language: profile.language || 'en'
    };
    await setDoc(doc(currentDb, 'profiles', userId), cleanProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch student profile from Firestore
 */
export async function fetchProfileFromFirestore(userId: string): Promise<StudentProfile | null> {
  const currentDb = getDb();
  if (!currentDb) return null;
  const path = `profiles/${userId}`;
  try {
    const snap = await getDoc(doc(currentDb, 'profiles', userId));
    if (snap.exists()) {
      return snap.data() as StudentProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Save a study note to subcollection
 */
export async function saveNoteToFirestore(userId: string, note: CustomNote): Promise<void> {
  const currentDb = getDb();
  if (!currentDb) return;
  const path = `profiles/${userId}/notes/${note.id}`;
  try {
    await setDoc(doc(currentDb, 'profiles', userId, 'notes', note.id), note);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a study note from subcollection
 */
export async function deleteNoteFromFirestore(userId: string, noteId: string): Promise<void> {
  const currentDb = getDb();
  if (!currentDb) return;
  const path = `profiles/${userId}/notes/${noteId}`;
  try {
    await deleteDoc(doc(currentDb, 'profiles', userId, 'notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Load all study notes from student subcollection
 */
export async function fetchNotesFromFirestore(userId: string): Promise<CustomNote[]> {
  const currentDb = getDb();
  if (!currentDb) return [];
  const path = `profiles/${userId}/notes`;
  try {
    const querySnapshot = await getDocs(collection(currentDb, 'profiles', userId, 'notes'));
    const notes: CustomNote[] = [];
    querySnapshot.forEach((doc) => {
      notes.push(doc.data() as CustomNote);
    });
    return notes;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
