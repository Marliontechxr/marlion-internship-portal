'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@marlion/config';
import { CheckCircle2, XCircle, Shield, Calendar, User, BookOpen, Building } from 'lucide-react';

interface VerificationData {
  valid: boolean;
  type: 'offer' | 'certificate' | null;
  studentName?: string;
  stream?: string;
  college?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  projectTitle?: string;
  completionDate?: string;
  issuedDate?: string;
}

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData>({ valid: false, type: null });

  useEffect(() => {
    const verifyDocument = async () => {
      try {
        const { db } = getFirebaseClient();
        
        // First, check if this is a new-format document ID in documentRecords
        const newDocRef = doc(db, 'documentRecords', id);
        const newDocSnap = await getDoc(newDocRef);
        
        if (newDocSnap.exists()) {
          // Redirect to new verification system
          const docData = newDocSnap.data();
          const pathMap: Record<string, string> = {
            offer: 'offer',
            certificate: 'cert',
            portfolio: 'portfolio'
          };
          router.replace(`/v/${pathMap[docData.type]}/${id}`);
          return;
        }
        
        // Also check short codes
        const shortCodeRef = doc(db, 'documentShortCodes', id);
        const shortCodeSnap = await getDoc(shortCodeRef);
        
        if (shortCodeSnap.exists()) {
          router.replace(`/v/${id}`);
          return;
        }
        
        // Fall back to legacy verification
        // Parse the verification ID
        // Format: INT-Win25-1234 (offer) or MT-XXXXXXXX or MARLION-2025-XXXXXXXX (certificate)
        const isOffer = id.startsWith('INT-');
        const isCertificate = id.startsWith('MT-') || id.startsWith('MARLION-');

        if (isOffer) {
          // Search for student with this offer reference
          const refNumber = id.replace(/-/g, '/');
          const studentsRef = collection(db, 'students');
          const q = query(studentsRef, where('offerRefNumber', '==', refNumber));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const student = snapshot.docs[0].data();
            const formatDate = (dateVal: any) => {
              if (!dateVal) return 'N/A';
              if (dateVal.toDate) return dateVal.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
              if (typeof dateVal === 'string') return new Date(dateVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
              return 'N/A';
            };

            setData({
              valid: true,
              type: 'offer',
              studentName: student.name,
              stream: student.chosenStream,
              college: student.collegeOther || student.college,
              startDate: formatDate(student.internshipStart),
              endDate: formatDate(student.internshipEnd),
              status: student.status,
              issuedDate: formatDate(student.offerIssuedAt || student.updatedAt),
            });
          } else {
            setData({ valid: false, type: 'offer' });
          }
        } else if (isCertificate) {
          // Search for certificate - first check students collection
          const studentsRef = collection(db, 'students');
          const q = query(studentsRef, where('certificateId', '==', id));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const student = snapshot.docs[0].data();
            const formatDate = (dateVal: any) => {
              if (!dateVal) return 'N/A';
              if (dateVal.toDate) return dateVal.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
              if (typeof dateVal === 'string') return new Date(dateVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
              return 'N/A';
            };

            // Get project title from problem submissions if available
            let projectTitle = 'Internship Project';
            try {
              const submissionsQuery = query(
                collection(db, 'problemSubmissions'),
                where('studentId', '==', snapshot.docs[0].id)
              );
              const submissionsSnap = await getDocs(submissionsQuery);
              const approvedSubmission = submissionsSnap.docs.find(d => 
                d.data().status === 'approved' || d.data().status === 'assigned'
              );
              if (approvedSubmission) {
                const psId = approvedSubmission.data().problemStatementId;
                const psDoc = await getDocs(query(collection(db, 'problemStatements'), where('__name__', '==', psId)));
                if (!psDoc.empty) {
                  projectTitle = psDoc.docs[0].data().title || projectTitle;
                }
              }
            } catch (e) {
              console.error('Error fetching project title:', e);
            }

            setData({
              valid: true,
              type: 'certificate',
              studentName: student.name,
              stream: student.chosenStream,
              college: student.collegeOther || student.college,
              projectTitle: projectTitle,
              completionDate: formatDate(student.certificateApprovedAt),
              issuedDate: formatDate(student.certificateApprovedAt),
            });
          } else {
            // Fallback to certificates collection
            const certsRef = collection(db, 'certificates');
            const certQuery = query(certsRef, where('verificationCode', '==', id));
            const certSnapshot = await getDocs(certQuery);

            if (!certSnapshot.empty) {
              const cert = certSnapshot.docs[0].data();
              const formatDate = (dateVal: any) => {
                if (!dateVal) return 'N/A';
                if (dateVal.toDate) return dateVal.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
                return 'N/A';
              };

              setData({
                valid: true,
                type: 'certificate',
                studentName: cert.studentName,
                stream: cert.stream,
                projectTitle: cert.projectTitle,
                completionDate: formatDate(cert.completionDate),
                issuedDate: formatDate(cert.issuedAt),
              });
            } else {
              setData({ valid: false, type: 'certificate' });
            }
          }
        } else {
          // Try to find by any ID pattern
          setData({ valid: false, type: null });
        }
      } catch (error) {
        console.error('Verification error:', error);
        setData({ valid: false, type: null });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      verifyDocument();
    }
  }, [id]);

  const streamNames: Record<string, string> = {
    'ar-vr': 'Immersive Tech (AR/VR/Unity)',
    'fullstack': 'Full Stack Development',
    'agentic-ai': 'Agentic AI Development',
    'data-science': 'Data Science & Computer Vision',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/80">Verifying document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              M
            </div>
            <span className="text-2xl font-bold text-white">Marlion Technologies</span>
          </div>
          <p className="text-white/60 text-sm">Document Verification Portal</p>
        </div>

        {/* Verification Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20">
          {/* Status Header */}
          <div className={`p-6 ${data.valid ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20' : 'bg-gradient-to-r from-red-500/20 to-orange-500/20'}`}>
            <div className="flex items-center justify-center gap-3">
              {data.valid ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Document Verified</h2>
                    <p className="text-green-300 text-sm">This document is authentic</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-red-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Verification Failed</h2>
                    <p className="text-red-300 text-sm">Document not found or invalid</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Details */}
          {data.valid && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <span className="text-white/70">Document Type</span>
                </div>
                <span className="text-white font-medium capitalize">
                  {data.type === 'offer' ? 'Internship Offer Letter' : 'Completion Certificate'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-400" />
                  <span className="text-white/70">Name</span>
                </div>
                <span className="text-white font-medium">{data.studentName}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <span className="text-white/70">Stream</span>
                </div>
                <span className="text-white font-medium text-right text-sm">
                  {streamNames[data.stream || ''] || data.stream}
                </span>
              </div>

              {data.college && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-blue-400" />
                    <span className="text-white/70">College</span>
                  </div>
                  <span className="text-white font-medium text-right text-sm">{data.college}</span>
                </div>
              )}

              {data.type === 'offer' && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <span className="text-white/70">Duration</span>
                  </div>
                  <span className="text-white font-medium text-right text-sm">
                    {data.startDate} - {data.endDate}
                  </span>
                </div>
              )}

              {data.type === 'certificate' && data.projectTitle && (
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    <span className="text-white/70">Project</span>
                  </div>
                  <p className="text-white font-medium text-sm italic">"{data.projectTitle}"</p>
                </div>
              )}

              {data.issuedDate && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <span className="text-white/70">Issued On</span>
                  </div>
                  <span className="text-white font-medium">{data.issuedDate}</span>
                </div>
              )}
            </div>
          )}

          {/* Document ID */}
          <div className="px-6 pb-6">
            <div className="p-3 bg-slate-900/50 rounded-lg text-center">
              <p className="text-white/50 text-xs mb-1">Document ID</p>
              <code className="text-blue-400 font-mono text-sm">{id}</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/40 text-xs">
            Marlion Technologies Pvt. Ltd. | A34, Kumarasamy Street, Madurai
          </p>
          <p className="text-white/40 text-xs mt-1">
            For queries: social@marliontech.com | +91 94867 34438
          </p>
          <a 
            href="https://internship.marliontech.com" 
            className="text-blue-400 text-xs hover:underline mt-2 inline-block"
          >
            internship.marliontech.com
          </a>
        </div>
      </div>
    </div>
  );
}
