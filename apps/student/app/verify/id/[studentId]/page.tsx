'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@marlion/config';
import { 
  CheckCircle, 
  XCircle, 
  User, 
  GraduationCap, 
  Calendar,
  Building,
  Shield,
  Loader2 
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  college: string;
  collegeName?: string;
  chosenStream: string;
  profilePhotoUrl?: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function VerifyIDPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      verifyStudent();
    }
  }, [studentId]);

  const verifyStudent = async () => {
    try {
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      
      if (!studentDoc.exists()) {
        setError('Student ID not found in our records');
        return;
      }

      const data = studentDoc.data();
      
      // Check if student is in a valid status
      const validStatuses = ['approved', 'interview_done', 'bootcamp_complete', 'project_approved', 'completed'];
      if (!validStatuses.includes(data.status)) {
        setError('This ID card is not currently valid');
        return;
      }

      setStudent({
        id: studentDoc.id,
        ...data
      } as Student);
    } catch (err) {
      console.error('Error verifying student:', err);
      setError('Unable to verify this ID card');
    } finally {
      setLoading(false);
    }
  };

  const getCollegeName = () => {
    if (!student) return '';
    if (student.college === 'Other' && student.collegeName) {
      return student.collegeName;
    }
    return student.college || 'Not specified';
  };

  const getStreamColor = (stream: string) => {
    const colors: { [key: string]: string } = {
      'AR/VR Development': 'bg-purple-500',
      'Agentic AI': 'bg-blue-500',
      'Data Science': 'bg-green-500',
      'Full Stack Development': 'bg-amber-500'
    };
    return colors[stream] || 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'approved': 'Active Intern',
      'interview_done': 'Active Intern',
      'bootcamp_complete': 'Active Intern',
      'project_approved': 'Active Intern',
      'completed': 'Completed Internship'
    };
    return labels[status] || status;
  };

  const isActive = () => {
    if (!student) return false;
    const today = new Date().toISOString().split('T')[0];
    return student.endDate >= today;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">Verifying ID Card...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
          <p className="text-gray-600 mb-6">{error || 'Unable to verify this ID card'}</p>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700">
              This ID card could not be verified. It may be invalid, expired, or the student may no longer be enrolled.
            </p>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <img 
              src="/marlion-logo.png" 
              alt="Marlion" 
              className="h-8 mx-auto opacity-50"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl">
        {/* Verified Badge Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="text-lg font-semibold">Verified Intern</span>
          </div>
          <p className="text-green-100 text-sm">This ID card is authentic and verified by Marlion</p>
        </div>

        {/* Student Details */}
        <div className="p-6">
          {/* Profile Section */}
          <div className="flex items-center gap-4 mb-6">
            {student.profilePhotoUrl ? (
              <img
                src={student.profilePhotoUrl}
                alt={student.name}
                className="w-20 h-24 object-cover rounded-xl border-4 border-gray-100 shadow"
              />
            ) : (
              <div className="w-20 h-24 bg-gray-100 rounded-xl flex items-center justify-center border-4 border-gray-50">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
              <span className={`inline-block px-3 py-1 rounded-full text-white text-xs font-medium mt-1 ${getStreamColor(student.chosenStream)}`}>
                {student.chosenStream}
              </span>
              <p className="text-sm text-gray-500 mt-1">{getStatusLabel(student.status)}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Building className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Institution</p>
                <p className="text-sm font-medium text-gray-900">{getCollegeName()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Internship Period</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(student.startDate).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })} - {new Date(student.endDate).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <GraduationCap className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className={`text-sm font-medium ${isActive() ? 'text-green-600' : 'text-gray-600'}`}>
                  {isActive() ? '✓ Currently Active' : student.status === 'completed' ? '✓ Successfully Completed' : 'Tenure Ended'}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Verified on {new Date().toLocaleDateString('en-IN')}</span>
              <span>ID: {student.id.substring(0, 12)}...</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Issued by</p>
              <p className="text-sm font-semibold text-gray-900">Marlion Technology</p>
            </div>
            <img 
              src="/marlion-logo.png" 
              alt="Marlion" 
              className="h-8"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
