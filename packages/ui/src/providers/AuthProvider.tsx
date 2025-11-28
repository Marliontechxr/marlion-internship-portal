'use client';

import * as React from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  applyActionCode,
  reload,
} from 'firebase/auth';
import { getFirebaseClient } from '@marlion/config/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<User>;
  signInWithPhone: (phoneNumber: string) => Promise<ConfirmationResult>;
  verifyOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  checkEmailVerified: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const { auth } = getFirebaseClient();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const { auth } = getFirebaseClient();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const { auth } = getFirebaseClient();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const { auth } = getFirebaseClient();
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Send verification email - redirect back to registration page after verification
      await sendEmailVerification(result.user, {
        url: window.location.origin + '/verify-email',
        handleCodeInApp: false,
      });
      return result.user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      setError(null);
      const { auth } = getFirebaseClient();
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser, {
          url: window.location.origin + '/verify-email',
          handleCodeInApp: false,
        });
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      setError(null);
      const { auth } = getFirebaseClient();
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const checkEmailVerified = async (): Promise<boolean> => {
    try {
      const { auth } = getFirebaseClient();
      if (auth.currentUser) {
        await reload(auth.currentUser);
        return auth.currentUser.emailVerified;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  };

  const signInWithPhone = async (phoneNumber: string): Promise<ConfirmationResult> => {
    try {
      setError(null);
      const { auth } = getFirebaseClient();
      
      // Create invisible recaptcha
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      return confirmationResult;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const verifyOtp = async (confirmationResult: ConfirmationResult, otp: string) => {
    try {
      setError(null);
      setLoading(true);
      await confirmationResult.confirm(otp);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { auth } = getFirebaseClient();
      await firebaseSignOut(auth);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithPhone,
        verifyOtp,
        resendVerificationEmail,
        sendPasswordReset,
        checkEmailVerified,
        signOut,
        clearError,
      }}
    >
      {children}
      <div id="recaptcha-container" />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
