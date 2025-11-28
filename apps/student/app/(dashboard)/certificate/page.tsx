'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@marlion/ui/providers';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@marlion/config';
import { generateCertificateHTML, generateVerificationCode } from '@marlion/lib/utils';
import { generateCertificateShareContent, openLinkedInShare } from '@marlion/lib';
import { 
  Award, 
  Download, 
  Clock, 
  CheckCircle, 
  Loader2, 
  Calendar,
  Building2,
  Code2,
  Trophy,
  Star,
  FileText,
  QrCode,
  Sparkles,
  MessageSquare,
  Send,
  X,
  ArrowRight,
  Linkedin
} from 'lucide-react';

interface StudentData {
  id: string;
  name: string;
  email: string;
  college: string;
  collegeOther?: string;
  department: string;
  chosenStream: string;
  internshipStart: any;
  internshipEnd: any;
  status: string;
  projectProgress: number;
  projectAssignment?: string;
  appliedProblemStatementId?: string;
  certificateRequested?: boolean;
  certificateApproved?: boolean;
  certificateSummary?: string;
  certificateId?: string;
  adminFeedback?: string;
  feedbackConversation?: Array<{role: string; content: string}>;
  bootcampProgress?: {
    completedModules: string[];
    totalProgress: number;
  };
}

interface ProblemStatement {
  id: string;
  title: string;
  stream: string;
}

interface CompletedTask {
  title: string;
  description: string;
  completedAt: any;
}

// Stream display names
const streamNames: Record<string, string> = {
  'ar-vr': 'AR/VR Development',
  'fullstack': 'Full-Stack Development',
  'agentic-ai': 'Agentic AI',
  'data-science': 'Data Science & Analytics'
};

