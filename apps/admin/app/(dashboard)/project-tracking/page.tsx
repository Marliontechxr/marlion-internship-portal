'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@marlion/config';
import { 
  Layout, 
  Users, 
  FolderKanban, 
  Eye, 
  CheckCircle, 
  RotateCcw, 
  Search, 
  Filter,
  ChevronDown,
  ChevronRight,
  Github,
  Image as ImageIcon,
  MessageSquare,
  Clock,
  Sparkles,
  AlertTriangle,
  BarChart3,
  Calendar,
  Loader2,
  ExternalLink,
  Video,
  Download,
  Play,
  Star
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  chosenStream: string;
  projectProgress: number;
}

interface UploadedFile {
  name: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  uploadedAt: string;
}

interface Task {
  id: string;
  studentId: string;
  problemStatementId: string;
  title: string;
  description: string;
  status: string;
  isAdminTask: boolean;
  estimatedDays: number;
  githubUrl?: string;
  screenshots?: string[];
  uploadedFiles?: UploadedFile[];
  explanation?: string;
  reworkReason?: string;
  aiInteractions?: Array<{role: string; content: string}>;
  aiSummary?: string;
  aiScore?: number;
  rating?: number;
  revisionCount?: number;
  createdAt: any;
  updatedAt: any;
  startedAtIST?: string;
  submittedAtIST?: string;
}

interface ProblemStatement {
  id: string;
  title: string;
  stream: string;
}

interface Submission {
  id: string;
  studentId: string;
  problemStatementId: string;
  status: string;
}

