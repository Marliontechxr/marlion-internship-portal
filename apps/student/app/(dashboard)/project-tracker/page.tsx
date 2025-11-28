'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@marlion/ui/providers';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

// Helper to get IST timestamp string
const getISTTimestamp = (): string => {
  const now = new Date();
  const istOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  return now.toLocaleString('en-IN', istOptions);
};

// Format IST timestamp for display
const formatISTDate = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const istOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleString('en-IN', istOptions);
};
import { db, storage } from '@marlion/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Layout, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Send, 
  Upload, 
  Github, 
  Image as ImageIcon,
  MessageSquare,
  X,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Eye,
  Calendar,
  Target,
  Loader2,
  GripVertical,
  FileText,
  Link as LinkIcon,
  Video,
  ExternalLink,
  FolderOpen,
  Linkedin,
  Star
} from 'lucide-react';
import { 
  generateTaskCompletionShareContent, 
  openLinkedInShare 
} from '@marlion/lib';

interface UploadedFile {
  name: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  uploadedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'rework';
  isAdminTask: boolean;
  parentTaskId?: string;
  problemStatementId?: string;
  studentId?: string;
  estimatedDays: number;
  githubUrl?: string;
  screenshots?: string[];
  uploadedFiles?: UploadedFile[];
  explanation?: string;
  reworkReason?: string;
  rating?: number;
  aiInteractions?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: any;
  }>;
  aiSummary?: string;
  aiScore?: number;
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
  startedAtIST?: string;
  submittedAtIST?: string;
}

interface ProblemStatement {
  id: string;
  title: string;
  description: string;
  stream: string;
  techStack: string[];
  tasks: Array<{
    title: string;
    duration: number;
    description: string;
  }>;
  deliverables: string[];
  attachments?: Array<{
    name: string;
    url: string;
    type: 'file' | 'link' | 'video' | 'image';
  }>;
}

interface StudentAssignment {
  id: string;
  problemStatementId: string;
  status: string;
  assignedAt: any;
}

const COLUMNS = [
  { id: 'todo', title: 'To Do', icon: Clock, color: 'bg-slate-500', shortTitle: 'Todo' },
  { id: 'in_progress', title: 'In Progress', icon: Loader2, color: 'bg-blue-500', shortTitle: 'Progress' },
  { id: 'review', title: 'Review', icon: Eye, color: 'bg-yellow-500', shortTitle: 'Review' },
  { id: 'completed', title: 'Completed', icon: CheckCircle, color: 'bg-green-500', shortTitle: 'Done' },
];

