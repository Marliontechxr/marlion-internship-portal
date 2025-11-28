'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Badge, Modal, Spinner } from '@marlion/ui/components';
import type { Student } from '@marlion/config/types';
import { Search, Filter, Eye, CheckCircle, XCircle, Ban, MoreVertical, MessageSquare, BookOpen, FolderKanban, Award, FileCheck, Download, CreditCard } from 'lucide-react';
import { generateIdCardHTML } from '@marlion/lib/utils';

interface InterviewData {
  studentId: string;
  transcript: Array<{ role: string; content: string }>;
  summary: string;
  score: number;
  completedAt: Date | null;
}

interface StudentJourney {
  interview: 'pending' | 'completed' | 'approved' | 'rejected';
  offerLetter: 'pending' | 'downloaded';
  bootcamp: 'not_started' | 'in_progress' | 'completed';
  bootcampProgress: number;
  projectSelection: 'not_started' | 'submitted' | 'approved' | 'assigned';
  projectWork: 'not_started' | 'in_progress' | 'completed';
  projectProgress: number;
  certificate: 'not_eligible' | 'eligible' | 'requested' | 'approved' | 'issued';
  overallProgress: number;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentJourneys, setStudentJourneys] = useState<Record<string, StudentJourney>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [streamFilter, setStreamFilter] = useState('all');
  const [journeyFilter, setJourneyFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<InterviewData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingInterview, setLoadingInterview] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Calculate student journey from their data
  const calculateJourney = (student: Student): StudentJourney => {
    // Handle bootcampProgress which can be number or object
    const rawBootcampProgress = student.bootcampProgress;
    const bootcampProgress = typeof rawBootcampProgress === 'number' 
      ? rawBootcampProgress 
      : (rawBootcampProgress?.totalProgress || 0);
    const projectProgress = typeof student.projectProgress === 'number' 
      ? student.projectProgress 
      : 0;
    
    // Interview status
    let interview: StudentJourney['interview'] = 'pending';
    if (student.status === 'interview_done') interview = 'completed';
    else if (student.status === 'selected' || student.status === 'offer_downloaded' || student.status === 'active' || student.status === 'completed') interview = 'approved';
    else if (student.status === 'rejected') interview = 'rejected';
    
    // Offer letter status - check both status field and offerDownloaded boolean
    const offerLetter: StudentJourney['offerLetter'] = 
      (student.offerDownloaded || student.status === 'offer_downloaded' || student.status === 'active' || student.status === 'completed') 
        ? 'downloaded' 
        : 'pending';
    
    // Bootcamp status
    let bootcamp: StudentJourney['bootcamp'] = 'not_started';
    if (bootcampProgress >= 100) bootcamp = 'completed';
    else if (bootcampProgress > 0) bootcamp = 'in_progress';
    
    // Project selection status
    let projectSelection: StudentJourney['projectSelection'] = 'not_started';
    if (student.assignedProblemStatement) projectSelection = 'assigned';
    else if (student.projectSubmissionStatus === 'approved') projectSelection = 'approved';
    else if (student.projectSubmissionStatus === 'pending') projectSelection = 'submitted';
    
    // Project work status
    let projectWork: StudentJourney['projectWork'] = 'not_started';
    if (projectProgress >= 100) projectWork = 'completed';
    else if (projectProgress > 0 || student.assignedProblemStatement) projectWork = 'in_progress';
    
    // Certificate status
    let certificate: StudentJourney['certificate'] = 'not_eligible';
    if (student.certificateIssued) certificate = 'issued';
    else if (student.certificateApproved) certificate = 'approved';
    else if (student.certificateRequested) certificate = 'requested';
    else if (student.status === 'completed' || projectProgress >= 100) certificate = 'eligible';
    
    // Overall progress calculation
    const bootcampWeight = 15;
    const projectAssignWeight = 15;
    const projectWorkWeight = 70;
    
    let overallProgress = 0;
    if (bootcamp === 'completed') overallProgress += bootcampWeight;
    else overallProgress += (bootcampProgress / 100) * bootcampWeight;
    
    if (projectSelection === 'assigned' || projectSelection === 'approved') overallProgress += projectAssignWeight;
    
    overallProgress += (projectProgress / 100) * projectWorkWeight;
    
    return {
      interview,
      offerLetter,
      bootcamp,
      bootcampProgress,
      projectSelection,
      projectWork,
      projectProgress,
      certificate,
      overallProgress: Math.round(overallProgress)
    };
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch('/api/students');
        const data = await response.json();
        const studentsList = data.students || [];
        setStudents(studentsList);
        
        // Calculate journeys for all students
        const journeys: Record<string, StudentJourney> = {};
        studentsList.forEach((student: Student) => {
          journeys[student.id] = calculateJourney(student);
        });
        setStudentJourneys(journeys);
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    const matchesStream = streamFilter === 'all' || student.chosenStream === streamFilter;
    
    // Journey filter
    let matchesJourney = true;
    if (journeyFilter !== 'all') {
      const journey = studentJourneys[student.id];
      if (journey) {
        switch (journeyFilter) {
          case 'interview_pending':
            matchesJourney = journey.interview === 'pending' || journey.interview === 'completed';
            break;
          case 'offer_pending':
            matchesJourney = journey.interview === 'approved' && journey.offerLetter === 'pending';
            break;
          case 'bootcamp_active':
            matchesJourney = journey.bootcamp === 'in_progress';
            break;
          case 'bootcamp_done':
            matchesJourney = journey.bootcamp === 'completed';
            break;
          case 'project_pending':
            matchesJourney = journey.projectSelection === 'submitted';
            break;
          case 'project_active':
            matchesJourney = journey.projectWork === 'in_progress';
            break;
          case 'project_done':
            matchesJourney = journey.projectWork === 'completed';
            break;
          case 'cert_requested':
            matchesJourney = journey.certificate === 'requested';
            break;
          case 'cert_issued':
            matchesJourney = journey.certificate === 'issued';
            break;
        }
      }
    }
    
    return matchesSearch && matchesStatus && matchesStream && matchesJourney;
  });

  // Journey status badge component
  const JourneyBadge = ({ status, label }: { status: string; label: string }) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'default'> = {
      'completed': 'success',
      'approved': 'success',
      'downloaded': 'success',
      'assigned': 'success',
      'issued': 'success',
      'in_progress': 'warning',
      'submitted': 'warning',
      'requested': 'warning',
      'pending': 'secondary',
      'not_started': 'secondary',
      'not_eligible': 'secondary',
      'eligible': 'default',
      'rejected': 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'} className="text-xs">{label}</Badge>;
  };

  const handleAction = async (studentId: string, action: 'accept' | 'reject' | 'ban') => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/students/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action }),
      });
      
      if (response.ok) {
        // Refresh students
        setStudents((prev) => prev.map((s) => {
          if (s.id === studentId) {
            return {
              ...s,
              status: action === 'accept' ? 'selected' : action === 'reject' ? 'rejected' : 'banned',
            };
          }
          return s;
        }));
        setIsModalOpen(false);
        setSelectedStudent(null);
        setSelectedInterview(null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchInterviewData = async (studentId: string) => {
    setLoadingInterview(true);
    try {
      const response = await fetch(`/api/interviews?studentId=${studentId}`);
      const data = await response.json();
      setSelectedInterview(data.interview || null);
    } catch (error) {
      console.error('Error fetching interview:', error);
      setSelectedInterview(null);
    } finally {
      setLoadingInterview(false);
    }
  };

  const openStudentModal = async (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
    if (student.status === 'interview_done' || student.aiScore) {
      await fetchInterviewData(student.id);
    }
  };

  const statusBadgeVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    registered: 'secondary',
    interview_pending: 'warning',
    interview_done: 'warning',
    selected: 'success',
    rejected: 'destructive',
    offer_downloaded: 'success',
    active: 'success',
    completed: 'success',
    banned: 'destructive',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
        <Badge>{filteredStudents.length} students</Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'registered', label: 'Registered' },
                  { value: 'interview_pending', label: 'Interview Pending' },
                  { value: 'interview_done', label: 'Under Review' },
                  { value: 'selected', label: 'Selected' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'banned', label: 'Banned' },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
              <Select
                options={[
                  { value: 'all', label: 'All Streams' },
                  { value: 'ar-vr', label: 'AR/VR Development' },
                  { value: 'fullstack', label: 'Full-Stack Development' },
                  { value: 'agentic-ai', label: 'Agentic AI' },
                  { value: 'data-science', label: 'Data Science' },
                ]}
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 self-center mr-2">Journey Stage:</span>
              <Select
                options={[
                  { value: 'all', label: 'All Stages' },
                  { value: 'interview_pending', label: '🎯 Interview Pending' },
                  { value: 'offer_pending', label: '📄 Offer Not Downloaded' },
                  { value: 'bootcamp_active', label: '📚 Bootcamp In Progress' },
                  { value: 'bootcamp_done', label: '✅ Bootcamp Completed' },
                  { value: 'project_pending', label: '📝 Project Selection Pending' },
                  { value: 'project_active', label: '🔨 Project Work Active' },
                  { value: 'project_done', label: '🏆 Project Completed' },
                  { value: 'cert_requested', label: '📜 Certificate Requested' },
                  { value: 'cert_issued', label: '🎓 Certificate Issued' },
                ]}
                value={journeyFilter}
                onChange={(e) => setJourneyFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stream</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interview</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bootcamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.map((student) => {
                const journey = studentJourneys[student.id] || calculateJourney(student);
                return (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.email}</div>
                        <div className="text-xs text-gray-400">{student.college}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-xs text-gray-600 dark:text-gray-300">
                        {student.chosenStream === 'ar-vr' && '🥽 AR/VR'}
                        {student.chosenStream === 'fullstack' && '💻 Full Stack'}
                        {student.chosenStream === 'agentic-ai' && '🤖 Agentic AI'}
                        {student.chosenStream === 'data-science' && '📊 Data Science'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <JourneyBadge 
                          status={journey.interview} 
                          label={journey.interview === 'approved' ? '✓ Approved' : 
                                 journey.interview === 'completed' ? 'Review' : 
                                 journey.interview === 'rejected' ? '✗ Rejected' : 'Pending'} 
                        />
                        {student.aiScore && (
                          <span className={`text-xs ${student.aiScore >= 70 ? 'text-green-600' : student.aiScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            Score: {student.aiScore}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {journey.interview === 'approved' ? (
                        <JourneyBadge 
                          status={journey.offerLetter} 
                          label={journey.offerLetter === 'downloaded' ? '✓ Downloaded' : 'Pending'} 
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {journey.offerLetter === 'downloaded' || journey.bootcamp !== 'not_started' ? (
                        <div className="flex flex-col gap-1">
                          <JourneyBadge 
                            status={journey.bootcamp} 
                            label={journey.bootcamp === 'completed' ? '✓ Done' : 
                                   journey.bootcamp === 'in_progress' ? 'Active' : 'Not Started'} 
                          />
                          {journey.bootcamp !== 'not_started' && (
                            <div className="flex items-center gap-1">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${journey.bootcampProgress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{journey.bootcampProgress}%</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {journey.bootcamp === 'completed' || journey.projectSelection !== 'not_started' ? (
                        <div className="flex flex-col gap-1">
                          <JourneyBadge 
                            status={journey.projectWork !== 'not_started' ? journey.projectWork : journey.projectSelection} 
                            label={journey.projectWork === 'completed' ? '✓ Done' : 
                                   journey.projectWork === 'in_progress' ? 'Working' : 
                                   journey.projectSelection === 'assigned' ? 'Assigned' :
                                   journey.projectSelection === 'approved' ? 'Approved' :
                                   journey.projectSelection === 'submitted' ? 'Review' : 'Selecting'} 
                          />
                          {journey.projectWork !== 'not_started' && (
                            <div className="flex items-center gap-1">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500 rounded-full transition-all"
                                  style={{ width: `${journey.projectProgress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{journey.projectProgress}%</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <JourneyBadge 
                        status={journey.certificate} 
                        label={journey.certificate === 'issued' ? '🎓 Issued' : 
                               journey.certificate === 'approved' ? '✓ Approved' : 
                               journey.certificate === 'requested' ? '📜 Requested' : 
                               journey.certificate === 'eligible' ? 'Eligible' : '—'} 
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                journey.overallProgress >= 100 ? 'bg-green-500' : 
                                journey.overallProgress >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${journey.overallProgress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {journey.overallProgress}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openStudentModal(student)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No students found matching your criteria.
            </div>
          )}
        </div>
      </Card>

      {/* Student Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStudent(null);
          setSelectedInterview(null);
        }}
        title={selectedStudent?.name || 'Student Details'}
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Journey Timeline */}
            {(() => {
              const journey = studentJourneys[selectedStudent.id] || calculateJourney(selectedStudent);
              return (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Internship Journey
                  </h4>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">Overall Progress</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{journey.overallProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        journey.overallProgress >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                        journey.overallProgress >= 50 ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 
                        'bg-gradient-to-r from-yellow-500 to-orange-500'
                      }`}
                      style={{ width: `${journey.overallProgress}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className={`text-center p-2 rounded-lg ${journey.interview === 'approved' ? 'bg-green-100 dark:bg-green-900/30' : journey.interview === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <div className="text-lg">{journey.interview === 'approved' ? '✅' : journey.interview === 'rejected' ? '❌' : journey.interview === 'completed' ? '⏳' : '🎯'}</div>
                      <div className="text-xs font-medium">Interview</div>
                      <div className="text-xs text-gray-500">{journey.interview}</div>
                    </div>
                    <div className={`text-center p-2 rounded-lg ${journey.offerLetter === 'downloaded' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <div className="text-lg">{journey.offerLetter === 'downloaded' ? '📄' : '⬜'}</div>
                      <div className="text-xs font-medium">Offer Letter</div>
                      <div className="text-xs text-gray-500">{journey.offerLetter}</div>
                    </div>
                    <div className={`text-center p-2 rounded-lg ${journey.bootcamp === 'completed' ? 'bg-green-100 dark:bg-green-900/30' : journey.bootcamp === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <div className="text-lg">{journey.bootcamp === 'completed' ? '📚' : journey.bootcamp === 'in_progress' ? '📖' : '⬜'}</div>
                      <div className="text-xs font-medium">Bootcamp</div>
                      <div className="text-xs text-gray-500">{journey.bootcampProgress}%</div>
                    </div>
                    <div className={`text-center p-2 rounded-lg ${journey.projectWork === 'completed' ? 'bg-green-100 dark:bg-green-900/30' : journey.projectWork === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <div className="text-lg">{journey.projectWork === 'completed' ? '🏆' : journey.projectWork === 'in_progress' ? '🔨' : journey.projectSelection !== 'not_started' ? '📝' : '⬜'}</div>
                      <div className="text-xs font-medium">Project</div>
                      <div className="text-xs text-gray-500">{journey.projectProgress}%</div>
                    </div>
                    <div className={`text-center p-2 rounded-lg ${journey.certificate === 'issued' ? 'bg-green-100 dark:bg-green-900/30' : journey.certificate === 'requested' || journey.certificate === 'approved' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <div className="text-lg">{journey.certificate === 'issued' ? '🎓' : journey.certificate === 'approved' ? '✅' : journey.certificate === 'requested' ? '📜' : '⬜'}</div>
                      <div className="text-xs font-medium">Certificate</div>
                      <div className="text-xs text-gray-500">{journey.certificate}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{selectedStudent.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{selectedStudent.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">College</p>
                <p className="font-medium">{selectedStudent.college}{selectedStudent.collegeOther ? ` (${selectedStudent.collegeOther})` : ''}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{selectedStudent.department} - Year {selectedStudent.year}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Stream</p>
                <p className="font-medium">{selectedStudent.chosenStream}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">AI Score</p>
                <p className="font-medium">{selectedStudent.aiScore ? `${selectedStudent.aiScore}%` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Laptop Configuration</p>
                <p className="font-medium">{selectedStudent.laptopConfig || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Graphics Card</p>
                <p className="font-medium">{selectedStudent.graphicsCard || 'N/A'}</p>
              </div>
            </div>

            {/* College ID Card */}
            {selectedStudent.collegeIdUrl && (
              <div>
                <p className="text-sm text-gray-500 mb-2">College ID Card</p>
                <a 
                  href={selectedStudent.collegeIdUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View ID Card
                </a>
              </div>
            )}

            {selectedStudent.aiInterviewSummary && (
              <div>
                <p className="text-sm text-gray-500 mb-2">AI Interview Summary</p>
                <p className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  {selectedStudent.aiInterviewSummary}
                </p>
              </div>
            )}

            {/* Interview Transcript */}
            {loadingInterview ? (
              <div className="flex items-center justify-center py-4">
                <Spinner size="sm" />
                <span className="ml-2 text-gray-500">Loading interview...</span>
              </div>
            ) : selectedInterview?.transcript && selectedInterview.transcript.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Interview Transcript</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
                  {selectedInterview.transcript.map((msg, idx) => {
                    const isAI = msg.role === 'assistant' || msg.role === 'ai';
                    return (
                      <div key={idx} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          isAI 
                            ? 'bg-slate-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 border-l-3 border-blue-500' 
                            : 'bg-blue-600 text-white'
                        }`}>
                          <p className={`text-xs font-semibold mb-1 ${isAI ? 'text-blue-600 dark:text-blue-400' : 'text-blue-100'}`}>
                            {isAI ? '🤖 AI Interviewer' : '👤 Student'}
                          </p>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedInterview.summary && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">AI Summary</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedInterview.summary}</p>
                  </div>
                )}
              </div>
            ) : null}

            {selectedStudent.status === 'interview_done' && (
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleAction(selectedStudent.id, 'accept')}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Spinner size="sm" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleAction(selectedStudent.id, 'reject')}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Spinner size="sm" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Reject
                </Button>
              </div>
            )}

            {/* Generate ID Card Button */}
            {['selected', 'offer_downloaded', 'active', 'completed'].includes(selectedStudent.status) && (
              <Button
                variant="outline"
                className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                onClick={() => {
                  const collegeName = selectedStudent.college === 'Other' && (selectedStudent as any).collegeOther 
                    ? (selectedStudent as any).collegeOther 
                    : selectedStudent.college;
                  
                  const html = generateIdCardHTML({
                    studentName: selectedStudent.name,
                    college: collegeName,
                    department: selectedStudent.department,
                    stream: selectedStudent.chosenStream,
                    photoUrl: (selectedStudent as any).profilePhotoUrl,
                    studentId: selectedStudent.id.slice(-8).toUpperCase(),
                    validFrom: selectedStudent.internshipStart instanceof Date 
                      ? selectedStudent.internshipStart 
                      : new Date((selectedStudent.internshipStart as any)?.seconds * 1000 || Date.now()),
                    validTo: selectedStudent.internshipEnd instanceof Date 
                      ? selectedStudent.internshipEnd 
                      : new Date((selectedStudent.internshipEnd as any)?.seconds * 1000 || Date.now()),
                  });
                  
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ID_Card_${selectedStudent.name.replace(/\s+/g, '_')}.html`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Download ID Card (Print Ready)
              </Button>
            )}

            {!['banned', 'rejected'].includes(selectedStudent.status) && (
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleAction(selectedStudent.id, 'ban')}
                disabled={actionLoading}
              >
                {actionLoading ? <Spinner size="sm" /> : <Ban className="w-4 h-4 mr-2" />}
                Ban Student
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
