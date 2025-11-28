'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('success');
  const [countdown, setCountdown] = useState(5);
  const email = searchParams.get('email');

  useEffect(() => {
    // Auto-redirect countdown
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/register');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, router]);

  return (
    <div className="max-w-md w-full">
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-2xl text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Verifying Email...</h1>
            <p className="text-slate-400">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
            <p className="text-slate-400 mb-6">
              Your email has been successfully verified. You can now continue with your registration.
            </p>
            
            <div className="p-4 bg-slate-700/30 rounded-xl mb-6">
              <p className="text-slate-300 text-sm">
                Redirecting to registration in <span className="text-blue-400 font-bold">{countdown}</span> seconds...
              </p>
            </div>

            <button
              onClick={() => router.push('/register')}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Continue to Registration
              <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
            <p className="text-slate-400 mb-6">
              We couldn't verify your email. The link may have expired or already been used.
            </p>
            
            <button
              onClick={() => router.push('/register')}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Back to Registration
              <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <p className="text-center text-slate-500 text-sm mt-6">
        Marlion Technologies Winter Internship 2025
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Suspense fallback={
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-2xl text-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Loading...</h1>
          </div>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
