// Firebase Admin Configuration
// Server-side only - uses Application Default Credentials or project ID

import * as admin from 'firebase-admin';

const PROJECT_ID = 'marlioninternshipportal2025';

function getAdminApp(): admin.app.App {
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin should only be initialized on the server side');
  }

  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Try to use private key from env if available
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (privateKey && privateKey.includes('BEGIN PRIVATE KEY')) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: PROJECT_ID,
        clientEmail: 'firebase-adminsdk-fbsvc@marlioninternshipportal2025.iam.gserviceaccount.com',
        privateKey: privateKey,
      }),
      storageBucket: 'marlioninternshipportal2025.firebasestorage.app',
    });
  }

  // Fallback: Initialize with just project ID (works for Firestore in development)
  return admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: 'marlioninternshipportal2025.firebasestorage.app',
  });
}

// Lazy initialization
let _adminApp: admin.app.App | null = null;
let _adminDb: admin.firestore.Firestore | null = null;
let _adminAuth: admin.auth.Auth | null = null;
let _adminStorage: admin.storage.Storage | null = null;

export const adminApp = new Proxy({} as admin.app.App, {
  get(_, prop) {
    if (!_adminApp) _adminApp = getAdminApp();
    return (_adminApp as any)[prop];
  }
});

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop) {
    if (!_adminDb) {
      if (!_adminApp) _adminApp = getAdminApp();
      _adminDb = admin.firestore(_adminApp);
    }
    return (_adminDb as any)[prop];
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_, prop) {
    if (!_adminAuth) {
      if (!_adminApp) _adminApp = getAdminApp();
      _adminAuth = admin.auth(_adminApp);
    }
    return (_adminAuth as any)[prop];
  }
});

export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(_, prop) {
    if (!_adminStorage) {
      if (!_adminApp) _adminApp = getAdminApp();
      _adminStorage = admin.storage(_adminApp);
    }
    return (_adminStorage as any)[prop];
  }
});

export function initializeFirebaseAdmin() {
  if (!_adminApp) _adminApp = getAdminApp();
  if (!_adminDb) _adminDb = admin.firestore(_adminApp);
  if (!_adminAuth) _adminAuth = admin.auth(_adminApp);
  if (!_adminStorage) _adminStorage = admin.storage(_adminApp);
  return { adminApp: _adminApp, adminDb: _adminDb, adminAuth: _adminAuth, adminStorage: _adminStorage };
}

export function getFirebaseAdmin() {
  return initializeFirebaseAdmin();
}

export { admin };
