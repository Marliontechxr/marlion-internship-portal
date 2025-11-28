'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@marlion/config';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  Save,
  X,
  FileText,
  Users,
  CheckCircle,
  Clock,
  Eye,
  Upload,
  Link,
  Image,
  Video,
  File,
  ExternalLink,
  MessageSquare,
  Bot,
  BookOpen
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  duration: number; // Always in days
}

interface Attachment {
  id: string;
  type: 'file' | 'url' | 'image' | 'video';
  name: string;
  url: string;
}

interface BootcampInteraction {
  id: string;
  studentId: string;
  moduleTitle: string;
  sectionTitle?: string;
  interactionType: 'quiz' | 'doubt';
  question: string;
  answer: string;
  passed?: boolean;
  attemptNumber?: number;
  createdAt: any;
}

interface ProblemStatement {
  id: string;
  title: string;
  stream: string;
  description: string;
  techStack: string[];
  tasks: Task[];
  deliverables: string[];
  attachments: Attachment[];
  createdAt: Timestamp;
  isActive: boolean;
}

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  problemStatementId: string;
  problemStatementTitle: string;
  whyThisProblem: string;
  proposedIdea: string;
  previousExperience: string;
  noveltyProposal: string;
  status: 'pending' | 'approved' | 'reassigned';
  assignedProblemId?: string;
  assignedProblemTitle?: string;
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
}

const STREAMS = [
  'General',
  'ar-vr',
  'fullstack',
  'agentic-ai',
  'data-science'
];

const STREAM_LABELS: Record<string, string> = {
  'General': 'General (All Students)',
  'ar-vr': 'AR/VR Development',
  'fullstack': 'Full-Stack Development',
  'agentic-ai': 'Agentic AI',
  'data-science': 'Data Science'
};

