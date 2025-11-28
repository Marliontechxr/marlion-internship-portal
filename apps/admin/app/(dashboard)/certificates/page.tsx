'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '@marlion/config';
import { 
  Award, 
  CheckCircle, 
  Clock, 
  Eye, 
  Search,
  User,
  Building2,
  Code2,
  Calendar,
  Edit2,
  X,
  Loader2,
  Sparkles,
  FileText,
  QrCode,
  MessageSquare
} from 'lucide-react';

interface Student {
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
  certificateRequested?: boolean;
  certificateRequestedAt?: any;
  certificateApproved?: boolean;
  certificateApprovedAt?: any;
  certificateSummary?: string;
  certificateId?: string;
  adminFeedback?: string;
  feedbackConversation?: Array<{role: string; content: string}>;
  aiInterviewSummary?: string;
  aiScore?: number;
}

interface CompletedTask {
  title: string;
  description: string;
  explanation?: string;
  aiSummary?: string;
  aiScore?: number;
}

// Helper to get actual college name
const getCollegeName = (student: Student): string => {
  if (student.college === 'Other' && student.collegeOther) {
    return student.collegeOther;
  }
  return student.college;
};

// Stream display names
const streamNames: Record<string, string> = {
  'ar-vr': 'AR/VR Development',
  'fullstack': 'Full-Stack Development',
  'agentic-ai': 'Agentic AI',
  'data-science': 'Data Science & Analytics'
};

