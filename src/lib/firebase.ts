import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling Definition
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
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

// User Profile Data Interface
export interface UserProfileData {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  dietaryPreferences: string[];
  macroTargets: {
    dailyCalories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  defaultServings: number;
  measurementSystem: 'metric' | 'imperial';
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_USER_PROFILE: Omit<UserProfileData, 'userId' | 'email'> = {
  displayName: 'Chef Krassi',
  photoURL: '',
  dietaryPreferences: ['High Protein', 'Gluten Free'],
  macroTargets: {
    dailyCalories: 2100,
    proteinGrams: 140,
    carbsGrams: 190,
    fatGrams: 65,
  },
  defaultServings: 2,
  measurementSystem: 'metric',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Sign in with Google Popup
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (user) {
      await ensureUserProfileExists(user);
    }
    return user;
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  }
}

// Sign out
export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
}

// Ensure profile exists or create default
export async function ensureUserProfileExists(user: FirebaseUser): Promise<UserProfileData> {
  const profileRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;
  try {
    const snapshot = await getDoc(profileRef);
    if (snapshot.exists()) {
      return snapshot.data() as UserProfileData;
    }

    const newProfile: UserProfileData = {
      userId: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Home Cook',
      photoURL: user.photoURL || '',
      dietaryPreferences: ['High Protein', 'Gluten Free'],
      macroTargets: {
        dailyCalories: 2100,
        proteinGrams: 140,
        carbsGrams: 190,
        fatGrams: 65,
      },
      defaultServings: 2,
      measurementSystem: 'metric',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(profileRef, newProfile);
    return newProfile;
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Update profile
export async function saveUserProfile(
  userId: string,
  updatedData: Partial<UserProfileData>
): Promise<void> {
  const profileRef = doc(db, 'users', userId);
  const path = `users/${userId}`;
  try {
    const dataToSave = {
      ...updatedData,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(profileRef, dataToSave, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
