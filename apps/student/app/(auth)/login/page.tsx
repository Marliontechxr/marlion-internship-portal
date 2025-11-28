'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@marlion/ui/providers';
import { Chrome, Mail, Sparkles, LogIn, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { getStudentByEmail } from '@marlion/lib/firestore';

export default function LoginPage() {
  const router = useRouter();
  const { user, signInWithGoogle, signInWithEmail, sendPasswordReset, error, loading, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checkingStudent, setCheckingStudent] = useState(false);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // When user logs in, check their status and redirect appropriately
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user?.email) {
        setCheckingStudent(true);
        try {
          const student = await getStudentByEmail(user.email);
          if (!student) {
            // No student record - redirect to registration
            router.replace('/register');
          } else if (['registered', 'interview_pending'].includes(student.status)) {
            router.replace('/interview');
          } else if (student.status === 'interview_done') {
            router.replace('/waiting');
          } else {
            router.replace('/dashboard');
          }
        } catch (err) {
          console.error('Error checking student:', err);
          // On error, redirect to register to be safe
          router.replace('/register');
        } finally {
          setCheckingStudent(false);
        }
      }
    };
    checkAndRedirect();
  }, [user, router]);

  const handleGoogleSignIn = async () => {
    clearError();
    try {
      await signInWithGoogle();
      // useEffect handles redirect
    } catch (err) {
      // Error handled by context
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await signInWithEmail(email, password);
      // useEffect handles redirect
    } catch (err) {
      // Error handled by context
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    
    try {
      await sendPasswordReset(resetEmail);
      setResetSent(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setResetError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setResetError('Please enter a valid email address.');
      } else {
        setResetError('Failed to send reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const resetForgotPasswordFlow = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSent(false);
    setResetError('');
  };

  if (checkingStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-marlion-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-marlion-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-marlion-bg relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-marlion-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-marlion-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Glass Card */}
        <div className="glass-card rounded-2xl p-8">
          
          {/* Forgot Password Flow */}
          {showForgotPassword ? (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-marlion-primary to-marlion-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-marlion-primary/30">
                  <KeyRound className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">Reset Password</h1>
                <p className="text-slate-400">
                  {resetSent 
                    ? 'Check your email for the reset link' 
                    : 'Enter your email to receive a password reset link'}
                </p>
              </div>

              <div className="space-y-6">
                {resetError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-sm">{resetError}</p>
                  </div>
                )}

                {resetSent ? (
                  <div className="space-y-6">
                    <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/30 text-center space-y-4">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-2">Email Sent!</h3>
                        <p className="text-sm text-slate-400">
                          We have sent a password reset link to <strong className="text-white">{resetEmail}</strong>
                        </p>
                      </div>
                      <div className="text-sm text-slate-400 space-y-1 text-left">
                        <p>• Check your inbox and spam folder</p>
                        <p>• Click the link to reset your password</p>
                        <p>• The link expires in 1 hour</p>
                      </div>
                    </div>
                    <button
                      onClick={resetForgotPasswordFlow}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="input-marlion"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      {resetLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForgotPasswordFlow}
                      className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Login
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Normal Login Flow */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-marlion-primary to-marlion-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-marlion-primary/30">
                  <LogIn className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">Welcome Back</h1>
                <p className="text-slate-400">Sign in to your Marlion Internship account</p>
              </div>

              <div className="space-y-6">
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Google Sign In */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-marlion-surface border border-marlion-border hover:border-marlion-primary/50 transition-all duration-300 group"
                >
                  <Chrome className="w-5 h-5 text-slate-400 group-hover:text-marlion-primary transition-colors" />
                  <span className="text-white font-medium">Continue with Google</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-marlion-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-marlion-surface px-4 text-slate-500">Or continue with email</span>
                  </div>
                </div>

                {/* Email Sign In */}
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-marlion"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-300">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-marlion-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-marlion"
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                    <Mail className="w-4 h-4" />
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-400 pt-4">
                  Do not have an account?{' '}
                  <Link href="/register" className="text-marlion-primary hover:underline font-medium">
                    Register Now
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
