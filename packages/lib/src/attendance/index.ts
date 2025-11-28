// Attendance System Utilities
// All times are handled in IST (Indian Standard Time)

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@marlion/config/firebase';
import type { 
  AttendanceRecord, 
  LeaveRequest, 
  Holiday, 
  AttendanceSettings,
  Student 
} from '@marlion/config/types';

// Default attendance settings
export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  checkInStartTime: '09:00',
  checkInEndTime: '11:00',
  checkOutEndTime: '20:00',
  minimumWorkHours: 6,
  weeklyOffDays: [0], // Sunday
};

// ===== IST Time Utilities =====

// Fetch IST time from a reliable source
export async function getISTTimeFromServer(): Promise<Date> {
  // Try multiple time APIs for reliability
  const timeApis = [
    {
      url: 'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata',
      parse: (data: any) => new Date(data.dateTime)
    },
    {
      url: 'https://worldtimeapi.org/api/timezone/Asia/Kolkata',
      parse: (data: any) => new Date(data.datetime)
    }
  ];

  for (const api of timeApis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(api.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return api.parse(data);
      }
    } catch (error) {
      // Continue to next API
    }
  }
  
  // Fallback: Calculate IST from local time
  console.warn('All time APIs failed, using calculated IST');
  return getISTTime();
}

// Calculate IST from local time (fallback)
export function getISTTime(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + istOffset);
}

// Format IST date as YYYY-MM-DD
export function formatISTDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format IST time as HH:MM AM/PM
export function formatISTTime(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Get hours and minutes from time string "HH:MM"
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

// Check if current IST time is within allowed check-in window
export function isWithinCheckInWindow(istTime: Date, settings: AttendanceSettings = DEFAULT_ATTENDANCE_SETTINGS): boolean {
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const start = parseTimeString(settings.checkInStartTime);
  const end = parseTimeString(settings.checkInEndTime);
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

// Check if check-in is too early
export function isTooEarlyForCheckIn(istTime: Date, settings: AttendanceSettings = DEFAULT_ATTENDANCE_SETTINGS): boolean {
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const start = parseTimeString(settings.checkInStartTime);
  const startMinutes = start.hours * 60 + start.minutes;

  return currentMinutes < startMinutes;
}

// Check if check-in deadline has passed
export function isCheckInDeadlinePassed(istTime: Date, settings: AttendanceSettings = DEFAULT_ATTENDANCE_SETTINGS): boolean {
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const end = parseTimeString(settings.checkInEndTime);
  const endMinutes = end.hours * 60 + end.minutes;

  return currentMinutes > endMinutes;
}

// Check if current time is within allowed checkout window
export function isWithinCheckOutWindow(istTime: Date, settings: AttendanceSettings = DEFAULT_ATTENDANCE_SETTINGS): boolean {
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const end = parseTimeString(settings.checkOutEndTime);
  const endMinutes = end.hours * 60 + end.minutes;

  return currentMinutes <= endMinutes;
}

// Calculate work duration in minutes
export function calculateWorkDuration(checkInTime: string, checkOutTime: string): number {
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  return Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
}

// Check if a day is a working day
export function isWorkingDay(
  date: Date, 
  holidays: Holiday[], 
  settings: AttendanceSettings = DEFAULT_ATTENDANCE_SETTINGS
): boolean {
  const dayOfWeek = date.getDay();
  const dateStr = formatISTDate(date);

  // Check if it's a weekly off day
  if (settings.weeklyOffDays.includes(dayOfWeek)) {
    return false;
  }

  // Check if it's a holiday
  if (holidays.some(h => h.date === dateStr)) {
    return false;
  }

  return true;
}

// Check if date falls within student's internship tenure
export function isWithinInternshipPeriod(date: Date, student: Student): boolean {
  const dateStr = formatISTDate(date);
  
  // Handle Firestore Timestamp, Date object, or string
  const parseDate = (value: any): string => {
    if (!value) return '';
    if (value instanceof Timestamp) {
      return formatISTDate(value.toDate());
    }
    if (typeof value === 'string') {
      return value.split('T')[0];
    }
    if (value instanceof Date) {
      return formatISTDate(value);
    }
    // Try to create a Date from it
    try {
      return formatISTDate(new Date(value));
    } catch {
      return '';
    }
  };
  
  const startDate = parseDate(student.internshipStart);
  const endDate = parseDate(student.internshipEnd);

  if (!startDate || !endDate) return true; // If dates not set, allow

  return dateStr >= startDate && dateStr <= endDate;
}

// ===== Firestore Operations =====

// Get attendance settings
export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  try {
    const settingsRef = doc(db, 'settings', 'attendance');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      return settingsSnap.data() as AttendanceSettings;
    }
  } catch (error) {
    console.error('Error fetching attendance settings:', error);
  }
  return DEFAULT_ATTENDANCE_SETTINGS;
}

