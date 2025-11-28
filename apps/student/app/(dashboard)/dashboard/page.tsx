'use client';

import { useEffect, useState } from 'react';
import { Badge, Progress, Spinner } from '@marlion/ui/components';
import { useAuth } from '@marlion/ui/providers';
import { getStudentByEmail, getActiveAnnouncements } from '@marlion/lib/firestore';
import { db } from '@marlion/config/firebase';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, addDoc, serverTimestamp, where } from 'firebase/firestore';
import type { Student, Announcement } from '@marlion/config/types';
import { BookOpen, FolderKanban, ArrowRight, Bell, Clock, CheckCircle2, Lightbulb, Award, Sparkles, Target, TrendingUp, Users, MessageCircle, Heart, Star, LogIn, LogOut, Calendar, Send, X, AlertCircle, Coffee } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { query, orderBy, limit, onSnapshot } from 'firebase/firestore';

// Stream mapping helper - maps various stream name formats to consistent display names
const streamMapping: { [key: string]: string } = {
  'ar-vr': 'AR/VR Development',
  'ar/vr': 'AR/VR Development',
  'ar/vr development': 'AR/VR Development',
  'arvr': 'AR/VR Development',
  'immersive-tech': 'AR/VR Development',
  'immersive tech': 'AR/VR Development',
  'fullstack': 'Full-Stack Development',
  'full-stack': 'Full-Stack Development',
  'full stack': 'Full-Stack Development',
  'full-stack development': 'Full-Stack Development',
  'agentic-ai': 'Agentic AI',
  'agentic ai': 'Agentic AI',
  'agenticai': 'Agentic AI',
  'data-science': 'Data Science',
  'data science': 'Data Science',
  'datascience': 'Data Science',
};

// Helper to normalize stream names for comparison
const normalizeStream = (stream: string): string => {
  const normalized = stream?.toLowerCase().trim() || '';
  return streamMapping[normalized] || normalized;
};

// Bootcamp Tile Component - calculates actual video completion percentage
function BootcampTile({ student }: { student: Student }) {
  const [bootcampPercentage, setBootcampPercentage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateBootcampProgress = async () => {
      try {
        // Get sections
        const sectionsRef = collection(db, 'sections');
        const sectionsSnap = await getDocs(sectionsRef);
        const allSections = sectionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as { id: string; stream: string }[];

        // Filter by student stream using normalized comparison
        const studentStreamNormalized = normalizeStream(student.chosenStream || '');
        
        const relevantSections = allSections.filter(s => {
          const sectionStream = s.stream?.toLowerCase().trim();
          const sectionStreamNormalized = normalizeStream(s.stream || '');
          return sectionStream === 'general' || 
                 sectionStreamNormalized === studentStreamNormalized ||
                 sectionStream === studentStreamNormalized.toLowerCase();
        });

        // Get modules for relevant sections
        const modulesRef = collection(db, 'modules');
        const modulesSnap = await getDocs(modulesRef);
        const allModules = modulesSnap.docs.map(doc => ({
          id: doc.id,
          sectionId: doc.data().sectionId
        }));

        const relevantSectionIds = new Set(relevantSections.map(s => s.id));
        const totalModules = allModules.filter(m => relevantSectionIds.has(m.sectionId)).length;
        const completedModules = (typeof student.bootcampProgress === "object" && student.bootcampProgress?.completedModules) ? student.bootcampProgress.completedModules.length : 0;

        if (totalModules > 0) {
          setBootcampPercentage(Math.round((completedModules / totalModules) * 100));
        } else {
          setBootcampPercentage(0);
        }
      } catch (error) {
        console.error('Error calculating bootcamp progress:', error);
        setBootcampPercentage(0);
      } finally {
        setLoading(false);
      }
    };

    calculateBootcampProgress();
  }, [student]);

  const isComplete = bootcampPercentage >= 100;

  return (
    <div className="glass-card rounded-2xl p-6 card-hover">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-marlion-primary to-blue-600 flex items-center justify-center shadow-lg shadow-marlion-primary/30">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Bootcamp Kit</h3>
          {isComplete && <span className="badge-success text-xs">Complete</span>}
        </div>
      </div>
      <p className="text-slate-400 mb-4 text-sm">
        {isComplete 
          ? 'Great job! You\'ve completed all bootcamp modules.'
          : 'Access video lessons, AI-powered Q&A, and quizzes.'}
      </p>
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Videos Completed</span>
          <span className="text-marlion-primary font-bold">{loading ? '...' : `${bootcampPercentage}%`}</span>
        </div>
        <div className="h-2 bg-marlion-surface rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-marlion-primary to-marlion-accent transition-all duration-500"
            style={{ width: loading ? '0%' : `${bootcampPercentage}%` }}
          />
        </div>
      </div>
      <Link href={isComplete ? "/problem-statements" : "/bootcamp"}>
        <button className="w-full btn-secondary flex items-center justify-center gap-2">
          {isComplete ? 'Choose Your Project' : 'Continue Bootcamp'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </Link>
    </div>
  );
}