export default function ProjectTrackingPage() {
  const [viewMode, setViewMode] = useState<'students' | 'projects'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [reworkReason, setReworkReason] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [taskRating, setTaskRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load students with approved/assigned projects
      const submissionsSnap = await getDocs(
        query(collection(db, 'problemSubmissions'), where('status', 'in', ['approved', 'assigned']))
      );
      const submissionsData = submissionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Submission[];
      setSubmissions(submissionsData);

      const studentIds = [...new Set(submissionsData.map(s => s.studentId))];
      
      if (studentIds.length > 0) {
        const studentsData: Student[] = [];
        for (const sid of studentIds) {
          const studentDoc = await getDocs(query(collection(db, 'students'), where('__name__', '==', sid)));
          if (!studentDoc.empty) {
            studentsData.push({
              id: studentDoc.docs[0].id,
              ...studentDoc.docs[0].data()
            } as Student);
          }
        }
        setStudents(studentsData);
      }

      // Load problem statements
      const psSnap = await getDocs(collection(db, 'problemStatements'));
      setProblemStatements(psSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProblemStatement[]);

      // Load all tasks
      const tasksSnap = await getDocs(collection(db, 'projectTasks'));
      setTasks(tasksSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const getStudentTasks = (studentId: string) => {
    return tasks.filter(t => t.studentId === studentId && t.isAdminTask);
  };

  const getProjectTasks = (projectId: string) => {
    return tasks.filter(t => t.problemStatementId === projectId && t.isAdminTask);
  };

  const getStudentForTask = (studentId: string) => {
    return students.find(s => s.id === studentId);
  };

  const getProjectForStudent = (studentId: string) => {
    const submission = submissions.find(s => s.studentId === studentId);
    if (!submission) return null;
    return problemStatements.find(p => p.id === submission.problemStatementId);
  };

  const handleApproveTask = async (task: Task) => {
    if (taskRating === 0) {
      alert('Please rate the task before approving (1-5 stars)');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'projectTasks', task.id), {
        status: 'completed',
        rating: taskRating,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Recalculate student progress
      const studentTasks = getStudentTasks(task.studentId);
      const totalDays = studentTasks.reduce((sum, t) => sum + (t.estimatedDays || 1), 0);
      const completedDays = studentTasks
        .filter(t => t.status === 'completed' || t.id === task.id)
        .reduce((sum, t) => sum + (t.estimatedDays || 1), 0);
      
      const progress = Math.round((completedDays / totalDays) * 100);
      
      await updateDoc(doc(db, 'students', task.studentId), {
        projectProgress: progress,
        updatedAt: serverTimestamp()
      });

      // Refresh data
      loadData();
      setReviewingTask(null);
      setTaskRating(0);
    } catch (error) {
      console.error('Error approving task:', error);
    }
  };

  const handleRequestRework = async (task: Task) => {
    if (!reworkReason.trim()) {
      alert('Please provide a reason for rework');
      return;
    }

    try {
      const currentRevisionCount = task.revisionCount || 0;
      await updateDoc(doc(db, 'projectTasks', task.id), {
        status: 'rework',
        reworkReason,
        revisionCount: currentRevisionCount + 1,
        updatedAt: serverTimestamp()
      });
      loadData();
      setReviewingTask(null);
      setReworkReason('');
    } catch (error) {
      console.error('Error requesting rework:', error);
    }
  };

  const generateAISummary = async (task: Task) => {
    if (!task.aiInteractions || task.aiInteractions.length === 0) {
      alert('No AI interactions to summarize');
      return;
    }

    setGeneratingSummary(true);
    try {
      const response = await fetch('/api/ai/summarize-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactions: task.aiInteractions,
          taskTitle: task.title,
          explanation: task.explanation
        })
      });

      const data = await response.json();
      
      await updateDoc(doc(db, 'projectTasks', task.id), {
        aiSummary: data.summary,
        aiScore: data.score,
        updatedAt: serverTimestamp()
      });

      loadData();
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-slate-500';
      case 'in_progress': return 'bg-blue-500';
      case 'review': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'rework': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo': return 'To Do';
      case 'in_progress': return 'In Progress';
      case 'review': return 'Under Review';
      case 'completed': return 'Completed';
      case 'rework': return 'Needs Rework';
      default: return status;
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = problemStatements.filter(p =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Layout className="w-8 h-8 text-purple-600" />
            Project Tracking
          </h1>
          <p className="text-gray-600 mt-1">Monitor and review student project progress</p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('students')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
              viewMode === 'students' ? 'bg-white shadow text-purple-600' : 'text-gray-600'
            }`}
          >
            <Users className="w-4 h-4" />
            By Student
          </button>
          <button
            onClick={() => setViewMode('projects')}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
              viewMode === 'projects' ? 'bg-white shadow text-purple-600' : 'text-gray-600'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            By Project
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
              <p className="text-sm text-gray-500">Active Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Eye className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.status === 'review').length}
              </p>
              <p className="text-sm text-gray-500">Pending Reviews</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-500">Completed Tasks</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <RotateCcw className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.status === 'rework').length}
              </p>
              <p className="text-sm text-gray-500">In Rework</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${viewMode === 'students' ? 'students' : 'projects'}...`}
            className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Content */}
      {viewMode === 'students' ? (
        <div className="space-y-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No students with assigned projects found
            </div>
          ) : (
            filteredStudents.map(student => {
              const project = getProjectForStudent(student.id);
              const studentTasks = getStudentTasks(student.id);
              const reviewTasks = studentTasks.filter(t => t.status === 'review');

              return (
                <div key={student.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedStudent(selectedStudent === student.id ? null : student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {student.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{student.name}</h3>
                          <p className="text-sm text-gray-500">{student.email}</p>
                          {project && (
                            <p className="text-sm text-purple-600 mt-1">{project.title}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {reviewTasks.length > 0 && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                            {reviewTasks.length} pending review
                          </span>
                        )}
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{student.projectProgress || 0}%</p>
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: `${student.projectProgress || 0}%` }}
                            />
                          </div>
                        </div>
                        {selectedStudent === student.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedStudent === student.id && (
                    <div className="border-t bg-gray-50 p-4">
                      <h4 className="font-medium text-gray-700 mb-3">Tasks</h4>
                      <div className="space-y-2">
                        {studentTasks.map(task => (
                          <div 
                            key={task.id}
                            className={`bg-white rounded-lg p-4 border ${
                              task.status === 'review' ? 'border-yellow-300 ring-2 ring-yellow-100' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                                <div>
                                  <p className="font-medium text-gray-900">{task.title}</p>
                                  <p className="text-sm text-gray-500">
                                    {getStatusLabel(task.status)} • {task.estimatedDays} day(s) estimated
                                  </p>
                                  {/* IST Timestamps */}
                                  {(task.startedAtIST || task.submittedAtIST) && (
                                    <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                                      {task.startedAtIST && (
                                        <p className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          Started: {task.startedAtIST} (IST)
                                        </p>
                                      )}
                                      {task.submittedAtIST && (
                                        <p className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          Submitted: {task.submittedAtIST} (IST)
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {task.status === 'review' && (
                                <button
                                  onClick={() => setReviewingTask(task)}
                                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  Review
                                </button>
                              )}
                            </div>

                            {task.status === 'rework' && task.reworkReason && (
                              <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
                                <p className="text-sm text-orange-700">
                                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                                  Rework reason: {task.reworkReason}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map(project => {
            const projectTasks = getProjectTasks(project.id);
            const projectStudents = submissions
              .filter(s => s.problemStatementId === project.id)
              .map(s => students.find(st => st.id === s.studentId))
              .filter(Boolean);

            return (
              <div key={project.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.title}</h3>
                      <p className="text-sm text-gray-500">
                        {project.stream} • {projectStudents.length} students
                      </p>
                    </div>
                    {selectedProject === project.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {selectedProject === project.id && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="space-y-4">
                      {projectStudents.map(student => {
                        if (!student) return null;
                        const studentTasks = tasks.filter(t => 
                          t.studentId === student.id && 
                          t.problemStatementId === project.id &&
                          t.isAdminTask
                        );

                        return (
                          <div key={student.id} className="bg-white rounded-lg p-4 border">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                  {student.name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{student.name}</p>
                                  <p className="text-sm text-gray-500">{student.projectProgress || 0}% complete</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              {['todo', 'in_progress', 'review', 'completed'].map(status => {
                                const count = studentTasks.filter(t => t.status === status).length;
                                return (
                                  <div key={status} className="text-center p-2 bg-gray-50 rounded">
                                    <p className="text-lg font-bold text-gray-900">{count}</p>
                                    <p className="text-xs text-gray-500">{getStatusLabel(status)}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Review Submission</h3>
              <button
                onClick={() => {
                  setReviewingTask(null);
                  setReworkReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Task Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{reviewingTask.title}</h4>
                <p className="text-gray-600">{reviewingTask.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {reviewingTask.estimatedDays} day(s) estimated
                  </span>
                </div>
              </div>

              {/* GitHub Link */}
              {reviewingTask.githubUrl && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    GitHub Repository
                  </h5>
                  <a
                    href={reviewingTask.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline flex items-center gap-1"
                  >
                    {reviewingTask.githubUrl}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Screenshots (URL-based) */}
              {reviewingTask.screenshots && reviewingTask.screenshots.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Screenshot URLs
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    {reviewingTask.screenshots.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Screenshot ${i + 1}`} className="rounded-lg border" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Files (Images & Videos) */}
              {reviewingTask.uploadedFiles && reviewingTask.uploadedFiles.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Uploaded Media ({reviewingTask.uploadedFiles.length} files)
                  </h5>
                  <div className="grid grid-cols-1 gap-3">
                    {reviewingTask.uploadedFiles.map((file, i) => (
                      <div key={i} className="border rounded-lg overflow-hidden bg-gray-50">
                        {file.type === 'image' ? (
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="block">
                            <img 
                              src={file.url} 
                              alt={file.name} 
                              className="w-full max-h-64 object-contain bg-gray-100"
                            />
                          </a>
                        ) : (
                          <div className="relative">
                            <video 
                              src={file.url} 
                              controls 
                              className="w-full max-h-64"
                              preload="metadata"
                            >
                              Your browser does not support video playback.
                            </video>
                          </div>
                        )}
                        <div className="p-2 flex items-center justify-between bg-white border-t">
                          <div className="flex items-center gap-2">
                            {file.type === 'video' ? (
                              <Play className="w-4 h-4 text-purple-500" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-green-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.uploadedAt}
                              </p>
                            </div>
                          </div>
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              {reviewingTask.explanation && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Student's Explanation
                  </h5>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{reviewingTask.explanation}</p>
                  </div>
                </div>
              )}

              {/* AI Interactions */}
              {reviewingTask.aiInteractions && reviewingTask.aiInteractions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-700 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Interactions ({reviewingTask.aiInteractions.length} messages)
                    </h5>
                    <button
                      onClick={() => generateAISummary(reviewingTask)}
                      disabled={generatingSummary}
                      className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      {generatingSummary ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <BarChart3 className="w-4 h-4" />
                      )}
                      Generate AI Summary
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                    {reviewingTask.aiInteractions.map((msg, i) => (
                      <div key={i} className={`p-2 rounded ${
                        msg.role === 'user' ? 'bg-purple-100 ml-8' : 'bg-white mr-8'
                      }`}>
                        <p className="text-sm text-gray-700">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary & Score */}
              {reviewingTask.aiSummary && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-purple-700">AI Assessment</h5>
                    {reviewingTask.aiScore && (
                      <span className="text-2xl font-bold text-purple-600">{reviewingTask.aiScore}/10</span>
                    )}
                  </div>
                  <p className="text-gray-700">{reviewingTask.aiSummary}</p>
                </div>
              )}

              {/* Star Rating */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
                <label className="block font-medium text-gray-700 mb-3">
                  Rate this submission (required for approval)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTaskRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= (hoverRating || taskRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-3 text-lg font-semibold text-gray-700">
                    {taskRating > 0 ? `${taskRating}/5` : 'Not rated'}
                  </span>
                </div>
                {taskRating > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {taskRating === 5 && '⭐ Outstanding work! This will be highlighted in their portfolio.'}
                    {taskRating === 4 && '👏 Great job! Solid execution of the task.'}
                    {taskRating === 3 && '👍 Good work. Meets expectations.'}
                    {taskRating === 2 && '📝 Acceptable but has room for improvement.'}
                    {taskRating === 1 && '⚠️ Meets minimum requirements. Consider providing detailed feedback.'}
                  </p>
                )}
              </div>

              {/* Rework Reason */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Reason for Rework (if requesting rework)
                </label>
                <textarea
                  value={reworkReason}
                  onChange={(e) => setReworkReason(e.target.value)}
                  placeholder="Explain what needs to be improved..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleApproveTask(reviewingTask)}
                  disabled={taskRating === 0}
                  className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    taskRating > 0 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  {taskRating > 0 ? `Approve with ${taskRating}★` : 'Rate to Approve'}
                </button>
                <button
                  onClick={() => handleRequestRework(reviewingTask)}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Request Rework
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
