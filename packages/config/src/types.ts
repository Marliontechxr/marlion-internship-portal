// Firestore Data Types and Schemas

// Student Status Enum
export type StudentStatus =
  | 'registered'
  | 'interview_pending'
  | 'interview_done'
  | 'selected'
  | 'rejected'
  | 'offer_downloaded'
  | 'active'
  | 'completed'
  | 'banned';

// Internship Streams - Winter 2025
export type InternshipStream =
  | 'ar-vr'
  | 'fullstack'
  | 'agentic-ai'
  | 'data-science';

// College Options
export type CollegeOption =
  | 'TCE'
  | 'Kamaraj'
  | 'SRM Madurai'
  | 'Anna University Ramnad'
  | 'Velammal'
  | 'Other';

// Student Document
export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  college: CollegeOption;
  collegeOther?: string;
  year: number | string;
  department: string;
  chosenStream: InternshipStream;
  internshipStart: Date;
  internshipEnd: Date;
  specialRequests?: string;
  collegeIdUrl?: string;
  profilePhotoUrl?: string;
  status: StudentStatus;
  aiInterviewSummary?: string;
  aiScore?: number;
  aiRecommendation?: string; // Strong Hire / Weak Hire / Reject
  bootcampProgress?: BootcampProgress | number; // Can be object or number (0-100)
  projectProgress?: number; // 0-100 representing project task completion (normalized from 70% weightage)
  projectAssignment?: string;
  appliedProblemStatementId?: string;
  assignedProblemStatement?: string; // Assigned problem statement ID
  projectSubmissionStatus?: 'pending' | 'approved' | 'rejected';
  dailyLogsCount: number;
  createdAt: Date;
  updatedAt: Date;
  bannedReason?: string;
  bannedAt?: Date;
  // Offer letter fields
  offerRefNumber?: string;
  offerIssuedAt?: Date;
  offerDownloaded?: boolean;
  offerDownloadedAt?: Date;
  // Certificate fields
  certificateRequested?: boolean;
  certificateRequestedAt?: Date;
  certificateApproved?: boolean;
  certificateApprovedAt?: Date;
  certificateApprovedBy?: string;
  certificateSummary?: string;
  certificateId?: string;
  certificateIssued?: boolean;
  certificateIssuedAt?: Date;
  // Device configuration
  laptopConfig?: string;
  graphicsCard?: string;
  // Rewards & Gamification
  assessmentScore?: number; // 0-100 admin assessment score
  spentPoints?: number; // Points spent on reward redemptions
}

// Bootcamp Progress
export interface BootcampProgress {
  completedModules: string[];
  currentModule?: string;
  quizScores: Record<string, number>;
  totalProgress: number;
  lastAccessedAt: Date;
}

// Interview Document
export interface Interview {
  studentId: string;
  studentEmail: string;
  transcript: TranscriptEntry[];
  aiSummary: string;
  score: number;
  duration: number;
  completedAt: Date;
  createdAt: Date;
  // New evaluation fields from AI interviewer
  technicalDepth?: string; // High/Medium/Low
  empathyScore?: string; // High/Medium/Low
  cultureFit?: string; // High/Medium/Low
  keyObservation?: string;
  recommendation?: string; // Strong Hire / Weak Hire / Reject
  progressScore?: number; // Dynamic interview progress score
  exitReason?: string; // 'timeout' | 'success_100' | 'poor_responses' | 'normal'
}

export interface TranscriptEntry {
  role: 'ai' | 'student';
  content: string;
  timestamp: Date;
}

// Course Module
export interface CourseModule {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  aiSummary?: string;
  quizSpec?: QuizSpec;
  order: number;
  stream: InternshipStream;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizSpec {
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

// Proposal Document
export interface Proposal {
  studentId: string;
  studentEmail: string;
  pdfUrl: string;
  ideaSummary: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  adminFeedback?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

// Project Document
export interface Project {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  references: string[];
  assignedStudents: string[];
  stream: InternshipStream;
  milestones: Milestone[];
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: Date;
}

// Daily Log Entry
export interface DailyLogEntry {
  id: string;
  studentId: string;
  date: Date;
  description: string;
  attachments: string[];
  githubUrl?: string;
  hoursWorked: number;
  challenges?: string;
  nextSteps?: string;
  createdAt: Date;
}

// Announcement
export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  targetStreams?: InternshipStream[];
  targetStudents?: string[];
  postedBy: string;
  postedByEmail: string;
  timestamp: Date;
  expiresAt?: Date;
  isActive: boolean;
}

// Support Ticket
export interface SupportTicket {
  id: string;
  studentId: string;
  studentEmail: string;
  subject: string;
  description: string;
  category: 'technical' | 'content' | 'general' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  messages: TicketMessage[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderRole: 'student' | 'admin';
  content: string;
  timestamp: Date;
}

// Certificate
export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  stream: InternshipStream;
  projectTitle: string;
  aiSummary: string;
  qrCode: string;
  pdfUrl: string;
  issuedAt: Date;
  verificationCode: string;
}

// Admin User
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super-admin' | 'admin' | 'moderator';
  permissions: string[];
  createdAt: Date;
  lastLoginAt?: Date;
}

// Feedback
export interface StudentFeedback {
  id: string;
  studentId: string;
  studentEmail: string;
  overallRating: number;
  contentRating: number;
  mentorshipRating: number;
  suggestions?: string;
  testimonial?: string;
  wouldRecommend: boolean;
  submittedAt: Date;
}

// Attendance Types
export type AttendanceStatus = 'checked_in' | 'checked_out' | 'absent' | 'leave' | 'holiday';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  date: string; // YYYY-MM-DD format in IST
  checkInTime?: string; // ISO timestamp
  checkInTimeFormatted?: string;
  checkOutTime?: string; // ISO timestamp
  checkOutTimeFormatted?: string;
  checkInConversation?: Array<{ role: string; content: string }>;
  checkOutConversation?: Array<{ role: string; content: string }>;
  checkInSummary?: string;
  checkOutSummary?: string;
  checkInPlan?: string; // What student plans to work on
  checkOutProgress?: string; // What was accomplished
  checkOutBlockers?: string; // Any blockers faced
  currentTaskId?: string; // Task being worked on
  currentTaskTitle?: string;
  tasksCompletedDuringSession?: string[]; // Task IDs moved to review during session
  workDurationMinutes?: number; // Duration between check-in and check-out
  status: AttendanceStatus;
  autoMarkedAbsent?: boolean; // If system auto-marked absent
  absentReason?: string; // 'no_checkin' | 'no_checkout' | 'insufficient_hours' | 'late_checkin'
  checkInLocation?: { latitude: number; longitude: number; accuracy: number }; // Geolocation at check-in
  checkOutLocation?: { latitude: number; longitude: number; accuracy: number }; // Geolocation at check-out
  createdAt: Date;
  updatedAt?: Date;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  date: string; // YYYY-MM-DD format
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminResponse?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD format
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
}

export interface AttendanceSettings {
  checkInStartTime: string; // "09:00" - earliest check-in
  checkInEndTime: string; // "11:00" - latest check-in (after this = absent)
  checkOutEndTime: string; // "20:00" - latest check-out
  minimumWorkHours: number; // 6 hours minimum
  weeklyOffDays: number[]; // [0] for Sunday
}
