'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Alert, AlertDescription, Spinner } from '@marlion/ui/components';
import { useAuth } from '@marlion/ui/providers';
import { getStudentByEmail, updateStudentStatus, updateStudent } from '@marlion/lib/firestore';
import { generateOfferLetterHTML, generateOfferRefNumber } from '@marlion/lib/utils';
import type { Student } from '@marlion/config/types';
import { FileText, Download, CheckCircle2, XCircle } from 'lucide-react';

// Helper to safely format dates from Firestore
const formatFirestoreDate = (dateValue: any): string => {
  if (!dateValue) return 'TBD';
  let date: Date;
  if (dateValue?.toDate) {
    date = dateValue.toDate();
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else if (dateValue?.seconds) {
    date = new Date(dateValue.seconds * 1000);
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    return 'TBD';
  }
  if (isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function OfferPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!user?.email) return;
      
      try {
        const studentData = await getStudentByEmail(user.email);
        setStudent(studentData);
        
        if (studentData?.status === 'offer_downloaded' || studentData?.status === 'active' || studentData?.status === 'completed') {
          setHasAccepted(true);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [user]);

  const handleAccept = async () => {
    if (!student) return;
    
    setHasAccepted(true);
  };

  const handleDownload = async () => {
    if (!student) return;
    
    setIsDownloading(true);
    
    try {
      // Parse dates safely
      const parseDate = (dateValue: any): Date => {
        if (!dateValue) return new Date();
        // Handle Firestore Timestamp
        if (dateValue?.toDate) return dateValue.toDate();
        // Handle string
        if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        // Handle Date object
        if (dateValue instanceof Date) return dateValue;
        // Handle seconds/nanoseconds object
        if (dateValue?.seconds) return new Date(dateValue.seconds * 1000);
        return new Date();
      };
      
      // Generate or use existing reference number
      const refNumber = student.offerRefNumber || generateOfferRefNumber();
      
      // Save ref number to student record if new
      if (!student.offerRefNumber) {
        await updateStudent(student.id, { 
          offerRefNumber: refNumber,
          offerIssuedAt: new Date()
        });
      }
      
      // Generate offer letter HTML with trust seal
      const html = generateOfferLetterHTML({
        studentName: student.name,
        college: student.collegeOther || student.college,
        stream: student.chosenStream,
        startDate: parseDate(student.internshipStart),
        endDate: parseDate(student.internshipEnd),
        offerDate: new Date(),
        refNumber: refNumber,
      });

      // Create downloadable file
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Marlion_Offer_Letter_${student.name.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update status and set offerDownloaded flag
      await updateStudentStatus(student.id, 'offer_downloaded', {
        offerDownloaded: true,
        offerDownloadedAt: new Date()
      });
      
      // Update local state
      setStudent(prev => prev ? {
        ...prev,
        status: 'offer_downloaded',
        offerDownloaded: true
      } : null);
    } catch (error) {
      console.error('Error downloading:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!student) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Unable to load student data. Please try again.</AlertDescription>
      </Alert>
    );
  }

  // Show rejection page
  if (student.status === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Application Update</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Thank you for your interest in the Marlion Technologies Winter Internship 2025.
              After careful review, we regret to inform you that we are unable to offer you a position at this time.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This decision does not reflect on your abilities. We encourage you to continue learning and apply again for future opportunities.
            </p>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show waiting page
  if (!['selected', 'offer_downloaded', 'active', 'completed'].includes(student.status)) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Awaiting Results</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your application is still under review. Please check back later for your results.
            </p>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Congratulations Banner */}
      <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
          <p className="text-white/80">
            You have been selected for the Marlion Technologies Winter Internship 2025!
          </p>
        </CardContent>
      </Card>

      {/* Offer Letter Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Internship Offer Letter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <p><strong>Dear {student.name},</strong></p>
            <p>
              We are pleased to offer you an internship position at Marlion Technologies for the Winter Internship 2025 program.
            </p>
            <div className="space-y-2">
              <p><strong>Stream:</strong> {student.chosenStream.replace('-', ' ').replace('ai ml', 'AI & Machine Learning')}</p>
              <p><strong>Duration:</strong> {formatFirestoreDate(student.internshipStart)} to {formatFirestoreDate(student.internshipEnd)}</p>
              <p><strong>Mode:</strong> On-site at Marlion Technologies, Madurai (A34, Kumarasamy Street)</p>
            </div>
          </div>

          {!hasAccepted ? (
            <div className="space-y-4">
              <h3 className="font-semibold">Terms & Conditions</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Complete all bootcamp modules before starting project work</li>
                <li>• Submit daily progress logs during the internship</li>
                <li>• Maintain professional conduct at all times</li>
                <li>• Disclose any AI-assisted work; plagiarism will result in termination</li>
                <li>• You will receive a completion certificate upon successful completion</li>
              </ul>
              <Button onClick={handleAccept} variant="gradient" className="w-full" size="lg">
                I Accept These Terms
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleDownload}
              variant="gradient"
              className="w-full"
              size="lg"
              isLoading={isDownloading}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Offer Letter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      {hasAccepted && (
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex items-start">
                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">1</span>
                <div>
                  <p className="font-medium">Complete Bootcamp</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Watch video lessons and complete quizzes to build your skills.</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">2</span>
                <div>
                  <p className="font-medium">Review Problem Statement</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Review your assigned project or submit your own proposal.</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">3</span>
                <div>
                  <p className="font-medium">Start Building</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Begin your project work and submit daily progress logs.</p>
                </div>
              </li>
            </ol>
            <Button onClick={() => router.push('/bootcamp')} className="w-full mt-6">
              Go to Bootcamp
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
