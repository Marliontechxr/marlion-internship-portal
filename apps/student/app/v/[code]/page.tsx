'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { verifyDocument, VerificationResult } from '@marlion/lib';
import { XCircle, ExternalLink } from 'lucide-react';

export default function UnifiedVerifyPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const verificationResult = await verifyDocument(code);
        
        // If found, redirect to specific document type page
        if (verificationResult.document) {
          const { type, id } = verificationResult.document;
          const pathMap: Record<string, string> = {
            offer: 'offer',
            certificate: 'cert',
            portfolio: 'portfolio'
          };
          router.replace(`/v/${pathMap[type]}/${id}`);
          return;
        }
        
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

    if (code) {
      verify();
    }
  }, [code, router]);

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
          <div className="p-8 bg-gradient-to-r from-red-500/20 to-orange-500/20">
            <div className="flex items-center justify-center gap-3">
              <XCircle className="w-12 h-12 text-red-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">Document Not Found</h2>
                <p className="text-red-300 text-sm">{result?.message || 'Invalid document ID'}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="p-4 bg-slate-900/50 rounded-lg text-center mb-4">
              <p className="text-white/50 text-xs mb-1">Searched Code</p>
              <code className="text-blue-400 font-mono text-lg">{code}</code>
            </div>

            <div className="text-center">
              <p className="text-white/60 text-sm mb-4">
                Please check the document ID and try again. If you believe this is an error, contact Marlion support.
              </p>
              <a 
                href="mailto:social@marliontech.com"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Contact Support
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/40 text-xs">
            Marlion Technologies Pvt. Ltd. | A34, Kumarasamy Street, Madurai
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
