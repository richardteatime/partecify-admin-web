import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

function initFirebase() {
  if (app) return;
  if (getApps().length) {
    app = getApp();
  } else {
    if (!firebaseConfig.apiKey) {
      throw new Error(
        "Firebase API key is missing. Check your environment variables."
      );
    }
    app = initializeApp(firebaseConfig);
  }
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
}

export function getAuthInstance(): Auth {
  initFirebase();
  return authInstance!;
}

export function getDbInstance(): Firestore {
  initFirebase();
  return dbInstance!;
}

export function getStorageInstance(): FirebaseStorage {
  initFirebase();
  return storageInstance!;
}
