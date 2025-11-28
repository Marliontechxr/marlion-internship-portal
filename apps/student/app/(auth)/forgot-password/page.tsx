'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@marlion/ui/providers';
import { Mail, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { sendPasswordReset, error, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');
    setLoading(true);

    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setLocalError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setLocalError('Please enter a valid email address.');
      } else {
        setLocalError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-marlion-bg relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-marlion-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-marlion-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-marlion-primary to-marlion-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-marlion-primary/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Reset Your Password</h1>
            <p className="text-slate-400">
              {sent 
                ? 'Check your email for the reset link' 
                : 'Enter your email to receive a password reset link'}
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/30 text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Email Sent!</h3>
                  <p className="text-sm text-slate-400">
                    We've sent a password reset link to <strong className="text-white">{email}</strong>
                  </p>
                </div>
                <div className="text-sm text-slate-400 space-y-1">
                  <p>• Check your inbox and spam folder</p>
                  <p>• Click the link to reset your password</p>
                  <p>• The link expires in 1 hour</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setSent(false);
                    setEmail('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-marlion-surface border border-marlion-border hover:border-marlion-primary/50 transition-all text-slate-300"
                >
                  Try a different email
                </button>
                <Link 
                  href="/login"
                  className="w-full btn-primary text-center flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {(error || localError) && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm">{error || localError}</p>
                </div>
              )}

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

              <button 
                type="submit" 
                className="btn-primary w-full flex items-center justify-center gap-2" 
                disabled={loading}
              >
                <Mail className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center pt-4 border-t border-marlion-border">
                <Link 
                  href="/login" 
                  className="text-marlion-primary hover:underline font-medium text-sm inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