export default function ProjectTrackerPage() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<StudentAssignment | null>(null);
  const [problemStatement, setProblemStatement] = useState<ProblemStatement | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSubtask, setShowAddSubtask] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [aiMessages, setAiMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitData, setSubmitData] = useState({ githubUrl: '', explanation: '', screenshots: '' });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [projectProgress, setProjectProgress] = useState(0);
  const [mobileActiveColumn, setMobileActiveColumn] = useState('todo');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showResources, setShowResources] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    loadProjectData();
    // Load student data
    getDoc(doc(db, 'students', user.uid)).then(snap => {
      if (snap.exists()) setStudent({ id: snap.id, ...snap.data() });
    });
  }, [user]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const loadProjectData = async () => {
    if (!user) return;
    
    try {
      // Get student's approved assignment - simple query without composite index
      const submissionsQuery = query(
        collection(db, 'problemSubmissions'),
        where('studentId', '==', user.uid)
      );
      const submissionsSnap = await getDocs(submissionsQuery);
      
      // Filter approved/assigned in memory
      const approvedSubmission = submissionsSnap.docs.find(doc => {
        const data = doc.data();
        return data.status === 'approved' || data.status === 'assigned';
      });
      
      if (!approvedSubmission) {
        setLoading(false);
        return;
      }

      const assignmentData = {
        id: approvedSubmission.id,
        ...approvedSubmission.data()
      } as StudentAssignment;
      setAssignment(assignmentData);

      // Get problem statement
      const psId = assignmentData.problemStatementId;
      const psDoc = await getDoc(doc(db, 'problemStatements', psId));
      if (psDoc.exists()) {
        const psData = { id: psDoc.id, ...psDoc.data() } as ProblemStatement;
        setProblemStatement(psData);

        // Initialize tasks from problem statement if not exist
        await initializeTasksIfNeeded(user.uid, psId, psData);
      }

      // Get tasks - simple query without composite index
      await fetchTasks(user.uid, psId);

      setLoading(false);
    } catch (error) {
      console.error('Error loading project data:', error);
      setLoading(false);
    }
  };

  const fetchTasks = async (studentId: string, psId: string) => {
    try {
      const tasksQuery = query(
        collection(db, 'projectTasks'),
        where('studentId', '==', studentId)
      );
      const tasksSnap = await getDocs(tasksQuery);
      
      // Filter by problemStatementId in memory, deduplicate by id, and sort
      const tasksMap = new Map<string, Task>();
      tasksSnap.docs.forEach(doc => {
        const task = { id: doc.id, ...doc.data() } as Task;
        if (task.problemStatementId === psId) {
          tasksMap.set(doc.id, task);
        }
      });
      
      const tasksList = Array.from(tasksMap.values()).sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });
      
      setTasks(tasksList);
      calculateProgress(tasksList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const initializeTasksIfNeeded = async (studentId: string, psId: string, ps: ProblemStatement): Promise<boolean> => {
    // Prevent concurrent initialization
    if (initializingRef.current) {
      return false;
    }
    
    try {
      initializingRef.current = true;
      
      const existingQuery = query(
        collection(db, 'projectTasks'),
        where('studentId', '==', studentId)
      );
      const existing = await getDocs(existingQuery);
      
      // Check if admin tasks exist for this problem statement
      const hasAdminTasks = existing.docs.some(doc => {
        const data = doc.data();
        return data.problemStatementId === psId && data.isAdminTask === true;
      });
      
      if (!hasAdminTasks && ps.tasks && ps.tasks.length > 0) {
        // Create admin tasks from problem statement
        for (const task of ps.tasks) {
          await addDoc(collection(db, 'projectTasks'), {
            studentId,
            problemStatementId: psId,
            title: task.title,
            description: task.description || '',
            estimatedDays: Number(task.duration) || 1,
            status: 'todo',
            isAdminTask: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        return true; // Tasks were created
      }
      return false; // No tasks created
    } catch (error) {
      console.error('Error initializing tasks:', error);
      return false;
    } finally {
      initializingRef.current = false;
    }
  };

  const calculateProgress = (tasksList: Task[]) => {
    const adminTasks = tasksList.filter(t => t.isAdminTask);
    if (adminTasks.length === 0) {
      setProjectProgress(0);
      return;
    }
    
    const totalDays = adminTasks.reduce((sum, t) => sum + (t.estimatedDays || 1), 0);
    const completedDays = adminTasks
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.estimatedDays || 1), 0);
    
    // This is 0-100% of project completion
    const progress = Math.round((completedDays / totalDays) * 100);
    setProjectProgress(progress);

    // Update student's project progress in Firestore (0-100 scale)
    // The sidebar will normalize this to 70% weightage
    if (user) {
      const updates: any = {
        projectProgress: progress,
        updatedAt: serverTimestamp()
      };
      
      // If 100% complete, mark student as ready for certificate
      if (progress >= 100) {
        updates.status = 'completed';
      }
      
      updateDoc(doc(db, 'students', user.uid), updates).catch(console.error);
    }
  };

  const handleAddSubtask = async (parentTaskId: string) => {
    if (!newSubtaskTitle.trim() || !user || !assignment) return;

    try {
      await addDoc(collection(db, 'projectTasks'), {
        studentId: user.uid,
        problemStatementId: assignment.problemStatementId,
        title: newSubtaskTitle,
        description: '',
        estimatedDays: 1,
        status: 'todo',
        isAdminTask: false,
        parentTaskId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewSubtaskTitle('');
      setShowAddSubtask(null);
      // Refresh tasks
      await fetchTasks(user.uid, assignment.problemStatementId);
    } catch (error) {
      console.error('Error adding subtask:', error);
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStatus: string) => {
    if (!draggedTask) return;

    // Cannot move to completed (admin only)
    if (targetStatus === 'completed') {
      alert('Only administrators can mark tasks as completed.');
      setDraggedTask(null);
      return;
    }

    // If moving to in_progress, show AI dialog
    if (draggedTask.status === 'todo' && targetStatus === 'in_progress') {
      setCurrentTask(draggedTask);
      setAiMessages([{
        role: 'assistant',
        content: `Great! You're about to start working on "${draggedTask.title}". 🚀\n\nAs your AI team lead, I'd love to understand your approach. What's your plan for tackling this task? What specific steps are you thinking of taking?`
      }]);
      setShowAIDialog(true);
      setDraggedTask(null);
      return;
    }

    // If moving to review from in_progress or rework, show submit dialog
    if ((draggedTask.status === 'in_progress' || draggedTask.status === 'rework') && targetStatus === 'review') {
      setCurrentTask(draggedTask);
      setShowSubmitDialog(true);
      setDraggedTask(null);
      return;
    }

    // Handle rework tasks - allow moving back to in_progress first (without dialog)
    if (draggedTask.status === 'rework' && targetStatus === 'in_progress') {
      try {
        await updateDoc(doc(db, 'projectTasks', draggedTask.id), {
          status: 'in_progress',
          updatedAt: serverTimestamp()
        });
        if (user && assignment) {
          await fetchTasks(user.uid, assignment.problemStatementId);
        }
      } catch (error) {
        console.error('Error updating task:', error);
      }
    }

    setDraggedTask(null);
  };

  const handleAISend = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage = aiInput;
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setAiInput('');
    setAiLoading(true);

    try {
      const response = await fetch('/api/ai/project-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...aiMessages, { role: 'user', content: userMessage }],
          taskTitle: currentTask?.title,
          taskDescription: currentTask?.description,
          problemStatement: problemStatement?.title,
          problemDescription: problemStatement?.description
        })
      });

      const data = await response.json();
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an issue. Please try again.' 
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const confirmStartTask = async () => {
    if (!currentTask || !user || !assignment) return;

    try {
      const istTimestamp = getISTTimestamp();
      await updateDoc(doc(db, 'projectTasks', currentTask.id), {
        status: 'in_progress',
        aiInteractions: aiMessages,
        startedAtIST: istTimestamp,
        updatedAt: serverTimestamp()
      });
      
      // Notify admin about task start
      await addDoc(collection(db, 'notifications'), {
        type: 'task_started',
        studentId: user.uid,
        taskId: currentTask.id,
        taskTitle: currentTask.title,
        problemStatementId: assignment.problemStatementId,
        message: `Student started task: ${currentTask.title}`,
        timestamp: istTimestamp,
        createdAt: serverTimestamp(),
        read: false
      });
      
      setShowAIDialog(false);
      setAiMessages([]);
      setCurrentTask(null);
      // Refresh tasks
      await fetchTasks(user.uid, assignment.problemStatementId);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !currentTask) return;

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
          alert(`${file.name} is not a valid image or video file`);
          continue;
        }

        // Validate file size (max 50MB for videos, 10MB for images)
        const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(`${file.name} is too large. Max size: ${isVideo ? '50MB' : '10MB'}`);
          continue;
        }

        // Upload to Firebase Storage
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `task-submissions/${user.uid}/${currentTask.id}/${timestamp}_${safeName}`;
        const storageRef = ref(storage, storagePath);
        
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        newFiles.push({
          name: file.name,
          url: downloadUrl,
          type: isImage ? 'image' : 'video',
          size: file.size,
          uploadedAt: getISTTimestamp()
        });
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload some files. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitForReview = async () => {
    if (!currentTask || !submitData.githubUrl || !submitData.explanation || !user || !assignment) {
      alert('Please provide GitHub URL and explanation.');
      return;
    }

    try {
      const istTimestamp = getISTTimestamp();
      
      // Combine URL-based screenshots with uploaded files
      const urlScreenshots = submitData.screenshots.split(',').map(s => s.trim()).filter(Boolean);
      
      await updateDoc(doc(db, 'projectTasks', currentTask.id), {
        status: 'review',
        githubUrl: submitData.githubUrl,
        explanation: submitData.explanation,
        screenshots: urlScreenshots,
        uploadedFiles: uploadedFiles,
        submittedAtIST: istTimestamp,
        updatedAt: serverTimestamp()
      });
      
      // Notify admin about submission for review
      await addDoc(collection(db, 'notifications'), {
        type: 'task_submitted',
        studentId: user.uid,
        taskId: currentTask.id,
        taskTitle: currentTask.title,
        problemStatementId: assignment.problemStatementId,
        message: `Student submitted task for review: ${currentTask.title}`,
        timestamp: istTimestamp,
        createdAt: serverTimestamp(),
        read: false
      });
      
      setShowSubmitDialog(false);
      setSubmitData({ githubUrl: '', explanation: '', screenshots: '' });
      setUploadedFiles([]);
      setCurrentTask(null);
      // Refresh tasks
      await fetchTasks(user.uid, assignment.problemStatementId);
    } catch (error) {
      console.error('Error submitting for review:', error);
    }
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleMobileMove = async (task: Task, targetStatus: string) => {
    if (targetStatus === 'completed') {
      alert('Only administrators can mark tasks as completed.');
      return;
    }

    if (task.status === 'todo' && targetStatus === 'in_progress') {
      setCurrentTask(task);
      setAiMessages([{
        role: 'assistant',
        content: `Great! You're about to start working on "${task.title}". 🚀\n\nAs your AI team lead, I'd love to understand your approach. What's your plan for tackling this task?`
      }]);
      setShowAIDialog(true);
      return;
    }

    // Allow moving from in_progress or rework to review
    if ((task.status === 'in_progress' || task.status === 'rework') && targetStatus === 'review') {
      setCurrentTask(task);
      setShowSubmitDialog(true);
      return;
    }

    // Move rework to in_progress first if needed
    if (task.status === 'rework' && targetStatus === 'in_progress') {
      if (!user || !assignment) return;
      try {
        await updateDoc(doc(db, 'projectTasks', task.id), {
          status: 'in_progress',
          updatedAt: serverTimestamp()
        });
        await fetchTasks(user.uid, assignment.problemStatementId);
      } catch (error) {
        console.error('Error updating task:', error);
      }
    }
  };

  const getTasksByStatus = (status: string) => {
    // Include rework tasks in in_progress column
    if (status === 'in_progress') {
      return tasks.filter(t => t.status === 'in_progress' || t.status === 'rework');
    }
    return tasks.filter(t => t.status === status);
  };

  const getSubtasks = (parentId: string) => {
    return tasks.filter(t => t.parentTaskId === parentId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!assignment || !problemStatement) {
    return (
      <div className="p-6">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center">
          <Target className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Project Assigned Yet</h2>
          <p className="text-gray-400">
            Please wait for your project application to be approved, or apply for a project first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <Layout className="w-8 h-8 text-purple-500" />
              Project Tracker
            </h1>
            <p className="text-gray-400 mt-1">{problemStatement.title}</p>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-gray-800 rounded-xl p-4 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Project Progress</span>
              <span className="text-lg font-bold text-purple-400">{projectProgress}%</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${projectProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2 mb-4">
          {problemStatement.techStack?.map((tech, i) => (
            <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
              {tech}
            </span>
          ))}
        </div>
        
        {/* Quick Access Resources Button */}
        {problemStatement.attachments && problemStatement.attachments.length > 0 && (
          <button
            onClick={() => setShowResources(!showResources)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-500/30 transition-all"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Project Resources ({problemStatement.attachments.length})</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showResources ? 'rotate-180' : ''}`} />
          </button>
        )}
        
        {/* Resources Panel */}
        {showResources && problemStatement.attachments && (
          <div className="mt-3 p-4 bg-gray-800/80 rounded-xl border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-400" />
              Project Files & Resources
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {problemStatement.attachments.map((attachment, i) => {
                const getIcon = () => {
                  switch (attachment.type) {
                    case 'video': return <Video className="w-4 h-4 text-red-400" />;
                    case 'image': return <ImageIcon className="w-4 h-4 text-green-400" />;
                    case 'link': return <LinkIcon className="w-4 h-4 text-blue-400" />;
                    default: return <FileText className="w-4 h-4 text-yellow-400" />;
                  }
                };
                
                return (
                  <a
                    key={i}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-purple-500/50 hover:bg-gray-900 transition-all group"
                  >
                    <div className="p-2 bg-gray-800 rounded-lg">
                      {getIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{attachment.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{attachment.type}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Column Tabs */}
      <div className="md:hidden flex gap-1 mb-4 overflow-x-auto pb-2">
        {COLUMNS.map(column => (
          <button
            key={column.id}
            onClick={() => setMobileActiveColumn(column.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
              mobileActiveColumn === column.id
                ? `${column.color} text-white`
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            <column.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{column.shortTitle}</span>
            <span className="bg-black/20 px-1.5 py-0.5 rounded text-xs">
              {getTasksByStatus(column.id).filter(t => t.isAdminTask).length}
            </span>
          </button>
        ))}
      </div>

      {/* Desktop Kanban Board */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(column => (
          <div
            key={column.id}
            className="bg-gray-800/50 rounded-xl p-4 min-h-[400px]"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700">
              <div className={`p-2 rounded-lg ${column.color}`}>
                <column.icon className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-white">{column.title}</h3>
              <span className="ml-auto bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full text-sm">
                {getTasksByStatus(column.id).filter(t => t.isAdminTask).length}
              </span>
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              {getTasksByStatus(column.id).filter(t => t.isAdminTask).map(task => (
                <div key={task.id}>
                  {/* Main Task Card */}
                  <div
                    draggable={column.id !== 'completed'}
                    onDragStart={() => handleDragStart(task)}
                    className={`bg-gray-900 rounded-lg p-4 cursor-move hover:ring-2 hover:ring-purple-500/50 transition-all ${
                      task.status === 'rework' ? 'border-l-4 border-orange-500' : ''
                    } ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
                  >
                    <h4 className="font-medium text-white mb-2">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimatedDays} {task.estimatedDays === 1 ? "day" : "days"}
                      </span>
                      {task.status === 'rework' && task.reworkReason && (
                        <span 
                          className="text-orange-400 flex items-center gap-1 cursor-help"
                          title={task.reworkReason}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Needs Rework
                        </span>
                      )}
                    </div>
                    
                    {/* IST Timestamps */}
                    {(task.startedAtIST || task.submittedAtIST) && (
                      <div className="text-xs text-gray-500 space-y-1 mb-2 pt-2 border-t border-gray-800">
                        {task.startedAtIST && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Started: {task.startedAtIST}
                          </div>
                        )}
                        {task.submittedAtIST && (
                          <div className="flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            Submitted: {task.submittedAtIST}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rework Reason */}
                    {task.status === 'rework' && task.reworkReason && (
                      <div className="mt-3 p-2 bg-orange-500/10 rounded border border-orange-500/30">
                        <p className="text-xs text-orange-300">{task.reworkReason}</p>
                      </div>
                    )}

                    {/* Quick Action Button for Rework Tasks */}
                    {task.status === 'rework' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTask(task);
                            setShowSubmitDialog(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          Resubmit for Review
                        </button>
                      </div>
                    )}

                    {/* Completed Task Rating & LinkedIn Share */}
                    {task.status === 'completed' && task.rating && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i}
                                className={`w-4 h-4 ${
                                  i < task.rating! 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-xs text-gray-400">({task.rating}/5)</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openLinkedInShare(generateTaskCompletionShareContent({
                                taskTitle: task.title,
                                projectTitle: problemStatement?.title || 'Marlion Project',
                                rating: task.rating || 0,
                                studentName: student?.name || 'Student'
                              }));
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded transition-colors"
                            title="Share to LinkedIn"
                          >
                            <Linkedin className="w-3 h-3" />
                            Share
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Subtasks */}
                    {getSubtasks(task.id).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                        {getSubtasks(task.id).map(subtask => (
                          <div 
                            key={subtask.id}
                            className="flex items-center gap-2 text-sm text-gray-400 pl-2 border-l-2 border-gray-600"
                          >
                            <CheckCircle className={`w-4 h-4 ${
                              subtask.status === 'completed' ? 'text-green-500' : 'text-gray-600'
                            }`} />
                            <span className={subtask.status === 'completed' ? 'line-through' : ''}>
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Subtask Button */}
                    {column.id !== 'completed' && (
                      <div className="mt-3">
                        {showAddSubtask === task.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSubtaskTitle}
                              onChange={(e) => setNewSubtaskTitle(e.target.value)}
                              placeholder="Subtask title..."
                              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                            />
                            <button
                              onClick={() => handleAddSubtask(task.id)}
                              className="p-1 bg-purple-500 rounded text-white"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowAddSubtask(null)}
                              className="p-1 bg-gray-600 rounded text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowAddSubtask(task.id)}
                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Subtask
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Task List */}
      <div className="md:hidden space-y-3">
        {getTasksByStatus(mobileActiveColumn).filter(t => t.isAdminTask).map(task => (
          <div 
            key={task.id}
            className={`bg-gray-800 rounded-xl overflow-hidden ${
              task.status === 'rework' ? 'border-l-4 border-orange-500' : ''
            }`}
          >
            {/* Task Header - Clickable to expand */}
            <button
              onClick={() => toggleTaskExpanded(task.id)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex-1">
                <h4 className="font-medium text-white">{task.title}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.estimatedDays} {task.estimatedDays === 1 ? "day" : "days"}
                  </span>
                  {getSubtasks(task.id).length > 0 && (
                    <span>{getSubtasks(task.id).length} subtasks</span>
                  )}
                </div>
              </div>
              {expandedTasks.has(task.id) ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Expanded Content */}
            {expandedTasks.has(task.id) && (
              <div className="px-4 pb-4 space-y-4">
                {task.description && (
                  <p className="text-sm text-gray-400">{task.description}</p>
                )}

                {/* Rework Reason */}
                {task.status === 'rework' && task.reworkReason && (
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                    <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-1">
                      <RotateCcw className="w-4 h-4" />
                      Needs Rework
                    </div>
                    <p className="text-sm text-orange-300">{task.reworkReason}</p>
                  </div>
                )}

                {/* Subtasks */}
                {getSubtasks(task.id).length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-gray-500 uppercase">Subtasks</h5>
                    {getSubtasks(task.id).map(subtask => (
                      <div 
                        key={subtask.id}
                        className="flex items-center gap-2 text-sm text-gray-400 pl-2 border-l-2 border-gray-600"
                      >
                        <CheckCircle className={`w-4 h-4 ${
                          subtask.status === 'completed' ? 'text-green-500' : 'text-gray-600'
                        }`} />
                        <span className={subtask.status === 'completed' ? 'line-through' : ''}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Subtask */}
                {mobileActiveColumn !== 'completed' && (
                  <div>
                    {showAddSubtask === task.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder="Subtask title..."
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                        />
                        <button
                          onClick={() => handleAddSubtask(task.id)}
                          className="p-2 bg-purple-500 rounded-lg text-white"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowAddSubtask(null)}
                          className="p-2 bg-gray-600 rounded-lg text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddSubtask(task.id)}
                        className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Subtask
                      </button>
                    )}
                  </div>
                )}

                {/* Move Actions - Mobile */}
                <div className="pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">Move to:</p>
                  <div className="flex flex-wrap gap-2">
                    {/* Show appropriate actions based on task status */}
                    {task.status === 'todo' && (
                      <button
                        onClick={() => handleMobileMove(task, 'in_progress')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white"
                      >
                        <Loader2 className="w-3 h-3" />
                        Start Task
                      </button>
                    )}
                    {(task.status === 'in_progress' || task.status === 'rework') && (
                      <button
                        onClick={() => handleMobileMove(task, 'review')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-yellow-500 text-white"
                      >
                        <Eye className="w-3 h-3" />
                        Submit for Review
                      </button>
                    )}
                    {task.status === 'rework' && (
                      <button
                        onClick={() => handleMobileMove(task, 'in_progress')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white"
                      >
                        <Loader2 className="w-3 h-3" />
                        Continue Working
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {getTasksByStatus(mobileActiveColumn).filter(t => t.isAdminTask).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No tasks in this column</p>
          </div>
        )}
      </div>

      {/* AI Dialog for Starting Task */}
      {showAIDialog && currentTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI Team Lead</h3>
                  <p className="text-sm text-gray-400">Starting: {currentTask.title}</p>
                </div>
              </div>
              <button onClick={() => setShowAIDialog(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl ${
                    msg.role === 'user' 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-800 text-gray-200'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 p-3 rounded-xl">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAISend()}
                  placeholder="Share your plan..."
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                />
                <button
                  onClick={handleAISend}
                  disabled={aiLoading}
                  className="p-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              
              <button
                onClick={confirmStartTask}
                disabled={aiMessages.length < 2}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Start Working on Task
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit for Review Dialog */}
      {showSubmitDialog && currentTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Submit for Review</h3>
              <button onClick={() => {
                setShowSubmitDialog(false);
                setUploadedFiles([]);
              }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Github className="w-4 h-4 inline mr-2" />
                  GitHub URL *
                </label>
                <input
                  type="url"
                  value={submitData.githubUrl}
                  onChange={(e) => setSubmitData(prev => ({ ...prev, githubUrl: e.target.value }))}
                  placeholder="https://github.com/..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                />
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload Images & Videos
                </label>
                <div 
                  className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-purple-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-purple-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Click to upload images or videos</p>
                      <p className="text-xs mt-1">Max: 10MB for images, 50MB for videos</p>
                    </div>
                  )}
                </div>

                {/* Uploaded Files Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
                        {file.type === 'image' ? (
                          <img src={file.url} alt={file.name} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                            <Video className="w-6 h-6 text-purple-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {file.type === 'video' ? 'Video' : 'Image'} • {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={() => removeUploadedFile(index)}
                          className="p-1 text-gray-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional URL Screenshots */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  Additional Screenshot URLs (optional, comma separated)
                </label>
                <input
                  type="text"
                  value={submitData.screenshots}
                  onChange={(e) => setSubmitData(prev => ({ ...prev, screenshots: e.target.value }))}
                  placeholder="https://i.imgur.com/..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Explanation *
                </label>
                <textarea
                  value={submitData.explanation}
                  onChange={(e) => setSubmitData(prev => ({ ...prev, explanation: e.target.value }))}
                  placeholder="Describe what you accomplished..."
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
                />
              </div>

              <button
                onClick={handleSubmitForReview}
                disabled={uploading}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