export default function CertificatePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [problemStatement, setProblemStatement] = useState<ProblemStatement | null>(null);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  
  // Feedback conversation states
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackMessages, setFeedbackMessages] = useState<Array<{role: string; content: string}>>([]);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [feedbackStep, setFeedbackStep] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);
  
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [feedbackMessages]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Get student data
      const studentDoc = await getDoc(doc(db, 'students', user.uid));
      if (!studentDoc.exists()) {
        setLoading(false);
        return;
      }

      const studentData = { id: studentDoc.id, ...studentDoc.data() } as StudentData;
      setStudent(studentData);

      // Calculate overall progress
      let progress = 0;
      
      // Bootcamp complete = 15%
      if (studentData.projectAssignment || studentData.appliedProblemStatementId) {
        progress += 15;
      }
      
      // Project assigned = 15%
      if (studentData.projectAssignment) {
        progress += 15;
      }
      
      // Project tasks = 70%
      const projectProgress = studentData.projectProgress || 0;
      progress += Math.round((projectProgress / 100) * 70);
      
      setOverallProgress(Math.min(100, progress));

      // Get problem statement if assigned
      const psId = studentData.projectAssignment || studentData.appliedProblemStatementId;
      if (psId) {
        // Check problem submissions for approved/assigned
        const submissionsQuery = query(
          collection(db, 'problemSubmissions'),
          where('studentId', '==', user.uid)
        );
        const submissionsSnap = await getDocs(submissionsQuery);
        const approvedSubmission = submissionsSnap.docs.find(d => 
          d.data().status === 'approved' || d.data().status === 'assigned'
        );

        if (approvedSubmission) {
          const psDoc = await getDoc(doc(db, 'problemStatements', approvedSubmission.data().problemStatementId));
          if (psDoc.exists()) {
            setProblemStatement({ id: psDoc.id, ...psDoc.data() } as ProblemStatement);
          }
        }
      }

      // Get completed tasks
      const tasksQuery = query(
        collection(db, 'projectTasks'),
        where('studentId', '==', user.uid)
      );
      const tasksSnap = await getDocs(tasksQuery);
      const completed = tasksSnap.docs
        .map(d => d.data())
        .filter(t => t.status === 'completed' && t.isAdminTask)
        .map(t => ({
          title: t.title,
          description: t.description || '',
          completedAt: t.completedAt
        }));
      setCompletedTasks(completed);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  // Dynamic AI feedback conversation
  const getAIResponse = async (messages: Array<{role: string; content: string}>, userResponse: string): Promise<string> => {
    const studentName = student?.name?.split(' ')[0] || 'there';
    const streamName = streamNames[student?.chosenStream || ''] || student?.chosenStream;
    const projectName = problemStatement?.title || 'your project';
    
    // Count user messages to determine conversation stage
    const userMessageCount = messages.filter(m => m.role === 'user').length + 1;
    
    // Analyze user response
    const isShort = userResponse.split(/\s+/).length < 10;
    const isPositive = /great|amazing|wonderful|learned|enjoyed|loved|awesome|excellent/i.test(userResponse);
    const mentionsChallenge = /challenge|difficult|hard|struggle|problem|issue/i.test(userResponse);
    const mentionsTeam = /team|mentor|colleague|help|support/i.test(userResponse);
    const mentionsTech = /code|build|develop|tech|ai|vr|ar|data|model/i.test(userResponse);
    
    // Dynamic responses based on conversation stage and user input
    if (userMessageCount === 1) {
      // Response to "what did you learn"
      if (isShort) {
        return `I'd love to hear more! ${studentName}, could you share a specific moment or breakthrough during ${projectName} that made you think "aha, I get it now"? 💡`;
      } else if (mentionsTech) {
        return `That's fantastic technical growth! 🚀 Beyond the technical skills, how did working on ${streamName} change the way you approach problem-solving? Any mindset shifts?`;
      } else {
        return `Beautiful insight, ${studentName}! 🌟 Now I'm curious - what was the toughest part of your journey? And how did you push through it?`;
      }
    } else if (userMessageCount === 2) {
      // Response to challenges/experience
      if (mentionsTeam) {
        return `It's great that you found support! 🤝 If you were to give advice to the next batch of interns starting ${streamName}, what would be the one thing you'd tell them?`;
      } else if (mentionsChallenge) {
        return `Overcoming challenges is what builds real skills! 💪 Quick question - if you could change one thing about the internship program to make it even better, what would it be?`;
      } else {
        return `I appreciate you sharing that! Looking back at your time here, what's something you wish you knew before starting? Any tips for future interns?`;
      }
    } else if (userMessageCount === 3) {
      // Response to suggestions/advice
      if (isPositive) {
        return `Your positivity is contagious! 🎉 Last question - in one sentence, how would you describe your Marlion internship journey to a friend considering applying?`;
      } else {
        return `That's valuable feedback we'll definitely consider! 📝 Before we wrap up - any final words or a message you'd like to share with the Marlion team?`;
      }
    } else {
      // Final response - ready to submit
      return `Thank you so much for this wonderful conversation, ${studentName}! 🙏✨ Your feedback means the world to us and will help shape the program for future interns.\n\nClick 'Submit & Request Certificate' below to complete your application. The team will review and you'll receive your certificate soon!`;
    }
  };

  const startFeedbackConversation = () => {
    const studentName = student?.name?.split(' ')[0] || 'there';
    const projectName = problemStatement?.title || 'your project';
    
    setShowFeedbackDialog(true);
    setFeedbackStep(0);
    setFeedbackMessages([{
      role: 'assistant',
      content: `Hey ${studentName}! 🎉 Congratulations on completing your internship and finishing "${projectName}"!\n\nBefore I hand you over to the team for your certificate, I'd love to chat briefly about your journey. It'll just take a minute!\n\nSo tell me - what was the most valuable thing you learned during this internship? Could be technical, personal, or anything that surprised you!`
    }]);
  };

  const handleFeedbackSend = async () => {
    if (!feedbackInput.trim() || aiLoading) return;

    const userMessage = feedbackInput;
    const newMessages = [...feedbackMessages, { role: 'user', content: userMessage }];
    setFeedbackMessages(newMessages);
    setFeedbackInput('');
    setAiLoading(true);

    const nextStep = feedbackStep + 1;

    // Get dynamic AI response
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
    
    const aiResponse = await getAIResponse(newMessages, userMessage);
    
    setFeedbackMessages([...newMessages, { 
      role: 'assistant', 
      content: aiResponse 
    }]);
    setFeedbackStep(nextStep);

    setAiLoading(false);
  };

  const submitFeedbackAndRequest = async () => {
    if (!user || !student) return;
    
    setRequesting(true);
    try {
      await updateDoc(doc(db, 'students', user.uid), {
        certificateRequested: true,
        certificateRequestedAt: serverTimestamp(),
        feedbackConversation: feedbackMessages,
        status: 'completed',
        updatedAt: serverTimestamp()
      });

      // Refresh student data
      const updatedDoc = await getDoc(doc(db, 'students', user.uid));
      if (updatedDoc.exists()) {
        setStudent({ id: updatedDoc.id, ...updatedDoc.data() } as StudentData);
      }
      setShowFeedbackDialog(false);
    } catch (error) {
      console.error('Error requesting certificate:', error);
      alert('Failed to request certificate. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const handleRequestCertificate = async () => {
    if (!user || !student) return;
    
    setRequesting(true);
    try {
      await updateDoc(doc(db, 'students', user.uid), {
        certificateRequested: true,
        certificateRequestedAt: serverTimestamp(),
        status: 'completed',
        updatedAt: serverTimestamp()
      });

      // Refresh student data
      const updatedDoc = await getDoc(doc(db, 'students', user.uid));
      if (updatedDoc.exists()) {
        setStudent({ id: updatedDoc.id, ...updatedDoc.data() } as StudentData);
      }
    } catch (error) {
      console.error('Error requesting certificate:', error);
      alert('Failed to request certificate. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-marlion-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-slate-400">Student data not found.</p>
        </div>
      </div>
    );
  }

  const isEligible = overallProgress >= 100;
  const hasRequested = student.certificateRequested;
  const isApproved = student.certificateApproved;

  return (
    <div className="p-4 md:p-6 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Award className="w-8 h-8 text-marlion-primary" />
          Internship Certificate
        </h1>
        <p className="text-slate-400 mt-2">
          Complete your internship to unlock your certificate
        </p>
      </div>

      {/* Progress Overview */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Internship Progress</h2>
            <p className="text-slate-400 text-sm">Complete all milestones to request your certificate</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-bold bg-gradient-to-r from-marlion-primary to-marlion-accent bg-clip-text text-transparent">
              {overallProgress}%
            </span>
            <p className="text-sm text-slate-400">Overall</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-4 bg-marlion-surface rounded-full overflow-hidden mb-6">
          <div 
            className={`h-full transition-all duration-1000 ${
              isEligible 
                ? 'bg-gradient-to-r from-emerald-500 to-green-400' 
                : 'bg-gradient-to-r from-marlion-primary to-marlion-accent'
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Progress Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl ${overallProgress >= 15 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-marlion-surface'}`}>
            <div className="flex items-center gap-2 mb-2">
              {overallProgress >= 15 ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Clock className="w-5 h-5 text-slate-400" />
              )}
              <span className="font-medium text-white">Bootcamp</span>
            </div>
            <p className="text-2xl font-bold text-white">{overallProgress >= 15 ? '15%' : '0%'}</p>
            <p className="text-xs text-slate-400">Complete all modules</p>
          </div>

          <div className={`p-4 rounded-xl ${overallProgress >= 30 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-marlion-surface'}`}>
            <div className="flex items-center gap-2 mb-2">
              {overallProgress >= 30 ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Clock className="w-5 h-5 text-slate-400" />
              )}
              <span className="font-medium text-white">Project Assigned</span>
            </div>
            <p className="text-2xl font-bold text-white">{overallProgress >= 30 ? '15%' : '0%'}</p>
            <p className="text-xs text-slate-400">Get approved for a project</p>
          </div>

          <div className={`p-4 rounded-xl ${student.projectProgress === 100 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-marlion-surface'}`}>
            <div className="flex items-center gap-2 mb-2">
              {student.projectProgress === 100 ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Clock className="w-5 h-5 text-slate-400" />
              )}
              <span className="font-medium text-white">Project Tasks</span>
            </div>
            <p className="text-2xl font-bold text-white">{Math.round((student.projectProgress || 0) / 100 * 70)}%</p>
            <p className="text-xs text-slate-400">Complete all tasks (70% weightage)</p>
          </div>
        </div>
      </div>

      {/* Certificate Status / Preview */}
      {isEligible ? (
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Certificate Preview */}
          <div className="relative bg-gradient-to-br from-marlion-primary/20 via-marlion-accent/10 to-purple-500/20 p-8 md:p-12">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-4 left-4 w-32 h-32 border-t-2 border-l-2 border-marlion-primary/30 rounded-tl-3xl" />
              <div className="absolute bottom-4 right-4 w-32 h-32 border-b-2 border-r-2 border-marlion-accent/30 rounded-br-3xl" />
            </div>

            <div className="relative text-center">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-marlion-primary to-marlion-accent rounded-2xl flex items-center justify-center shadow-xl shadow-marlion-primary/30">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-sm uppercase tracking-[0.3em] text-marlion-primary mb-2">Certificate of Completion</h2>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">Winter Internship 2025</h1>

              {/* Recipient */}
              <p className="text-slate-400 mb-2">This is to certify that</p>
              <p className="text-2xl md:text-3xl font-bold text-white mb-2">{student.name}</p>
              <p className="text-slate-400 mb-6">has successfully completed the internship program</p>

              {/* Details */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="px-4 py-2 bg-marlion-surface/50 rounded-xl">
                  <div className="flex items-center gap-2 text-sm">
                    <Code2 className="w-4 h-4 text-marlion-primary" />
                    <span className="text-white">{streamNames[student.chosenStream] || student.chosenStream}</span>
                  </div>
                </div>
                <div className="px-4 py-2 bg-marlion-surface/50 rounded-xl">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-marlion-primary" />
                    <span className="text-white">{student.college}</span>
                  </div>
                </div>
                <div className="px-4 py-2 bg-marlion-surface/50 rounded-xl">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-marlion-primary" />
                    <span className="text-white">{formatDate(student.internshipStart)} - {formatDate(student.internshipEnd)}</span>
                  </div>
                </div>
              </div>

              {/* Project */}
              {problemStatement && (
                <div className="mb-8 p-4 bg-marlion-surface/30 rounded-xl inline-block">
                  <p className="text-sm text-slate-400 mb-1">Project Completed</p>
                  <p className="text-lg font-semibold text-white">{problemStatement.title}</p>
                </div>
              )}

              {/* Performance Summary (if approved) */}
              {isApproved && student.certificateSummary && (
                <div className="mb-8 p-4 bg-marlion-surface/30 rounded-xl text-left max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-marlion-primary" />
                    <span className="text-sm font-medium text-white">Performance Summary</span>
                  </div>
                  <p className="text-sm text-slate-300">{student.certificateSummary}</p>
                </div>
              )}

              {/* Admin Feedback (if approved and has feedback) */}
              {isApproved && student.adminFeedback && (
                <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-left max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Message from Marlion Team</span>
                  </div>
                  <p className="text-sm text-slate-300 italic">"{student.adminFeedback}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Section */}
          <div className="p-6 bg-marlion-surface/30">
            {isApproved ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-400 mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Certificate Approved!</span>
                </div>
                <button
                  className="px-8 py-3 bg-gradient-to-r from-marlion-primary to-marlion-accent text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
                  onClick={() => {
                    if (!student || !problemStatement) return;
                    
                    // Generate verification code if not exists
                    const verificationCode = student.certificateId || generateVerificationCode();
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://internship.marliontech.com/verify/${verificationCode}`;
                    
                    // Get correct college name
                    const collegeName = student.college === 'Other' && student.collegeOther 
                      ? student.collegeOther 
                      : student.college;
                    
                    // Generate certificate HTML
                    const html = generateCertificateHTML({
                      studentName: student.name,
                      college: collegeName,
                      stream: student.chosenStream,
                      projectTitle: problemStatement.title,
                      completionDate: new Date(),
                      achievementSummary: student.certificateSummary || 'Successfully completed the internship program with dedication and excellence.',
                      verificationCode: verificationCode,
                      qrCodeUrl: qrCodeUrl,
                      adminFeedback: student.adminFeedback
                    });

                    // Create downloadable file
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Marlion_Certificate_${student.name.replace(/\s+/g, '_')}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-5 h-5" />
                  Download Certificate
                </button>
                
                {/* LinkedIn Share Button */}
                <button
                  onClick={() => {
                    // Use share page URL with OG metadata for rich preview
                    const shareUrl = `https://internship.marliontech.com/share/certificate/${student.certificateId}?name=${encodeURIComponent(student.name)}&stream=${encodeURIComponent(student.chosenStream)}`;
                    openLinkedInShare(generateCertificateShareContent({
                      studentName: student.name,
                      stream: student.chosenStream,
                      certificateUrl: shareUrl
                    }));
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl font-medium transition-all mt-3"
                >
                  <Linkedin className="w-5 h-5" />
                  Share to LinkedIn
                </button>
                
                {student.certificateId && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                    <QrCode className="w-4 h-4" />
                    Verification ID: {student.certificateId}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Verify at: internship.marliontech.com/verify/{student.certificateId}
                </p>
              </div>
            ) : hasRequested ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-amber-400 mb-4">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Certificate Under Review</span>
                </div>
                <p className="text-slate-400 text-sm">
                  Your certificate request is being reviewed by our admin team. 
                  You'll be notified once it's approved and ready for download.
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-slate-400 mb-4">
                  Congratulations on completing your internship! 🎉<br />
                  Share your feedback and request your official certificate.
                </p>
                <button
                  onClick={startFeedbackConversation}
                  disabled={requesting}
                  className="px-8 py-3 bg-gradient-to-r from-marlion-primary to-marlion-accent text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  <MessageSquare className="w-5 h-5" />
                  Share Feedback & Request Certificate
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Not Eligible Yet
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-marlion-surface rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10 text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Certificate Locked</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Complete your internship journey to unlock your certificate. 
            You're {100 - overallProgress}% away from completion!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {overallProgress < 15 && (
              <div className="p-4 bg-marlion-surface rounded-xl text-left">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <p className="text-white font-medium">Complete Bootcamp</p>
                <p className="text-xs text-slate-400">Watch all videos and pass quizzes</p>
              </div>
            )}
            {overallProgress < 30 && overallProgress >= 15 && (
              <div className="p-4 bg-marlion-surface rounded-xl text-left">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <p className="text-white font-medium">Get Project Approved</p>
                <p className="text-xs text-slate-400">Apply and get assigned a project</p>
              </div>
            )}
            {overallProgress >= 30 && overallProgress < 100 && (
              <div className="p-4 bg-marlion-surface rounded-xl text-left">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">In Progress</span>
                </div>
                <p className="text-white font-medium">Complete Project Tasks</p>
                <p className="text-xs text-slate-400">{student.projectProgress || 0}% of tasks complete</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Conversation Dialog */}
      {showFeedbackDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-marlion-primary/20 rounded-lg">
                  <Sparkles className="w-5 h-5 text-marlion-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Share Your Experience</h3>
                  <p className="text-sm text-slate-400">Quick feedback before your certificate</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFeedbackDialog(false)} 
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {feedbackMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl ${
                    msg.role === 'user' 
                      ? 'bg-marlion-primary text-white' 
                      : 'bg-gray-800 text-gray-200'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 p-3 rounded-xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              {feedbackStep < 4 ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleFeedbackSend()}
                    placeholder="Type your response..."
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    disabled={aiLoading}
                  />
                  <button
                    onClick={handleFeedbackSend}
                    disabled={aiLoading || !feedbackInput.trim()}
                    className="p-2 bg-marlion-primary hover:bg-marlion-primary/80 rounded-lg text-white disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={submitFeedbackAndRequest}
                  disabled={requesting}
                  className="w-full py-3 bg-gradient-to-r from-marlion-primary to-marlion-accent text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {requesting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Award className="w-5 h-5" />
                  )}
                  Submit & Request Certificate
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