// Project Tracker Tile - shows actual project progress
function ProjectTrackerTile({ student }: { student: Student }) {
  const [projectProgress, setProjectProgress] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [dailyLogs, setDailyLogs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateProjectProgress = async () => {
      // Handle both string and object formats for projectAssignment
      const projectAssignment = student.projectAssignment;
      const hasProject = projectAssignment && (
        typeof projectAssignment === 'string' 
          ? projectAssignment.length > 0 
          : Boolean((projectAssignment as any)?.problemStatementId)
      );
      
      if (!hasProject) {
        setLoading(false);
        return;
      }

      try {
        // Get project tasks
        const tasksQuery = query(
          collection(db, 'projectTasks'),
          where('studentId', '==', student.id)
        );
        const tasksSnap = await getDocs(tasksQuery);
        const tasks = tasksSnap.docs.map(doc => doc.data());

        const completed = tasks.filter(t => t.status === 'completed').length;
        const total = tasks.length;

        setCompletedTasks(completed);
        setTotalTasks(total);

        if (total > 0) {
          setProjectProgress(Math.round((completed / total) * 100));
        }

        // Get daily logs count from attendance
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('studentId', '==', student.id)
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        setDailyLogs(attendanceSnap.size);

      } catch (error) {
        console.error('Error calculating project progress:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateProjectProgress();
  }, [student]);

  // Handle both string and object formats for projectAssignment
  const projectAssignment = student.projectAssignment;
  const hasProject = projectAssignment && (
    typeof projectAssignment === 'string' 
      ? projectAssignment.length > 0 
      : Boolean((projectAssignment as any)?.problemStatementId)
  );

  return (
    <div className="glass-card rounded-2xl p-6 card-hover">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-marlion-accent to-purple-600 flex items-center justify-center shadow-lg shadow-marlion-accent/30">
          <FolderKanban className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Project Tracker</h3>
          {projectProgress >= 100 && <span className="badge-success text-xs">Complete</span>}
        </div>
      </div>
      <p className="text-slate-400 mb-4 text-sm">
        {hasProject 
          ? 'Track your project milestones and submit daily logs.'
          : 'Complete bootcamp and choose a project to get started.'}
      </p>
      {hasProject && (
        <div className="mb-4 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Tasks Progress</span>
              <span className="text-marlion-accent font-bold">
                {loading ? '...' : `${completedTasks}/${totalTasks}`}
              </span>
            </div>
            <div className="h-2 bg-marlion-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-marlion-accent to-purple-500 transition-all duration-500"
                style={{ width: loading ? '0%' : `${projectProgress}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Daily Check-ins</span>
            <span className="text-white font-bold">{dailyLogs} days</span>
          </div>
        </div>
      )}
      <Link href={hasProject ? "/project-tracker" : "/problem-statements"}>
        <button className="w-full btn-secondary flex items-center justify-center gap-2">
          {hasProject ? 'View Project' : 'Choose Project'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </Link>
    </div>
  );
}

// Helper to get IST time
const getISTTime = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + istOffset);
};

const formatISTTime = (date: Date) => {
  return date.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatISTDate = (date: Date) => {
  return date.toLocaleDateString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Check-In/Check-Out Component with AI Chat - Uses shared attendance functions
function CheckInOutWidget({ student, onUpdate }: { student: Student; onUpdate: () => void }) {
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatType, setChatType] = useState<'checkin' | 'checkout'>('checkin');
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  const [currentTask, setCurrentTask] = useState<{ id: string; title: string } | null>(null);
  const [projectContext, setProjectContext] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    fetchTodayAttendance();
    fetchCurrentTask();
  }, [student.id]);

  const fetchTodayAttendance = async () => {
    try {
      const today = getISTTime().toISOString().split('T')[0];
      const attendanceRef = doc(db, 'attendance', `${student.id}_${today}`);
      const attendanceSnap = await getDoc(attendanceRef);
      
      if (attendanceSnap.exists()) {
        setTodayAttendance({ id: attendanceSnap.id, ...attendanceSnap.data() });
      } else {
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current task from project tasks
  const fetchCurrentTask = async () => {
    try {
      // First try to get in-progress tasks
      const tasksQuery = query(
        collection(db, 'projectTasks'),
        where('studentId', '==', student.id),
        where('status', '==', 'in-progress')
      );
      const tasksSnap = await getDocs(tasksQuery);
      
      if (!tasksSnap.empty) {
        const task = tasksSnap.docs[0];
        setCurrentTask({ id: task.id, title: task.data().title });
        return;
      }

      // If no in-progress, get first todo task
      const todoQuery = query(
        collection(db, 'projectTasks'),
        where('studentId', '==', student.id),
        where('status', '==', 'todo'),
        orderBy('order', 'asc'),
        limit(1)
      );
      const todoSnap = await getDocs(todoQuery);
      
      if (!todoSnap.empty) {
        const task = todoSnap.docs[0];
        setCurrentTask({ id: task.id, title: task.data().title });
      }
    } catch (error) {
      console.error('Error fetching current task:', error);
    }
  };

  // Fetch project context
  const fetchProjectContext = async () => {
    if (student.projectAssignment || student.appliedProblemStatementId) {
      const projectId = typeof student.projectAssignment === 'string' 
        ? student.projectAssignment 
        : (student.projectAssignment as any)?.problemStatementId || student.appliedProblemStatementId;
      
      if (projectId && typeof projectId === 'string') {
        try {
          const projectRef = doc(db, 'problemStatements', projectId);
          const projectSnap = await getDoc(projectRef);
          if (projectSnap.exists()) {
            const data = projectSnap.data();
            setProjectContext({ title: data.title, description: data.description || '' });
            return { title: data.title, description: data.description || '' };
          }
        } catch (e) {}
      }
    }
    return null;
  };

  const startCheckIn = async () => {
    // Fetch project context for better AI interaction
    const projCtx = await fetchProjectContext();
    
    const taskInfo = currentTask ? `Your current task: "${currentTask.title}". ` : '';
    const projectInfo = projCtx ? `You're working on: ${projCtx.title}. ` : '';

    setChatType('checkin');
    setShowAIChat(true);
    setAiMessages([{
      role: 'assistant',
      content: `Good morning, ${student.name?.split(' ')[0] || 'there'}! 🌅 ${projectInfo}${taskInfo}What's your plan for today? What specific goals do you want to accomplish?`
    }]);
  };

  const startCheckOut = async () => {
    const projCtx = await fetchProjectContext();
    const taskInfo = currentTask ? `You were working on: "${currentTask.title}". ` : '';
    
    setChatType('checkout');
    setShowAIChat(true);
    setAiMessages([{
      role: 'assistant',
      content: `Hey ${student.name?.split(' ')[0] || 'there'}! 🌙 ${taskInfo}How did your day go? What progress did you make? Any blockers or challenges?`
    }]);
  };

  const handleAISend = async () => {
    if (!userInput.trim() || aiLoading) return;

    const newMessages = [...aiMessages, { role: 'user', content: userInput }];
    setAiMessages(newMessages);
    setUserInput('');
    setAiLoading(true);

    try {
      // Use cached project context or build from fetched data
      const projCtxStr = projectContext 
        ? `Current Project: ${projectContext.title}. Description: ${projectContext.description}` 
        : '';
      const taskInfo = currentTask ? `Current task: "${currentTask.title}". ` : '';

      const systemPrompt = chatType === 'checkin' 
        ? `You are a friendly AI co-pilot at Marlion Technologies, helping build tech for neurodiverse children. 
           ${projCtxStr}
           ${taskInfo}
           Student: ${student.name}, Stream: ${student.chosenStream}
           
           The student is checking in. Be warm and supportive - you're a friend, not a supervisor.
           Ask about their specific goals for today. Keep responses under 50 words.`
        : `You are a friendly AI co-pilot at Marlion Technologies, helping build tech for neurodiverse children.
           ${projCtxStr}
           ${taskInfo}
           Student: ${student.name}, Stream: ${student.chosenStream}
           
           The student is checking out. Celebrate their efforts, ask about progress and blockers.
           Keep responses under 50 words.`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          systemPrompt
        })
      });

      const data = await response.json();
      
      // Check if conversation should end (after 2 user messages)
      const userMsgCount = newMessages.filter(m => m.role === 'user').length;
      const isEnding = userMsgCount >= 2;
      
      if (isEnding) {
        // Complete check-in/check-out
        await completeAttendance(newMessages, data.response);
        setAiMessages([...newMessages, { 
          role: 'assistant', 
          content: data.response + (chatType === 'checkin' 
            ? '\n\n✅ You\'re checked in! Have a productive day!' 
            : '\n\n✅ You\'re checked out! Great work today!')
        }]);
        setTimeout(() => {
          setShowAIChat(false);
          fetchTodayAttendance();
          onUpdate();
        }, 2000);
      } else {
        setAiMessages([...newMessages, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      console.error('Error with AI:', error);
      setAiMessages([...newMessages, { role: 'assistant', content: 'Let me note that down. Anything else?' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const completeAttendance = async (messages: any[], aiSummary: string) => {
    const today = getISTTime().toISOString().split('T')[0];
    const attendanceRef = doc(db, 'attendance', `${student.id}_${today}`);
    const istNow = getISTTime();

    // Check if already checked in/out today to prevent duplicates
    const existingSnap = await getDoc(attendanceRef);
    if (existingSnap.exists()) {
      const existing = existingSnap.data();
      if (chatType === 'checkin' && existing.checkInTime) {
        // Already checked in
        return;
      }
      if (chatType === 'checkout' && existing.checkOutTime) {
        // Already checked out
        return;
      }
    }

    if (chatType === 'checkin') {
      await setDoc(attendanceRef, {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        date: today,
        checkInTime: istNow.toISOString(),
        checkInTimeFormatted: formatISTTime(istNow),
        checkInConversation: messages,
        checkInSummary: aiSummary,
        checkInPlan: messages.filter(m => m.role === 'user').map(m => m.content).join(' '),
        currentTaskId: currentTask?.id || null,
        currentTaskTitle: currentTask?.title || null,
        status: 'checked_in',
        createdAt: serverTimestamp()
      });
    } else {
      await updateDoc(attendanceRef, {
        checkOutTime: istNow.toISOString(),
        checkOutTimeFormatted: formatISTTime(istNow),
        checkOutConversation: messages,
        checkOutSummary: aiSummary,
        checkOutProgress: messages.filter(m => m.role === 'user').map(m => m.content).join(' '),
        status: 'checked_out',
        updatedAt: serverTimestamp()
      });
    }

    // Update student's daily log count
    const updateData: any = {
      dailyLogsCount: (student.dailyLogsCount || 0) + 1
    };
    
    if (chatType === 'checkin') {
      updateData.lastCheckIn = istNow.toISOString();
    } else {
      updateData.lastCheckOut = istNow.toISOString();
    }
    
    await updateDoc(doc(db, 'students', student.id!), updateData);
  };

  const handleLeaveSubmit = async () => {
    if (!leaveDate || !leaveReason) return;

    try {
      await addDoc(collection(db, 'leaveRequests'), {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        date: leaveDate,
        reason: leaveReason,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setShowLeaveModal(false);
      setLeaveDate('');
      setLeaveReason('');
      alert('Leave request submitted successfully!');
    } catch (error) {
      console.error('Error submitting leave:', error);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-4 animate-pulse">
        <div className="h-20 bg-marlion-surface rounded"></div>
      </div>
    );
  }

  const isCheckedIn = todayAttendance?.status === 'checked_in';
  const isCheckedOut = todayAttendance?.status === 'checked_out';

  return (
    <>
      {/* Main Check-In/Out Card */}
      <div className="glass-card rounded-2xl p-4 md:p-6 bg-gradient-to-r from-marlion-primary/10 to-marlion-accent/10 border border-marlion-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isCheckedOut ? 'bg-emerald-500/20' : isCheckedIn ? 'bg-amber-500/20' : 'bg-marlion-primary/20'
            }`}>
              {isCheckedOut ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : isCheckedIn ? (
                <Coffee className="w-6 h-6 text-amber-400" />
              ) : (
                <Clock className="w-6 h-6 text-marlion-primary" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isCheckedOut ? 'Day Complete! 🎉' : isCheckedIn ? 'Currently Working' : 'Start Your Day'}
              </h3>
              <p className="text-sm text-slate-400">
                {isCheckedOut 
                  ? `Checked out at ${todayAttendance.checkOutTimeFormatted}`
                  : isCheckedIn 
                    ? `Checked in at ${todayAttendance.checkInTimeFormatted}`
                    : formatISTDate(getISTTime())
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isCheckedIn && !isCheckedOut && (
              <button
                onClick={startCheckIn}
                className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2 py-3 px-4"
              >
                <LogIn className="w-4 h-4" />
                Check In
              </button>
            )}
            {isCheckedIn && !isCheckedOut && (
              <button
                onClick={startCheckOut}
                className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Check Out
              </button>
            )}
            <button
              onClick={() => setShowLeaveModal(true)}
              className="btn-secondary py-3 px-4 flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Apply Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-marlion-primary/20 flex items-center justify-center">
                  {chatType === 'checkin' ? <LogIn className="w-5 h-5 text-marlion-primary" /> : <LogOut className="w-5 h-5 text-amber-400" />}
                </div>
                <div>
                  <h3 className="font-bold text-white">{chatType === 'checkin' ? 'Morning Check-In' : 'Evening Check-Out'}</h3>
                  <p className="text-xs text-slate-400">Chat with your AI Team Lead</p>
                </div>
              </div>
              <button onClick={() => setShowAIChat(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl ${
                    msg.role === 'user' 
                      ? 'bg-marlion-primary text-white' 
                      : 'bg-marlion-surface text-slate-300'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-marlion-surface p-3 rounded-xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAISend()}
                  placeholder="Type your response..."
                  className="flex-1 bg-marlion-surface text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-marlion-primary"
                />
                <button
                  onClick={handleAISend}
                  disabled={aiLoading || !userInput.trim()}
                  className="btn-primary px-4"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Apply for Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Leave Date</label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full bg-marlion-surface text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-marlion-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Reason</label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  rows={3}
                  placeholder="Briefly explain your reason..."
                  className="w-full bg-marlion-surface text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-marlion-primary resize-none"
                />
              </div>
              <button
                onClick={handleLeaveSubmit}
                disabled={!leaveDate || !leaveReason}
                className="w-full btn-primary py-3"
              >
                Submit Leave Request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Contextual Quick Action - shows what the student should do next
function QuickActionCard({ student }: { student: Student }) {
  const [bootcampComplete, setBootcampComplete] = useState(false);
  const [hasAppliedProject, setHasAppliedProject] = useState(false);
  const [hasApprovedProject, setHasApprovedProject] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProgress = async () => {
      try {
        // Check bootcamp completion
        const sectionsRef = collection(db, 'sections');
        const sectionsSnap = await getDocs(sectionsRef);
        const allSections = sectionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as { id: string; stream: string }[];

        const studentStreamNormalized = normalizeStream(student.chosenStream || '');
        
        const relevantSections = allSections.filter(s => {
          const sectionStream = s.stream?.toLowerCase().trim();
          const sectionStreamNormalized = normalizeStream(s.stream || '');
          return sectionStream === 'general' || 
                 sectionStreamNormalized === studentStreamNormalized ||
                 sectionStream === studentStreamNormalized.toLowerCase();
        });

        const modulesRef = collection(db, 'modules');
        const modulesSnap = await getDocs(modulesRef);
        const allModules = modulesSnap.docs.map(doc => ({
          id: doc.id,
          sectionId: doc.data().sectionId
        }));

        const relevantSectionIds = new Set(relevantSections.map(s => s.id));
        const totalModules = allModules.filter(m => relevantSectionIds.has(m.sectionId)).length;
        const completedModules = (typeof student.bootcampProgress === "object" && student.bootcampProgress?.completedModules) ? student.bootcampProgress.completedModules.length : 0;
        
        const isBootcampComplete = totalModules > 0 && completedModules >= totalModules;
        setBootcampComplete(isBootcampComplete);

        // Check project status - handle both string and object formats
        const projectAssignment = student.projectAssignment;
        const hasProject = projectAssignment && (
          typeof projectAssignment === 'string' 
            ? projectAssignment.length > 0 
            : Boolean((projectAssignment as any)?.problemStatementId)
        );
        
        if (hasProject) {
          setHasApprovedProject(true);
        } else if (student.appliedProblemStatementId) {
          setHasAppliedProject(true);
        }
      } catch (error) {
        console.error('Error checking progress:', error);
      } finally {
        setLoading(false);
      }
    };

    checkProgress();
  }, [student]);

  if (loading) return null;

  // Determine what the student should do next
  let actionText = '';
  let actionHref = '';
  let IconComponent = ArrowRight;

  if (!bootcampComplete) {
    actionText = 'Continue Bootcamp';
    actionHref = '/bootcamp';
    IconComponent = BookOpen;
  } else if (!hasAppliedProject && !hasApprovedProject) {
    actionText = 'Choose Your Project';
    actionHref = '/problem-statements';
    IconComponent = Lightbulb;
  } else if (hasAppliedProject && !hasApprovedProject) {
    actionText = 'Application Under Review';
    actionHref = '/problem-statements';
    IconComponent = Clock;
  } else if (hasApprovedProject) {
    actionText = 'Continue Project';
    actionHref = '/project-tracker';
    IconComponent = FolderKanban;
  }

  return (
    <Link href={actionHref}>
      <button className="bg-white text-marlion-bg font-bold py-3 px-6 rounded-xl hover:bg-slate-100 transition-all flex items-center gap-2">
        {actionText}
        <IconComponent className="w-4 h-4" />
      </button>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);

  const handleAttendanceUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.email) return;
      
      try {
        const [studentData, announcementsData] = await Promise.all([
          getStudentByEmail(user.email),
          getActiveAnnouncements(),
        ]);
        
        // If no student record, redirect to registration
        if (!studentData) {
          router.push('/register');
          return;
        }
        
        // If needs to complete interview, redirect there
        if (['registered', 'interview_pending'].includes(studentData.status)) {
          router.push('/interview');
          return;
        }
        
        setStudent(studentData);
        setAnnouncements(announcementsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-marlion-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Loading your profile...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-marlion-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  // Status-based UI rendering
  const renderStatusCard = () => {
    switch (student.status) {
      case 'interview_done':
        return (
          <div className="glass-card rounded-2xl p-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                  <Clock className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Interview Under Review</h2>
                  <p className="text-slate-400">Our team is evaluating your responses. Check back in 24 hours!</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'selected':
        return (
          <div className="glass-card rounded-2xl p-6 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-500/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">🎉 Congratulations!</h2>
                  <p className="text-slate-400">You've been selected for the internship!</p>
                </div>
              </div>
              <Link href="/offer">
                <button className="bg-white text-emerald-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-100 transition-all flex items-center gap-2">
                  View Offer Letter
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        );
        
      case 'rejected':
        return (
          <div className="glass-card rounded-2xl p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">
                Thank You for Your Interest
              </h2>
              <p className="text-slate-400 mb-4">
                Unfortunately, we were unable to offer you a position in this cohort. 
                We encourage you to apply again in future programs.
              </p>
              {student.aiInterviewSummary && (
                <div className="text-left p-4 glass-card rounded-xl">
                  <p className="text-sm font-medium text-slate-300 mb-2">Feedback:</p>
                  <p className="text-sm text-slate-400">{student.aiInterviewSummary}</p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'offer_downloaded':
      case 'active':
        return (
          <div className="glass-card rounded-2xl p-6 bg-gradient-to-r from-marlion-primary/20 to-marlion-accent/20 border-marlion-primary/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-marlion-primary/20 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-marlion-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Welcome to the Team! 🚀</h2>
                  <p className="text-slate-400">Continue your internship journey</p>
                </div>
              </div>
              <QuickActionCard student={student} />
            </div>
          </div>
        );
        
      case 'completed':
        return (
          <div className="glass-card rounded-2xl p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                  <Award className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Internship Completed! 🎓</h2>
                  <p className="text-slate-400">Congratulations on completing the program</p>
                </div>
              </div>
              <Link href="/certificate">
                <button className="bg-white text-purple-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-100 transition-all flex items-center gap-2">
                  Download Certificate
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banned Alert */}
      {student.status === 'banned' && (
        <div className="glass-card rounded-2xl p-6 bg-red-500/10 border-red-500/30">
          <h3 className="text-lg font-bold text-red-400 mb-2">Account Suspended</h3>
          <p className="text-slate-400">
            Your account has been suspended. Reason: {student.bannedReason || 'Policy violation'}
            <br />
            If you believe this is an error, please submit an appeal.
          </p>
        </div>
      )}

      {/* Check-In/Check-Out Widget - Prominent for active students */}
      {['offer_downloaded', 'active'].includes(student.status) && (
        <CheckInOutWidget student={student} onUpdate={handleAttendanceUpdate} />
      )}

      {/* Status-based Card */}
      {renderStatusCard()}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-marlion-primary/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-marlion-primary" />
            </div>
            <span className="text-sm text-slate-400">Internship Stream</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {normalizeStream(student.chosenStream || '') || 'Not selected'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-marlion-accent/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-marlion-accent" />
            </div>
            <span className="text-sm text-slate-400">Interview Score</span>
          </div>
          <p className="text-2xl font-bold text-white mb-2">
            {student.aiScore ? `${student.aiScore}/100` : 'Pending'}
          </p>
          {student.aiScore && (
            <div className="h-2 bg-marlion-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-marlion-primary to-marlion-accent"
                style={{ width: `${student.aiScore}%` }}
              />
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm text-slate-400">Status</span>
          </div>
          <Badge 
            variant={
              student.status === 'active' || student.status === 'selected' ? 'success' :
              student.status === 'rejected' || student.status === 'banned' ? 'destructive' :
              student.status === 'completed' ? 'default' : 'secondary'
            }
            className="text-sm"
          >
            {student.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Announcements</h3>
          </div>
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 rounded-xl bg-marlion-surface border-l-4 border-marlion-primary"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white">
                      {announcement.title}
                    </h4>
                    <p className="text-slate-400 mt-1 text-sm">
                      {announcement.message}
                    </p>
                  </div>
                  <Badge variant={announcement.priority === 'high' ? 'destructive' : 'secondary'}>
                    {announcement.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links - Only show for active students */}
      {['offer_downloaded', 'active', 'completed'].includes(student.status) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BootcampTile student={student} />
          <ProjectTrackerTile student={student} />
        </div>
      )}

      {/* Interview Summary - Show for interview_done status */}
      {student.status === 'interview_done' && student.aiInterviewSummary && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Interview Summary</h3>
          <p className="text-slate-400">{student.aiInterviewSummary}</p>
        </div>
      )}

      {/* Community Widget - Show for active students */}
      {['offer_downloaded', 'active', 'completed'].includes(student.status) && (
        <CommunityWidget />
      )}
    </div>
  );
}

// Community Widget Component
function CommunityWidget() {
  const [featuredPosts, setFeaturedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const postsQuery = query(
      collection(db, 'communityPosts'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const posts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => !p.isHidden);
      setFeaturedPosts(posts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const POST_ICONS: Record<string, any> = {
    spotlight: Star,
    announcement: Bell,
    resource: BookOpen,
    work: Sparkles,
    help: MessageCircle,
    insight: Lightbulb
  };

  const POST_COLORS: Record<string, string> = {
    spotlight: 'from-yellow-500 to-orange-500',
    announcement: 'from-blue-500 to-cyan-500',
    resource: 'from-purple-500 to-pink-500',
    work: 'from-green-500 to-emerald-500',
    help: 'from-red-500 to-rose-500',
    insight: 'from-amber-500 to-yellow-500'
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-marlion-surface rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-marlion-surface rounded"></div>
            <div className="h-16 bg-marlion-surface rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 card-hover overflow-hidden relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-marlion-primary/5 via-transparent to-marlion-accent/5 pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-marlion-primary to-marlion-accent flex items-center justify-center shadow-lg shadow-marlion-primary/30">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Community Hub</h3>
              <p className="text-sm text-slate-400">Connect with fellow interns</p>
            </div>
          </div>
          <Link href="/community">
            <button className="text-marlion-primary hover:text-marlion-accent text-sm font-medium flex items-center gap-1 transition-colors">
              View All
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {featuredPosts.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm mb-3">No posts yet. Be the first to share!</p>
            <Link href="/community">
              <button className="btn-primary text-sm px-4 py-2">
                Start a Conversation
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {featuredPosts.map((post) => {
              const Icon = POST_ICONS[post.type] || MessageCircle;
              const gradient = POST_COLORS[post.type] || 'from-gray-500 to-gray-600';
              
              return (
                <Link key={post.id} href="/community">
                  <div className="p-3 rounded-xl bg-marlion-surface hover:bg-marlion-surface/80 transition-all cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white truncate">{post.title}</span>
                          {post.authorType === 'admin' && (
                            <span className="px-1.5 py-0.5 bg-marlion-primary/20 text-marlion-primary text-[10px] rounded-full flex-shrink-0">
                              Marlion
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{post.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Heart className="w-3 h-3" /> {post.likes?.length || 0}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MessageCircle className="w-3 h-3" /> {post.commentsCount || 0}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-marlion-primary transition-colors flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-marlion-primary/10 to-marlion-accent/10 border border-marlion-primary/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <Sparkles className="w-5 h-5 text-marlion-primary" />
              <span className="text-sm text-white">Share your work, ask questions, or help others!</span>
            </div>
            <Link href="/community">
              <button className="btn-primary text-sm px-4 py-2 whitespace-nowrap">
                Create Post
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
