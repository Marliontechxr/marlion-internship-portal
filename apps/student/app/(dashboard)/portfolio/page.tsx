'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@marlion/ui/providers';
import { db } from '@marlion/config';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy
} from 'firebase/firestore';
import { 
  Download, 
  Linkedin, 
  Star, 
  Award, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Github,
  ExternalLink,
  Share2,
  Briefcase,
  GraduationCap,
  Code,
  Sparkles,
  Trophy,
  MessageSquare,
  Loader2,
  Image as ImageIcon,
  Video,
  FileText,
  Play
} from 'lucide-react';
import { 
  generatePortfolioShareContent, 
  openLinkedInShare 
} from '@marlion/lib';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  rating?: number;
  estimatedDays: number;
  completedAt?: any;
  githubUrl?: string;
  explanation?: string;
  screenshots?: string[];
  uploadedFiles?: UploadedFile[];
}

interface ProblemStatement {
  id: string;
  title: string;
  description: string;
  stream: string;
}

const STREAM_LABELS: Record<string, string> = {
  'ar-vr': 'AR/VR Development',
  'fullstack': 'Full Stack Development',
  'agentic-ai': 'Agentic AI',
  'data-science': 'Data Science'
};

const STREAM_COLORS: Record<string, string> = {
  'ar-vr': 'from-purple-500 to-pink-500',
  'fullstack': 'from-blue-500 to-cyan-500',
  'agentic-ai': 'from-green-500 to-emerald-500',
  'data-science': 'from-orange-500 to-amber-500'
};

