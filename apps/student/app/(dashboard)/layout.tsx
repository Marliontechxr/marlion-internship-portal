'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@marlion/ui/providers';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { getStudentByEmail, subscribeToStudent } from '@marlion/lib/firestore';
import type { Student } from '@marlion/config/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Fetch student data
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    const fetchStudent = async () => {
      try {
        const studentData = await getStudentByEmail(user.email!);
        
        if (!isMounted) return;
        
        if (!studentData) {
          // No student record - redirect to registration immediately
          // Use replace to prevent back button issues
          router.replace('/register');
          return;
        }
        
        setStudent(studentData);
        
        // Handle status-based routing
        // Interview pending/registered -> interview page (unless already there)
        if (['registered', 'interview_pending'].includes(studentData.status) && !pathname.includes('/interview')) {
          router.replace('/interview');
          return;
        }
        
        // Interview done -> waiting page (unless already there)
        if (studentData.status === 'interview_done' && !pathname.includes('/waiting')) {
          router.replace('/waiting');
          return;
        }
        
        // Subscribe to real-time updates
        unsubscribe = subscribeToStudent(studentData.id, (updated) => {
          if (updated && isMounted) {
            setStudent(updated);
            // Auto-redirect if status changes
            if (updated.status === 'selected' && pathname.includes('/waiting')) {
              router.replace('/dashboard');
            }
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching student:', error);
        if (isMounted) {
          router.replace('/register');
        }
      }
    };

    fetchStudent();
    
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user, authLoading, router, pathname]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-marlion-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-marlion-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  // For waiting page, show simplified layout
  if (pathname.includes('/waiting')) {
    return (
      <div className="min-h-screen bg-marlion-bg">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-marlion-bg">
      <DashboardSidebar student={student} isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />
      <div className="lg:pl-64">
        <DashboardHeader student={student} setIsMobileOpen={setIsMobileMenuOpen} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
