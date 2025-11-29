'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Search, FileText, Award, Briefcase, ArrowRight } from 'lucide-react';

export default function VerificationPortal() {
  const router = useRouter();
  const [documentId, setDocumentId] = useState('');
  const [searching, setSearching] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId.trim()) return;
    
    setSearching(true);
    // Navigate to the verification page
    router.push(`/v/${documentId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-500/20">
              M
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Marlion Technologies</h1>
          <p className="text-white/60">Document Verification Portal</p>
        </div>

        {/* Search Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Verify a Document</h2>
          </div>
          
          <p className="text-white/60 text-center text-sm mb-6">
            Enter the document ID or short code to verify its authenticity.
            You can find this code on the document or in the QR code.
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value.toUpperCase())}
                placeholder="Enter Document ID (e.g., INT25WA3B2)"
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-lg tracking-wider"
              />
            </div>
            
            <button
              type="submit"
              disabled={!documentId.trim() || searching}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify Document
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Document Types */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 text-center border border-white/10">
            <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Offer Letters</p>
            <p className="text-white/40 text-xs">INT-XXXXX</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 text-center border border-white/10">
            <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Certificates</p>
            <p className="text-white/40 text-xs">MT-XXXXX</p>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-4 text-center border border-white/10">
            <Briefcase className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Portfolios</p>
            <p className="text-white/40 text-xs">PF-XXXXX</p>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
          <h3 className="text-white font-medium mb-3">About Document Verification</h3>
          <ul className="text-white/60 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              All documents issued by Marlion Technologies can be verified instantly
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              Each document has a unique ID that cannot be duplicated or forged
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              QR codes on documents link directly to their verification page
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              Revoked or expired documents are clearly marked as invalid
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/40 text-xs">
            Marlion Technologies Pvt. Ltd. | A34, Kumarasamy Street, Madurai
          </p>
          <p className="text-white/40 text-xs mt-1">
            For queries: social@marliontech.com | +91 94867 34438
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a href="https://marliontech.com" className="text-blue-400 text-xs hover:underline">
              marliontech.com
            </a>
            <span className="text-white/20">|</span>
            <a href="https://intern.marliontech.com" className="text-blue-400 text-xs hover:underline">
              intern.marliontech.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