export default function CertificatesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'requested' | 'approved'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [adminFeedbackText, setAdminFeedbackText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      // Get completed students or those who requested certificates
      const studentsSnap = await getDocs(collection(db, 'students'));
      const allStudents = studentsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as Student)
        .filter(s => s.status === 'completed' || s.certificateRequested)
        .sort((a, b) => {
          // Requested but not approved first
          if (a.certificateRequested && !a.certificateApproved && !(b.certificateRequested && !b.certificateApproved)) return -1;
          if (b.certificateRequested && !b.certificateApproved && !(a.certificateRequested && !a.certificateApproved)) return 1;
          return 0;
        });
      
      setStudents(allStudents);
      setLoading(false);
    } catch (error) {
      console.error('Error loading students:', error);
      setLoading(false);
    }
  };

  const loadStudentDetails = async (student: Student) => {
    setSelectedStudent(student);
    setSummaryText(student.certificateSummary || '');
    setAdminFeedbackText(student.adminFeedback || '');
    
    try {
      // Load completed tasks
      const tasksQuery = query(
        collection(db, 'projectTasks'),
        where('studentId', '==', student.id)
      );
      const tasksSnap = await getDocs(tasksQuery);
      const completed = tasksSnap.docs
        .map(d => d.data())
        .filter(t => t.status === 'completed' && t.isAdminTask)
        .map(t => ({
          title: t.title,
          description: t.description || '',
          explanation: t.explanation,
          aiSummary: t.aiSummary,
          aiScore: t.aiScore
        }));
      setCompletedTasks(completed);
    } catch (error) {
      console.error('Error loading student details:', error);
    }
  };

  const generateAISummary = async () => {
    if (!selectedStudent) return;
    
    setGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-certificate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: selectedStudent.name,
          stream: streamNames[selectedStudent.chosenStream] || selectedStudent.chosenStream,
          college: getCollegeName(selectedStudent),
          department: selectedStudent.department,
          completedTasks: completedTasks,
          interviewSummary: selectedStudent.aiInterviewSummary,
          interviewScore: selectedStudent.aiScore
        })
      });

      const data = await response.json();
      setSummaryText(data.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const approveCertificate = async () => {
    if (!selectedStudent || !summaryText.trim()) {
      alert('Please provide a certificate summary before approving.');
      return;
    }

    setApproving(true);
    try {
      const certificateId = `MARLION-2025-${selectedStudent.id.substring(0, 8).toUpperCase()}`;
      
      await updateDoc(doc(db, 'students', selectedStudent.id), {
        certificateApproved: true,
        certificateApprovedAt: serverTimestamp(),
        certificateSummary: summaryText,
        adminFeedback: adminFeedbackText.trim() || null,
        certificateId: certificateId,
        updatedAt: serverTimestamp()
      });

      // Refresh
      await loadStudents();
      setSelectedStudent(null);
      setAdminFeedbackText('');
    } catch (error) {
      console.error('Error approving certificate:', error);
      alert('Failed to approve certificate. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'requested') {
      return matchesSearch && s.certificateRequested && !s.certificateApproved;
    }
    if (filterStatus === 'approved') {
      return matchesSearch && s.certificateApproved;
    }
    return matchesSearch;
  });

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Award className="w-8 h-8 text-purple-500" />
          Certificate Management
        </h1>
        <p className="text-gray-400 mt-1">Review and approve internship completion certificates</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {students.filter(s => s.certificateRequested && !s.certificateApproved).length}
              </p>
              <p className="text-sm text-gray-400">Pending Review</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {students.filter(s => s.certificateApproved).length}
              </p>
              <p className="text-sm text-gray-400">Approved</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Award className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {students.filter(s => s.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-400">Completed Internship</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === 'all' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('requested')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === 'requested' ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            Approved
          </button>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Student</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 hidden md:table-cell">Stream</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 hidden lg:table-cell">Progress</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{student.name}</p>
                      <p className="text-sm text-gray-400">{student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                    {streamNames[student.chosenStream] || student.chosenStream}
                  </span>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${student.projectProgress || 0}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400">{student.projectProgress || 0}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {student.certificateApproved ? (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Approved
                    </span>
                  ) : student.certificateRequested ? (
                    <span className="flex items-center gap-1 text-amber-400 text-sm">
                      <Clock className="w-4 h-4" />
                      Pending
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Not Requested</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => loadStudentDetails(student)}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-sm transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStudents.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            No students found matching your criteria.
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedStudent.name}</h2>
                <p className="text-gray-400 text-sm">{selectedStudent.email}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Building2 className="w-4 h-4" />
                    College
                  </div>
                  <p className="text-white font-medium">{getCollegeName(selectedStudent)}</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Code2 className="w-4 h-4" />
                    Stream
                  </div>
                  <p className="text-white font-medium">
                    {streamNames[selectedStudent.chosenStream] || selectedStudent.chosenStream}
                  </p>
                </div>
                <div className="p-4 bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Duration
                  </div>
                  <p className="text-white font-medium">
                    {formatDate(selectedStudent.internshipStart)} - {formatDate(selectedStudent.internshipEnd)}
                  </p>
                </div>
              </div>

              {/* Interview Summary */}
              {selectedStudent.aiInterviewSummary && (
                <div className="p-4 bg-gray-800 rounded-xl">
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Interview Summary (Score: {selectedStudent.aiScore}/100)
                  </h3>
                  <p className="text-gray-300 text-sm">{selectedStudent.aiInterviewSummary}</p>
                </div>
              )}

              {/* Completed Tasks */}
              <div>
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Completed Tasks ({completedTasks.length})
                </h3>
                <div className="space-y-2">
                  {completedTasks.map((task, i) => (
                    <div key={i} className="p-3 bg-gray-800 rounded-lg">
                      <p className="text-white font-medium">{task.title}</p>
                      {task.explanation && (
                        <p className="text-gray-400 text-sm mt-1">{task.explanation}</p>
                      )}
                      {task.aiScore && (
                        <span className="text-xs text-purple-400 mt-1 inline-block">
                          AI Score: {task.aiScore}/100
                        </span>
                      )}
                    </div>
                  ))}
                  {completedTasks.length === 0 && (
                    <p className="text-gray-400 text-sm">No tasks completed yet.</p>
                  )}
                </div>
              </div>

              {/* Student Feedback (from exit conversation) */}
              {selectedStudent.feedbackConversation && selectedStudent.feedbackConversation.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    Student Feedback
                  </h3>
                  <div className="bg-gray-800 rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
                    {selectedStudent.feedbackConversation.map((msg, i) => (
                      <div key={i} className={`p-2 rounded ${
                        msg.role === 'user' ? 'bg-blue-500/20 ml-4' : 'bg-gray-700 mr-4'
                      }`}>
                        <p className="text-xs text-gray-400 mb-1">
                          {msg.role === 'user' ? 'Student' : 'AI'}
                        </p>
                        <p className="text-sm text-gray-300">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificate Summary */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    Certificate Summary
                  </h3>
                  <button
                    onClick={generateAISummary}
                    disabled={generating}
                    className="px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate with AI
                  </button>
                </div>
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="Enter a personalized summary of the student's internship journey and achievements..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Admin Feedback (optional personal message) */}
              {!selectedStudent.certificateApproved && (
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Personal Message for Student (Optional)
                  </h3>
                  <textarea
                    value={adminFeedbackText}
                    onChange={(e) => setAdminFeedbackText(e.target.value)}
                    placeholder="Add a personal congratulatory message or feedback that will be shown to the student when they download their certificate..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This message will be displayed to the student on their certificate page.
                  </p>
                </div>
              )}

              {/* Actions */}
              {!selectedStudent.certificateApproved && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={approveCertificate}
                    disabled={approving || !summaryText.trim()}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {approving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve Certificate
                  </button>
                </div>
              )}

              {selectedStudent.certificateApproved && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Certificate Approved</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Approved on {formatDate(selectedStudent.certificateApprovedAt)}
                  </p>
                  {selectedStudent.certificateId && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                      <QrCode className="w-4 h-4" />
                      ID: {selectedStudent.certificateId}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
