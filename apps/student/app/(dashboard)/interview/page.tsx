'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Progress, Spinner } from '@marlion/ui/components';
import { useAuth } from '@marlion/ui/providers';
import { getStudentByEmail, updateStudentStatus, saveInterview } from '@marlion/lib/firestore';
import type { Student, TranscriptEntry } from '@marlion/config/types';
import { Send, Clock, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Zap, TrendingUp, TrendingDown } from 'lucide-react';

const MAX_TIME_SECONDS = 10 * 60; // 10 minutes max
const CONSECUTIVE_POOR_THRESHOLD = 3; // 3 poor responses = early exit
const INTERVIEW_SESSION_KEY = 'marlion_interview_session';
const PASTE_WARNING_KEY = 'marlion_paste_warning_count';

interface InterviewSession {
  studentId: string;
  transcript: TranscriptEntry[];
  conversationHistory: Array<{role: string; content: string}>;
  turnCount: number;
  timeElapsed: number;
  startedAt: string;
  progressScore: number;
  consecutivePoor: number;
}

export default function InterviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string; content: string}>>([]);
  const [hasInterruptedSession, setHasInterruptedSession] = useState(false);
  const [savedSession, setSavedSession] = useState<InterviewSession | null>(null);
  const [pasteWarning, setPasteWarning] = useState(false);
  const [pasteWarningCount, setPasteWarningCount] = useState(0);
  const [isWrappingUp, setIsWrappingUp] = useState(false);
  const [progressScore, setProgressScore] = useState(50); // Start at 50%
  const [consecutivePoor, setConsecutivePoor] = useState(0);
  const [progressFlicker, setProgressFlicker] = useState(false);
  const [lastScoreChange, setLastScoreChange] = useState<'up' | 'down' | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInputRef = useRef<string>('');

  // Anti-cheat: Detect paste events
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    
    // Check if paste looks like AI-generated content (long text, formal structure)
    const looksLikeAI = pastedText.length > 100 || 
      /\b(firstly|secondly|furthermore|moreover|in conclusion|to summarize)\b/i.test(pastedText) ||
      (pastedText.split('\n').length > 3 && pastedText.length > 50);
    
    if (looksLikeAI) {
      e.preventDefault();
      const newCount = pasteWarningCount + 1;
      setPasteWarningCount(newCount);
      localStorage.setItem(PASTE_WARNING_KEY, String(newCount));
      
      if (newCount >= 2 && student) {
        // Ban the student
        await updateStudentStatus(student.id, 'banned', {
          bannedReason: 'Detected repeated copy-pasting of AI-generated responses during interview.'
        });
        router.push('/dashboard');
        return;
      }
      
      setPasteWarning(true);
      setTimeout(() => setPasteWarning(false), 5000);
    }
  }, [pasteWarningCount, student, router]);

  // Load paste warning count from storage
  useEffect(() => {
    const savedCount = localStorage.getItem(PASTE_WARNING_KEY);
    if (savedCount) {
      setPasteWarningCount(parseInt(savedCount, 10));
    }
  }, []);

  // Save session to localStorage whenever it changes
  const saveSessionToStorage = useCallback((session: Partial<InterviewSession>) => {
    if (!student?.id) return;
    const fullSession: InterviewSession = {
      studentId: student.id,
      transcript: session.transcript || transcript,
      conversationHistory: session.conversationHistory || conversationHistory,
      turnCount: session.turnCount ?? turnCount,
      timeElapsed: session.timeElapsed ?? timeElapsed,
      startedAt: session.startedAt || new Date().toISOString(),
      progressScore: session.progressScore ?? progressScore,
      consecutivePoor: session.consecutivePoor ?? consecutivePoor,
    };
    localStorage.setItem(INTERVIEW_SESSION_KEY, JSON.stringify(fullSession));
  }, [student?.id, transcript, conversationHistory, turnCount, timeElapsed, progressScore, consecutivePoor]);

  // Clear session from localStorage
  const clearSessionFromStorage = useCallback(() => {
    localStorage.removeItem(INTERVIEW_SESSION_KEY);
    localStorage.removeItem(PASTE_WARNING_KEY);
  }, []);

  // Check for interrupted session on load - but only after we know the student
  // Don't check here, let the student fetch handle it

  useEffect(() => {
    const fetchStudent = async () => {
      if (!user?.email) return;
      try {
        const studentData = await getStudentByEmail(user.email);
        setStudent(studentData);
        
        // Check if interview already done OR user is banned - both should block access
        if (studentData && ['interview_done', 'selected', 'rejected', 'active', 'completed', 'banned', 'offer_downloaded'].includes(studentData.status)) {
          setIsInterviewComplete(true);
          clearSessionFromStorage();
          setHasInterruptedSession(false);
          setSavedSession(null);
        } else if (studentData?.status === 'interview_pending') {
          // Only check for saved session if status is interview_pending
          // This means they started but didn't finish
          const savedData = localStorage.getItem(INTERVIEW_SESSION_KEY);
          if (savedData) {
            try {
              const session: InterviewSession = JSON.parse(savedData);
              // Verify session belongs to this student AND has actual progress
              if (session.studentId === studentData.id && 
                  session.transcript && 
                  session.transcript.length > 0 &&
                  session.turnCount > 0) {
                // Check if session is less than 30 minutes old
                const sessionAge = Date.now() - new Date(session.startedAt).getTime();
                if (sessionAge < 30 * 60 * 1000) { // 30 minutes
                  setHasInterruptedSession(true);
                  setSavedSession(session);
                } else {
                  // Session too old, clear it
                  clearSessionFromStorage();
                  setHasInterruptedSession(false);
                  setSavedSession(null);
                }
              } else {
                // Session doesn't match or has no progress, clear it
                clearSessionFromStorage();
                setHasInterruptedSession(false);
                setSavedSession(null);
              }
            } catch (e) {
              // Invalid JSON, clear it
              clearSessionFromStorage();
              setHasInterruptedSession(false);
              setSavedSession(null);
            }
          } else {
            // No saved session but status is interview_pending
            // This could be from a previous interrupted session that was cleared
            // Reset status to registered so they can start fresh
            setHasInterruptedSession(false);
            setSavedSession(null);
          }
        } else if (studentData?.status === 'registered') {
          // Fresh registration - clear any stale localStorage data
          clearSessionFromStorage();
          setHasInterruptedSession(false);
          setSavedSession(null);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [user, clearSessionFromStorage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Timeout tracking ref
  const timeoutTriggeredRef = useRef(false);

  useEffect(() => {
    if (isInterviewActive && !isInterviewComplete) {
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isInterviewActive, isInterviewComplete]);

  // Check for timeout and trigger completion
  useEffect(() => {
    if (timeElapsed >= MAX_TIME_SECONDS && isInterviewActive && !isInterviewComplete && !timeoutTriggeredRef.current && student) {
      timeoutTriggeredRef.current = true;
      // Trigger timeout completion
      (async () => {
        setIsProcessing(true);
        const finalTranscript = [...transcript, { 
          role: 'ai' as const, 
          content: "Time's up! Thanks for the conversation. Let me compile my notes...", 
          timestamp: new Date() 
        }];
        setTranscript(finalTranscript);
        
        // Inline complete logic for timeout
        try {
          const res = await fetch('/api/interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'evaluate', 
              stream: student.chosenStream,
              conversationHistory,
              studentName: student.name,
            }),
          });
          const data = await res.json();
          const evaluation = data.evaluation;
          
          await saveInterview(student.id, {
            studentId: student.id, 
            studentEmail: student.email, 
            transcript: finalTranscript,
            aiSummary: evaluation?.summary || '', 
            score: evaluation?.overallScore || 0,
            technicalDepth: evaluation?.technical_depth || '',
            empathyScore: evaluation?.empathy_score || '',
            cultureFit: evaluation?.culture_fit || '',
            keyObservation: evaluation?.key_observation || '',
            recommendation: evaluation?.recommendation || '',
            duration: timeElapsed, 
            completedAt: new Date(),
            exitReason: 'timeout',
          });
          
          await updateStudentStatus(student.id, 'interview_done', {
            aiInterviewSummary: evaluation?.summary, 
            aiScore: evaluation?.overallScore,
            aiRecommendation: evaluation?.recommendation,
          });
          
          clearSessionFromStorage();
          setIsInterviewComplete(true);
          setTranscript(prev => [...prev.slice(0, -1), { 
            role: 'ai', 
            content: `Thanks for the conversation, ${student.name}. Time's up but I've captured the essence. The team will review and you'll hear back within 24 hours. Good luck! 🚀`, 
            timestamp: new Date() 
          }]);
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setIsProcessing(false);
        }
      })();
    }
  }, [timeElapsed, isInterviewActive, isInterviewComplete, student, transcript, conversationHistory, clearSessionFromStorage]);

  // Save session whenever state changes during active interview
  useEffect(() => {
    if (isInterviewActive && !isInterviewComplete && student?.id && transcript.length > 0) {
      saveSessionToStorage({
        studentId: student.id,
        transcript,
        conversationHistory,
        turnCount,
        timeElapsed,
        progressScore,
        consecutivePoor,
      });
    }
  }, [isInterviewActive, isInterviewComplete, student?.id, transcript, conversationHistory, turnCount, timeElapsed, progressScore, consecutivePoor, saveSessionToStorage]);

  // Resume interrupted session
  const resumeInterview = () => {
    if (!savedSession || !student) return;
    
    // Restore session state
    setTranscript(savedSession.transcript.map(t => ({
      ...t,
      timestamp: new Date(t.timestamp)
    })));
    setConversationHistory(savedSession.conversationHistory);
    setTurnCount(savedSession.turnCount);
    setTimeElapsed(savedSession.timeElapsed);
    setProgressScore(savedSession.progressScore ?? 50);
    setConsecutivePoor(savedSession.consecutivePoor ?? 0);
    setIsInterviewActive(true);
    setHasInterruptedSession(false);
    setSavedSession(null);
  };

  // Start fresh interview (discard interrupted session)
  const startFreshInterview = async () => {
    clearSessionFromStorage();
    setHasInterruptedSession(false);
    setSavedSession(null);
    await startInterview();
  };

  const startInterview = async () => {
    if (!student) return;
    setIsInterviewActive(true);
    setIsProcessing(true);
    setProgressScore(50); // Reset progress
    setConsecutivePoor(0);
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'start', 
          stream: student.chosenStream,
          studentName: student.name,
          college: student.college,
        }),
      });
      const data = await res.json();
      const firstQuestion = data.question || "Tell me about yourself and why you're interested in this internship.";
      const initialTranscript = [{ role: 'ai' as const, content: firstQuestion, timestamp: new Date() }];
      const initialHistory = [{ role: 'assistant', content: firstQuestion }];
      
      setTranscript(initialTranscript);
      setConversationHistory(initialHistory);
      setTurnCount(1);
      
      // Save initial session
      saveSessionToStorage({
        studentId: student.id,
        transcript: initialTranscript,
        conversationHistory: initialHistory,
        turnCount: 1,
        timeElapsed: 0,
        startedAt: new Date().toISOString(),
        progressScore: 50,
        consecutivePoor: 0,
      });
      
      await updateStudentStatus(student.id, 'interview_pending');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing || !student) return;
    const userMessage = userInput.trim();
    setUserInput('');
    setIsProcessing(true);
    
    const newTranscript: TranscriptEntry[] = [...transcript, { role: 'student', content: userMessage, timestamp: new Date() }];
    setTranscript(newTranscript);
    
    const newHistory = [...conversationHistory, { role: 'user', content: userMessage }];
    setConversationHistory(newHistory);
    
    try {
      // If we're in wrap-up mode (AI already asked final question), complete after this response
      if (isWrappingUp) {
        await completeInterview(newTranscript, newHistory);
        return;
      }

      // Get AI's next response and score the user's response
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'next_question',
          stream: student.chosenStream,
          conversationHistory: newHistory,
          studentName: student.name,
          includeScoring: true, // Request scoring
        }),
      });
      const data = await res.json();
      const nextQuestion = data.question;
      const responseQuality = data.responseQuality || 'medium'; // 'excellent', 'good', 'medium', 'poor'
      
      // Update progress score based on response quality
      // Good answers: +12, Bad answers: -10 (as per requirements)
      let scoreChange = 0;
      let newConsecutivePoor = consecutivePoor;
      
      if (responseQuality === 'excellent') {
        scoreChange = 12 + Math.floor(Math.random() * 5); // +12-17
        newConsecutivePoor = 0;
        setLastScoreChange('up');
      } else if (responseQuality === 'good') {
        scoreChange = 8 + Math.floor(Math.random() * 5); // +8-12
        newConsecutivePoor = 0;
        setLastScoreChange('up');
      } else if (responseQuality === 'medium') {
        scoreChange = Math.random() > 0.5 ? 3 : -3; // slight fluctuation
        newConsecutivePoor = 0;
        setLastScoreChange(scoreChange > 0 ? 'up' : 'down');
      } else if (responseQuality === 'poor') {
        scoreChange = -(8 + Math.floor(Math.random() * 4)); // -8 to -12 (around -10)
        newConsecutivePoor = consecutivePoor + 1;
        setLastScoreChange('down');
      }
      
      const newProgressScore = Math.max(0, Math.min(100, progressScore + scoreChange));
      setProgressScore(newProgressScore);
      setConsecutivePoor(newConsecutivePoor);
      
      // Trigger flicker animation
      setProgressFlicker(true);
      setTimeout(() => setProgressFlicker(false), 600);
      
      // Check exit conditions - interview can end anytime based on progress
      // 1. Progress reached 100% - complete with success
      if (newProgressScore >= 100) {
        setTranscript([...newTranscript, { 
          role: 'ai', 
          content: "That's wonderful! I can really see your enthusiasm and potential. Let me wrap up my notes - the team will be excited to review your application! 🎉", 
          timestamp: new Date() 
        }]);
        await completeInterview(newTranscript, newHistory);
        return;
      }
      
      // 2. Three consecutive poor responses - early exit
      if (newConsecutivePoor >= CONSECUTIVE_POOR_THRESHOLD) {
        setTranscript([...newTranscript, { 
          role: 'ai', 
          content: "Thanks for chatting with me today! The team will review your application and get back to you soon.", 
          timestamp: new Date() 
        }]);
        await completeInterview(newTranscript, newHistory);
        return;
      }
      
      // 3. Progress dropped to 0 - bottom out
      if (newProgressScore <= 0) {
        setTranscript([...newTranscript, { 
          role: 'ai', 
          content: "Thanks for your time today! We'll be in touch with next steps.", 
          timestamp: new Date() 
        }]);
        await completeInterview(newTranscript, newHistory);
        return;
      }
      
      // Check if AI signaled end of interview
      if (nextQuestion.toLowerCase().includes("wrap this up") || 
          nextQuestion.toLowerCase().includes("got a good read") ||
          nextQuestion.toLowerCase().includes("one last") ||
          nextQuestion.toLowerCase().includes("final question")) {
        setTranscript([...newTranscript, { role: 'ai', content: nextQuestion, timestamp: new Date() }]);
        setConversationHistory([...newHistory, { role: 'assistant', content: nextQuestion }]);
        setTurnCount(prev => prev + 1);
        setIsWrappingUp(true); // Mark that next user response will complete interview
      } else {
        setTranscript([...newTranscript, { role: 'ai', content: nextQuestion, timestamp: new Date() }]);
        setConversationHistory([...newHistory, { role: 'assistant', content: nextQuestion }]);
        setTurnCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const completeInterview = async (finalTranscript: TranscriptEntry[], history: Array<{role: string; content: string}>, exitReason?: string) => {
    if (!student) return;
    try {
      setTranscript([...finalTranscript, { role: 'ai', content: "Alright, I think I've got a good sense of who you are. Give me a moment to wrap up my notes...", timestamp: new Date() }]);
      
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'evaluate', 
          stream: student.chosenStream,
          conversationHistory: history,
          studentName: student.name,
        }),
      });
      const data = await res.json();
      const evaluation = data.evaluation;
      
      // Determine exit reason for analytics
      const reason = exitReason || (progressScore >= 100 ? 'success_100' : consecutivePoor >= 3 ? 'poor_responses' : 'normal');
      
      // Save interview with all evaluation data (hidden from student)
      await saveInterview(student.id, {
        studentId: student.id, 
        studentEmail: student.email, 
        transcript: finalTranscript,
        aiSummary: evaluation?.summary || '', 
        score: evaluation?.overallScore || 0,
        technicalDepth: evaluation?.technical_depth || '',
        empathyScore: evaluation?.empathy_score || '',
        cultureFit: evaluation?.culture_fit || '',
        keyObservation: evaluation?.key_observation || '',
        recommendation: evaluation?.recommendation || '',
        duration: timeElapsed, 
        completedAt: new Date(),
        progressScore,
        exitReason: reason,
      });
      
      await updateStudentStatus(student.id, 'interview_done', {
        aiInterviewSummary: evaluation?.summary, 
        aiScore: evaluation?.overallScore,
        aiRecommendation: evaluation?.recommendation,
      });
      
      // Clear the session from storage on successful completion
      clearSessionFromStorage();
      
      setIsInterviewComplete(true);
      setTranscript(prev => [...prev.slice(0, -1), { 
        role: 'ai', 
        content: `Thanks for the conversation, ${student.name}. I've made my notes. The team will review your interview and you'll hear back within 24 hours. If you're a fit for our mission, we'll be in touch. Good luck! 🚀`, 
        timestamp: new Date() 
      }]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-marlion-primary"></div>
    </div>
  );

  // Show banned message if user is banned
  if (student?.status === 'banned') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-red-400">Account Suspended</h2>
          <p className="text-slate-400 mb-4">Your account has been suspended and you cannot access the interview.</p>
          <p className="text-sm text-slate-500 mb-6">Reason: {student.bannedReason || 'Policy violation'}</p>
          <button onClick={() => router.push('/dashboard')} className="btn-secondary">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  if (isInterviewComplete && !isInterviewActive) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-marlion-success/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-marlion-success" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Interview Completed</h2>
          <p className="text-slate-400 mb-6">Your interview has been submitted. Check back in 24 hours for results.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  // Show resume option if there's an interrupted session
  if (hasInterruptedSession && savedSession && !isInterviewActive) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-marlion-border">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <RefreshCw className="w-6 h-6 text-yellow-400" />
              Interview Session Found
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-5 rounded-xl">
              <h3 className="font-semibold mb-3 text-yellow-400">Your previous session was interrupted</h3>
              <p className="text-sm text-slate-400 mb-4">
                We found an incomplete interview session. You can resume where you left off or start fresh.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                <div>
                  <span className="text-slate-500">Energy Level:</span>{' '}
                  <span className="text-white">{savedSession.progressScore ?? 50}%</span>
                </div>
                <div>
                  <span className="text-slate-500">Time elapsed:</span>{' '}
                  <span className="text-white">{formatTime(savedSession.timeElapsed)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={resumeInterview} 
                className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Resume Interview
              </button>
              <button 
                onClick={startFreshInterview} 
                className="btn-secondary flex-1 py-4 text-lg"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInterviewActive) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-marlion-border">
            <h2 className="text-2xl font-bold text-white">AI Interview</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-marlion-primary/10 border border-marlion-primary/20 p-5 rounded-xl">
              <h3 className="font-semibold mb-3 text-white">Before You Begin:</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-marlion-primary">•</span>
                  This is a conversational AI interview with <strong className="text-white">Marlion</strong>, our Lead Architect
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-marlion-primary">•</span>
                  You've selected: <strong className="text-white">{student?.chosenStream?.replace('-', ' ').replace('ar-vr', 'Immersive Tech (AR/VR)').replace('agentic-ai', 'Agentic AI').replace('data-science', 'Data Science').replace('fullstack', 'Full Stack')}</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-marlion-primary">•</span>
                  Be yourself - Marlion wants to understand your thinking, not test your syntax
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-marlion-primary">•</span>
                  It's okay to say "I don't know" - curiosity matters more than memorized answers
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-marlion-primary">•</span>
                  Remember: We build tech for neurodiverse children - the mission matters
                </li>
              </ul>
            </div>
            <button onClick={startInterview} className="btn-primary w-full py-4 text-lg">Start Interview</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="glass-card rounded-2xl h-[calc(100vh-200px)] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-marlion-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">AI Interview with Marlion</h2>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center text-sm ${timeElapsed >= MAX_TIME_SECONDS - 60 ? 'text-red-400' : 'text-slate-400'}`}>
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(timeElapsed)}
              {timeElapsed >= MAX_TIME_SECONDS - 60 && <span className="ml-1 text-xs">(ending soon)</span>}
            </div>
            <div className="px-3 py-1 rounded-full bg-marlion-primary/20 text-marlion-primary text-xs font-medium">
              Live Conversation
            </div>
          </div>
        </div>
        
        {/* Dynamic Progress Meter */}
        <div className="px-4 py-3 border-b border-marlion-border bg-marlion-surface/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Zap className={`w-4 h-4 ${progressScore >= 70 ? 'text-green-400' : progressScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`} />
              <span className="text-xs text-slate-400">Interview Energy</span>
            </div>
            <div className="flex-1 relative">
              <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    progressFlicker ? 'animate-pulse' : ''
                  } ${
                    progressScore >= 70 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                      : progressScore >= 40 
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-400' 
                        : 'bg-gradient-to-r from-red-500 to-orange-500'
                  }`}
                  style={{ width: `${progressScore}%` }}
                />
              </div>
              {/* Animated particles */}
              {progressFlicker && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`absolute ${lastScoreChange === 'up' ? 'animate-ping' : ''}`}>
                    {lastScoreChange === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
              )}
            </div>
            <span className={`text-sm font-bold min-w-[3rem] text-right ${
              progressScore >= 70 ? 'text-green-400' : progressScore >= 40 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {progressScore}%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5 text-center">
            {progressScore >= 80 
              ? "🔥 Outstanding! You're doing great!" 
              : progressScore >= 60 
                ? "👍 Good momentum - keep sharing your experiences!" 
                : progressScore >= 40 
                  ? "💭 Stay curious and genuine - that's what matters here"
                  : "⚡ Tell us more about yourself and what you've worked on"}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {transcript.map((entry, i) => (
            <div key={i} className={`flex ${entry.role === 'student' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                entry.role === 'student' 
                  ? 'bg-gradient-to-r from-marlion-primary to-blue-600 text-white' 
                  : 'bg-marlion-surface border border-marlion-border text-slate-300'
              }`}>
                {entry.content}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-marlion-surface border border-marlion-border rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-marlion-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-marlion-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-marlion-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        
        {/* Paste Warning */}
        {pasteWarning && (
          <div className="mx-4 mb-2 p-3 bg-red-500/20 border border-red-500/40 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium text-sm">Warning: Copy-Paste Detected</p>
              <p className="text-red-300/80 text-xs mt-1">
                If you mindlessly copy-paste AI-generated responses instead of explaining yourself, 
                we would rather work with the AI directly. This is your {pasteWarningCount === 1 ? 'first' : 'FINAL'} warning.
              </p>
            </div>
          </div>
        )}
        
        <div className="border-t border-marlion-border p-4">
          <div className="flex space-x-3">
            <input 
              type="text" 
              className="flex-1 input-marlion" 
              placeholder="Type your response..." 
              value={userInput} 
              onChange={(e) => setUserInput(e.target.value)} 
              onPaste={handlePaste}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} 
              disabled={isProcessing || isInterviewComplete} 
            />
            <button 
              onClick={handleSendMessage} 
              disabled={isProcessing || !userInput.trim() || isInterviewComplete}
              className="btn-primary px-4 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
