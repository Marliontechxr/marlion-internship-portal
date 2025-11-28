'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, Spinner, Button } from '@marlion/ui/components';
import { useAuth } from '@marlion/ui/providers';
import { getStudentByEmail } from '@marlion/lib/firestore';
import type { Student } from '@marlion/config/types';
import { Clock, CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WaitingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.email) return;
      
      try {
        const studentData = await getStudentByEmail(user.email);
        
        if (!studentData) {
          router.push('/register');
          return;
        }
        
        // Redirect based on status
        if (['registered', 'interview_pending'].includes(studentData.status)) {
          router.push('/interview');
          return;
        }
        
        if (['selected', 'offer_downloaded', 'active', 'completed'].includes(studentData.status)) {
          router.push('/dashboard');
          return;
        }
        
        if (studentData.status === 'rejected') {
          router.push('/dashboard');
          return;
        }
        
        setStudent(studentData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Poll every 30 seconds for status updates
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card className="border-0 shadow-xl">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Interview Under Review
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Thank you for completing your AI interview!
            </p>
          </div>

          {/* Status Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                Interview Completed Successfully
              </span>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Status</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Your interview responses have been recorded and are now being reviewed by our team. 
                Results will be shared once the review is complete.
              </p>
            </div>
          </div>

          {/* What's Next */}
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What happens next?</h2>
            
            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Human Review</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our team will review your interview responses within 24-48 hours.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Email Notification</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You'll receive an email at <strong>{student.email}</strong> with the results.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Check Back Here</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This page will automatically update when a decision is made.
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Questions? Contact us at{' '}
              <a href="mailto:internships@marliontech.com" className="text-blue-600 hover:underline">
                internships@marliontech.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="text-center mt-6">
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          Check for Updates
        </Button>
        <p className="text-xs text-gray-500 mt-2">Page auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}
