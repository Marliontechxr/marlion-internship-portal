// Main exports from @marlion/config
export * from './firebaseClient';
export * from './types';

// Client is the main export
export { getFirebaseClient, firebaseClientConfig, initializeFirebaseClient, app, auth, db, storage } from './firebaseClient';

// Re-export admin separately to avoid client-side imports
export type { AdminUser } from './types';
