'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Spinner } from '@marlion/ui/components';
import { useAuth } from '@marlion/ui/providers';
import { getStudentByEmail, updateDocument } from '@marlion/lib/firestore';
import { db } from '@marlion/config/firebase';
import { collection, getDocs, doc, getDoc, addDoc, query, where, orderBy, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { Student, BootcampProgress } from '@marlion/config/types';
import { Play, Pause, CheckCircle2, MessageSquare, Send, Bot, X, BookOpen, AlertCircle, Trash2, User } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Section {
  id: string;
  title: string;
  stream: string;
  order: number;
  createdAt: Date;
}

interface Module {
  id: string;
  sectionId: string;
  title: string;
  youtubeUrl: string;
  transcript: string;
  objectives: string;
  duration: number;
  order: number;
}

interface VideoComment {
  id: string;
  moduleId: string;
  authorId: string;
  authorName: string;
  authorType: 'admin' | 'student';
  content: string;
  createdAt: any;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function BootcampContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleId = searchParams.get('module');
  
  const [student, setStudent] = useState<Student | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [showAIOverlay, setShowAIOverlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Video progress state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState<{ passed: boolean; feedback: string } | null>(null);
  const [quizAttempts, setQuizAttempts] = useState(0);
  
  // Comments state
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Get saved video progress for a module (user-specific)
  const getSavedProgress = useCallback((moduleId: string): number => {
    if (typeof window === 'undefined' || !student?.id) return 0;
    // Use user-specific key to prevent cross-user contamination
    const saved = localStorage.getItem(`video_progress_${student.id}_${moduleId}`);
    return saved ? parseFloat(saved) : 0;
  }, [student?.id]);

  // Save video progress (user-specific, both local and Firebase)
  const saveVideoProgress = useCallback(async (moduleId: string, time: number) => {
    if (typeof window === 'undefined' || !student?.id) return;
    // Use user-specific key
    localStorage.setItem(`video_progress_${student.id}_${moduleId}`, time.toString());
    
    // Also save to Firebase for cross-device sync (debounced - only save significant changes)
    try {
      const progressRef = doc(db, 'students', student.id, 'videoProgress', moduleId);
      await updateDocument('students', student.id, {
        [`videoProgress.${moduleId}`]: {
          time,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      // Silent fail for Firebase sync - localStorage is primary
      console.debug('Video progress sync failed:', error);
    }
  }, [student?.id]);

  // Load video progress from Firebase on mount (for cross-device sync)
  useEffect(() => {
    const loadCloudProgress = async () => {
      if (!student?.id) return;
      try {
        const studentDoc = await getDoc(doc(db, 'students', student.id));
        const data = studentDoc.data();
        if (data?.videoProgress) {
          // Sync cloud progress to localStorage (cloud is source of truth)
          Object.entries(data.videoProgress).forEach(([modId, progress]: [string, any]) => {
            const localKey = `video_progress_${student.id}_${modId}`;
            const localTime = parseFloat(localStorage.getItem(localKey) || '0');
            // Only update if cloud has more progress
            if (progress.time > localTime) {
              localStorage.setItem(localKey, progress.time.toString());
            }
          });
        }
      } catch (error) {
        console.debug('Failed to load cloud progress:', error);
      }
    };
    loadCloudProgress();
  }, [student?.id]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.email) return;
      
      try {
        const studentData = await getStudentByEmail(user.email);
        setStudent(studentData);
        
        if (studentData) {
          // Map student's stream values to admin's section stream values
          const streamMapping: { [key: string]: string } = {
            'ar-vr': 'ar-vr',
            'fullstack': 'fullstack',
            'agentic-ai': 'agentic-ai',
            'data-science': 'data-science',
          };
          
          const sectionsRef = collection(db, 'sections');
          const sectionsSnap = await getDocs(sectionsRef);
          const allSectionsData = sectionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Section[];
          
          const studentStreamRaw = studentData.chosenStream?.toLowerCase().trim() || '';
          const mappedStream = streamMapping[studentStreamRaw] || studentStreamRaw;
          
          const sectionsData = allSectionsData.filter(s => {
            const sectionStream = s.stream?.toLowerCase().trim();
            return sectionStream === 'general' || sectionStream === mappedStream;
          });
          sectionsData.sort((a, b) => (a.order || 0) - (b.order || 0));
          setSections(sectionsData);
          
          const modulesRef = collection(db, 'modules');
          const modulesSnap = await getDocs(modulesRef);
          const allModulesData = modulesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Module[];
          setAllModules(allModulesData);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Handle module selection from URL
  useEffect(() => {
    if (moduleId && allModules.length > 0 && sections.length > 0) {
      const module = allModules.find(m => m.id === moduleId);
      if (module) {
        setSelectedModule(module);
        const section = sections.find(s => s.id === module.sectionId);
        setCurrentSection(section || null);
      }
    } else if (!moduleId && allModules.length > 0 && sections.length > 0 && student) {
      // Auto-select first unlocked incomplete module
      const progress = student.bootcampProgress;
      const completedModules = (typeof progress === 'object' && progress?.completedModules) ? progress.completedModules : [];
      
      for (const section of sections) {
        const sectionModules = allModules
          .filter(m => m.sectionId === section.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        for (let i = 0; i < sectionModules.length; i++) {
          const mod = sectionModules[i];
          const isCompleted = completedModules.includes(mod.id);
          const isUnlocked = i === 0 || completedModules.includes(sectionModules[i-1]?.id);
          
          if (isUnlocked && !isCompleted) {
            router.replace(`/bootcamp?module=${mod.id}`);
            return;
          }
        }
      }
      
      // If all completed, select first module
      if (sections.length > 0) {
        const firstSectionModules = allModules
          .filter(m => m.sectionId === sections[0].id)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        if (firstSectionModules.length > 0) {
          router.replace(`/bootcamp?module=${firstSectionModules[0].id}`);
        }
      }
    }
  }, [moduleId, allModules, sections, student, router]);

  const getModulesForSection = (sectionId: string) => {
    return allModules
      .filter(m => m.sectionId === sectionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const isModuleCompleted = (moduleId: string) => {
    const progress = student?.bootcampProgress;
    const completedModules = (typeof progress === 'object' && progress?.completedModules) ? progress.completedModules : [];
    return completedModules.includes(moduleId);
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : '';
  };

  // Refs to hold current values for use inside player callbacks
  const selectedModuleRef = useRef<Module | null>(null);
  const studentIdRef = useRef<string | null>(null);
  const studentRef = useRef<Student | null>(null);
  const durationRef = useRef<number>(0);
  const triggerQuizRef = useRef<(() => void) | null>(null);
  const quizTriggeredRef = useRef<boolean>(false); // Prevent double triggering
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedModuleRef.current = selectedModule;
    quizTriggeredRef.current = false; // Reset when module changes
  }, [selectedModule]);
  
  useEffect(() => {
    studentIdRef.current = student?.id || null;
    studentRef.current = student;
  }, [student]);
  
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const initPlayer = useCallback((videoId: string, moduleId: string, studentId: string | null) => {
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
      playerRef.current = null;
    }
    setIsPlayerReady(false);
    setIsPlaying(false);

    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Wait for YouTube API to be ready
    const checkReady = setInterval(() => {
      if (window.YT?.Player && playerContainerRef.current) {
        clearInterval(checkReady);
        
        // Create fresh container
        playerContainerRef.current.innerHTML = '<div id="yt-player" style="width:100%;height:100%;"></div>';
        
        // Get saved progress for this specific module and user
        const savedTime = studentId && moduleId 
          ? parseFloat(localStorage.getItem(`video_progress_${studentId}_${moduleId}`) || '0')
          : 0;
        
        try {
          playerRef.current = new window.YT.Player('yt-player', {
            videoId,
            width: '100%',
            height: '100%',
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              modestbranding: 1,
              rel: 0,
              fs: 0,
              iv_load_policy: 3,
              showinfo: 0,
              start: Math.floor(savedTime),
              origin: window.location.origin,
            },
            events: {
              onReady: (event: any) => {
                const videoDuration = event.target.getDuration();
                setDuration(videoDuration);
                durationRef.current = videoDuration;
                setIsPlayerReady(true);
                if (savedTime > 0) {
                  event.target.seekTo(savedTime, true);
                  setCurrentTime(savedTime);
                }
              },
              onStateChange: (event: any) => {
                const currentModuleId = selectedModuleRef.current?.id;
                const currentStudentId = studentIdRef.current;
                
                setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
                
                if (event.data === window.YT.PlayerState.PLAYING) {
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                  }
                  progressIntervalRef.current = setInterval(() => {
                    if (playerRef.current?.getCurrentTime) {
                      try {
                        const time = playerRef.current.getCurrentTime();
                        const totalDuration = durationRef.current;
                        setCurrentTime(time);
                        if (Math.floor(time) % 5 === 0 && currentModuleId && currentStudentId) {
                          localStorage.setItem(`video_progress_${currentStudentId}_${currentModuleId}`, time.toString());
                        }
                        
                        // Fallback: if video is 98%+ complete, trigger quiz (ENDED sometimes doesn't fire)
                        if (totalDuration > 0 && time >= totalDuration * 0.98 && !quizTriggeredRef.current) {
                          const mod = selectedModuleRef.current;
                          const currentStudent = studentRef.current;
                          const studentProgress = currentStudent?.bootcampProgress;
                          const studentCompletedModules = (typeof studentProgress === 'object' && studentProgress?.completedModules) ? studentProgress.completedModules : [];
                          const isCompleted = studentCompletedModules.includes(mod?.id || '');
                          
                          if (mod && !isCompleted && triggerQuizRef.current) {
                            console.log('Triggering quiz via 98% fallback');
                            quizTriggeredRef.current = true;
                            if (progressIntervalRef.current) {
                              clearInterval(progressIntervalRef.current);
                              progressIntervalRef.current = null;
                            }
                            if (playerRef.current?.pauseVideo) {
                              playerRef.current.pauseVideo();
                            }
                            setIsPlaying(false);
                            triggerQuizRef.current();
                          }
                        }
                      } catch (e) {
                        // Player might be destroyed
                      }
                    }
                  }, 1000);
                } else {
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                  }
                  if (playerRef.current?.getCurrentTime && currentModuleId && currentStudentId) {
                    try {
                      const time = playerRef.current.getCurrentTime();
                      setCurrentTime(time);
                      localStorage.setItem(`video_progress_${currentStudentId}_${currentModuleId}`, time.toString());
                    } catch (e) {
                      // Player might be destroyed
                    }
                  }
                }
                
                if (event.data === window.YT.PlayerState.ENDED) {
                  setIsPlaying(false);
                  setCurrentTime(durationRef.current);
                  if (currentModuleId && currentStudentId) {
                    localStorage.removeItem(`video_progress_${currentStudentId}_${currentModuleId}`);
                  }
                  // Check if module is completed using the ref
                  const mod = selectedModuleRef.current;
                  const currentStudent = studentRef.current;
                  const currentProgress = currentStudent?.bootcampProgress;
                  const currentCompletedModules = (typeof currentProgress === 'object' && currentProgress?.completedModules) ? currentProgress.completedModules : [];
                  const isCompleted = currentCompletedModules.includes(mod?.id || '');
                  
                  console.log('Video ended - triggering quiz check', { mod: mod?.id, isCompleted, alreadyTriggered: quizTriggeredRef.current });
                  
                  if (mod && !isCompleted && !quizTriggeredRef.current) {
                    quizTriggeredRef.current = true;
                    // Use the ref to trigger quiz
                    if (triggerQuizRef.current) {
                      triggerQuizRef.current();
                    }
                  }
                }
              },
            },
          });
        } catch (e) {
          console.error('Failed to create YouTube player:', e);
        }
      }
    }, 200);

    // Return cleanup function
    const timeoutId = setTimeout(() => clearInterval(checkReady), 10000); // 10s max wait
    
    return () => {
      clearInterval(checkReady);
      clearTimeout(timeoutId);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []); // No dependencies - uses refs for current values

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Custom play/pause toggle
  const togglePlayPause = () => {
    if (!playerRef.current || !isPlayerReady) return;
    try {
      // Check if player is ready (has playVideo method)
      if (typeof playerRef.current.playVideo !== 'function') return;
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (e) {
      console.error('Toggle play/pause error:', e);
    }
  };

  useEffect(() => {
    if (selectedModule?.youtubeUrl && student?.id) {
      const videoId = getYouTubeVideoId(selectedModule.youtubeUrl);
      if (videoId) {
        setShowQuiz(false);
        setQuizQuestion('');
        setQuizAnswer('');
        setQuizFeedback(null);
        setQuizAttempts(0);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        
        const cleanup = initPlayer(videoId, selectedModule.id, student.id);
        return cleanup;
      }
    }
  }, [selectedModule?.id, selectedModule?.youtubeUrl, student?.id, initPlayer]);

  // Load comments for selected module
  useEffect(() => {
    if (!selectedModule) return;
    
    // Simple query without composite index - sort client-side
    const commentsRef = collection(db, 'bootcampComments');
    const commentsQuery = query(
      commentsRef,
      where('moduleId', '==', selectedModule.id)
    );
    
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VideoComment[];
      // Sort by createdAt descending client-side
      commentsData.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      setComments(commentsData);
    });
    
    return () => unsubscribe();
  }, [selectedModule]);

  const triggerTextQuiz = async () => {
    if (!selectedModule) return;
    
    console.log('triggerTextQuiz called for module:', selectedModule.title);
    
    setQuizLoading(true);
    setShowQuiz(true);
    
    try {
      const res = await fetch('/api/bootcamp/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleTitle: selectedModule.title,
          transcript: selectedModule.transcript || '',
          objectives: selectedModule.objectives || '',
        }),
      });
      const data = await res.json();
      setQuizQuestion(data.question || `What is the main concept you learned from "${selectedModule.title}"?`);
    } catch (error) {
      setQuizQuestion(`Summarize the key takeaways from "${selectedModule.title}" in your own words.`);
    } finally {
      setQuizLoading(false);
    }
  };

  // Keep triggerQuizRef in sync
  useEffect(() => {
    triggerQuizRef.current = triggerTextQuiz;
  });

  // Save bootcamp interaction to Firestore
  const saveBootcampInteraction = async (interactionType: 'quiz' | 'doubt', question: string, answer: string, passed?: boolean) => {
    if (!student || !selectedModule) return;
    
    try {
      await addDoc(collection(db, 'bootcampInteractions'), {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        moduleId: selectedModule.id,
        moduleTitle: selectedModule.title,
        sectionId: currentSection?.id,
        sectionTitle: currentSection?.title,
        interactionType,
        question,
        answer,
        passed: passed ?? null,
        attemptNumber: interactionType === 'quiz' ? quizAttempts + 1 : null,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving bootcamp interaction:', error);
    }
  };

  const submitQuizAnswer = async () => {
    if (!quizAnswer.trim() || !selectedModule || !student) return;
    
    const currentAttempt = quizAttempts + 1;
    setQuizLoading(true);
    
    try {
      // If this is the 3rd attempt, auto-pass regardless of answer quality
      if (currentAttempt >= 3) {
        // Save interaction
        await saveBootcampInteraction('quiz', quizQuestion, quizAnswer, true);
        
        setQuizFeedback({ 
          passed: true, 
          feedback: "Thank you for your effort! You've completed this module. Keep learning and improving!" 
        });
        setQuizAttempts(currentAttempt);
        await markModuleComplete();
        return;
      }
      
      const res = await fetch('/api/bootcamp/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: quizQuestion,
          answer: quizAnswer,
          moduleTitle: selectedModule.title,
          transcript: selectedModule.transcript || '',
          objectives: selectedModule.objectives || '',
          attemptNumber: currentAttempt,
        }),
      });
      const data = await res.json();
      
      // Save interaction
      await saveBootcampInteraction('quiz', quizQuestion, quizAnswer, data.passed);
      
      setQuizFeedback({ passed: data.passed, feedback: data.feedback });
      setQuizAttempts(currentAttempt);
      
      if (data.passed) {
        await markModuleComplete();
      }
    } catch (error) {
      setQuizFeedback({ passed: false, feedback: 'Unable to evaluate. Please try again.' });
    } finally {
      setQuizLoading(false);
    }
  };

  const markModuleComplete = async () => {
    if (!student || !selectedModule) return;
    
    const existingProgress = student.bootcampProgress;
    const existingCompletedModules = (typeof existingProgress === 'object' && existingProgress?.completedModules) ? existingProgress.completedModules : [];
    const completedModules = [...existingCompletedModules];
    if (!completedModules.includes(selectedModule.id)) {
      completedModules.push(selectedModule.id);
    }
    
    const relevantSectionIds = sections.map(s => s.id);
    const totalModulesCount = allModules.filter(m => relevantSectionIds.includes(m.sectionId)).length || 1;
    const bootcampProgress = Math.min(15, Math.round((completedModules.length / totalModulesCount) * 15));
    
    await updateDocument('students', student.id, {
      bootcampProgress: {
        ...(typeof existingProgress === 'object' ? existingProgress : {}),
        completedModules,
        totalProgress: bootcampProgress,
        lastAccessedAt: new Date(),
      },
    });
    
    setStudent(prev => {
      if (!prev) return null;
      const prevProgress = prev.bootcampProgress;
      const prevQuizScores = (typeof prevProgress === 'object' && prevProgress?.quizScores) ? prevProgress.quizScores : {};
      const newProgress: BootcampProgress = {
        completedModules,
        totalProgress: bootcampProgress,
        quizScores: prevQuizScores,
        lastAccessedAt: new Date()
      };
      return { ...prev, bootcampProgress: newProgress };
    });
  };

  const goToNextModule = () => {
    if (!selectedModule || !currentSection) return;
    
    const sectionModules = getModulesForSection(currentSection.id);
    const currentIndex = sectionModules.findIndex(m => m.id === selectedModule.id);
    
    if (currentIndex < sectionModules.length - 1) {
      router.push(`/bootcamp?module=${sectionModules[currentIndex + 1].id}`);
    } else {
      const sectionIndex = sections.findIndex(s => s.id === currentSection.id);
      if (sectionIndex < sections.length - 1) {
        const nextSection = sections[sectionIndex + 1];
        const nextSectionModules = getModulesForSection(nextSection.id);
        if (nextSectionModules.length > 0) {
          router.push(`/bootcamp?module=${nextSectionModules[0].id}`);
        }
      }
    }
    
    setShowQuiz(false);
    setQuizQuestion('');
    setQuizAnswer('');
    setQuizFeedback(null);
    setQuizAttempts(0);
  };

  const retryQuiz = () => {
    setQuizAnswer('');
    setQuizFeedback(null);
  };

  const openDoubtMode = () => {
    if (playerRef.current && isPlayerReady && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
    }
    setIsPlaying(false);
    setShowAIOverlay(true);
    if (chatMessages.length === 0) {
      setChatMessages([{ role: 'assistant', content: 'What doubt do you have about this topic?' }]);
    }
  };

  const handleAskQuestion = async () => {
    if (!chatInput.trim() || isChatLoading || !selectedModule) return;
    
    // Initialize chat with welcome message if empty (for mobile inline chat)
    if (chatMessages.length === 0) {
      setChatMessages([{ role: 'assistant', content: 'What doubt do you have about this topic?' }]);
    }
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    
    try {
      const res = await fetch('/api/bootcamp/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          mode: 'doubt',
          context: { moduleTitle: selectedModule.title, transcript: selectedModule.transcript, objectives: selectedModule.objectives },
          conversationHistory: chatMessages,
        }),
      });
      const data = await res.json();
      
      // Save doubt interaction
      await saveBootcampInteraction('doubt', userMessage, data.response);
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Error. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Add comment to module
  const submitComment = async () => {
    if (!commentInput.trim() || !selectedModule || !student) return;
    
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'bootcampComments'), {
        moduleId: selectedModule.id,
        authorId: student.id,
        authorName: student.name,
        authorType: 'student',
        content: commentInput.trim(),
        createdAt: serverTimestamp()
      });
      setCommentInput('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatCommentTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const closeAIOverlay = () => {
    setShowAIOverlay(false);
    setChatMessages([]);
    if (playerRef.current && isPlayerReady && typeof playerRef.current.playVideo === 'function') {
      playerRef.current.playVideo();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  }

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">No Bootcamp Content Yet</h2>
        <p className="text-gray-600">Content for your stream is being prepared.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {selectedModule ? (
        <div className="space-y-4">
          {/* Video Card */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b dark:border-gray-700 py-3 px-4">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <CardTitle className="text-base md:text-lg">{selectedModule.title}</CardTitle>
                  <p className="text-xs md:text-sm text-gray-500">{currentSection?.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isModuleCompleted(selectedModule.id) ? (
                    <Badge variant="success" className="text-xs">✓ Done</Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />Quiz required
                    </Badge>
                  )}
                  {/* Desktop only Ask AI button */}
                  <Button variant="outline" size="sm" onClick={openDoubtMode} className="hidden md:flex text-xs px-2 py-1">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    <span>Ask AI</span>
                  </Button>
                </div>
              </div>
              {/* Instruction for incomplete modules */}
              {!isModuleCompleted(selectedModule.id) && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  Watch the full video to unlock the AI quiz and complete this module
                </p>
              )}
            </CardHeader>

            <CardContent className="p-0 relative">
              {/* Video Container - responsive aspect ratio */}
              <div className="w-full relative" style={{ paddingTop: '56.25%' }}>
                <div ref={playerContainerRef} className="absolute inset-0 flex items-center justify-center bg-black">
                  <div id="yt-player" className="w-full h-full" />
                </div>
                
                {/* Custom Play/Pause Overlay */}
                {!showQuiz && !showAIOverlay && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center cursor-pointer z-5"
                    onClick={togglePlayPause}
                  >
                    {!isPlaying && (
                      <div className="bg-black/50 p-4 rounded-full hover:bg-black/70 transition-colors">
                        {isPlayerReady ? (
                          <Play className="w-12 h-12 text-white fill-white" />
                        ) : (
                          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Pause button - bottom left when playing */}
                {isPlaying && !showQuiz && !showAIOverlay && (
                  <button
                    onClick={togglePlayPause}
                    className="absolute bottom-4 left-4 bg-black/70 p-2 rounded-lg hover:bg-black/90 transition-colors z-5"
                  >
                    <Pause className="w-5 h-5 text-white" />
                  </button>
                )}
                
                {/* Desktop AI Doubt Overlay */}
                {showAIOverlay && (
                  <div className="hidden md:flex absolute inset-0 bg-black/80 items-center justify-center p-4 z-10">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <Bot className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-sm">Ask Your Doubt</span>
                        </div>
                        <button onClick={closeAIOverlay} className="p-1.5 hover:bg-gray-100 rounded-full">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[150px]">
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {isChatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                              <Spinner size="sm" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t dark:border-gray-700 flex gap-2">
                        <input 
                          type="text" 
                          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm min-w-0" 
                          placeholder="Type your doubt..." 
                          value={chatInput} 
                          onChange={(e) => setChatInput(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()} 
                        />
                        <Button onClick={handleAskQuestion} disabled={isChatLoading || !chatInput.trim()} size="sm">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quiz Overlay */}
                {showQuiz && (
                  <div className="absolute inset-0 bg-black/90 flex items-end md:items-center justify-center p-2 md:p-4 z-20">
                    <div className="bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                      {quizLoading && !quizQuestion ? (
                        <div className="p-8 flex flex-col items-center justify-center">
                          <Spinner size="lg" />
                          <p className="mt-4 text-gray-600 text-sm">Generating quiz...</p>
                        </div>
                      ) : (
                        <>
                          <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-semibold">Module Quiz</span>
                            </div>
                            <p className="text-xs mt-1 opacity-90">Answer correctly to complete this module</p>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                              <p className="font-medium text-sm">{quizQuestion}</p>
                            </div>
                            {!quizFeedback ? (
                              <>
                                <textarea 
                                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm resize-none" 
                                  rows={4} 
                                  placeholder="Type your answer here..." 
                                  value={quizAnswer} 
                                  onChange={(e) => setQuizAnswer(e.target.value)} 
                                />
                                <Button 
                                  onClick={submitQuizAnswer} 
                                  disabled={quizLoading || !quizAnswer.trim()} 
                                  variant="gradient" 
                                  className="w-full"
                                >
                                  {quizLoading ? <Spinner size="sm" /> : 'Submit Answer'}
                                </Button>
                              </>
                            ) : (
                              <div className={`p-4 rounded-lg ${quizFeedback.passed ? 'bg-green-50 dark:bg-green-900/30 border border-green-200' : 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200'}`}>
                                <p className={`font-semibold mb-2 ${quizFeedback.passed ? 'text-green-700' : 'text-yellow-700'}`}>
                                  {quizFeedback.passed ? '✓ Correct! Module Complete' : '⚠ Try Again'}
                                </p>
                                <p className="text-sm">{quizFeedback.feedback}</p>
                              </div>
                            )}
                          </div>
                          {quizFeedback && (
                            <div className="p-4 border-t dark:border-gray-700 flex gap-2">
                              {quizFeedback.passed ? (
                                <Button variant="gradient" className="w-full" onClick={goToNextModule}>
                                  Continue to Next Module →
                                </Button>
                              ) : (
                                <Button variant="outline" className="w-full" onClick={retryQuiz}>
                                  Try Again (Attempt {quizAttempts + 1})
                                </Button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Video Progress Bar - Non-interactive */}
              {duration > 0 && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-12">
                      {formatTime(currentTime)}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((currentTime / duration) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
                      {formatTime(duration)}
                    </span>
                  </div>
                  {duration - currentTime > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-center">
                      {formatTime(duration - currentTime)} remaining
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Ask AI Section - Below video like YouTube comments */}
          <div className="md:hidden">
            <Card>
              <CardHeader className="py-3 px-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-sm">Ask AI About This Topic</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Chat Messages */}
                {chatMessages.length > 0 && (
                  <div className="p-3 space-y-2 max-h-60 overflow-y-auto border-b dark:border-gray-700">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                          <Spinner size="sm" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Input */}
                <div className="p-3 flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm" 
                    placeholder="Ask a question about this video..." 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()} 
                  />
                  <Button onClick={handleAskQuestion} disabled={isChatLoading || !chatInput.trim()} size="sm">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comments Section - Like YouTube */}
          <Card>
            <CardHeader className="py-3 px-4 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-sm">{comments.length} Comments</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Add Comment */}
              <div className="p-4 border-b dark:border-gray-700">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {student?.name?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                      placeholder="Add a comment..."
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {commentInput.trim() && (
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" size="sm" onClick={() => setCommentInput('')}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={submitComment} disabled={submittingComment}>
                          {submittingComment ? <Spinner size="sm" /> : 'Comment'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    No comments yet. Be the first to comment!
                  </div>
                ) : (
                  <div className="divide-y dark:divide-gray-700">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-4 flex gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${
                          comment.authorType === 'admin' 
                            ? 'bg-gradient-to-br from-yellow-500 to-orange-600' 
                            : 'bg-gradient-to-br from-blue-500 to-purple-600'
                        }`}>
                          {comment.authorName?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{comment.authorName}</span>
                            {comment.authorType === 'admin' && (
                              <Badge variant="warning" className="text-xs py-0">Admin</Badge>
                            )}
                            <span className="text-xs text-gray-500">{formatCommentTime(comment.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-gray-500 p-4">
            <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a module from the sidebar to start</p>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function BootcampPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>}>
      <BootcampContent />
    </Suspense>
  );
}