// Save attendance settings
export async function saveAttendanceSettings(settings: AttendanceSettings): Promise<void> {
  const settingsRef = doc(db, 'settings', 'attendance');
  await setDoc(settingsRef, settings);
}

// Get holidays for a month
export async function getHolidays(year?: number, month?: number): Promise<Holiday[]> {
  try {
    const holidaysRef = collection(db, 'holidays');
    const snapshot = await getDocs(holidaysRef);
    let holidays = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Holiday[];

    if (year && month) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      holidays = holidays.filter(h => h.date.startsWith(monthStr));
    }

    return holidays;
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

// Add a holiday
export async function addHoliday(holiday: Omit<Holiday, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'holidays'), {
    ...holiday,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

// Delete a holiday
export async function deleteHoliday(holidayId: string): Promise<void> {
  const holidayRef = doc(db, 'holidays', holidayId);
  await updateDoc(holidayRef, { deleted: true });
}

// Get today's attendance for a student
export async function getTodayAttendance(studentId: string): Promise<AttendanceRecord | null> {
  try {
    const istNow = await getISTTimeFromServer();
    const today = formatISTDate(istNow);
    const attendanceRef = doc(db, 'attendance', `${studentId}_${today}`);
    const attendanceSnap = await getDoc(attendanceRef);
    
    if (attendanceSnap.exists()) {
      return { id: attendanceSnap.id, ...attendanceSnap.data() } as AttendanceRecord;
    }
    return null;
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    return null;
  }
}

// Get attendance for a student for a date range
export async function getStudentAttendance(
  studentId: string, 
  startDate?: string, 
  endDate?: string
): Promise<AttendanceRecord[]> {
  try {
    const attendanceRef = collection(db, 'attendance');
    let q = query(attendanceRef, where('studentId', '==', studentId), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    
    let records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AttendanceRecord[];

    if (startDate) {
      records = records.filter(r => r.date >= startDate);
    }
    if (endDate) {
      records = records.filter(r => r.date <= endDate);
    }

    return records;
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return [];
  }
}

// Get user's geolocation
export async function getGeolocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

// Check-in a student
export async function checkInStudent(
  student: Student,
  plan: string,
  currentTask?: { id: string; title: string },
  conversation?: Array<{ role: string; content: string }>,
  geolocation?: { latitude: number; longitude: number; accuracy: number } | null
): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  try {
    const istNow = await getISTTimeFromServer();
    const today = formatISTDate(istNow);
    const settings = await getAttendanceSettings();

    // Check if too early
    if (isTooEarlyForCheckIn(istNow, settings)) {
      return { 
        success: false, 
        message: `Check-in opens at ${settings.checkInStartTime}. Please wait.` 
      };
    }

    // Check if deadline passed
    if (isCheckInDeadlinePassed(istNow, settings)) {
      return { 
        success: false, 
        message: `Check-in deadline (${settings.checkInEndTime}) has passed. Today will be marked absent.` 
      };
    }

    // Check for existing attendance - STRICT: Only one check-in per day allowed
    const existingRef = doc(db, 'attendance', `${student.id}_${today}`);
    const existingSnap = await getDoc(existingRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      if (data.checkInTime) {
        return { success: false, message: 'You have already checked in today. Only one check-in is allowed per day.' };
      }
      // If marked absent/leave but no check-in, allow check-in if still within window
      if (data.status === 'absent' || data.status === 'leave') {
        return { success: false, message: `Today is already marked as ${data.status}. Cannot check in.` };
      }
    }

    const record: Record<string, any> = {
      studentId: student.id!,
      studentName: student.name,
      studentEmail: student.email,
      date: today,
      checkInTime: istNow.toISOString(),
      checkInTimeFormatted: formatISTTime(istNow),
      checkInPlan: plan || '',
      status: 'checked_in',
      createdAt: istNow
    };

    // Only add optional fields if they have values (Firestore rejects undefined)
    if (conversation && conversation.length > 0) record.checkInConversation = conversation;
    if (currentTask?.id) record.currentTaskId = currentTask.id;
    if (currentTask?.title) record.currentTaskTitle = currentTask.title;
    
    // Add geolocation if available
    if (geolocation) {
      record.checkInLocation = {
        latitude: geolocation.latitude,
        longitude: geolocation.longitude,
        accuracy: geolocation.accuracy
      };
    }

    await setDoc(existingRef, record);

    // Update student's last check-in
    await updateDoc(doc(db, 'students', student.id!), {
      lastCheckIn: istNow.toISOString()
    });

    return { 
      success: true, 
      message: 'Checked in successfully!',
      record: { id: existingRef.id, ...record } as AttendanceRecord
    };
  } catch (error) {
    console.error('Error checking in:', error);
    return { success: false, message: 'Failed to check in. Please try again.' };
  }
}

// Check-out a student
export async function checkOutStudent(
  student: Student,
  progress: string,
  blockers?: string,
  tasksCompleted?: string[],
  conversation?: Array<{ role: string; content: string }>,
  geolocation?: { latitude: number; longitude: number; accuracy: number } | null
): Promise<{ success: boolean; message: string; warning?: string; record?: AttendanceRecord }> {
  try {
    const istNow = await getISTTimeFromServer();
    const today = formatISTDate(istNow);
    const settings = await getAttendanceSettings();

    // Check if checkout is too late
    if (!isWithinCheckOutWindow(istNow, settings)) {
      return { 
        success: false, 
        message: `Checkout deadline (${settings.checkOutEndTime}) has passed.` 
      };
    }

    // Get today's attendance
    const attendanceRef = doc(db, 'attendance', `${student.id}_${today}`);
    const attendanceSnap = await getDoc(attendanceRef);
    
    if (!attendanceSnap.exists() || !attendanceSnap.data().checkInTime) {
      return { success: false, message: 'You have not checked in today.' };
    }

    const attendanceData = attendanceSnap.data();
    
    // STRICT: Only one check-out per day allowed
    if (attendanceData.checkOutTime) {
      return { success: false, message: 'You have already checked out today. Only one check-out is allowed per day.' };
    }

    // Calculate work duration
    const workDuration = calculateWorkDuration(attendanceData.checkInTime, istNow.toISOString());
    const minMinutes = settings.minimumWorkHours * 60;

    let warning: string | undefined;
    let status: 'checked_out' | 'absent' = 'checked_out';
    let absentReason: string | undefined;

    if (workDuration < minMinutes) {
      const hoursWorked = (workDuration / 60).toFixed(1);
      const remainingMinutes = minMinutes - workDuration;
      const remainingHours = (remainingMinutes / 60).toFixed(1);
      
      // Check if any tasks were completed - this is the only exemption
      if (tasksCompleted && tasksCompleted.length > 0) {
        // Allow checkout with warning but count as present since work was completed
        warning = `Note: You worked ${hoursWorked} hours (minimum is ${settings.minimumWorkHours}), but task completion recorded. Good work!`;
      } else {
        // Block checkout if under 6 hours AND no tasks completed
        return {
          success: false,
          message: `Cannot check out yet. You've only worked ${hoursWorked} hours. Minimum required is ${settings.minimumWorkHours} hours (${remainingHours} more hours needed). Complete a task or continue working to check out.`
        };
      }
    }

    const updateData: Record<string, any> = {
      checkOutTime: istNow.toISOString(),
      checkOutTimeFormatted: formatISTTime(istNow),
      checkOutProgress: progress || '',
      workDurationMinutes: workDuration,
      status,
      updatedAt: istNow
    };

    // Only add optional fields if they have values (Firestore rejects undefined)
    if (blockers && blockers.trim()) updateData.checkOutBlockers = blockers;
    if (conversation && conversation.length > 0) updateData.checkOutConversation = conversation;
    if (tasksCompleted && tasksCompleted.length > 0) updateData.tasksCompletedDuringSession = tasksCompleted;
    if (absentReason) updateData.absentReason = absentReason;
    
    // Add geolocation if available
    if (geolocation) {
      updateData.checkOutLocation = {
        latitude: geolocation.latitude,
        longitude: geolocation.longitude,
        accuracy: geolocation.accuracy
      };
    }

    await updateDoc(attendanceRef, updateData);

    // Update student's last check-out
    await updateDoc(doc(db, 'students', student.id!), {
      lastCheckOut: istNow.toISOString(),
      dailyLogsCount: (student.dailyLogsCount || 0) + 1
    });

    return { 
      success: true, 
      message: 'Checked out successfully!',
      warning,
      record: { id: attendanceRef.id, ...attendanceData, ...updateData } as AttendanceRecord
    };
  } catch (error) {
    console.error('Error checking out:', error);
    return { success: false, message: 'Failed to check out. Please try again.' };
  }
}

// Submit leave request
export async function submitLeaveRequest(
  student: Student,
  date: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if leave already exists for this date
    const leavesRef = collection(db, 'leaveRequests');
    const existingQuery = query(
      leavesRef, 
      where('studentId', '==', student.id),
      where('date', '==', date)
    );
    const existingSnap = await getDocs(existingQuery);
    
    if (!existingSnap.empty) {
      return { success: false, message: 'You already have a leave request for this date.' };
    }

    await addDoc(leavesRef, {
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      date,
      reason,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    return { success: true, message: 'Leave request submitted successfully!' };
  } catch (error) {
    console.error('Error submitting leave:', error);
    return { success: false, message: 'Failed to submit leave request.' };
  }
}

// Get leave requests for a student
export async function getStudentLeaveRequests(studentId: string): Promise<LeaveRequest[]> {
  try {
    const leavesRef = collection(db, 'leaveRequests');
    const q = query(leavesRef, where('studentId', '==', studentId), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LeaveRequest[];
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return [];
  }
}

// Admin: Approve/Reject leave
export async function handleLeaveRequest(
  leaveId: string,
  action: 'approved' | 'rejected',
  adminEmail: string,
  response?: string
): Promise<void> {
  const leaveRef = doc(db, 'leaveRequests', leaveId);
  const leaveSnap = await getDoc(leaveRef);
  
  if (!leaveSnap.exists()) {
    throw new Error('Leave request not found');
  }

  const leaveData = leaveSnap.data();
  
  await updateDoc(leaveRef, {
    status: action,
    adminResponse: response,
    reviewedBy: adminEmail,
    reviewedAt: serverTimestamp()
  });

  // If approved, create/update attendance record as leave
  if (action === 'approved') {
    const attendanceRef = doc(db, 'attendance', `${leaveData.studentId}_${leaveData.date}`);
    await setDoc(attendanceRef, {
      studentId: leaveData.studentId,
      studentName: leaveData.studentName,
      studentEmail: leaveData.studentEmail,
      date: leaveData.date,
      status: 'leave',
      createdAt: serverTimestamp()
    }, { merge: true });
  }
}

// Auto-mark absent for students who didn't check-in by deadline
export async function autoMarkAbsent(): Promise<number> {
  try {
    const istNow = await getISTTimeFromServer();
    const today = formatISTDate(istNow);
    const settings = await getAttendanceSettings();
    const holidays = await getHolidays();

    // Only run after check-in deadline
    if (!isCheckInDeadlinePassed(istNow, settings)) {
      return 0;
    }

    // Check if today is a working day
    if (!isWorkingDay(istNow, holidays, settings)) {
      return 0;
    }

    // Get all active students
    const studentsRef = collection(db, 'students');
    const studentsQuery = query(
      studentsRef,
      where('status', 'in', ['active', 'offer_downloaded'])
    );
    const studentsSnap = await getDocs(studentsQuery);

    let markedCount = 0;

    for (const studentDoc of studentsSnap.docs) {
      const student = { id: studentDoc.id, ...studentDoc.data() } as Student;

      // Check if within internship period
      if (!isWithinInternshipPeriod(istNow, student)) {
        continue;
      }

      // Check if already has attendance record
      const attendanceRef = doc(db, 'attendance', `${student.id}_${today}`);
      const attendanceSnap = await getDoc(attendanceRef);

      if (!attendanceSnap.exists()) {
        // Check if has approved leave
        const leavesRef = collection(db, 'leaveRequests');
        const leaveQuery = query(
          leavesRef,
          where('studentId', '==', student.id),
          where('date', '==', today),
          where('status', '==', 'approved')
        );
        const leaveSnap = await getDocs(leaveQuery);

        if (leaveSnap.empty) {
          // Mark as absent
          await setDoc(attendanceRef, {
            studentId: student.id,
            studentName: student.name,
            studentEmail: student.email,
            date: today,
            status: 'absent',
            autoMarkedAbsent: true,
            absentReason: 'no_checkin',
            createdAt: serverTimestamp()
          });
          markedCount++;
        }
      }
    }

    return markedCount;
  } catch (error) {
    console.error('Error auto-marking absent:', error);
    return 0;
  }
}

// Auto-mark absent for students who checked in but didn't check out by deadline
export async function autoMarkAbsentForNoCheckout(): Promise<number> {
  try {
    const istNow = await getISTTimeFromServer();
    const today = formatISTDate(istNow);
    const settings = await getAttendanceSettings();

    // Only run after checkout deadline
    if (isWithinCheckOutWindow(istNow, settings)) {
      return 0;
    }

    // Get all attendance records for today with checked_in status
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('date', '==', today),
      where('status', '==', 'checked_in')
    );
    const snapshot = await getDocs(q);

    let markedCount = 0;

    for (const attendanceDoc of snapshot.docs) {
      await updateDoc(doc(db, 'attendance', attendanceDoc.id), {
        status: 'absent',
        autoMarkedAbsent: true,
        absentReason: 'no_checkout',
        updatedAt: serverTimestamp()
      });
      markedCount++;
    }

    return markedCount;
  } catch (error) {
    console.error('Error auto-marking absent for no checkout:', error);
    return 0;
  }
}

// Get attendance summary for a student
export async function getAttendanceSummary(
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  attendancePercentage: number;
  totalWorkHours: number;
}> {
  const records = await getStudentAttendance(studentId, startDate, endDate);
  
  const presentDays = records.filter(r => r.status === 'checked_out').length;
  const absentDays = records.filter(r => r.status === 'absent').length;
  const leaveDays = records.filter(r => r.status === 'leave').length;
  const totalDays = presentDays + absentDays + leaveDays;

  const totalWorkMinutes = records
    .filter(r => r.workDurationMinutes)
    .reduce((sum, r) => sum + (r.workDurationMinutes || 0), 0);

  return {
    totalDays,
    presentDays,
    absentDays,
    leaveDays,
    attendancePercentage: totalDays > 0 ? Math.round((presentDays / (totalDays - leaveDays)) * 100) : 0,
    totalWorkHours: Math.round(totalWorkMinutes / 60 * 10) / 10
  };
}

// Get current in-progress task for a student
export async function getCurrentTask(studentId: string): Promise<{ id: string; title: string } | null> {
  try {
    const tasksRef = collection(db, 'projectTasks');
    const q = query(
      tasksRef,
      where('studentId', '==', studentId),
      where('status', '==', 'in-progress')
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const task = snapshot.docs[0];
      return { id: task.id, title: task.data().title };
    }

    // If no in-progress task, get the first todo task
    const todoQuery = query(
      tasksRef,
      where('studentId', '==', studentId),
      where('status', '==', 'todo'),
      orderBy('order', 'asc')
    );
    const todoSnapshot = await getDocs(todoQuery);

    if (!todoSnapshot.empty) {
      const task = todoSnapshot.docs[0];
      return { id: task.id, title: task.data().title };
    }

    return null;
  } catch (error) {
    console.error('Error getting current task:', error);
    return null;
  }
}

// Get tasks moved to review during current session
export async function getTasksMovedToReviewDuringSession(
  studentId: string,
  sessionStartTime: string
): Promise<Array<{ id: string; title: string }>> {
  try {
    const tasksRef = collection(db, 'projectTasks');
    const q = query(
      tasksRef,
      where('studentId', '==', studentId),
      where('status', '==', 'review')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs
      .filter(doc => {
        const movedAt = doc.data().movedToReviewAt;
        if (!movedAt) return false;
        const movedDate = movedAt.toDate ? movedAt.toDate() : new Date(movedAt);
        return movedDate >= new Date(sessionStartTime);
      })
      .map(doc => ({
        id: doc.id,
        title: doc.data().title
      }));
  } catch (error) {
    console.error('Error getting tasks moved to review:', error);
    return [];
  }
}

// Get all tasks for a student with their status for AI context
export async function getAllStudentTasks(studentId: string): Promise<{
  inProgress: Array<{ id: string; title: string }>;
  todo: Array<{ id: string; title: string }>;
  review: Array<{ id: string; title: string }>;
  done: Array<{ id: string; title: string }>;
}> {
  try {
    const tasksRef = collection(db, 'projectTasks');
    const q = query(tasksRef, where('studentId', '==', studentId));
    const snapshot = await getDocs(q);

    const tasks = {
      inProgress: [] as Array<{ id: string; title: string }>,
      todo: [] as Array<{ id: string; title: string }>,
      review: [] as Array<{ id: string; title: string }>,
      done: [] as Array<{ id: string; title: string }>
    };

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const task = { id: doc.id, title: data.title };
      
      switch (data.status) {
        case 'in-progress':
          tasks.inProgress.push(task);
          break;
        case 'todo':
          tasks.todo.push(task);
          break;
        case 'review':
          tasks.review.push(task);
          break;
        case 'done':
          tasks.done.push(task);
          break;
      }
    });

    return tasks;
  } catch (error) {
    console.error('Error getting all student tasks:', error);
    return { inProgress: [], todo: [], review: [], done: [] };
  }
}
