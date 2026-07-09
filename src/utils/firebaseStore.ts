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

// Safe initialization to prevent "duplicate default app" warnings
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let firestoreInstance: ReturnType<typeof getFirestore> | null = null;
export function getDb() {
  if (!firestoreInstance) {
    firestoreInstance = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
  return firestoreInstance;
}

let authInstance: ReturnType<typeof getAuth> | null = null;
export function getAuthInstance() {
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}

// Proxies as highly compatible backward-compatible exports
export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
}) as unknown as ReturnType<typeof getFirestore>;

export const auth = new Proxy({} as any, {
  get(target, prop, receiver) {
    const instance = getAuthInstance();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
}) as unknown as ReturnType<typeof getAuth>;

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
      userId: getAuthInstance().currentUser?.uid,
      email: getAuthInstance().currentUser?.email,
      emailVerified: getAuthInstance().currentUser?.emailVerified,
      isAnonymous: getAuthInstance().currentUser?.isAnonymous,
      tenantId: getAuthInstance().currentUser?.tenantId,
      providerInfo: getAuthInstance().currentUser?.providerData?.map(provider => ({
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
  try {
    await getDocFromServer(doc(getDb(), 'test', 'connection'));
    console.log('[Firestore Service] Initial boot liveness check succeeded.');
  } catch (error: any) {
    console.warn("[Firestore Service] Offline or unable to contact Firestore server. Operating in cached/local mode.", error?.message || error);
  }
}

/**
 * Save or update student profile in Firestore
 */
export async function syncProfileToFirestore(userId: string, profile: StudentProfile): Promise<void> {
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
    await setDoc(doc(getDb(), 'profiles', userId), cleanProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch student profile from Firestore
 */
export async function fetchProfileFromFirestore(userId: string): Promise<StudentProfile | null> {
  const path = `profiles/${userId}`;
  try {
    const snap = await getDoc(doc(getDb(), 'profiles', userId));
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
  const path = `profiles/${userId}/notes/${note.id}`;
  try {
    await setDoc(doc(getDb(), 'profiles', userId, 'notes', note.id), note);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a study note from subcollection
 */
export async function deleteNoteFromFirestore(userId: string, noteId: string): Promise<void> {
  const path = `profiles/${userId}/notes/${noteId}`;
  try {
    await deleteDoc(doc(getDb(), 'profiles', userId, 'notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Load all study notes from student subcollection
 */
export async function fetchNotesFromFirestore(userId: string): Promise<CustomNote[]> {
  const path = `profiles/${userId}/notes`;
  try {
    const querySnapshot = await getDocs(collection(getDb(), 'profiles', userId, 'notes'));
    const notes: CustomNote[] = [];
    querySnapshot.forEach((doc) => {
      notes.push(doc.data() as CustomNote);
    });
    return notes;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
