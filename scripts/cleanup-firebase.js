/**
 * Firebase Cleanup Script
 * Run with: node scripts/cleanup-firebase.js
 * 
 * This script clears all test data from Firestore and Auth
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: "marlioninternshipportal2025",
  private_key_id: "6b7ecae2087cd9fff010ecf3b026df194e993c5a",
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC+vkjsqnsiVxlS\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@marlioninternshipportal2025.iam.gserviceaccount.com",
  client_id: "108727275749348596393",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40marlioninternshipportal2025.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// Collections to clean
const COLLECTIONS = [
  'students',
  'interviews', 
  'modules',
  'sections',
  'problemStatements',
  'projectSubmissions',
  'projectTasks',
  'announcements',
  'certificates',
  'courses'
];

async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(500);
  
  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  console.log(`  Deleted ${snapshot.size} documents`);

  // Recurse to delete remaining
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function deleteAllUsers() {
  console.log('\n🔐 Deleting all Auth users...');
  
  const listUsersResult = await auth.listUsers(1000);
  const uids = listUsersResult.users.map(user => user.uid);
  
  if (uids.length === 0) {
    console.log('  No users to delete');
    return;
  }
  
  // Delete users in batches
  for (const uid of uids) {
    try {
      await auth.deleteUser(uid);
      console.log(`  Deleted user: ${uid}`);
    } catch (error) {
      console.error(`  Error deleting user ${uid}:`, error.message);
    }
  }
  
  console.log(`✅ Deleted ${uids.length} users`);
}

async function cleanupFirebase() {
  console.log('🧹 Starting Firebase Cleanup...\n');
  console.log('📦 Deleting Firestore collections...');
  
  for (const collection of COLLECTIONS) {
    console.log(`\n  Cleaning: ${collection}`);
    try {
      await deleteCollection(collection);
      console.log(`  ✅ ${collection} cleared`);
    } catch (error) {
      console.error(`  ❌ Error cleaning ${collection}:`, error.message);
    }
  }
  
  await deleteAllUsers();
  
  console.log('\n✨ Firebase cleanup complete!');
  console.log('Your database is now ready for production testing.\n');
  
  process.exit(0);
}

cleanupFirebase().catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
