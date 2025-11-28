'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  where,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@marlion/config/firebase';
import { 
  Calendar,
  Clock,
  User,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Coffee,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Settings,
  CalendarDays,
  Timer
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  date: string;
  checkInTime?: string;
  checkInTimeFormatted?: string;
  checkOutTime?: string;
  checkOutTimeFormatted?: string;
  checkInSummary?: string;
  checkOutSummary?: string;
  checkInPlan?: string;
  checkOutProgress?: string;
  checkOutBlockers?: string;
  workDurationMinutes?: number;
  status: 'checked_in' | 'checked_out' | 'absent' | 'leave' | 'holiday';
  absentReason?: string;
}

interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminResponse?: string;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  description?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  chosenStream: string;
  college: string;
  internshipStart: any;
  internshipEnd: any;
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [view, setView] = useState<'calendar' | 'list' | 'leaves' | 'holidays'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Holiday modal state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');
  
  // Leave response modal
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [leaveResponse, setLeaveResponse] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      // Fetch students
      const studentsSnap = await getDocs(
        query(collection(db, 'students'), where('status', 'in', ['active', 'offer_downloaded', 'completed']))
      );
      const studentsData = studentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentsData);

      // Fetch attendance for selected month
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;
      
      const attendanceSnap = await getDocs(
        query(collection(db, 'attendance'), orderBy('date', 'desc'))
      );
      const attendanceData = attendanceSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((a: any) => a.date >= startDate && a.date <= endDate) as AttendanceRecord[];
      setAttendance(attendanceData);

      // Fetch leave requests
      const leavesSnap = await getDocs(
        query(collection(db, 'leaveRequests'), orderBy('createdAt', 'desc'))
      );
      const leavesData = leavesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRequest[];
      setLeaveRequests(leavesData);

      // Fetch holidays
      const holidaysSnap = await getDocs(collection(db, 'holidays'));
      const holidaysData = holidaysSnap.docs
        .filter(doc => !doc.data().deleted)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Holiday[];
      setHolidays(holidaysData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAction = async (leaveId: string, action: 'approved' | 'rejected', response?: string) => {
    try {
      const leaveRef = doc(db, 'leaveRequests', leaveId);
      const leave = leaveRequests.find(l => l.id === leaveId);
      
      await updateDoc(leaveRef, {
        status: action,
        adminResponse: response || '',
        reviewedAt: serverTimestamp()
      });

      // If approved, create attendance record as leave
      if (action === 'approved' && leave) {
        const attendanceRef = doc(db, 'attendance', `${leave.studentId}_${leave.date}`);
        await updateDoc(attendanceRef, {
          status: 'leave'
        }).catch(() => {
          // If doc doesn't exist, create it
          addDoc(collection(db, 'attendance'), {
            studentId: leave.studentId,
            studentName: leave.studentName,
            studentEmail: leave.studentEmail,
            date: leave.date,
            status: 'leave',
            createdAt: serverTimestamp()
          });
        });
      }

      setLeaveRequests(prev => 
        prev.map(l => l.id === leaveId ? { ...l, status: action, adminResponse: response } : l)
      );
      setSelectedLeave(null);
      setLeaveResponse('');
    } catch (error) {
      console.error('Error updating leave:', error);
    }
  };

  const handleAddHoliday = async () => {
    if (!holidayDate || !holidayName) return;
    
    try {
      const docRef = await addDoc(collection(db, 'holidays'), {
        date: holidayDate,
        name: holidayName,
        description: holidayDescription,
        createdAt: serverTimestamp()
      });
      
      setHolidays(prev => [...prev, {
        id: docRef.id,
        date: holidayDate,
        name: holidayName,
        description: holidayDescription
      }]);
      
      setShowHolidayModal(false);
      setHolidayDate('');
      setHolidayName('');
      setHolidayDescription('');
    } catch (error) {
      console.error('Error adding holiday:', error);
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    
    try {
      await updateDoc(doc(db, 'holidays', holidayId), { deleted: true });
      setHolidays(prev => prev.filter(h => h.id !== holidayId));
    } catch (error) {
      console.error('Error deleting holiday:', error);
    }
  };

  const exportAttendance = () => {
    const filteredAttendance = selectedStudent === 'all' 
      ? attendance 
      : attendance.filter(a => a.studentId === selectedStudent);

    const csv = [
      ['Date', 'Student Name', 'Email', 'Check-In', 'Check-Out', 'Status', 'Check-In Summary', 'Check-Out Summary'].join(','),
      ...filteredAttendance.map(a => [
        a.date,
        `"${a.studentName}"`,
        a.studentEmail,
        a.checkInTimeFormatted || '',
        a.checkOutTimeFormatted || '',
        a.status,
        `"${a.checkInSummary || ''}"`,
        `"${a.checkOutSummary || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedMonth}_${selectedStudent === 'all' ? 'all' : students.find(s => s.id === selectedStudent)?.name}.csv`;
    a.click();
  };

  const getCalendarDays = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        date: dateStr,
        attendance: attendance.filter(a => 
          a.date === dateStr && 
          (selectedStudent === 'all' || a.studentId === selectedStudent)
        )
      });
    }

    return days;
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">Track check-ins, check-outs, and leave requests</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportAttendance}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              List
            </button>
            <button
              onClick={() => setView('leaves')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'leaves' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Leaves ({leaveRequests.filter(l => l.status === 'pending').length})
            </button>
            <button
              onClick={() => setView('holidays')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'holidays' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              <CalendarDays className="w-4 h-4 inline mr-2" />
              Holidays
            </button>
          </div>

          {/* Month Picker */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                const prev = new Date(y, m - 2, 1);
                setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />
            <button
              onClick={() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                const next = new Date(y, m, 1);
                setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Student Filter */}
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white"
          >
            <option value="all">All Students</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {getCalendarDays().map((dayData, idx) => (
              <div
                key={idx}
                className={`min-h-[100px] p-2 rounded-lg border ${
                  dayData ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                }`}
              >
                {dayData && (
                  <>
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {dayData.day}
                    </div>
                    <div className="space-y-1">
                      {dayData.attendance.slice(0, 3).map((a, i) => (
                        <div
                          key={i}
                          className={`text-xs px-2 py-1 rounded-full truncate ${
                            a.status === 'checked_out' 
                              ? 'bg-green-100 text-green-700' 
                              : a.status === 'checked_in'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                          title={a.studentName}
                        >
                          {selectedStudent === 'all' ? a.studentName.split(' ')[0] : a.checkInTimeFormatted}
                        </div>
                      ))}
                      {dayData.attendance.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayData.attendance.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attendance
                  .filter(a => selectedStudent === 'all' || a.studentId === selectedStudent)
                  .map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(a.date).toLocaleDateString('en-IN', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{a.studentName}</div>
                            <div className="text-xs text-gray-500">{a.studentEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {a.checkInTimeFormatted || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {a.checkOutTimeFormatted || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          a.status === 'checked_out' 
                            ? 'bg-green-100 text-green-700' 
                            : a.status === 'checked_in'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {a.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {a.checkOutSummary || a.checkInSummary || '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Requests View */}
      {view === 'leaves' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Leave Requests</h2>
          </div>
          <div className="divide-y">
            {leaveRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No leave requests
              </div>
            ) : (
              leaveRequests.map(leave => (
                <div key={leave.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{leave.studentName}</h3>
                        <p className="text-sm text-gray-500">
                          Leave Date: {new Date(leave.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {leave.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleLeaveAction(leave.id, 'approved')}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleLeaveAction(leave.id, 'rejected')}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          leave.status === 'approved' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {leave.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Students</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Check-ins Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {attendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Coffee className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Currently Working</p>
              <p className="text-2xl font-bold text-gray-900">
                {attendance.filter(a => 
                  a.date === new Date().toISOString().split('T')[0] && 
                  a.status === 'checked_in'
                ).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Leaves</p>
              <p className="text-2xl font-bold text-gray-900">
                {leaveRequests.filter(l => l.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Holidays View */}
      {view === 'holidays' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Holiday Calendar</h2>
            <button
              onClick={() => setShowHolidayModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
          </div>
          <div className="divide-y">
            {holidays.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No holidays declared. Add holidays to mark them on the attendance calendar.
              </div>
            ) : (
              holidays
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(holiday => (
                  <div key={holiday.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{holiday.name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(holiday.date).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                        {holiday.description && (
                          <p className="text-sm text-gray-600 mt-1">{holiday.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Holiday</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Holiday Name</label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g., Republic Day"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description (Optional)</label>
                <textarea
                  value={holidayDescription}
                  onChange={(e) => setHolidayDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowHolidayModal(false);
                    setHolidayDate('');
                    setHolidayName('');
                    setHolidayDescription('');
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHoliday}
                  disabled={!holidayDate || !holidayName}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Holiday
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
