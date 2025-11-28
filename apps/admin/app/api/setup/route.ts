import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin, admin } from '@marlion/config/firebaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setupKey = searchParams.get('key');
  
  // Simple security check - only allow setup with correct key
  if (setupKey !== 'marlion2025setup') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { adminAuth, adminDb } = initializeFirebaseAdmin();
    
    const adminEmail = 'admin@marliontech.com';
    const adminPassword = 'admin123';
    
    let adminUser;
    
    try {
      // Try to get existing user
      adminUser = await adminAuth.getUserByEmail(adminEmail);
      console.log('Admin user already exists:', adminUser.uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create the admin user
        adminUser = await adminAuth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: 'Admin User',
          emailVerified: true,
        });
        console.log('Admin user created:', adminUser.uid);
      } else {
        throw error;
      }
    }
    
    // Set custom claims for admin
    await adminAuth.setCustomUserClaims(adminUser.uid, { admin: true });
    
    // Create or update admin record in Firestore
    await adminDb.collection('admins').doc(adminUser.uid).set({
      email: adminEmail,
      role: 'super_admin',
      name: 'Admin User',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Admin user setup complete',
      email: adminEmail,
      password: adminPassword,
      uid: adminUser.uid,
    });
    
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Setup failed', 
      details: error.message 
    }, { status: 500 });
  }
}
