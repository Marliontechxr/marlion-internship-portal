'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { verifyDocument, VerificationResult } from '@marlion/lib';
import { CheckCircle2, XCircle, Shield, Calendar, User, BookOpen, Building, Award, AlertTriangle, Star } from 'lucide-react';

const streamNames: Record<string, string> = {
  'ar-vr': 'Immersive Tech (AR/VR/Unity)',
  'fullstack': 'Full Stack Development',
  'agentic-ai': 'Agentic AI Development',
  'data-science': 'Data Science & Computer Vision',
};

export default function CertificateVerifyPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const verificationResult = await verifyDocument(id);
        setResult(verificationResult);
      } catch (error) {
        console.error('Verification error:', error);
        setResult({
          valid: false,
          status: 'not_found',
          message: 'An error occurred while verifying the document.'
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      verify();
    }
  }, [id]);

  const formatDate = (dateVal: any) => {
    if (!dateVal) return 'N/A';
    if (dateVal.toDate) return dateVal.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    if (typeof dateVal === 'string') return new Date(dateVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/80">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  const doc = result?.document;
  const isValid = result?.valid && result?.status === 'approved';
  const isRevoked = result?.status === 'revoked';
  const isPending = result?.status === 'pending';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              M
            </div>
            <span className="text-2xl font-bold text-white">Marlion Technologies</span>
          </div>
          <p className="text-white/60 text-sm">Certificate Verification</p>
        </div>

        {/* Verification Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/20">
          {/* Status Header */}
          <div className={`p-6 ${
            isValid ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20' : 
            isRevoked ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20' :
            isPending ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20' :
            'bg-gradient-to-r from-red-500/20 to-orange-500/20'
          }`}>
            <div className="flex items-center justify-center gap-3">
              {isValid ? (
                <>
                  <Award className="w-10 h-10 text-purple-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Certificate Verified</h2>
                    <p className="text-purple-300 text-sm">This certificate is authentic and valid</p>
                  </div>
                </>
              ) : isRevoked ? (
                <>
                  <XCircle className="w-10 h-10 text-red-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Certificate Revoked</h2>
                    <p className="text-red-300 text-sm">This certificate is no longer valid</p>
                  </div>
                </>
              ) : isPending ? (
                <>
                  <AlertTriangle className="w-10 h-10 text-yellow-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Pending Approval</h2>
                    <p className="text-yellow-300 text-sm">This certificate is awaiting approval</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-red-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Verification Failed</h2>
                    <p className="text-red-300 text-sm">{result?.message || 'Certificate not found'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Document Details */}
          {doc && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-purple-400" />
                  <span className="text-white/70">Document Type</span>
                </div>
                <span className="text-white font-medium">Completion Certificate</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-purple-400" />
                  <span className="text-white/70">Recipient</span>
                </div>
                <span className="text-white font-medium">{doc.studentName}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <span className="text-white/70">Stream</span>
                </div>
                <span className="text-white font-medium text-right text-sm">
                  {streamNames[doc.stream] || doc.stream}
                </span>
              </div>

              {doc.college && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-purple-400" />
                    <span className="text-white/70">Institution</span>
                  </div>
                  <span className="text-white font-medium text-right text-sm max-w-[200px] truncate">
                    {doc.college}
                  </span>
                </div>
              )}

              {doc.issuedAt && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="text-white/70">Issued On</span>
                  </div>
                  <span className="text-white font-medium">{formatDate(doc.issuedAt)}</span>
                </div>
              )}

              {isRevoked && doc.revokedReason && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm">
                    <strong>Revocation Reason:</strong> {doc.revokedReason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Document ID */}
          <div className="px-6 pb-6">
            <div className="p-3 bg-slate-900/50 rounded-lg text-center">
              <p className="text-white/50 text-xs mb-1">Certificate ID</p>
              <code className="text-purple-400 font-mono text-sm">{id}</code>
            </div>
          </div>

          {/* Security Badge */}
          {isValid && (
            <div className="px-6 pb-6">
              <div className="flex items-center justify-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="text-purple-300 text-sm font-medium">
                  Certified by Marlion Technologies Winter Internship 2025
                </span>
              </div>
            </div>
          )}
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
            href="https://intern.marliontech.com" 
            className="text-purple-400 text-xs hover:underline mt-2 inline-block"
          >
            intern.marliontech.com
          </a>
        </div>
      </div>
    </div>
  );
}
