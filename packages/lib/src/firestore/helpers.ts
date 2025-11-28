// Firestore helper functions for common operations

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentData,
  QueryConstraint,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseClient } from '@marlion/config';
import type { Student, Interview, CourseModule, Project, Announcement, DailyLogEntry } from '@marlion/config/types';

// Generic CRUD helpers
export async function getDocument<T>(
  collectionName: string,
  documentId: string
): Promise<T | null> {
  const { db } = getFirebaseClient();
  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
}

export async function setDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string,
  data: T
): Promise<void> {
  const { db } = getFirebaseClient();
  const docRef = doc(db, collectionName, documentId);
  await setDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function updateDocument(
  collectionName: string,
  documentId: string,
  data: Partial<DocumentData>
): Promise<void> {
  const { db } = getFirebaseClient();
  const docRef = doc(db, collectionName, documentId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteDocument(
  collectionName: string,
  documentId: string
): Promise<void> {
  const { db } = getFirebaseClient();
  const docRef = doc(db, collectionName, documentId);
  await deleteDoc(docRef);
}

// Student-specific functions
export async function getStudent(studentId: string): Promise<Student | null> {
  return getDocument<Student>('students', studentId);
}

export async function getStudentByEmail(email: string): Promise<Student | null> {
  const { db } = getFirebaseClient();
  const q = query(collection(db, 'students'), where('email', '==', email), limit(1));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Student;
}

export async function createStudent(
  student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>,
  userId?: string
): Promise<string> {
  const { db, auth } = getFirebaseClient();
  
  // Use provided userId, or get from current auth user
  const documentId = userId || auth.currentUser?.uid;
  if (!documentId) {
    throw new Error('User must be authenticated to create a student record');
  }
  
  const docRef = doc(db, 'students', documentId);
  await setDoc(docRef, {
    ...student,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    dailyLogsCount: 0,
  });
  return documentId;
}

export async function updateStudentStatus(
  studentId: string,
  status: Student['status'],
  additionalData?: Partial<Student>
): Promise<void> {
  await updateDocument('students', studentId, {
    status,
    ...additionalData,
  });
}

export async function updateStudent(
  studentId: string,
  data: Partial<Student>
): Promise<void> {
  await updateDocument('students', studentId, data);
}

// Interview functions
export async function getInterview(studentId: string): Promise<Interview | null> {
  return getDocument<Interview>('interviews', studentId);
}

export async function saveInterview(studentId: string, interview: Omit<Interview, 'createdAt'>): Promise<void> {
  const { db } = getFirebaseClient();
  await setDoc(doc(db, 'interviews', studentId), {
    ...interview,
    createdAt: Timestamp.now(),
  });
}

// Course functions - simplified query to avoid compound index requirement
export async function getCourseModules(stream?: string): Promise<CourseModule[]> {
  const { db } = getFirebaseClient();
  
  // Simple query without compound index
  const q = query(collection(db, 'courses'), limit(50));
  const snapshot = await getDocs(q);
  
  let courses = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CourseModule[];
  
  // Filter by stream client-side to avoid compound index
  if (stream) {
    courses = courses.filter(c => c.stream === stream || !c.stream);
  }
  
  // Sort by order client-side
  return courses.sort((a, b) => (a.order || 0) - (b.order || 0));
}

// Daily logs
export async function addDailyLog(
  studentId: string,
  log: Omit<DailyLogEntry, 'id' | 'studentId' | 'createdAt'>
): Promise<string> {
  const { db } = getFirebaseClient();
  const logRef = doc(collection(db, 'logs', studentId, 'entries'));
  
  await setDoc(logRef, {
    ...log,
    studentId,
    createdAt: Timestamp.now(),
  });

  // Increment student's log count
  await updateDocument('students', studentId, {
    dailyLogsCount: ((await getStudent(studentId))?.dailyLogsCount ?? 0) + 1,
  });

  return logRef.id;
}

export async function getStudentLogs(studentId: string): Promise<DailyLogEntry[]> {
  const { db } = getFirebaseClient();
  const q = query(
    collection(db, 'logs', studentId, 'entries'),
    orderBy('date', 'desc'),
    limit(30)
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DailyLogEntry[];
}

// Announcements - simplified query without compound index requirement
export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const { db } = getFirebaseClient();
  // Simple query without ordering to avoid index requirement
  const q = query(
    collection(db, 'announcements'),
    limit(20)
  );
  const snapshot = await getDocs(q);
  
  // Filter and sort client-side to avoid index requirement
  const announcements = snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Announcement[];
  
  return announcements
    .filter(a => a.isActive !== false)
    .sort((a, b) => {
      const aTime = (a.timestamp as any)?.toMillis?.() || (a.timestamp instanceof Date ? a.timestamp.getTime() : 0);
      const bTime = (b.timestamp as any)?.toMillis?.() || (b.timestamp instanceof Date ? b.timestamp.getTime() : 0);
      return bTime - aTime;
    })
    .slice(0, 10);
}

// Real-time subscriptions
export function subscribeToStudent(
  studentId: string,
  callback: (student: Student | null) => void
): Unsubscribe {
  const { db } = getFirebaseClient();
  const docRef = doc(db, 'students', studentId);
  
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as Student);
    } else {
      callback(null);
    }
  });
}

export function subscribeToAnnouncements(
  callback: (announcements: Announcement[]) => void
): Unsubscribe {
  const { db } = getFirebaseClient();
  // Simple query without compound index requirement
  const q = query(
    collection(db, 'announcements'),
    limit(20)
  );
  
  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Announcement[];
    
    // Filter and sort client-side
    const filtered = announcements
      .filter(a => a.isActive !== false)
      .sort((a, b) => {
        const aTime = (a.timestamp as any)?.toMillis?.() || (a.timestamp instanceof Date ? a.timestamp.getTime() : 0);
        const bTime = (b.timestamp as any)?.toMillis?.() || (b.timestamp instanceof Date ? b.timestamp.getTime() : 0);
        return bTime - aTime;
      })
      .slice(0, 10);
    
    callback(filtered);
  });
}
