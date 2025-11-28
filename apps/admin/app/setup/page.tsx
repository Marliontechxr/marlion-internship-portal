'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseClient } from '@marlion/config/client';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@marlion/ui/components';

export default function SetupPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const createAdminUser = async () => {
    setLoading(true);
    setStatus('Creating admin user...');
    
    try {
      const { auth } = getFirebaseClient();
      const email = 'admin@marliontech.com';
      const password = 'Admin@123';
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      setStatus(`✅ Admin user created successfully!\n\nEmail: ${email}\nPassword: ${password}\nUID: ${result.user.uid}\n\nYou can now go back to login page and sign in.`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setStatus(`ℹ️ Admin user already exists!\n\nEmail: admin@marliontech.com\nPassword: Admin@123\n\nGo back to login page and sign in.`);
      } else {
        setStatus(`❌ Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click the button below to create the admin user for the dashboard.
          </p>
          
          <Button 
            onClick={createAdminUser} 
            isLoading={loading}
            variant="gradient"
            className="w-full"
          >
            Create Admin User
          </Button>
          
          {status && (
            <pre className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm whitespace-pre-wrap">
              {status}
            </pre>
          )}
          
          <a 
            href="/" 
            className="block text-center text-blue-600 hover:underline mt-4"
          >
            ← Back to Login
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
