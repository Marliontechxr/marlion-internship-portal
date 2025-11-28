'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@marlion/ui/providers';
import { getStudentByEmail } from '@marlion/lib/firestore';
import { 
  getISTTimeFromServer,
  formatISTDate,
  formatISTTime,
  getAttendanceSettings,
  getHolidays,
  getTodayAttendance,
  getStudentAttendance,
  getStudentLeaveRequests,
  getAttendanceSummary,
  checkInStudent,
  checkOutStudent,
  submitLeaveRequest,
  getCurrentTask,
  getAllStudentTasks,
  getTasksMovedToReviewDuringSession,
  isWithinCheckInWindow,
  isTooEarlyForCheckIn,
  isCheckInDeadlinePassed,
  isWithinCheckOutWindow,
  isWorkingDay,
  getGeolocation,
  DEFAULT_ATTENDANCE_SETTINGS
} from '@marlion/lib/attendance';
import type { Student, AttendanceRecord, LeaveRequest, Holiday, AttendanceSettings } from '@marlion/config/types';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Coffee,
  Send,
  X,
  CalendarDays,
  TrendingUp,
  Timer,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin
} from 'lucide-react';
import { db } from '@marlion/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function AttendancePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [istTime, setIstTime] = useState<Date | null>(null);
  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  
  // Check-in/out modal state
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatType, setChatType] = useState<'checkin' | 'checkout'>('checkin');
  const [aiMessages, setAiMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<{ id: string; title: string } | null>(null);
  const [allTasks, setAllTasks] = useState<{
    inProgress: Array<{ id: string; title: string }>;
    todo: Array<{ id: string; title: string }>;
    review: Array<{ id: string; title: string }>;
    done: Array<{ id: string; title: string }>;
  } | null>(null);
  const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [projectContext, setProjectContext] = useState<{ title: string; description: string } | null>(null);
  
  // Leave modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.email) {
      loadData();
    }
  }, [user?.email]);

  useEffect(() => {
    // Update IST time every second
    const updateTime = async () => {
      const ist = await getISTTimeFromServer();
      setIstTime(ist);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const loadData = async () => {
    try {
      const studentData = await getStudentByEmail(user!.email!);
      if (!studentData) return;
      setStudent(studentData);

      const [settingsData, holidaysData, todayData, historyData, leavesData, summaryData] = await Promise.all([
        getAttendanceSettings(),
        getHolidays(),
        getTodayAttendance(studentData.id!),
        getStudentAttendance(studentData.id!),
        getStudentLeaveRequests(studentData.id!),
        getAttendanceSummary(studentData.id!)
      ]);

      setSettings(settingsData);
      setHolidays(holidaysData);
      setTodayAttendance(todayData);
      setAttendanceHistory(historyData);
      setLeaveRequests(leavesData);
      setSummary(summaryData);

      // Get current task for check-in context
      const task = await getCurrentTask(studentData.id!);
      setCurrentTask(task);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startCheckIn = async () => {
    if (!student || !istTime) return;

    // Request geolocation
    const geo = await getGeolocation();
    setGeolocation(geo);

    // Fetch fresh current task and all tasks
    const [freshTask, tasks] = await Promise.all([
      getCurrentTask(student.id!),
      getAllStudentTasks(student.id!)
    ]);
    setCurrentTask(freshTask);
    setAllTasks(tasks);

    // Get project context
    let projectCtx: { title: string; description: string } | null = null;
    if (student.projectAssignment || student.appliedProblemStatementId) {
      const projectId = typeof student.projectAssignment === 'string' 
        ? student.projectAssignment 
        : student.appliedProblemStatementId;
      
      if (projectId) {
        try {
          const projectRef = doc(db, 'problemStatements', projectId);
          const projectSnap = await getDoc(projectRef);
          if (projectSnap.exists()) {
            const data = projectSnap.data();
            projectCtx = { title: data.title, description: data.description || '' };
            setProjectContext(projectCtx);
          }
        } catch (e) {}
      }
    }

    // Build task context for AI
    let taskContext = '';
    if (freshTask) {
      taskContext = `Current focus: "${freshTask.title}". `;
    }
    if (tasks.inProgress.length > 0) {
      taskContext += `In-progress: ${tasks.inProgress.map(t => t.title).join(', ')}. `;
    }
    if (tasks.todo.length > 0) {
      taskContext += `Upcoming: ${tasks.todo.slice(0, 3).map(t => t.title).join(', ')}${tasks.todo.length > 3 ? ` (+${tasks.todo.length - 3} more)` : ''}. `;
    }

    const projectInfo = projectCtx ? `Project: ${projectCtx.title}. ` : '';
    const locationNote = geo ? '📍 ' : '';

    setChatType('checkin');
    setShowAIChat(true);
    setAiMessages([{
      role: 'assistant',
      content: `Good morning, ${student.name?.split(' ')[0] || 'there'}! 🌅 ${locationNote}${projectInfo}${taskContext}\n\nWhat's your plan for today? What specific goals do you want to accomplish?`
    }]);
  };

  const startCheckOut = async () => {
    if (!student || !todayAttendance) return;

    // Request geolocation
    const geo = await getGeolocation();
    setGeolocation(geo);

    // Fetch all tasks for context
    const tasks = await getAllStudentTasks(student.id!);
    setAllTasks(tasks);

    // Check for tasks moved to review during session
    const tasksCompleted = await getTasksMovedToReviewDuringSession(
      student.id!,
      todayAttendance.checkInTime!
    );

    // Calculate time worked so far
    const checkInTime = new Date(todayAttendance.checkInTime!);
    const now = await getISTTimeFromServer();
    const minutesWorked = Math.round((now.getTime() - checkInTime.getTime()) / (1000 * 60));
    const hoursWorked = Math.floor(minutesWorked / 60);
    const minsRemainder = minutesWorked % 60;
    const timeInfo = `You've worked ${hoursWorked}h ${minsRemainder}m today. `;

    // Build task context
    let inProgressTasks = tasks.inProgress.map(t => t.title).join(', ') || 'None';
    
    const locationNote = geo ? '📍 ' : '';
    let contextMessage = '';
    
    if (tasksCompleted.length > 0) {
      contextMessage = `${locationNote}${timeInfo}Great work! I see you moved "${tasksCompleted[0].title}" to review. How did you approach this task? What was your solution?`;
    } else if (tasks.inProgress.length > 0) {
      contextMessage = `${locationNote}${timeInfo}Hey ${student.name?.split(' ')[0] || 'there'}! 🌙 How did your work on "${tasks.inProgress[0].title}" go today? What progress did you make? Any blockers?`;
    } else if (todayAttendance.currentTaskTitle) {
      contextMessage = `${locationNote}${timeInfo}Hey ${student.name?.split(' ')[0] || 'there'}! 🌙 How did your work on "${todayAttendance.currentTaskTitle}" go today? What progress did you make? Any blockers?`;
    } else {
      contextMessage = `${locationNote}${timeInfo}Hey ${student.name?.split(' ')[0] || 'there'}! 🌙 How did your day go? What progress did you make? Any blockers or challenges?`;
    }

    setChatType('checkout');
    setShowAIChat(true);
    setAiMessages([{
      role: 'assistant',
      content: contextMessage
    }]);
  };

  const handleAISend = async () => {
    if (!userInput.trim() || aiLoading || !student) return;

    const newMessages = [...aiMessages, { role: 'user', content: userInput }];
    setAiMessages(newMessages);
    setUserInput('');
    setAiLoading(true);

    try {
      // Use cached project context or fetch fresh
      let projectCtxStr = '';
      if (projectContext) {
        projectCtxStr = `Current Project: ${projectContext.title}. Description: ${projectContext.description}`;
      } else if (student.projectAssignment || student.appliedProblemStatementId) {
        const projectId = typeof student.projectAssignment === 'string' 
          ? student.projectAssignment 
          : student.appliedProblemStatementId;
        
        if (projectId) {
          try {
            const projectRef = doc(db, 'problemStatements', projectId);
            const projectSnap = await getDoc(projectRef);
            if (projectSnap.exists()) {
              projectCtxStr = `Current Project: ${projectSnap.data().title}. Description: ${projectSnap.data().description}`;
            }
          } catch (e) {}
        }
      }

      // Build comprehensive task context
      let taskContextStr = '';
      if (allTasks) {
        if (allTasks.inProgress.length > 0) {
          taskContextStr += `Tasks IN PROGRESS: ${allTasks.inProgress.map(t => t.title).join(', ')}. `;
        }
        if (allTasks.todo.length > 0) {
          taskContextStr += `Tasks TO DO: ${allTasks.todo.map(t => t.title).join(', ')}. `;
        }
        if (allTasks.review.length > 0) {
          taskContextStr += `Tasks UNDER REVIEW: ${allTasks.review.map(t => t.title).join(', ')}. `;
        }
        if (allTasks.done.length > 0) {
          taskContextStr += `Completed tasks: ${allTasks.done.length}. `;
        }
      }
      const taskInfo = currentTask ? `Current focus task: "${currentTask.title}". ` : '';
      const attendanceInfo = todayAttendance?.checkInPlan ? `Their morning plan was: "${todayAttendance.checkInPlan}". ` : '';

      const systemPrompt = chatType === 'checkin' 
        ? `You are a friendly AI co-pilot at Marlion Technologies, like a supportive teammate helping build tech for neurodiverse children. 
           ${projectCtxStr}
           ${taskContextStr}
           ${taskInfo}
           Student: ${student.name}, Stream: ${student.chosenStream}
           
           The student is checking in for the day. Your goal is to understand their plan.
           - Reference their SPECIFIC tasks by name when discussing plans
           - Be warm, encouraging, and supportive - you're a friend, not a supervisor
           - Ask about specific goals related to their actual tasks
           - If they mention blockers, offer helpful suggestions
           - Keep responses concise and natural (under 60 words)
           - After 2 exchanges, summarize their plan briefly and wish them a productive day`
        : `You are a friendly AI co-pilot at Marlion Technologies, helping build tech for neurodiverse children.
           ${projectCtxStr}
           ${taskContextStr}
           ${taskInfo}
           ${attendanceInfo}
           Student: ${student.name}, Stream: ${student.chosenStream}
           
           The student is checking out for the day. Your goal is to capture their progress.
           - Reference their SPECIFIC tasks by name when asking about progress
           - Celebrate their wins and acknowledge their efforts genuinely
           - Ask about what they accomplished and the approach they took
           - If they mention blockers, acknowledge them supportively
           - Ask about estimated time to completion if relevant
           - Keep responses concise and natural (under 60 words)
           - After 2 exchanges, summarize their progress briefly and wish them well`;

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
      const userMessageCount = newMessages.filter(m => m.role === 'user').length;
      const isEnding = userMessageCount >= 2;
      
      if (isEnding) {
        // Complete check-in/check-out
        if (chatType === 'checkin') {
          const result = await checkInStudent(
            student,
            userInput, // last message as plan summary
            currentTask || undefined,
            newMessages,
            geolocation
          );
          
          if (result.success) {
            const locationInfo = geolocation ? ' 📍' : '';
            setAiMessages([...newMessages, { 
              role: 'assistant', 
              content: data.response + `\n\n✅ You\'re checked in!${locationInfo} Have a productive day! 🚀`
            }]);
            setTimeout(() => {
              setShowAIChat(false);
              loadData();
            }, 2000);
          } else {
            setAiMessages([...newMessages, { 
              role: 'assistant', 
              content: `❌ ${result.message}`
            }]);
          }
        } else {
          // Get tasks completed during session
          const tasksCompleted = todayAttendance?.checkInTime 
            ? await getTasksMovedToReviewDuringSession(student.id!, todayAttendance.checkInTime)
            : [];
          
          const result = await checkOutStudent(
            student,
            userInput, // last message as progress summary
            '', // blockers - empty string instead of undefined
            tasksCompleted.map(t => t.id),
            newMessages,
            geolocation
          );
          
          if (result.success) {
            const locationInfo = geolocation ? ' 📍' : '';
            let message = data.response + `\n\n✅ You\'re checked out!${locationInfo} Great work today! 🎉`;
            if (result.warning) {
              message += `\n\n⚠️ ${result.warning}`;
            }
            setAiMessages([...newMessages, { role: 'assistant', content: message }]);
            setTimeout(() => {
              setShowAIChat(false);
              loadData();
            }, 2000);
          } else {
            setAiMessages([...newMessages, { 
              role: 'assistant', 
              content: `❌ ${result.message}`
            }]);
          }
        }
      } else {
        setAiMessages([...newMessages, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      console.error('Error with AI:', error);
      setAiMessages([...newMessages, { 
        role: 'assistant', 
        content: 'I\'m having trouble processing that. Could you try again?' 
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLeaveSubmit = async () => {
    if (!student || !leaveDate || !leaveReason) return;
    
    setSubmittingLeave(true);
    try {
      const result = await submitLeaveRequest(student, leaveDate, leaveReason);
      if (result.success) {
        setShowLeaveModal(false);
        setLeaveDate('');
        setLeaveReason('');
        loadData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error submitting leave:', error);
    } finally {
      setSubmittingLeave(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_out':
        return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">Present</span>;
      case 'checked_in':
        return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs">Working</span>;
      case 'absent':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">Absent</span>;
      case 'leave':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Leave</span>;
      case 'holiday':
        return <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">Holiday</span>;
      default:
        return null;
    }
  };

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">Rejected</span>;
      default:
        return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs">Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-marlion-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-400">Student not found</p>
      </div>
    );
  }

  const isCheckedIn = todayAttendance?.status === 'checked_in';
  const isCheckedOut = todayAttendance?.status === 'checked_out';
  const isAbsent = todayAttendance?.status === 'absent';
  const isOnLeave = todayAttendance?.status === 'leave';
  const isHoliday = istTime && !isWorkingDay(istTime, holidays, settings);

  const canCheckIn = istTime && !isCheckedIn && !isCheckedOut && !isAbsent && !isOnLeave && !isHoliday && 
    isWithinCheckInWindow(istTime, settings);
  const canCheckOut = isCheckedIn && istTime && isWithinCheckOutWindow(istTime, settings);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance</h1>
          <p className="text-slate-400">Track your daily check-ins, check-outs, and leaves</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2">
            <Clock className="w-4 h-4 text-marlion-primary" />
            <span className="text-white font-mono">
              {istTime ? formatISTTime(istTime) : '--:--'} IST
            </span>
          </div>
          <button
            onClick={() => setShowLeaveModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* Today's Status Card */}
      <div className="glass-card rounded-2xl p-6 bg-gradient-to-r from-marlion-primary/10 to-marlion-accent/10 border border-marlion-primary/20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isCheckedOut ? 'bg-emerald-500/20' : 
              isCheckedIn ? 'bg-amber-500/20' : 
              isAbsent ? 'bg-red-500/20' :
              isOnLeave ? 'bg-blue-500/20' :
              isHoliday ? 'bg-purple-500/20' :
              'bg-marlion-primary/20'
            }`}>
              {isCheckedOut ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> :
               isCheckedIn ? <Coffee className="w-8 h-8 text-amber-400" /> :
               isAbsent ? <XCircle className="w-8 h-8 text-red-400" /> :
               isOnLeave ? <CalendarDays className="w-8 h-8 text-blue-400" /> :
               isHoliday ? <CalendarDays className="w-8 h-8 text-purple-400" /> :
               <Clock className="w-8 h-8 text-marlion-primary" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isCheckedOut ? 'Day Complete! 🎉' :
                 isCheckedIn ? 'Currently Working' :
                 isAbsent ? 'Marked Absent' :
                 isOnLeave ? 'On Leave' :
                 isHoliday ? 'Holiday' :
                 'Start Your Day'}
              </h2>
              <p className="text-slate-400">
                {istTime ? formatISTDate(istTime) : ''} • 
                {isCheckedIn && todayAttendance?.checkInTimeFormatted 
                  ? ` Checked in at ${todayAttendance.checkInTimeFormatted}` 
                  : isCheckedOut && todayAttendance?.checkOutTimeFormatted
                    ? ` Checked out at ${todayAttendance.checkOutTimeFormatted}`
                    : istTime && isTooEarlyForCheckIn(istTime, settings)
                      ? ` Check-in opens at ${settings.checkInStartTime}`
                      : istTime && isCheckInDeadlinePassed(istTime, settings)
                        ? ' Check-in deadline passed'
                        : ' Ready to check in'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {canCheckIn && (
              <button
                onClick={startCheckIn}
                className="btn-primary flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Check In
              </button>
            )}
            {canCheckOut && (
              <button
                onClick={startCheckOut}
                className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <LogOut className="w-4 h-4" />
                Check Out
              </button>
            )}
            {isCheckedOut && todayAttendance?.workDurationMinutes && (
              <div className="flex items-center gap-2 px-4 py-2 bg-marlion-surface rounded-xl">
                <Timer className="w-4 h-4 text-marlion-primary" />
                <span className="text-white font-medium">
                  {Math.floor(todayAttendance.workDurationMinutes / 60)}h {todayAttendance.workDurationMinutes % 60}m
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Warning messages */}
        {istTime && isTooEarlyForCheckIn(istTime, settings) && !isCheckedIn && !isCheckedOut && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 text-sm">
              Check-in opens at {settings.checkInStartTime}. Current time: {formatISTTime(istTime)}
            </span>
          </div>
        )}
        {istTime && isCheckInDeadlinePassed(istTime, settings) && !isCheckedIn && !isCheckedOut && !isAbsent && !isOnLeave && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">
              Check-in deadline ({settings.checkInEndTime}) has passed. Today will be marked absent.
            </span>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Present Days</p>
                <p className="text-xl font-bold text-white">{summary.presentDays}</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Absent Days</p>
                <p className="text-xl font-bold text-white">{summary.absentDays}</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Leave Days</p>
                <p className="text-xl font-bold text-white">{summary.leaveDays}</p>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-marlion-primary/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-marlion-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Attendance</p>
                <p className="text-xl font-bold text-white">{summary.attendancePercentage}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance History & Leave Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance History */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-marlion-border flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Attendance History</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const prev = new Date(y, m - 2, 1);
                  setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
                }}
                className="p-1 hover:bg-marlion-surface rounded"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
              <span className="text-sm text-slate-400">
                {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const next = new Date(y, m, 1);
                  setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
                }}
                className="p-1 hover:bg-marlion-surface rounded"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {attendanceHistory
              .filter(a => a.date.startsWith(selectedMonth))
              .map(record => (
                <div key={record.id} className="p-4 border-b border-marlion-border/50 hover:bg-marlion-surface/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {new Date(record.date).toLocaleDateString('en-IN', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: 'short' 
                      })}
                    </span>
                    {getStatusBadge(record.status)}
                  </div>
                  {record.status === 'checked_out' && (
                    <div className="text-sm text-slate-400 flex items-center gap-2">
                      <span>
                        {record.checkInTimeFormatted} - {record.checkOutTimeFormatted}
                        {record.workDurationMinutes && (
                          <span className="ml-2">
                            ({Math.floor(record.workDurationMinutes / 60)}h {record.workDurationMinutes % 60}m)
                          </span>
                        )}
                      </span>
                      {(record.checkInLocation || record.checkOutLocation) && (
                        <span title="Location tracked">
                          <MapPin className="w-3 h-3 text-marlion-primary" />
                        </span>
                      )}
                    </div>
                  )}
                  {record.status === 'checked_in' && (
                    <div className="text-sm text-slate-400">
                      Checked in at {record.checkInTimeFormatted}
                    </div>
                  )}
                  {record.absentReason && (
                    <div className="text-xs text-red-400 mt-1">
                      Reason: {record.absentReason.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
              ))}
            {attendanceHistory.filter(a => a.date.startsWith(selectedMonth)).length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No records for this month
              </div>
            )}
          </div>
        </div>

        {/* Leave Requests */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-marlion-border">
            <h3 className="text-lg font-bold text-white">Leave Requests</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {leaveRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No leave requests
              </div>
            ) : (
              leaveRequests.map(leave => (
                <div key={leave.id} className="p-4 border-b border-marlion-border/50 hover:bg-marlion-surface/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {new Date(leave.date).toLocaleDateString('en-IN', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    {getLeaveStatusBadge(leave.status)}
                  </div>
                  <p className="text-sm text-slate-400">{leave.reason}</p>
                  {leave.adminResponse && (
                    <p className="text-xs text-marlion-primary mt-1">Admin: {leave.adminResponse}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-marlion-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {chatType === 'checkin' ? '🌅 Daily Check-In' : '🌙 Daily Check-Out'}
              </h3>
              <button onClick={() => setShowAIChat(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-marlion-primary text-white rounded-br-md' 
                      : 'bg-marlion-surface text-slate-300 rounded-bl-md'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-marlion-surface rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-marlion-primary" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-marlion-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAISend()}
                  placeholder="Type your response..."
                  className="flex-1 px-4 py-2 bg-marlion-surface border border-marlion-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-marlion-primary"
                  disabled={aiLoading}
                />
                <button
                  onClick={handleAISend}
                  disabled={aiLoading || !userInput.trim()}
                  className="btn-primary p-2"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Apply for Leave</h3>
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
                  min={formatISTDate(new Date())}
                  className="w-full px-4 py-2 bg-marlion-surface border border-marlion-border rounded-xl text-white focus:outline-none focus:border-marlion-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Reason</label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Please provide a reason for your leave..."
                  rows={3}
                  className="w-full px-4 py-2 bg-marlion-surface border border-marlion-border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-marlion-primary resize-none"
                />
              </div>
              <button
                onClick={handleLeaveSubmit}
                disabled={!leaveDate || !leaveReason || submittingLeave}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {submittingLeave ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Submit Leave Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