export default function ProjectsPage() {
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'statements' | 'submissions'>('statements');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    stream: 'General',
    description: '',
    techStack: '',
    tasks: [{ id: '1', title: '', duration: 1 }],
    deliverables: '',
    attachments: [] as Attachment[]
  });
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // View state
  const [expandedStatement, setExpandedStatement] = useState<string | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);
  const [reassignProblemId, setReassignProblemId] = useState<string>('');
  
  // Bootcamp interactions state
  const [bootcampInteractions, setBootcampInteractions] = useState<BootcampInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [showInteractions, setShowInteractions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Load bootcamp interactions when viewing a submission
  useEffect(() => {
    if (viewingSubmission) {
      loadBootcampInteractions(viewingSubmission.studentId);
    } else {
      setBootcampInteractions([]);
      setShowInteractions(false);
    }
  }, [viewingSubmission]);

  const loadBootcampInteractions = async (studentId: string) => {
    setLoadingInteractions(true);
    try {
      const interactionsQuery = query(
        collection(db, 'bootcampInteractions'),
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(interactionsQuery);
      const interactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BootcampInteraction[];
      setBootcampInteractions(interactions);
    } catch (error) {
      console.error('Error loading bootcamp interactions:', error);
    } finally {
      setLoadingInteractions(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch problem statements
      const statementsQuery = query(
        collection(db, 'problemStatements'),
        orderBy('createdAt', 'desc')
      );
      const statementsSnap = await getDocs(statementsQuery);
      const statementsData = statementsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProblemStatement[];
      setProblemStatements(statementsData);

      // Fetch submissions
      const submissionsQuery = query(
        collection(db, 'problemSubmissions'),
        orderBy('submittedAt', 'desc')
      );
      const submissionsSnap = await getDocs(submissionsQuery);
      const submissionsData = submissionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Submission[];
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      title: formData.title,
      stream: formData.stream,
      description: formData.description,
      techStack: formData.techStack.split(',').map(t => t.trim()).filter(Boolean),
      tasks: formData.tasks.filter(t => t.title.trim()).map(t => ({
        ...t,
        duration: Number(t.duration) || 1
      })),
      deliverables: formData.deliverables.split('\n').map(d => d.trim()).filter(Boolean),
      attachments: formData.attachments,
      isActive: true,
      createdAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'problemStatements', editingId), data);
      } else {
        await addDoc(collection(db, 'problemStatements'), data);
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving problem statement:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newAttachments: Attachment[] = [];
      
      for (const file of Array.from(files)) {
        const fileRef = ref(storage, `problem-attachments/${Date.now()}-${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        
        let type: Attachment['type'] = 'file';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        
        newAttachments.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type,
          name: file.name,
          url
        });
      }
      
      setFormData({
        ...formData,
        attachments: [...formData.attachments, ...newAttachments]
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const addUrlAttachment = () => {
    if (!urlInput.trim()) return;
    
    let type: Attachment['type'] = 'url';
    const url = urlInput.trim();
    
    // Detect type from URL
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
      type = 'video';
    } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
      type = 'image';
    } else if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(url)) {
      type = 'file';
    }
    
    const newAttachment: Attachment = {
      id: Date.now().toString(),
      type,
      name: url.split('/').pop() || 'Link',
      url
    };
    
    setFormData({
      ...formData,
      attachments: [...formData.attachments, newAttachment]
    });
    setUrlInput('');
  };

  const removeAttachment = (id: string) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter(a => a.id !== id)
    });
  };

  const handleEdit = (statement: ProblemStatement) => {
    setFormData({
      title: statement.title,
      stream: statement.stream,
      description: statement.description,
      techStack: statement.techStack.join(', '),
      tasks: statement.tasks.length > 0 ? statement.tasks.map(t => ({
        ...t,
        duration: Number(t.duration) || 1
      })) : [{ id: '1', title: '', duration: 1 }],
      deliverables: statement.deliverables.join('\n'),
      attachments: statement.attachments || []
    });
    setEditingId(statement.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this problem statement?')) return;
    
    try {
      await deleteDoc(doc(db, 'problemStatements', id));
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      stream: 'General',
      description: '',
      techStack: '',
      tasks: [{ id: '1', title: '', duration: 1 }],
      deliverables: '',
      attachments: []
    });
    setEditingId(null);
    setShowForm(false);
    setUrlInput('');
  };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [...formData.tasks, { id: Date.now().toString(), title: '', duration: 1 }]
    });
  };

  const updateTask = (id: string, field: 'title' | 'duration', value: string | number) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.map(t => t.id === id ? { ...t, [field]: field === 'duration' ? Number(value) || 1 : value } : t)
    });
  };

  const removeTask = (id: string) => {
    if (formData.tasks.length <= 1) return;
    setFormData({
      ...formData,
      tasks: formData.tasks.filter(t => t.id !== id)
    });
  };

  const handleApproveSubmission = async (submission: Submission) => {
    try {
      // Update submission status
      await updateDoc(doc(db, 'problemSubmissions', submission.id), {
        status: 'approved',
        reviewedAt: serverTimestamp()
      });

      // Update student record and set status to active
      await updateDoc(doc(db, 'students', submission.studentId), {
        status: 'active',
        projectAssignment: {
          problemStatementId: submission.problemStatementId,
          problemStatementTitle: submission.problemStatementTitle,
          status: 'approved',
          assignedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      fetchData();
      setViewingSubmission(null);
    } catch (error) {
      console.error('Error approving submission:', error);
    }
  };

  const handleReassignSubmission = async (submission: Submission) => {
    if (!reassignProblemId) return;

    const selectedProblem = problemStatements.find(p => p.id === reassignProblemId);
    if (!selectedProblem) return;

    try {
      // Update submission status
      await updateDoc(doc(db, 'problemSubmissions', submission.id), {
        status: 'assigned',
        assignedProblemId: reassignProblemId,
        assignedProblemTitle: selectedProblem.title,
        reviewedAt: serverTimestamp()
      });

      // Update student record and set status to active
      await updateDoc(doc(db, 'students', submission.studentId), {
        status: 'active',
        projectAssignment: {
          problemStatementId: reassignProblemId,
          problemStatementTitle: selectedProblem.title,
          status: 'assigned',
          assignedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      fetchData();
      setViewingSubmission(null);
      setReassignProblemId('');
    } catch (error) {
      console.error('Error reassigning submission:', error);
    }
  };

  const getApplicableProblems = (submission: Submission) => {
    // Get student's stream from their submission context
    const studentSubmission = submissions.find(s => s.studentId === submission.studentId);
    return problemStatements.filter(p => 
      p.id !== submission.problemStatementId && p.isActive
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Problem Statements</h1>
        {activeTab === 'statements' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Problem Statement
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('statements')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'statements' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Statements ({problemStatements.length})
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'submissions' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Submissions ({submissions.filter(s => s.status === 'pending').length} pending)
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingId ? 'Edit Problem Statement' : 'Add Problem Statement'}
              </h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stream</label>
                <select
                  value={formData.stream}
                  onChange={e => setFormData({ ...formData, stream: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {STREAMS.map(stream => (
                    <option key={stream} value={stream}>{STREAM_LABELS[stream] || stream}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tech Stack & Tools (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.techStack}
                  onChange={e => setFormData({ ...formData, techStack: e.target.value })}
                  placeholder="React, Node.js, Firebase, etc."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tasks & Duration (Work Breakdown)
                </label>
                {formData.tasks.map((task, index) => (
                  <div key={task.id} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={task.title}
                      onChange={e => updateTask(task.id, 'title', e.target.value)}
                      placeholder={`Task ${index + 1}`}
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={task.duration}
                        onChange={e => updateTask(task.id, 'duration', e.target.value)}
                        className="w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-500">days</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="px-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTask}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Deliverables (one per line)
                </label>
                <textarea
                  value={formData.deliverables}
                  onChange={e => setFormData({ ...formData, deliverables: e.target.value })}
                  rows={4}
                  placeholder="Working prototype&#10;Documentation&#10;Demo video"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Attachments Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments (Files, Images, Videos, URLs)
                </label>
                
                {/* File Upload */}
                <div className="flex gap-2 mb-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 ${uploading ? 'opacity-50' : ''}`}>
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {uploading ? 'Uploading...' : 'Upload Files (Images, Videos, PDFs)'}
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* URL Input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="Add URL (YouTube, images, documents...)"
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addUrlAttachment}
                    disabled={!urlInput.trim()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    <Link className="w-4 h-4" />
                  </button>
                </div>

                {/* Attachments List */}
                {formData.attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {formData.attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        {att.type === 'image' && <Image className="w-4 h-4 text-green-600" />}
                        {att.type === 'video' && <Video className="w-4 h-4 text-red-600" />}
                        {att.type === 'file' && <File className="w-4 h-4 text-blue-600" />}
                        {att.type === 'url' && <Link className="w-4 h-4 text-purple-600" />}
                        <span className="flex-1 text-sm truncate">{att.name}</span>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submission View Modal */}
      {viewingSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Submission Details</h2>
              <button 
                onClick={() => { setViewingSubmission(null); setReassignProblemId(''); }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Student</p>
                <p className="font-medium">{viewingSubmission.studentName}</p>
                <p className="text-sm text-gray-600">{viewingSubmission.studentEmail}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Applied For</p>
                <p className="font-medium">{viewingSubmission.problemStatementTitle}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Why this problem?</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{viewingSubmission.whyThisProblem}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Proposed Idea & Action Plan</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{viewingSubmission.proposedIdea}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Previous Experience</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{viewingSubmission.previousExperience || 'None mentioned'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Novelty/Innovation Proposal</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{viewingSubmission.noveltyProposal || 'None mentioned'}</p>
              </div>

              {/* Bootcamp Interactions Section */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowInteractions(!showInteractions)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-700">
                      Bootcamp Interactions ({bootcampInteractions.length})
                    </span>
                  </div>
                  {showInteractions ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                
                {showInteractions && (
                  <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                    {loadingInteractions ? (
                      <div className="text-center py-4 text-gray-500">Loading interactions...</div>
                    ) : bootcampInteractions.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No bootcamp interactions recorded yet.
                      </div>
                    ) : (
                      bootcampInteractions.map((interaction) => (
                        <div 
                          key={interaction.id} 
                          className={`p-3 rounded-lg border ${
                            interaction.interactionType === 'quiz' 
                              ? interaction.passed 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-yellow-50 border-yellow-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {interaction.interactionType === 'quiz' ? (
                              <CheckCircle className={`w-4 h-4 ${interaction.passed ? 'text-green-600' : 'text-yellow-600'}`} />
                            ) : (
                              <Bot className="w-4 h-4 text-blue-600" />
                            )}
                            <span className="text-xs font-medium text-gray-600">
                              {interaction.interactionType === 'quiz' ? 'Quiz' : 'Doubt'} • {interaction.moduleTitle}
                            </span>
                            {interaction.attemptNumber && (
                              <span className="text-xs text-gray-500">
                                (Attempt {interaction.attemptNumber})
                              </span>
                            )}
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-gray-700 mb-1">Q: {interaction.question}</p>
                            <p className="text-gray-600">A: {interaction.answer}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {viewingSubmission.status === 'pending' && (
                <>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Or Reassign to Different Problem:</p>
                    <select
                      value={reassignProblemId}
                      onChange={e => setReassignProblemId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a problem statement...</option>
                      {getApplicableProblems(viewingSubmission).map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.stream})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => handleApproveSubmission(viewingSubmission)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Original Choice
                    </button>
                    {reassignProblemId && (
                      <button
                        onClick={() => handleReassignSubmission(viewingSubmission)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Reassign to Selected
                      </button>
                    )}
                  </div>
                </>
              )}

              {viewingSubmission.status !== 'pending' && (
                <div className={`p-4 rounded-lg ${
                  viewingSubmission.status === 'approved' ? 'bg-green-50' : 'bg-blue-50'
                }`}>
                  <p className="font-medium">
                    {viewingSubmission.status === 'approved' 
                      ? '✓ Approved - Original choice confirmed'
                      : `✓ Reassigned to: ${viewingSubmission.assignedProblemTitle}`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statements Tab Content */}
      {activeTab === 'statements' && (
        <div className="space-y-4">
          {problemStatements.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No problem statements yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-blue-600 hover:text-blue-700"
              >
                Create your first one
              </button>
            </div>
          ) : (
            problemStatements.map(statement => (
              <div key={statement.id} className="bg-white border rounded-lg overflow-hidden">
                <div 
                  className="p-4 flex justify-between items-start cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedStatement(
                    expandedStatement === statement.id ? null : statement.id
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{statement.title}</h3>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {statement.stream}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{statement.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(statement); }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(statement.id); }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedStatement === statement.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedStatement === statement.id && (
                  <div className="border-t p-4 bg-gray-50 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Tech Stack & Tools</p>
                      <div className="flex flex-wrap gap-2">
                        {statement.techStack.map((tech, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-200 text-gray-700 text-sm rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Tasks & Duration</p>
                      <div className="space-y-2">
                        {statement.tasks.map((task, i) => (
                          <div key={i} className="flex justify-between bg-white p-2 rounded">
                            <span className="text-sm">{i + 1}. {task.title}</span>
                            <span className="text-sm text-gray-500">{task.duration} {task.duration === 1 ? 'day' : 'days'}</span>
                          </div>
                        ))}
                        <div className="flex justify-between bg-blue-50 p-2 rounded font-medium">
                          <span className="text-sm">Total Duration</span>
                          <span className="text-sm text-blue-600">
                            {statement.tasks.reduce((sum, t) => sum + (Number(t.duration) || 0), 0)} days
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Expected Deliverables</p>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {statement.deliverables.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Attachments Display */}
                    {statement.attachments && statement.attachments.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Attachments</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {statement.attachments.map((att, i) => (
                            <a
                              key={i}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-white rounded border hover:bg-gray-50"
                            >
                              {att.type === 'image' && <Image className="w-4 h-4 text-green-600" />}
                              {att.type === 'video' && <Video className="w-4 h-4 text-red-600" />}
                              {att.type === 'file' && <File className="w-4 h-4 text-blue-600" />}
                              {att.type === 'url' && <Link className="w-4 h-4 text-purple-600" />}
                              <span className="text-sm truncate flex-1">{att.name}</span>
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Submissions Tab Content */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No submissions yet</p>
            </div>
          ) : (
            submissions.map(submission => (
              <div 
                key={submission.id} 
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setViewingSubmission(submission)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{submission.studentName}</h3>
                    <p className="text-sm text-gray-500">{submission.studentEmail}</p>
                    <p className="text-sm text-blue-600 mt-1">
                      Applied for: {submission.problemStatementTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {submission.status === 'pending' ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    ) : submission.status === 'approved' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Approved
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Reassigned
                      </span>
                    )}
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
