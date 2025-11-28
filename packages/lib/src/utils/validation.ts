// Validation utilities using Zod

import { z } from 'zod';

// Student registration validation
export const studentRegistrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian phone number').optional(),
  college: z.enum(['TCE', 'Kamaraj', 'SRM Madurai', 'Anna University Ramnad', 'Other']),
  collegeOther: z.string().optional(),
  year: z.number().min(1).max(5),
  department: z.string().min(2),
  chosenStream: z.enum(['ar-vr', 'fullstack', 'agentic-ai', 'data-science']),
  internshipStart: z.date(),
  internshipEnd: z.date(),
  specialRequests: z.string().max(500).optional(),
}).refine(
  (data) => data.college !== 'Other' || (data.collegeOther && data.collegeOther.length > 0),
  { message: 'Please specify your college name', path: ['collegeOther'] }
).refine(
  (data) => data.internshipEnd > data.internshipStart,
  { message: 'End date must be after start date', path: ['internshipEnd'] }
);

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;

// Daily log validation
export const dailyLogSchema = z.object({
  date: z.date(),
  description: z.string().min(50, 'Please provide more detail (at least 50 characters)').max(2000),
  hoursWorked: z.number().min(0).max(12),
  githubUrl: z.string().url().optional().or(z.literal('')),
  challenges: z.string().max(500).optional(),
  nextSteps: z.string().max(500).optional(),
});

export type DailyLogInput = z.infer<typeof dailyLogSchema>;

// Support ticket validation
export const supportTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  category: z.enum(['technical', 'content', 'general', 'urgent']),
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;

// Admin announcement validation
export const announcementSchema = z.object({
  title: z.string().min(5).max(100),
  message: z.string().min(10).max(1000),
  priority: z.enum(['low', 'medium', 'high']),
  targetStreams: z.array(z.enum(['ar-vr', 'fullstack', 'agentic-ai', 'data-science'])).optional(),
  expiresAt: z.date().optional(),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;

// Course module validation
export const courseModuleSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(1000),
  videoUrl: z.string().url(),
  stream: z.enum(['ar-vr', 'fullstack', 'agentic-ai', 'data-science']),
  order: z.number().min(0),
  duration: z.number().min(1), // minutes
});

export type CourseModuleInput = z.infer<typeof courseModuleSchema>;

// Feedback validation
export const feedbackSchema = z.object({
  overallRating: z.number().min(1).max(5),
  contentRating: z.number().min(1).max(5),
  mentorshipRating: z.number().min(1).max(5),
  suggestions: z.string().max(1000).optional(),
  testimonial: z.string().max(500).optional(),
  wouldRecommend: z.boolean(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

// Validate function helper
export function validate<T>(schema: z.Schema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
