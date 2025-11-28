'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  getDocs, 
  addDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@marlion/config';
import { 
  FileText, 
  ChevronRight,
  ChevronDown,
  Send,
  CheckCircle,
  Clock,
  ArrowLeft,
  Lightbulb,
  Code,
  Calendar,
  Package,
  Lock
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

interface ProblemStatement {
  id: string;
  title: string;
  stream: string;
  description: string;
  techStack: string[];
  tasks: Task[];
  deliverables: string[];
  attachments?: Attachment[];
  createdAt: Timestamp;
  isActive: boolean;
}

interface Submission {
  id: string;
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
}

interface StudentData {
  chosenStream: string;
  bootcampCompleted?: boolean;
  projectAssignment?: {
    problemStatementId: string;
    problemStatementTitle: string;
    status: string;
  };
}

export default function ProblemStatementsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootcampComplete, setBootcampComplete] = useState(false);

  // View states
  const [selectedProblem, setSelectedProblem] = useState<ProblemStatement | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    whyThisProblem: '',
    proposedIdea: '',
    previousExperience: '',
    noveltyProposal: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      // Get student data - try by uid first, then by email
      let studentDoc = await getDoc(doc(db, 'students', currentUser.uid));
      let studentId = currentUser.uid;
      
      if (!studentDoc.exists() && currentUser.email) {
        // Try to find by email
        const studentsQuery = query(
          collection(db, 'students'),
          where('email', '==', currentUser.email)
        );
        const studentsSnap = await getDocs(studentsQuery);
        if (!studentsSnap.empty) {
          studentDoc = studentsSnap.docs[0] as any;
          studentId = studentsSnap.docs[0].id;
        }
      }
      
      if (studentDoc.exists()) {
        const data = studentDoc.data() as any;
        setStudentData(data);

        // Check bootcamp completion from student's bootcampProgress
        // Get all sections and modules to calculate completion
        try {
          // Map student's stream values to admin's section stream values
          const streamMapping: { [key: string]: string } = {
            'ar-vr': 'ar-vr',
            'fullstack': 'fullstack',
            'agentic-ai': 'agentic-ai',
            'data-science': 'data-science',
          };
          
          const sectionsSnap = await getDocs(collection(db, 'sections'));
          const allSections = sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          // Filter sections by student's stream with proper mapping
          const studentStreamRaw = data.chosenStream?.toLowerCase().trim() || '';
          const mappedStream = streamMapping[studentStreamRaw] || studentStreamRaw;
          
          const relevantSections = allSections.filter((s: any) => {
            const sectionStream = s.stream?.toLowerCase().trim();
            return sectionStream === 'general' || sectionStream === mappedStream;
          });
          
          // Get all modules for relevant sections
          const modulesSnap = await getDocs(collection(db, 'modules'));
          const allModules = modulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          const relevantSectionIds = new Set(relevantSections.map((s: any) => s.id));
          const relevantModules = allModules.filter((m: any) => relevantSectionIds.has(m.sectionId));
          
          // Check if all relevant modules are completed
          const completedModules = data.bootcampProgress?.completedModules || [];
          
          console.log('Bootcamp check:', {
            studentStream: studentStreamRaw,
            mappedStream: mappedStream,
            relevantModulesCount: relevantModules.length,
            completedModulesCount: completedModules.length,
            relevantModuleIds: relevantModules.map((m: any) => m.id),
            completedModuleIds: completedModules
          });
          
          // If no modules exist yet, check by totalProgress
          if (relevantModules.length === 0) {
            const totalProgress = data.bootcampProgress?.totalProgress || 0;
            setBootcampComplete(totalProgress >= 15);
          } else {
            const isComplete = relevantModules.every((m: any) => completedModules.includes(m.id));
            setBootcampComplete(isComplete);
          }
        } catch (error) {
          console.error('Error checking bootcamp completion:', error);
          // Fallback: check if bootcampProgress.totalProgress >= 15 (full bootcamp)
          const totalProgress = data.bootcampProgress?.totalProgress || 0;
          setBootcampComplete(totalProgress >= 15);
        }

        // Fetch problem statements for student's stream
        fetchProblemStatements(data.chosenStream);

        // Listen for student's submission
        const submissionQuery = query(
          collection(db, 'problemSubmissions'),
          where('studentId', '==', studentId)
        );
        
        const unsubSubmission = onSnapshot(submissionQuery, (snapshot) => {
          if (!snapshot.empty) {
            const subDoc = snapshot.docs[0];
            setMySubmission({ id: subDoc.id, ...subDoc.data() } as Submission);
          }
        });

        setLoading(false);
        return () => unsubSubmission();
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, [router]);

  const fetchProblemStatements = async (stream: string) => {
    try {
      // Map student's stream values to admin's problem statement stream values
      const streamMapping: { [key: string]: string } = {
        // Registration stream values -> Admin problem statement stream values
        'ar-vr': 'ar-vr',
        'fullstack': 'fullstack',
        'agentic-ai': 'agentic-ai',
        'data-science': 'data-science',
      };

      const mappedStream = streamMapping[stream] || stream;
      console.log('Student stream:', stream, '-> Mapped to:', mappedStream);

      // Get problems matching student's stream or General
      const problemsSnap = await getDocs(collection(db, 'problemStatements'));
      const problems = problemsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement))
        .filter(p => {
          const matches = p.isActive && (p.stream === 'General' || p.stream === mappedStream);
          console.log('Problem:', p.title, 'Stream:', p.stream, 'Matches:', matches);
          return matches;
        });
      
      setProblemStatements(problems);
    } catch (error) {
      console.error('Error fetching problem statements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProblem) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'problemSubmissions'), {
        studentId: user.uid,
        studentName: user.displayName || 'Unknown',
        studentEmail: user.email,
        problemStatementId: selectedProblem.id,
        problemStatementTitle: selectedProblem.title,
        whyThisProblem: formData.whyThisProblem,
        proposedIdea: formData.proposedIdea,
        previousExperience: formData.previousExperience,
        noveltyProposal: formData.noveltyProposal,
        status: 'pending',
        submittedAt: serverTimestamp()
      });

      setShowApplyForm(false);
      setSelectedProblem(null);
      setFormData({
        whyThisProblem: '',
        proposedIdea: '',
        previousExperience: '',
        noveltyProposal: ''
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if bootcamp is complete
  if (!bootcampComplete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Complete Bootcamp First</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You need to complete all bootcamp modules before you can submit a problem statement solution.
          </p>
          <button
            onClick={() => router.push('/bootcamp')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Bootcamp
          </button>
        </div>
      </div>
    );
  }

  // Show submission status if already submitted
  if (mySubmission) {
    const assignedProblem = mySubmission.status === 'reassigned' 
      ? problemStatements.find(p => p.id === mySubmission.assignedProblemId)
      : problemStatements.find(p => p.id === mySubmission.problemStatementId);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Submission</h1>

          {mySubmission.status === 'pending' ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">Under Review</h2>
              </div>
              <p className="text-yellow-700 dark:text-yellow-200">
                Your submission for "<strong>{mySubmission.problemStatementTitle}</strong>" is being reviewed. 
                You will be notified once approved.
              </p>
            </div>
          ) : mySubmission.status === 'approved' ? (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                <h2 className="text-lg font-semibold text-green-800 dark:text-green-300">Approved!</h2>
              </div>
              <p className="text-green-700 dark:text-green-200">
                Congratulations! Your choice has been approved. You will be working on:
              </p>
              <p className="text-green-800 dark:text-green-100 font-semibold mt-2">
                "{mySubmission.problemStatementTitle}"
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Problem Assigned</h2>
              </div>
              <p className="text-blue-700 dark:text-blue-200">
                After carefully reviewing your submission and current performance, a better matching 
                problem statement has been assigned to you:
              </p>
              <p className="text-blue-800 dark:text-blue-100 font-semibold mt-2">
                "{mySubmission.assignedProblemTitle}"
              </p>
            </div>
          )}

          {/* Show assigned problem details */}
          {(mySubmission.status === 'approved' || mySubmission.status === 'reassigned') && assignedProblem && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Problem Details</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
                  <p className="text-gray-700 dark:text-gray-300">{assignedProblem.description}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Tech Stack</p>
                  <div className="flex flex-wrap gap-2">
                    {assignedProblem.techStack.map((tech, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Tasks</p>
                  <div className="space-y-2">
                    {assignedProblem.tasks.map((task, i) => (
                      <div key={i} className="flex justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <span className="text-gray-900 dark:text-white">{i + 1}. {task.title}</span>
                        <span className="text-gray-500 dark:text-gray-400">{task.duration} {task.duration === 1 ? 'day' : 'days'}</span>
                      </div>
                    ))}
                    <div className="flex justify-between bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg font-medium">
                      <span className="text-blue-800 dark:text-blue-200">Total Duration</span>
                      <span className="text-blue-600 dark:text-blue-300">
                        {assignedProblem.tasks.reduce((sum, t) => sum + (Number(t.duration) || 0), 0)} days
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Expected Deliverables</p>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                    {assignedProblem.deliverables.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => router.push('/project')}
                className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Go to Project Tracker
              </button>
            </div>
          )}

          {/* Show original submission details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Application</h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Why this problem?</p>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{mySubmission.whyThisProblem}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Your proposed idea</p>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{mySubmission.proposedIdea}</p>
              </div>
              {mySubmission.previousExperience && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Previous experience</p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{mySubmission.previousExperience}</p>
                </div>
              )}
              {mySubmission.noveltyProposal && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Novelty/Innovation</p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{mySubmission.noveltyProposal}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Apply form modal
  if (showApplyForm && selectedProblem) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => { setShowApplyForm(false); }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Apply for Problem Statement</h2>
            <p className="text-blue-600 dark:text-blue-400 font-medium mb-6">{selectedProblem.title}</p>

            <form onSubmit={handleApply} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Why do you want to work on this problem? *
                </label>
                <textarea
                  value={formData.whyThisProblem}
                  onChange={e => setFormData({ ...formData, whyThisProblem: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Explain your interest and motivation..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What is your proposed idea and action plan? *
                </label>
                <textarea
                  value={formData.proposedIdea}
                  onChange={e => setFormData({ ...formData, proposedIdea: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Describe your approach and how you plan to tackle this problem..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Do you have any previous experience with similar projects?
                </label>
                <textarea
                  value={formData.previousExperience}
                  onChange={e => setFormData({ ...formData, previousExperience: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Share any relevant experience or projects you've worked on..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Any novelty or innovation you'd like to propose?
                </label>
                <textarea
                  value={formData.noveltyProposal}
                  onChange={e => setFormData({ ...formData, noveltyProposal: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Share any unique ideas or improvements you'd like to implement..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Application
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Problem detail view
  if (selectedProblem) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setSelectedProblem(null)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to list
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm mb-3 inline-block">
                {selectedProblem.stream}
              </span>
              <h1 className="text-2xl font-bold">{selectedProblem.title}</h1>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Description
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedProblem.description}</p>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Tech Stack & Tools
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProblem.techStack.map((tech, i) => (
                    <span 
                      key={i} 
                      className="px-4 py-2 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Tasks & Timeline
                </h3>
                <div className="space-y-2">
                  {selectedProblem.tasks.map((task, i) => (
                    <div 
                      key={i} 
                      className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{i + 1}. {task.title}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm bg-white dark:bg-gray-600 px-3 py-1 rounded-full">
                        {task.duration} {task.duration === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg font-medium">
                    <span className="text-blue-800 dark:text-blue-200">Total Duration</span>
                    <span className="text-blue-600 dark:text-blue-300 bg-white dark:bg-blue-800 px-3 py-1 rounded-full text-sm">
                      {selectedProblem.tasks.reduce((sum, t) => sum + (Number(t.duration) || 0), 0)} days
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Expected Deliverables
                </h3>
                <ul className="space-y-2">
                  {selectedProblem.deliverables.map((d, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Attachments Section */}
              {selectedProblem.attachments && selectedProblem.attachments.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Resources & Attachments
                  </h3>
                  <div className="grid gap-2">
                    {selectedProblem.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        {att.type === 'image' && (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        {att.type === 'video' && (
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                        {att.type === 'file' && (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        {att.type === 'url' && (
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}
                        <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{att.name}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowApplyForm(true)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 font-semibold text-lg flex items-center justify-center gap-2"
              >
                <Lightbulb className="w-5 h-5" />
                Apply for This Problem
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Problem statements list
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Choose Your Project</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a problem statement that matches your interests and skills. 
            Read through each one carefully before applying.
          </p>
        </div>

        {problemStatements.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Problem Statements Available</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Problem statements for your stream haven't been published yet. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {problemStatements.map(problem => (
              <div
                key={problem.id}
                onClick={() => setSelectedProblem(problem)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer p-6 border border-transparent hover:border-blue-200 dark:hover:border-blue-700"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                        {problem.stream}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{problem.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{problem.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {problem.techStack.slice(0, 4).map((tech, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                          {tech}
                        </span>
                      ))}
                      {problem.techStack.length > 4 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                          +{problem.techStack.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 ml-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
