'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  where,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@marlion/config/firebase';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Video, 
  BookOpen,
  Save,
  X,
  GripVertical,
  Eye,
  Users,
  MessageSquare,
  Send
} from 'lucide-react';

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

interface StudentProgress {
  studentId: string;
  studentName: string;
  email: string;
  completedModules: string[];
  totalProgress: number;
  quizScores: Record<string, number>;
}

interface BootcampComment {
  id: string;
  moduleId: string;
  authorId: string;
  authorName: string;
  authorType: 'admin' | 'student';
  content: string;
  createdAt: any;
}

const STREAMS = [
  { value: 'general', label: 'General (All Students)' },
  { value: 'ar-vr', label: 'AR/VR Development' },
  { value: 'fullstack', label: 'Full-Stack Development' },
  { value: 'agentic-ai', label: 'Agentic AI' },
  { value: 'data-science', label: 'Data Science' },
];

export default function CoursesPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  // View mode: 'content' or 'comments'
  const [viewMode, setViewMode] = useState<'content' | 'comments'>('content');
  
  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState({ title: '', stream: 'general' });
  
  // Module form
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({
    sectionId: '',
    title: '',
    youtubeUrl: '',
    transcript: '',
    objectives: '',
    duration: 3,
  });
  
  // Student progress view
  const [showProgress, setShowProgress] = useState(false);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState<BootcampComment[]>([]);
  const [selectedModuleForComments, setSelectedModuleForComments] = useState<string>('');
  const [adminReplyInput, setAdminReplyInput] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Fetch sections and modules
  useEffect(() => {
    fetchData();
  }, []);

  // Load comments when switching to comments view or changing module
  useEffect(() => {
    if (viewMode !== 'comments') return;
    
    // Simple query without composite index - sort client-side
    const commentsRef = collection(db, 'bootcampComments');
    const commentsQuery = selectedModuleForComments
      ? query(commentsRef, where('moduleId', '==', selectedModuleForComments))
      : commentsRef;
    
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BootcampComment[];
      // Sort by createdAt descending client-side
      commentsData.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      setComments(commentsData);
    });
    
    return () => unsubscribe();
  }, [viewMode, selectedModuleForComments]);

  const fetchData = async () => {
    try {
      // Fetch sections - simple query without composite index
      const sectionsRef = collection(db, 'sections');
      const sectionsSnap = await getDocs(sectionsRef);
      const sectionsData = sectionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Section[];
      // Sort locally
      sectionsData.sort((a, b) => (a.order || 0) - (b.order || 0));
      setSections(sectionsData);

      // Fetch ALL modules in one query and group by sectionId
      const modulesRef = collection(db, 'modules');
      const modulesSnap = await getDocs(modulesRef);
      const modulesMap: Record<string, Module[]> = {};
      
      // Initialize empty arrays for each section
      sectionsData.forEach(section => {
        modulesMap[section.id] = [];
      });
      
      // Group modules by sectionId
      modulesSnap.docs.forEach(doc => {
        const data = doc.data();
        const mod = {
          id: doc.id,
          ...data
        } as Module;
        
        if (modulesMap[mod.sectionId]) {
          modulesMap[mod.sectionId].push(mod);
        } else {
          modulesMap[mod.sectionId] = [mod];
        }
      });
      
      // Sort modules locally by order
      Object.keys(modulesMap).forEach(sectionId => {
        modulesMap[sectionId].sort((a, b) => (a.order || 0) - (b.order || 0));
      });
      
      setModules(modulesMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Comment operations
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    
    try {
      await deleteDoc(doc(db, 'bootcampComments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleAdminReply = async (moduleId: string) => {
    if (!adminReplyInput.trim()) return;
    
    setSubmittingReply(true);
    try {
      await addDoc(collection(db, 'bootcampComments'), {
        moduleId,
        authorId: 'admin',
        authorName: 'Marlion Admin',
        authorType: 'admin',
        content: adminReplyInput.trim(),
        createdAt: serverTimestamp()
      });
      setAdminReplyInput('');
    } catch (error) {
      console.error('Error adding admin reply:', error);
    } finally {
      setSubmittingReply(false);
    }
  };

  const getModuleTitle = (moduleId: string) => {
    for (const sectionId in modules) {
      const mod = modules[sectionId]?.find(m => m.id === moduleId);
      if (mod) return mod.title;
    }
    return 'Unknown Module';
  };

  const formatCommentTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Section operations
  const handleSaveSection = async () => {
    try {
      if (editingSection) {
        await updateDoc(doc(db, 'sections', editingSection.id), {
          title: sectionForm.title,
          stream: sectionForm.stream,
        });
      } else {
        await addDoc(collection(db, 'sections'), {
          title: sectionForm.title,
          stream: sectionForm.stream,
          order: sections.length,
          createdAt: serverTimestamp(),
        });
      }
      
      setShowSectionForm(false);
      setEditingSection(null);
      setSectionForm({ title: '', stream: 'general' });
      fetchData();
    } catch (error) {
      console.error('Error saving section:', error);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section and all its modules?')) return;
    
    try {
      // Delete all modules in this section
      const sectionModules = modules[sectionId] || [];
      for (const module of sectionModules) {
        await deleteDoc(doc(db, 'modules', module.id));
      }
      
      await deleteDoc(doc(db, 'sections', sectionId));
      fetchData();
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  };

  const startEditSection = (section: Section) => {
    setEditingSection(section);
    setSectionForm({ title: section.title, stream: section.stream });
    setShowSectionForm(true);
  };

  // Module operations
  const handleSaveModule = async () => {
    if (!moduleForm.sectionId) {
      console.error('No sectionId provided');
      alert('Error: No section selected');
      return;
    }
    
    try {
      const sectionModules = modules[moduleForm.sectionId] || [];
      
      const moduleData = {
        sectionId: moduleForm.sectionId,
        title: moduleForm.title,
        youtubeUrl: moduleForm.youtubeUrl,
        transcript: moduleForm.transcript,
        objectives: moduleForm.objectives,
        duration: moduleForm.duration,
        order: sectionModules.length,
      };
      
      console.log('Saving module:', moduleData);
      
      if (editingModule) {
        await updateDoc(doc(db, 'modules', editingModule.id), {
          title: moduleForm.title,
          youtubeUrl: moduleForm.youtubeUrl,
          transcript: moduleForm.transcript,
          objectives: moduleForm.objectives,
          duration: moduleForm.duration,
        });
        console.log('Module updated:', editingModule.id);
      } else {
        const docRef = await addDoc(collection(db, 'modules'), {
          ...moduleData,
          createdAt: serverTimestamp(),
        });
        console.log('Module created with ID:', docRef.id);
      }
      
      setShowModuleForm(false);
      setEditingModule(null);
      setModuleForm({
        sectionId: '',
        title: '',
        youtubeUrl: '',
        transcript: '',
        objectives: '',
        duration: 3,
      });
      fetchData();
    } catch (error) {
      console.error('Error saving module:', error);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module?')) return;
    
    try {
      await deleteDoc(doc(db, 'modules', moduleId));
      fetchData();
    } catch (error) {
      console.error('Error deleting module:', error);
    }
  };

  const startEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleForm({
      sectionId: module.sectionId,
      title: module.title,
      youtubeUrl: module.youtubeUrl,
      transcript: module.transcript,
      objectives: module.objectives,
      duration: module.duration,
    });
    setShowModuleForm(true);
  };

  const startAddModule = (sectionId: string) => {
    setModuleForm({
      sectionId,
      title: '',
      youtubeUrl: '',
      transcript: '',
      objectives: '',
      duration: 3,
    });
    setShowModuleForm(true);
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Fetch student progress
  const fetchStudentProgress = async () => {
    setProgressLoading(true);
    try {
      const studentsRef = collection(db, 'students');
      const studentsSnap = await getDocs(studentsRef);
      
      const progressData: StudentProgress[] = [];
      studentsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.bootcampProgress) {
          progressData.push({
            studentId: doc.id,
            studentName: data.name || 'Unknown',
            email: data.email || '',
            completedModules: data.bootcampProgress.completedModules || [],
            totalProgress: data.bootcampProgress.totalProgress || 0,
            quizScores: data.bootcampProgress.quizScores || {},
          });
        }
      });
      
      setStudentProgress(progressData.sort((a, b) => b.totalProgress - a.totalProgress));
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  const openProgressView = () => {
    setShowProgress(true);
    fetchStudentProgress();
  };

  // Get total modules count
  const getTotalModulesCount = () => {
    return Object.values(modules).reduce((acc, mods) => acc + mods.length, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Course Management</h1>
          <p className="text-gray-600">
            {sections.length} sections · {getTotalModulesCount()} modules
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('content')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'content' 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-1" />
              Content
            </button>
            <button
              onClick={() => setViewMode('comments')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'comments' 
                  ? 'bg-white shadow text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Comments
            </button>
          </div>
          <button
            onClick={openProgressView}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Users className="w-4 h-4" />
            Progress
          </button>
          {viewMode === 'content' && (
            <button
              onClick={() => setShowSectionForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          )}
        </div>
      </div>

      {/* Comments View */}
      {viewMode === 'comments' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                Bootcamp Comments ({comments.length})
              </h2>
              <select
                value={selectedModuleForComments}
                onChange={(e) => setSelectedModuleForComments(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Modules</option>
                {sections.map(section => (
                  <optgroup key={section.id} label={section.title}>
                    {(modules[section.id] || []).map(mod => (
                      <option key={mod.id} value={mod.id}>{mod.title}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {comments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No comments yet.
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="p-4 hover:bg-gray-50">
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
                      comment.authorType === 'admin' 
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-600' 
                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}>
                      {comment.authorName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.authorName}</span>
                          {comment.authorType === 'admin' && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">Admin</span>
                          )}
                          <span className="text-xs text-gray-500">{formatCommentTime(comment.createdAt)}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete comment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        on: {getModuleTitle(comment.moduleId)}
                      </p>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Admin Reply Input */}
          {selectedModuleForComments && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adminReplyInput}
                  onChange={(e) => setAdminReplyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminReply(selectedModuleForComments)}
                  placeholder="Reply as admin..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleAdminReply(selectedModuleForComments)}
                  disabled={submittingReply || !adminReplyInput.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Reply
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sections List - Content View */}
      {viewMode === 'content' && (
        <div className="space-y-4">
          {sections.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sections Yet</h3>
              <p className="text-gray-600 mb-4">Create your first section to start building the bootcamp curriculum.</p>
              <button
                onClick={() => setShowSectionForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Create Section
              </button>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Section Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="font-semibold">{section.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        section.stream === 'general' 
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {STREAMS.find(s => s.value === section.stream)?.label || section.stream}
                      </span>
                      <span>· {modules[section.id]?.length || 0} modules</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => startAddModule(section.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Add Module"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEditSection(section)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Edit Section"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete Section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modules List */}
              {expandedSections.has(section.id) && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {modules[section.id]?.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No modules in this section</p>
                      <button
                        onClick={() => startAddModule(section.id)}
                        className="mt-2 text-blue-600 hover:underline text-sm"
                      >
                        + Add first module
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {modules[section.id]?.map((module, idx) => (
                        <div key={module.id} className="flex items-center justify-between p-4 hover:bg-gray-100">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{module.title}</h4>
                              <p className="text-xs text-gray-500">
                                {module.duration || 3} min · {module.youtubeUrl ? 'Video linked' : 'No video'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {module.youtubeUrl && (
                              <a
                                href={module.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                                title="Preview Video"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => startEditModule(module)}
                              className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                              title="Edit Module"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteModule(module.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete Module"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      )}

      {/* Section Form Modal */}
      {showSectionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingSection ? 'Edit Section' : 'Add Section'}
              </h2>
              <button onClick={() => {
                setShowSectionForm(false);
                setEditingSection(null);
                setSectionForm({ title: '', stream: 'general' });
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Section Title</label>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Introduction to Web Development"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Stream</label>
                <select
                  value={sectionForm.stream}
                  onChange={(e) => setSectionForm({ ...sectionForm, stream: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {STREAMS.map((stream) => (
                    <option key={stream.value} value={stream.value}>
                      {stream.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  General sections are visible to all students
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => {
                  setShowSectionForm(false);
                  setEditingSection(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSection}
                disabled={!sectionForm.title.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module Form Modal */}
      {showModuleForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingModule ? 'Edit Module' : 'Add Module'}
              </h2>
              <button onClick={() => {
                setShowModuleForm(false);
                setEditingModule(null);
                setModuleForm({
                  sectionId: '',
                  title: '',
                  youtubeUrl: '',
                  transcript: '',
                  objectives: '',
                  duration: 3,
                });
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Module Title *</label>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Understanding HTML Basics"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">YouTube URL *</label>
                  <input
                    type="url"
                    value={moduleForm.youtubeUrl}
                    onChange={(e) => setModuleForm({ ...moduleForm, youtubeUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={moduleForm.duration}
                    onChange={(e) => setModuleForm({ ...moduleForm, duration: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Video Transcript (Verbatim)
                  <span className="text-gray-500 font-normal ml-1">- For AI context</span>
                </label>
                <textarea
                  value={moduleForm.transcript}
                  onChange={(e) => setModuleForm({ ...moduleForm, transcript: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                  placeholder="Paste the full transcript of the video here. This helps AI understand the content and ask relevant questions..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is used by AI to generate contextual questions. Not shown to students.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Learning Objectives
                  <span className="text-gray-500 font-normal ml-1">- What to evaluate</span>
                </label>
                <textarea
                  value={moduleForm.objectives}
                  onChange={(e) => setModuleForm({ ...moduleForm, objectives: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                  placeholder="e.g., Student should understand:&#10;- Basic HTML structure&#10;- Common tags and their uses&#10;- Document hierarchy"
                />
                <p className="text-xs text-gray-500 mt-1">
                  AI will generate questions based on these objectives. Not shown to students.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => {
                  setShowModuleForm(false);
                  setEditingModule(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModule}
                disabled={!moduleForm.title.trim() || !moduleForm.youtubeUrl.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Module
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Progress Modal */}
      {showProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Student Bootcamp Progress</h2>
              <button onClick={() => setShowProgress(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {progressLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : studentProgress.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No student progress data yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Student</th>
                      <th className="pb-3 font-medium">Completed Modules</th>
                      <th className="pb-3 font-medium">Progress</th>
                      <th className="pb-3 font-medium">Avg Quiz Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {studentProgress.map((sp) => {
                      const avgScore = Object.values(sp.quizScores).length > 0
                        ? Math.round(Object.values(sp.quizScores).reduce((a, b) => a + b, 0) / Object.values(sp.quizScores).length)
                        : 0;
                      
                      return (
                        <tr key={sp.studentId}>
                          <td className="py-3">
                            <div className="font-medium">{sp.studentName}</div>
                            <div className="text-sm text-gray-500">{sp.email}</div>
                          </td>
                          <td className="py-3">
                            {sp.completedModules.length} / {getTotalModulesCount()}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${(sp.totalProgress / 15) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{sp.totalProgress}%</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`font-medium ${avgScore >= 70 ? 'text-green-600' : avgScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {avgScore > 0 ? `${avgScore}%` : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
