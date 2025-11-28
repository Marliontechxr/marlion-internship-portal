// Firebase Client Configuration
// Uses environment variables for security

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export const firebaseClientConfig = {
  apiKey: "AIzaSyDcOhIcq62aZuh0YVTcjsNdlysCdTYFfjQ",
  authDomain: "marlioninternshipportal2025.firebaseapp.com",
  projectId: "marlioninternshipportal2025",
  storageBucket: "marlioninternshipportal2025.firebasestorage.app",
  messagingSenderId: "593947094542",
  appId: "1:593947094542:web:9ed58b16bcf50ed59d165f",
  measurementId: "G-CMYEE92CG7",
};

// Initialize Firebase app
const app: FirebaseApp = !getApps().length 
  ? initializeApp(firebaseClientConfig) 
  : getApp();

// Initialize services
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export function initializeFirebaseClient() {
  return { app, auth, db, storage };
}

export function getFirebaseClient() {
  return { app, auth, db, storage };
}

export { app, auth, db, storage };