export default function PortfolioPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [project, setProject] = useState<ProblemStatement | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [canGeneratePortfolio, setCanGeneratePortfolio] = useState(false);
  const [generating, setGenerating] = useState(false);
  const portfolioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.uid) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.uid) return;
    
    try {
      // Load student data
      const studentDoc = await getDoc(doc(db, 'students', user.uid));
      if (!studentDoc.exists()) {
        setLoading(false);
        return;
      }
      const studentData = { id: studentDoc.id, ...studentDoc.data() };
      setStudent(studentData);

      // Check for approved project
      const submissionQuery = query(
        collection(db, 'problemSubmissions'),
        where('studentId', '==', user.uid),
        where('status', 'in', ['approved', 'assigned'])
      );
      const submissionSnap = await getDocs(submissionQuery);
      
      if (!submissionSnap.empty) {
        const submission = submissionSnap.docs[0].data();
        
        // Load problem statement
        const psDoc = await getDoc(doc(db, 'problemStatements', submission.problemStatementId));
        if (psDoc.exists()) {
          setProject({ id: psDoc.id, ...psDoc.data() } as ProblemStatement);
        }

        // Load completed tasks
        const tasksQuery = query(
          collection(db, 'projectTasks'),
          where('studentId', '==', user.uid),
          where('isAdminTask', '==', true)
        );
        const tasksSnap = await getDocs(tasksQuery);
        const tasksData = tasksSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Task[];
        
        // Sort by completion time
        tasksData.sort((a, b) => {
          const aTime = a.completedAt?.toMillis?.() || 0;
          const bTime = b.completedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        
        setTasks(tasksData);
        
        // Check if certificate is approved - portfolio only unlocks after certificate approval
        const certificateApproved = (studentData as any).certificateApproved === true;
        const allCompleted = tasksData.length > 0 && tasksData.every(t => t.status === 'completed');
        setCanGeneratePortfolio(allCompleted && certificateApproved);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const calculateOverallRating = () => {
    const ratedTasks = tasks.filter(t => t.rating && t.rating > 0);
    if (ratedTasks.length === 0) return 0;
    const total = ratedTasks.reduce((sum, t) => sum + (t.rating || 0), 0);
    return Math.round((total / ratedTasks.length) * 10) / 10;
  };

  // Convert image URL to base64 to avoid CORS issues
  const convertImageToBase64 = async (url: string): Promise<string | null> => {
    try {
      // Use proxy for Firebase Storage URLs to avoid CORS
      let fetchUrl = url;
      if (url.includes('firebasestorage.googleapis.com')) {
        fetchUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      }
      
      const response = await fetch(fetchUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    if (!portfolioRef.current) return;
    
    setGenerating(true);
    try {
      // Pre-convert all images to base64 to avoid CORS issues
      const images = portfolioRef.current.querySelectorAll('img');
      const originalSrcs: { img: HTMLImageElement; src: string }[] = [];
      
      for (const img of Array.from(images)) {
        if (img.src && img.src.startsWith('http')) {
          originalSrcs.push({ img, src: img.src });
          const base64 = await convertImageToBase64(img.src);
          if (base64) {
            img.src = base64;
          }
        }
      }

      const canvas = await html2canvas(portfolioRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f0f1a',
        logging: false
      });
      
      // Restore original image sources
      for (const { img, src } of originalSrcs) {
        img.src = src;
      }
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Handle multi-page if content is too long
      if (imgHeight > 297) {
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
        
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= 297;
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }
      
      pdf.save(`${student?.name || 'Portfolio'}_Marlion_Internship.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback: try without images
      try {
        const canvas = await html2canvas(portfolioRef.current, {
          scale: 2,
          useCORS: false,
          allowTaint: true,
          backgroundColor: '#0f0f1a',
          logging: false,
          ignoreElements: (element) => element.tagName === 'IMG'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${student?.name || 'Portfolio'}_Marlion_Internship.pdf`);
      } catch (fallbackError) {
        console.error('Fallback PDF generation also failed:', fallbackError);
        alert('Failed to generate PDF. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleShareToLinkedIn = () => {
    if (!student || !project) return;
    
    const overallRating = calculateOverallRating();
    // Use share page URL with OG metadata for rich LinkedIn preview
    const portfolioUrl = `https://internship.marliontech.com/share/portfolio/${student.id}?name=${encodeURIComponent(student.name)}&stream=${encodeURIComponent(student.chosenStream)}&rating=${overallRating.toFixed(1)}`;
    
    openLinkedInShare(generatePortfolioShareContent({
      studentName: student.name,
      stream: student.chosenStream,
      projectTitle: project.title,
      projectDescription: project.description || '',
      overallRating,
      portfolioUrl,
      adminFeedback: student.mentorFeedback || ''
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-marlion-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-marlion-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-marlion-bg p-6">
        <div className="max-w-2xl mx-auto text-center py-16">
          <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Portfolio Not Available</h1>
          <p className="text-gray-400">Complete your registration to access your portfolio.</p>
        </div>
      </div>
    );
  }

  if (!canGeneratePortfolio) {
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const totalCount = tasks.length;
    const allTasksComplete = totalCount > 0 && completedCount === totalCount;
    const certificateApproved = student?.certificateApproved === true;
    
    return (
      <div className="min-h-screen bg-marlion-bg p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-marlion-card rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
              {allTasksComplete ? (
                <Award className="w-10 h-10 text-yellow-500" />
              ) : (
                <Clock className="w-10 h-10 text-yellow-500" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">
              {allTasksComplete && !certificateApproved 
                ? 'Awaiting Certificate Approval' 
                : 'Portfolio In Progress'
              }
            </h1>
            <p className="text-gray-400 mb-6">
              {allTasksComplete && !certificateApproved 
                ? 'Your portfolio will unlock once your certificate is approved by the admin. This ensures your portfolio includes the official recognition and feedback.'
                : 'Complete all your project tasks and get your certificate approved to unlock your shareable portfolio.'
              }
            </p>
            
            <div className="space-y-4 mb-6">
              {/* Task Progress */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${allTasksComplete ? 'text-green-500' : 'text-gray-500'}`} />
                    Project Tasks
                  </span>
                  <span className="text-white font-semibold">{completedCount}/{totalCount}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${allTasksComplete ? 'bg-green-500' : 'bg-gradient-to-r from-marlion-primary to-marlion-accent'}`}
                    style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              {/* Certificate Status */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Award className={`w-4 h-4 ${certificateApproved ? 'text-green-500' : 'text-gray-500'}`} />
                    Certificate
                  </span>
                  <span className={`font-semibold ${certificateApproved ? 'text-green-500' : 'text-yellow-500'}`}>
                    {certificateApproved ? 'Approved ✓' : student?.certificateRequested ? 'Pending Review' : 'Not Requested'}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-500">
              {allTasksComplete 
                ? "Hang tight! Once approved, your portfolio will showcase your internship journey with official Marlion recognition."
                : "Keep up the great work! Your portfolio will showcase your internship journey at Marlion."
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  const overallRating = calculateOverallRating();
  const streamLabel = STREAM_LABELS[student.chosenStream] || student.chosenStream;
  const streamColor = STREAM_COLORS[student.chosenStream] || 'from-purple-500 to-pink-500';

  return (
    <div className="min-h-screen bg-marlion-bg p-4 md:p-6">
      {/* Action Bar */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-marlion-primary" />
          Your Portfolio
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>
          <button
            onClick={handleShareToLinkedIn}
            className="flex items-center gap-2 px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg transition-all"
          >
            <Linkedin className="w-4 h-4" />
            Share to LinkedIn
          </button>
        </div>
      </div>

      {/* Portfolio Content */}
      <div 
        ref={portfolioRef}
        className="max-w-4xl mx-auto bg-marlion-card rounded-2xl border border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${streamColor} p-6 md:p-8`}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Photo */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-4 border-white/30">
              {student.profilePhotoUrl ? (
                <img 
                  src={student.profilePhotoUrl} 
                  alt={student.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl md:text-5xl font-bold text-white">
                  {student.name?.charAt(0) || 'S'}
                </span>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">{student.name}</h2>
              <p className="text-white/80 flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4" />
                {student.college === 'Other' ? student.collegeOther : student.college} • {student.department}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium">
                  {streamLabel}
                </span>
                {overallRating > 0 && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-yellow-400/20 rounded-full text-yellow-300 text-sm font-medium">
                    <Star className="w-4 h-4 fill-current" />
                    {overallRating} / 5
                  </span>
                )}
              </div>
            </div>
            
            {/* Marlion Badge */}
            <div className="text-right hidden md:block">
              <div className="text-white/60 text-sm">Internship at</div>
              <div className="text-white text-xl font-bold">Marlion Technologies</div>
              <div className="text-white/60 text-sm">Winter 2025</div>
            </div>
          </div>
        </div>

        {/* Project Section */}
        {project && (
          <div className="p-6 md:p-8 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-marlion-primary" />
              Project
            </h3>
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-xl font-bold text-white mb-2">{project.title}</h4>
              <p className="text-gray-400">{project.description}</p>
            </div>
          </div>
        )}

        {/* Tasks Section */}
        <div className="p-6 md:p-8 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Completed Tasks ({tasks.filter(t => t.status === 'completed').length})
          </h3>
          <div className="space-y-4">
            {tasks.filter(t => t.status === 'completed').map(task => (
              <div key={task.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-white mb-1">{task.title}</h4>
                    <p className="text-sm text-gray-400 line-clamp-2">{task.description}</p>
                  </div>
                  {task.rating && (
                    <div className="flex items-center gap-1 shrink-0">
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
                    </div>
                  )}
                </div>
                
                {/* Work explanation */}
                {task.explanation && (
                  <div className="mb-3 bg-white/5 rounded-lg p-3">
                    <p className="text-sm text-gray-300 italic">"{task.explanation}"</p>
                  </div>
                )}
                
                {/* GitHub Link */}
                {task.githubUrl && (
                  <a 
                    href={task.githubUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors mb-3"
                  >
                    <Github className="w-4 h-4" />
                    View Source Code
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                
                {/* Media Gallery - Screenshots */}
                {task.screenshots && task.screenshots.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      Screenshots
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {task.screenshots.map((url, idx) => (
                        <a 
                          key={idx} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="relative group"
                        >
                          <img 
                            src={url} 
                            alt={`Screenshot ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-white/10 hover:border-marlion-primary transition-colors"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                            <ExternalLink className="w-4 h-4 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Media Gallery - Uploaded Files (Images and Videos) */}
                {task.uploadedFiles && task.uploadedFiles.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Uploaded Media
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {task.uploadedFiles.map((file, idx) => {
                        const isVideo = file.type.startsWith('video/');
                        const isImage = file.type.startsWith('image/');
                        
                        if (isImage) {
                          return (
                            <a 
                              key={idx} 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative group"
                            >
                              <img 
                                src={file.url} 
                                alt={file.name}
                                className="w-20 h-20 object-cover rounded-lg border border-white/10 hover:border-marlion-primary transition-colors"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                                <ExternalLink className="w-4 h-4 text-white" />
                              </div>
                            </a>
                          );
                        }
                        
                        if (isVideo) {
                          return (
                            <a 
                              key={idx} 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative group"
                            >
                              <div className="w-20 h-20 bg-gray-800 rounded-lg border border-white/10 hover:border-marlion-primary transition-colors flex items-center justify-center">
                                <Play className="w-8 h-8 text-white" />
                              </div>
                              <div className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/60 rounded px-1 truncate">
                                {file.name}
                              </div>
                            </a>
                          );
                        }
                        
                        // Other files
                        return (
                          <a 
                            key={idx} 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="truncate max-w-[100px]">{file.name}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* GitHub Repositories Section */}
        {tasks.some(t => t.githubUrl) && (
          <div className="p-6 md:p-8 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Github className="w-5 h-5 text-gray-300" />
              Code Repositories
            </h3>
            <div className="grid gap-3">
              {tasks
                .filter(t => t.githubUrl)
                .map(task => (
                  <a
                    key={task.id}
                    href={task.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-marlion-primary/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                        <Github className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{task.title}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[300px]">{task.githubUrl}</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-marlion-primary transition-colors" />
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div className="p-6 md:p-8 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Internship Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{tasks.length}</p>
              <p className="text-sm text-gray-400">Total Tasks</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{tasks.filter(t => t.status === 'completed').length}</p>
              <p className="text-sm text-gray-400">Completed</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{overallRating || '-'}</p>
              <p className="text-sm text-gray-400">Avg Rating</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-marlion-primary">
                {tasks.reduce((sum, t) => sum + (t.estimatedDays || 0), 0)}
              </p>
              <p className="text-sm text-gray-400">Days Worked</p>
            </div>
          </div>
        </div>

        {/* Admin/Mentor Feedback */}
        {(student.adminFeedback || student.mentorFeedback) && (
          <div className="p-6 md:p-8 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              Feedback from Marlion
            </h3>
            {student.adminFeedback && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-emerald-500/20 mb-3">
                <p className="text-xs text-emerald-400 mb-1 font-medium">Certificate Feedback</p>
                <p className="text-gray-300 italic">"{student.adminFeedback}"</p>
              </div>
            )}
            {student.mentorFeedback && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
                <p className="text-xs text-blue-400 mb-1 font-medium">Mentor Notes</p>
                <p className="text-gray-300 italic">"{student.mentorFeedback}"</p>
              </div>
            )}
          </div>
        )}

        {/* Certificate Summary */}
        {student.certificateSummary && (
          <div className="p-6 md:p-8 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Performance Summary
            </h3>
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/20">
              <p className="text-gray-300">{student.certificateSummary}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 md:p-8 bg-white/5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <p className="text-gray-400 text-sm">This portfolio is verified by</p>
              <p className="text-white font-semibold">Marlion Technologies</p>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Winter Internship 2025</span>
            </div>
            <div className="text-gray-500 text-xs">
              internship.marliontech.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
