import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@marlion/config/admin';

export async function GET() {
  try {
    const { adminAuth } = getFirebaseAdmin();
    
    const adminEmail = 'admin@marliontech.com';
    const adminPassword = 'Admin@123';
    
    // Check if admin user exists
    try {
      const existingUser = await adminAuth.getUserByEmail(adminEmail);
      return NextResponse.json({
        message: 'Admin user already exists',
        uid: existingUser.uid,
        email: existingUser.email,
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new admin user
        const newUser = await adminAuth.createUser({
          email: adminEmail,
          password: adminPassword,
          emailVerified: true,
          displayName: 'Admin',
        });
        
        // Set custom claims for admin role
        await adminAuth.setCustomUserClaims(newUser.uid, { admin: true });
        
        return NextResponse.json({
          message: 'Admin user created successfully',
          uid: newUser.uid,
          email: newUser.email,
          credentials: {
            email: adminEmail,
            password: adminPassword,
          },
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Setup admin error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup admin' },
      { status: 500 }
    );
  }
}
