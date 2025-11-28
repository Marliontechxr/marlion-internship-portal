// Server-side Firestore operations (Admin SDK)

import { getFirebaseAdmin } from '@marlion/config/admin';
import type { Student, Interview, Certificate, Announcement, AdminUser } from '@marlion/config/types';

// Admin-only student operations
export async function getAllStudents(filters?: {
  status?: Student['status'];
  stream?: string;
  college?: string;
}): Promise<Student[]> {
  const { adminDb } = getFirebaseAdmin();
  let query: FirebaseFirestore.Query = adminDb.collection('students');

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters?.stream) {
    query = query.where('chosenStream', '==', filters.stream);
  }
  if (filters?.college) {
    query = query.where('college', '==', filters.college);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Student[];
}

export async function bulkUpdateStudentStatus(
  studentIds: string[],
  status: Student['status']
): Promise<void> {
  const { adminDb } = getFirebaseAdmin();
  const batch = adminDb.batch();

  for (const id of studentIds) {
    const ref = adminDb.collection('students').doc(id);
    batch.update(ref, {
      status,
      updatedAt: new Date(),
    });
  }

  await batch.commit();
}

export async function banStudent(
  studentId: string,
  reason: string
): Promise<void> {
  const { adminDb } = getFirebaseAdmin();
  await adminDb.collection('students').doc(studentId).update({
    status: 'banned',
    bannedReason: reason,
    bannedAt: new Date(),
    updatedAt: new Date(),
  });
}

// Interview results
export async function getInterviewsForReview(): Promise<Interview[]> {
  const { adminDb } = getFirebaseAdmin();
  
  // Get students with interview_done status
  const studentsSnapshot = await adminDb
    .collection('students')
    .where('status', '==', 'interview_done')
    .get();

  const studentIds = studentsSnapshot.docs.map((doc) => doc.id);
  
  if (studentIds.length === 0) return [];

  const interviews: Interview[] = [];
  for (const id of studentIds) {
    const interviewDoc = await adminDb.collection('interviews').doc(id).get();
    if (interviewDoc.exists) {
      interviews.push({
        studentId: id,
        ...interviewDoc.data(),
      } as Interview);
    }
  }

  return interviews;
}

// Certificate management
export async function createCertificate(certificate: Omit<Certificate, 'id'>): Promise<string> {
  const { adminDb } = getFirebaseAdmin();
  const docRef = await adminDb.collection('certificates').add({
    ...certificate,
    issuedAt: new Date(),
  });
  return docRef.id;
}

export async function verifyCertificate(verificationCode: string): Promise<Certificate | null> {
  const { adminDb } = getFirebaseAdmin();
  const snapshot = await adminDb
    .collection('certificates')
    .where('verificationCode', '==', verificationCode)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Certificate;
}

// Announcement management
export async function createAnnouncement(
  announcement: Omit<Announcement, 'id' | 'timestamp'>
): Promise<string> {
  const { adminDb } = getFirebaseAdmin();
  const docRef = await adminDb.collection('announcements').add({
    ...announcement,
    timestamp: new Date(),
    isActive: true,
  });
  return docRef.id;
}

export async function deactivateAnnouncement(announcementId: string): Promise<void> {
  const { adminDb } = getFirebaseAdmin();
  await adminDb.collection('announcements').doc(announcementId).update({
    isActive: false,
  });
}

// Admin user management
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  const { adminDb } = getFirebaseAdmin();
  const doc = await adminDb.collection('admins').doc(userId).get();
  
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as AdminUser;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const admin = await getAdminUser(userId);
  return admin !== null;
}

export async function updateAdminLastLogin(userId: string): Promise<void> {
  const { adminDb } = getFirebaseAdmin();
  await adminDb.collection('admins').doc(userId).update({
    lastLoginAt: new Date(),
  });
}

// Statistics
export async function getDashboardStats(): Promise<{
  totalStudents: number;
  pendingInterviews: number;
  activeInterns: number;
  completedInterns: number;
  byStream: Record<string, number>;
  byCollege: Record<string, number>;
}> {
  const { adminDb } = getFirebaseAdmin();
  const studentsSnapshot = await adminDb.collection('students').get();
  
  const stats = {
    totalStudents: studentsSnapshot.size,
    pendingInterviews: 0,
    activeInterns: 0,
    completedInterns: 0,
    byStream: {} as Record<string, number>,
    byCollege: {} as Record<string, number>,
  };

  studentsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    
    if (data.status === 'interview_pending' || data.status === 'registered') {
      stats.pendingInterviews++;
    }
    if (data.status === 'active') {
      stats.activeInterns++;
    }
    if (data.status === 'completed') {
      stats.completedInterns++;
    }

    // Count by stream
    const stream = data.chosenStream || 'unknown';
    stats.byStream[stream] = (stats.byStream[stream] || 0) + 1;

    // Count by college
    const college = data.college || 'unknown';
    stats.byCollege[college] = (stats.byCollege[college] || 0) + 1;
  });

  return stats;
}
