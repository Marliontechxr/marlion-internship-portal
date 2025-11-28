import { NextResponse } from 'next/server';

const FIREBASE_API_KEY = 'AIzaSyDcOhIcq62aZuh0YVTcjsNdlysCdTYFfjQ';
const FIREBASE_PROJECT_ID = 'marlioninternshipportal2025';

export async function POST(request: Request) {
  try {
    const { key } = await request.json();
    
    // Simple security check
    if (key !== 'marlion2025setup') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const adminEmail = 'admin@marliontech.com';
    const adminPassword = 'admin123';
    
    let uid: string;
    let idToken: string;
    
    // First try to sign up
    const signUpResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          returnSecureToken: true,
        }),
      }
    );
    
    const signUpData = await signUpResponse.json();
    
    if (signUpData.error && signUpData.error.message === 'EMAIL_EXISTS') {
      // User exists, try to sign in
      const signInResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            returnSecureToken: true,
          }),
        }
      );
      
      const signInData = await signInResponse.json();
      
      if (signInData.error) {
        return NextResponse.json({ 
          error: 'Sign in failed', 
          details: signInData.error.message 
        }, { status: 400 });
      }
      
      uid = signInData.localId;
      idToken = signInData.idToken;
    } else if (signUpData.error) {
      return NextResponse.json({ 
        error: 'Sign up failed', 
        details: signUpData.error.message 
      }, { status: 400 });
    } else {
      uid = signUpData.localId;
      idToken = signUpData.idToken;
    }
    
    // Create admin document in Firestore using REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/admins/${uid}`;
    
    const firestoreResponse = await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          email: { stringValue: adminEmail },
          role: { stringValue: 'super_admin' },
          name: { stringValue: 'Admin User' },
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });
    
    if (!firestoreResponse.ok) {
      const firestoreError = await firestoreResponse.text();
      console.error('Firestore error:', firestoreError);
      // Continue anyway - admin user is created
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user setup complete',
      email: adminEmail,
      password: adminPassword,
      uid: uid,
      note: 'Use these credentials to log into the admin dashboard at http://localhost:3004',
    });
    
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      error: 'Setup failed', 
      details: error.message,
    }, { status: 500 });
  }
}
