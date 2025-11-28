'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, Select, Card, CardHeader, CardTitle, CardDescription, Alert, AlertDescription, Progress } from '@marlion/ui/components';
import { useAuth } from '@marlion/ui/providers';
import { Chrome, Mail, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Shield, RefreshCw, Clock, Upload, X, Image as ImageIcon, Laptop } from 'lucide-react';
import { getStudentByEmail, createStudent } from '@marlion/lib/firestore';
import { getFirebaseClient } from '@marlion/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const COLLEGES = [
  { value: 'TCE', label: 'Thiagarajar College of Engineering' },
  { value: 'Kamaraj', label: 'Kamaraj College of Engineering' },
  { value: 'SRM Madurai', label: 'SRM Madurai' },
  { value: 'Anna University Ramnad', label: 'Anna University Ramnad' },
  { value: 'Velammal', label: 'Velammal Engineering College' },
  { value: 'Other', label: 'Other' },
];

const STREAMS = [
  { value: 'ar-vr', label: 'AR/VR Development' },
  { value: 'fullstack', label: 'Full-Stack Development' },
  { value: 'agentic-ai', label: 'Agentic AI' },
  { value: 'data-science', label: 'Data Science' },
];

const YEARS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: '5', label: '5th Year (Integrated)' },
  { value: 'pg1', label: 'PG 1st Year' },
  { value: 'pg2', label: 'PG 2nd Year' },
];

const VALID_DEPARTMENTS = [
  'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML', 'CSD', 'CSM',
  'BME', 'CHEM', 'AUTO', 'PROD', 'ICE', 'MCA', 'MBA', 'MTech', 'MSc'
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, signInWithGoogle, signUpWithEmail, resendVerificationEmail, checkEmailVerified, loading, error, clearError } = useAuth();
  
  const [step, setStepState] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [emailForm, setEmailForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [checkingExisting, setCheckingExisting] = useState(false);
  
  // Email verification state
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verificationChecking, setVerificationChecking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // ID card upload state
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile photo state
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  
  // Track if we've already moved past step 1 - use ref to persist across renders without triggering useEffect
  const hasInitializedRef = useRef(false);
  // Track if submission is in progress to prevent step resets
  const isSubmittingRef = useRef(false);
  // Track current step value without triggering re-renders
  const stepRef = useRef(1);
  
  // Wrapper for setStep that also updates the ref and prevents going backwards unexpectedly
  const setStep = (newStep: number) => {
    // Only allow going backwards if explicitly called (not from useEffect)
    stepRef.current = newStep;
    setStepState(newStep);
  };
  
  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    collegeOther: '',
    year: '',
    department: '',
    chosenStream: '',
    internshipStart: '',
    internshipEnd: '',
    specialRequests: '',
    collegeIdUrl: '',
    profilePhotoUrl: '',
    laptopConfig: '',
    graphicsCard: '',
  });

  useEffect(() => {
    // Only run once on mount or when user becomes available
    // We use a local variable to track if we've already processed
    let isCancelled = false;
    
    const checkExistingStudent = async () => {
      console.log('[DEBUG] useEffect triggered:', {
        hasInitialized: hasInitializedRef.current,
        isSubmitting: isSubmittingRef.current,
        stepRef: stepRef.current,
        userEmail: user?.email,
        userVerified: user?.emailVerified,
        isCancelled
      });
      
      // Skip if already initialized, submission in progress, or already past step 1
      if (hasInitializedRef.current || isSubmittingRef.current || stepRef.current > 1) {
        console.log('[DEBUG] Skipping - already initialized or past step 1');
        hasInitializedRef.current = true; // Ensure it's set if we skip
        return;
      }
      
      if (!user?.email) {
        console.log('[DEBUG] No user email, skipping');
        return;
      }
      
      if (!user.emailVerified && user.providerData[0]?.providerId === 'password') {
        console.log('[DEBUG] User not verified, showing verification screen');
        if (!isCancelled) {
          setAwaitingVerification(true);
          setEmailForm(prev => ({ ...prev, email: user.email || '' }));
        }
        return;
      }
      
      // Mark as initialized IMMEDIATELY to prevent race conditions
      console.log('[DEBUG] Setting hasInitializedRef to true');
      hasInitializedRef.current = true;
      
      if (!isCancelled) {
        setCheckingExisting(true);
      }
      
      try {
        const existingStudent = await getStudentByEmail(user.email);
        
        if (isCancelled) {
          console.log('[DEBUG] Operation cancelled, returning');
          return;
        }
        
        if (existingStudent) {
          console.log('[DEBUG] Existing student found, redirecting');
          if (['registered', 'interview_pending'].includes(existingStudent.status)) {
            router.replace('/interview');
          } else {
            router.replace('/dashboard');
          }
          return;
        }
        
        console.log('[DEBUG] No existing student, setting form data');
        setFormData((prev) => ({
          ...prev,
          name: user.displayName || prev.name,
          email: user.email || prev.email,
        }));
        
        // Only set step to 2 if we're still at step 1
        if (stepRef.current === 1) {
          console.log('[DEBUG] Setting step to 2');
          setStep(2);
        } else {
          console.log('[DEBUG] Not setting step, stepRef is:', stepRef.current);
        }
      } catch (err) {
        console.error('Error checking student:', err);
        // Reset ref on error so user can retry
        hasInitializedRef.current = false;
      } finally {
        if (!isCancelled) {
          setCheckingExisting(false);
        }
      }
    };
    
    checkExistingStudent();
    
    // Cleanup function to cancel pending operations
    return () => {
      isCancelled = true;
    };
  }, [user?.email, user?.emailVerified, router]); // Only depend on specific user properties

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (!awaitingVerification) return;
    
    const checkInterval = setInterval(async () => {
      const verified = await checkEmailVerified();
      if (verified) {
        setAwaitingVerification(false);
        setSubmitError(''); // Clear any stale "not verified" error
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [awaitingVerification, checkEmailVerified]);

  const handleGoogleSignIn = async () => {
    clearError();
    try {
      await signInWithGoogle();
    } catch (err) {
      // Error handled by context
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitError('');
    
    if (emailForm.password !== emailForm.confirmPassword) {
      setSubmitError('Passwords do not match');
      return;
    }
    if (emailForm.password.length < 6) {
      setSubmitError('Password must be at least 6 characters');
      return;
    }
    
    const existingStudent = await getStudentByEmail(emailForm.email);
    if (existingStudent) {
      setSubmitError('An account with this email already exists. Please login instead.');
      return;
    }
    
    try {
      await signUpWithEmail(emailForm.email, emailForm.password);
      setAwaitingVerification(true);
      setResendCooldown(60);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setSubmitError('An account with this email already exists. Please login instead.');
      }
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      setResendCooldown(60);
    } catch (err) {
      console.error('Failed to resend:', err);
    }
  };

  const handleCheckVerification = async () => {
    setVerificationChecking(true);
    setSubmitError(''); // Clear any previous error before checking
    try {
      const verified = await checkEmailVerified();
      if (verified) {
        setAwaitingVerification(false);
        setSubmitError(''); // Ensure error is cleared
      } else {
        setSubmitError('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (err) {
      console.error('Failed to check:', err);
      setSubmitError('Failed to check verification status. Please try again.');
    } finally {
      setVerificationChecking(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Validate phone number format
    if (field === 'phone') {
      const phoneRegex = /^(\+91[\-\s]?)?[6-9]\d{9}$/;
      const cleanPhone = value.replace(/[\s\-]/g, '');
      if (value && !phoneRegex.test(cleanPhone)) {
        setFieldErrors(prev => ({ ...prev, phone: 'Enter valid 10-digit Indian mobile number' }));
      }
    }
    
    // Validate department
    if (field === 'department') {
      const upperDept = value.toUpperCase().trim();
      const isValidDept = VALID_DEPARTMENTS.some(d => 
        upperDept === d || upperDept.includes(d)
      );
      if (value && !isValidDept && value.length > 1) {
        setFieldErrors(prev => ({ ...prev, department: 'Enter valid department code (e.g., CSE, ECE, IT)' }));
      }
    }
  };

  const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setFieldErrors(prev => ({ ...prev, idCard: 'Please upload JPG, PNG or PDF file' }));
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, idCard: 'File size must be less than 5MB' }));
      return;
    }
    
    setIdCardFile(file);
    setFieldErrors(prev => ({ ...prev, idCard: '' }));
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setIdCardPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setIdCardPreview(null);
    }
  };

  const uploadIdCard = async (): Promise<string> => {
    if (!idCardFile || !user) throw new Error('No file or user');
    
    setUploadingIdCard(true);
    try {
      const { storage } = getFirebaseClient();
      const fileExt = idCardFile.name.split('.').pop();
      const fileName = `college-ids/${user.uid}_${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, idCardFile);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } finally {
      setUploadingIdCard(false);
    }
  };

  const removeIdCard = () => {
    setIdCardFile(null);
    setIdCardPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Profile photo handlers
  const handleProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      setFieldErrors(prev => ({ ...prev, profilePhoto: 'Please upload an image file' }));
      return;
    }
    
    // Validate file size (max 2MB for profile photos)
    if (file.size > 2 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, profilePhoto: 'Photo must be less than 2MB' }));
      return;
    }
    
    setProfilePhoto(file);
    setFieldErrors(prev => ({ ...prev, profilePhoto: '' }));
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setProfilePhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadProfilePhoto = async (): Promise<string> => {
    if (!profilePhoto || !user) return '';
    
    try {
      const { storage } = getFirebaseClient();
      const fileExt = profilePhoto.name.split('.').pop();
      const fileName = `profile-photos/${user.uid}_${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, profilePhoto);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      return '';
    }
  };

  const removeProfilePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
    if (profilePhotoInputRef.current) {
      profilePhotoInputRef.current.value = '';
    }
  };

  const validateStep2 = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const phoneRegex = /^(\+91[\-\s]?)?[6-9]\d{9}$/;
      const cleanPhone = formData.phone.replace(/[\s\-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        errors.phone = 'Enter valid 10-digit Indian mobile number';
      }
    }
    if (!formData.college) errors.college = 'College is required';
    if (formData.college === 'Other' && !formData.collegeOther.trim()) {
      errors.collegeOther = 'Please enter your college name';
    }
    if (!formData.year) errors.year = 'Year of study is required';
    if (!formData.department.trim()) {
      errors.department = 'Department is required';
    }
    if (!idCardFile) errors.idCard = 'College ID card is required';
    if (!profilePhoto) errors.profilePhoto = 'Profile photo is required for ID card';
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('[DEBUG] handleSubmit called, setting isSubmittingRef to true');
    // Set refs immediately to prevent any step resets during submission
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      console.log('[DEBUG] Checking for existing student...');
      const existingStudent = await getStudentByEmail(formData.email);
      if (existingStudent) {
        console.log('[DEBUG] Existing student found, redirecting to dashboard');
        router.replace('/dashboard');
        return;
      }

      // Upload ID card first
      console.log('[DEBUG] Uploading ID card...');
      let collegeIdUrl = '';
      if (idCardFile) {
        collegeIdUrl = await uploadIdCard();
      }
      console.log('[DEBUG] ID card uploaded:', collegeIdUrl);

      // Upload profile photo if provided
      console.log('[DEBUG] Uploading profile photo...');
      let profilePhotoUrl = '';
      if (profilePhoto) {
        profilePhotoUrl = await uploadProfilePhoto();
      }
      console.log('[DEBUG] Profile photo uploaded:', profilePhotoUrl);

      console.log('[DEBUG] Creating student record...');
      await createStudent({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        college: formData.college as any,
        collegeOther: formData.collegeOther,
        year: formData.year,
        department: formData.department.toUpperCase().trim(),
        chosenStream: formData.chosenStream as any,
        internshipStart: new Date(formData.internshipStart),
        internshipEnd: new Date(formData.internshipEnd),
        specialRequests: formData.specialRequests,
        collegeIdUrl: collegeIdUrl,
        profilePhotoUrl: profilePhotoUrl,
        laptopConfig: formData.laptopConfig,
        graphicsCard: formData.graphicsCard || '',
        status: 'registered',
        dailyLogsCount: 0,
      }, user!.uid);
      console.log('[DEBUG] Student created successfully');

      // Clear any stale interview session data from localStorage for fresh start
      if (typeof window !== 'undefined') {
        localStorage.removeItem('marlion_interview_session');
        localStorage.removeItem('marlion_paste_warning_count');
      }

      console.log('[DEBUG] Redirecting to interview...');
      router.replace('/interview');
    } catch (err: any) {
      console.error('[DEBUG] Error in handleSubmit:', err);
      setSubmitError(err.message || 'Failed to submit registration. Please try again.');
      isSubmittingRef.current = false; // Only reset on error, not on success (we're navigating away)
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Continue = () => {
    if (validateStep2()) {
      setStep(3);
    }
  };

  const canProceedStep2 = formData.name && formData.phone && formData.college && (formData.college !== 'Other' || formData.collegeOther) && formData.year && formData.department && idCardFile && profilePhoto;
  const canProceedStep3 = formData.chosenStream && formData.internshipStart && formData.internshipEnd && formData.laptopConfig && (formData.chosenStream !== 'ar-vr' || formData.graphicsCard);

  if (checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-marlion-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-marlion-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Checking your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-marlion-bg relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-marlion-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-marlion-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl relative z-10">
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-marlion-primary to-marlion-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-marlion-primary/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Register for Winter Internship 2025</h1>
            <p className="text-slate-400">Complete your registration in 3 simple steps</p>
            
            <div className="mt-6">
              <div className="h-2 bg-marlion-surface rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-marlion-primary to-marlion-accent transition-all duration-500"
                  style={{ width: (step / 3) * 100 + '%' }}
                />
              </div>
              <div className="flex justify-between mt-3 text-xs">
                <span className={step >= 1 ? 'text-marlion-primary font-semibold' : 'text-slate-500'}>Authentication</span>
                <span className={step >= 2 ? 'text-marlion-primary font-semibold' : 'text-slate-500'}>Personal Info</span>
                <span className={step >= 3 ? 'text-marlion-primary font-semibold' : 'text-slate-500'}>Internship Details</span>
              </div>
            </div>
          </div>

        <div className="space-y-6">
          {(error || submitError) && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">
                {error || submitError}
                {(error || submitError)?.includes('already exists') && (
                  <Link href="/login" className="block mt-2 text-marlion-primary hover:underline font-medium">
                    Click here to login instead
                  </Link>
                )}
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              {awaitingVerification ? (
                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-marlion-primary/10 border border-marlion-primary/30 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-marlion-primary/20 rounded-full flex items-center justify-center">
                        <Mail className="w-6 h-6 text-marlion-primary" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Verify Your Email</h3>
                        <p className="text-sm text-slate-400">Check your inbox for the verification link</p>
                      </div>
                    </div>
                    
                    <div className="bg-marlion-surface/50 rounded-lg p-4">
                      <p className="text-sm text-slate-300">We have sent a verification email to:</p>
                      <p className="text-marlion-primary font-medium mt-1">{emailForm.email || user?.email}</p>
                    </div>
                    
                    <div className="text-sm text-slate-400 space-y-2">
                      <p>Click the link in the email to verify your account</p>
                      <p>The page will automatically update once verified</p>
                      <p>Check your spam folder if you do not see it</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={handleResendVerification}
                        disabled={resendCooldown > 0}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-marlion-surface border border-marlion-border hover:border-marlion-primary/50 transition-all text-slate-300 disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {resendCooldown > 0 ? 'Resend in ' + resendCooldown + 's' : 'Resend Email'}
                      </button>
                      <button
                        onClick={handleCheckVerification}
                        disabled={verificationChecking}
                        className="flex-1 btn-primary flex items-center justify-center gap-2"
                      >
                        {verificationChecking ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            I have Verified
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setAwaitingVerification(false);
                        setEmailForm({ email: '', password: '', confirmPassword: '' });
                      }}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              ) : !user ? (
                <>
                  <p className="text-center text-slate-400">Create your account to get started.</p>
                  
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading && authMethod === 'google'}
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
                      <span className="bg-marlion-surface px-4 text-slate-500">Or</span>
                    </div>
                  </div>

                  <form onSubmit={handleEmailSignUp} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={emailForm.email}
                        onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                        className="input-marlion"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                      <input
                        type="password"
                        placeholder="Min 6 characters"
                        value={emailForm.password}
                        onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                        className="input-marlion"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                      <input
                        type="password"
                        placeholder="Re-enter password"
                        value={emailForm.confirmPassword}
                        onChange={(e) => setEmailForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
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
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-marlion-success/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-marlion-success" />
                  </div>
                  <p className="text-slate-400">
                    Authenticated as <strong className="text-white">{user.email}</strong>
                  </p>
                  <button onClick={() => setStep(2)} className="btn-primary flex items-center gap-2 mx-auto">
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                <input 
                  type="text" 
                  placeholder="Your full name" 
                  value={formData.name} 
                  onChange={handleChange('name')} 
                  className={`input-marlion ${fieldErrors.name ? 'border-red-500' : ''}`} 
                  required 
                />
                {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number *</label>
                <input 
                  type="tel" 
                  placeholder="+91 9876543210" 
                  value={formData.phone} 
                  onChange={handleChange('phone')} 
                  className={`input-marlion ${fieldErrors.phone ? 'border-red-500' : ''}`}
                  required 
                />
                {fieldErrors.phone && <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">College *</label>
                <select 
                  value={formData.college} 
                  onChange={handleChange('college')} 
                  className={`input-marlion ${fieldErrors.college ? 'border-red-500' : ''}`} 
                  required
                >
                  <option value="" className="bg-marlion-surface text-slate-300">Select your college</option>
                  {COLLEGES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-marlion-surface text-slate-100">{c.label}</option>
                  ))}
                </select>
                {fieldErrors.college && <p className="text-red-400 text-xs mt-1">{fieldErrors.college}</p>}
              </div>
              {formData.college === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">College Name *</label>
                  <input 
                    type="text" 
                    placeholder="Enter your college name" 
                    value={formData.collegeOther} 
                    onChange={handleChange('collegeOther')} 
                    className={`input-marlion ${fieldErrors.collegeOther ? 'border-red-500' : ''}`} 
                    required 
                  />
                  {fieldErrors.collegeOther && <p className="text-red-400 text-xs mt-1">{fieldErrors.collegeOther}</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Year of Study *</label>
                  <select 
                    value={formData.year} 
                    onChange={handleChange('year')} 
                    className={`input-marlion ${fieldErrors.year ? 'border-red-500' : ''}`} 
                    required
                  >
                    <option value="" className="bg-marlion-surface text-slate-300">Select year</option>
                    {YEARS.map((y) => (
                      <option key={y.value} value={y.value} className="bg-marlion-surface text-slate-100">{y.label}</option>
                    ))}
                  </select>
                  {fieldErrors.year && <p className="text-red-400 text-xs mt-1">{fieldErrors.year}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Department *</label>
                  <input 
                    type="text" 
                    placeholder="e.g., CSE, ECE, IT" 
                    value={formData.department} 
                    onChange={handleChange('department')} 
                    className={`input-marlion ${fieldErrors.department ? 'border-red-500' : ''}`} 
                    required 
                  />
                  {fieldErrors.department && <p className="text-red-400 text-xs mt-1">{fieldErrors.department}</p>}
                </div>
              </div>
              
              {/* College ID Card Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">College ID Card *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleIdCardUpload}
                  className="hidden"
                  id="idCardUpload"
                />
                
                {!idCardFile ? (
                  <label
                    htmlFor="idCardUpload"
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      fieldErrors.idCard 
                        ? 'border-red-500 bg-red-500/5' 
                        : 'border-marlion-border hover:border-marlion-primary/50 bg-marlion-surface/30'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-400">Click to upload ID card</span>
                    <span className="text-xs text-slate-500 mt-1">JPG, PNG or PDF (max 5MB)</span>
                  </label>
                ) : (
                  <div className="relative p-4 rounded-xl bg-marlion-surface/50 border border-marlion-border">
                    <button
                      type="button"
                      onClick={removeIdCard}
                      className="absolute top-2 right-2 p-1 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-4">
                      {idCardPreview ? (
                        <img 
                          src={idCardPreview} 
                          alt="ID Card Preview" 
                          className="w-20 h-20 object-cover rounded-lg border border-marlion-border"
                        />
                      ) : (
                        <div className="w-20 h-20 flex items-center justify-center bg-marlion-primary/10 rounded-lg">
                          <ImageIcon className="w-8 h-8 text-marlion-primary" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-slate-300 font-medium">{idCardFile.name}</p>
                        <p className="text-xs text-slate-500">{(idCardFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready to upload
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {fieldErrors.idCard && <p className="text-red-400 text-xs mt-1">{fieldErrors.idCard}</p>}
              </div>

              {/* Profile Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Profile Photo * <span className="text-slate-500">(for ID card)</span>
                </label>
                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleProfilePhotoSelect}
                  className="hidden"
                  id="profilePhotoUpload"
                />
                
                {!profilePhoto ? (
                  <label
                    htmlFor="profilePhotoUpload"
                    className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      fieldErrors.profilePhoto 
                        ? 'border-red-500 bg-red-500/5' 
                        : 'border-marlion-border hover:border-marlion-primary/50 bg-marlion-surface/30'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-marlion-surface border-2 border-dashed border-marlion-border flex items-center justify-center mb-2">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="text-sm text-slate-400">Upload passport-size photo</span>
                    <span className="text-xs text-slate-500 mt-1">JPG or PNG (max 2MB)</span>
                  </label>
                ) : (
                  <div className="relative p-4 rounded-xl bg-marlion-surface/50 border border-marlion-border">
                    <button
                      type="button"
                      onClick={removeProfilePhoto}
                      className="absolute top-2 right-2 p-1 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-4">
                      {profilePhotoPreview && (
                        <img 
                          src={profilePhotoPreview} 
                          alt="Profile Photo Preview" 
                          className="w-16 h-16 object-cover rounded-full border-2 border-marlion-primary"
                        />
                      )}
                      <div>
                        <p className="text-sm text-slate-300 font-medium">{profilePhoto.name}</p>
                        <p className="text-xs text-slate-500">{(profilePhoto.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready to upload
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {fieldErrors.profilePhoto && <p className="text-red-400 text-xs mt-1">{fieldErrors.profilePhoto}</p>}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep(1)} className="flex-1 px-4 py-3 rounded-xl bg-marlion-surface border border-marlion-border hover:border-marlion-primary/50 transition-all text-slate-300">
                  <ArrowLeft className="w-4 h-4 inline mr-2" />Back
                </button>
                <button onClick={handleStep2Continue} disabled={!canProceedStep2} className="flex-1 btn-primary disabled:opacity-50">
                  Continue<ArrowRight className="w-4 h-4 inline ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {/* BYOD Notice */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <Laptop className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-amber-300 font-medium mb-1">Bring Your Own Device (BYOD)</p>
                    <p className="text-slate-400">
                      Students must bring their own laptops. For <strong className="text-amber-300">AR/VR Development</strong> stream, 
                      a gaming laptop with dedicated GPU is required. Some devices may be reserved for exceptional candidates, 
                      but it is recommended to bring your own device.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Internship Stream *</label>
                <select value={formData.chosenStream} onChange={handleChange('chosenStream')} className="input-marlion" required>
                  <option value="">Select your preferred stream</option>
                  {STREAMS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>

              {/* Laptop Configuration */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Laptop Configuration *</label>
                <input 
                  type="text" 
                  placeholder="e.g., Intel i5 11th Gen, 16GB RAM, 512GB SSD" 
                  value={formData.laptopConfig || ''} 
                  onChange={handleChange('laptopConfig')} 
                  className="input-marlion" 
                  required 
                />
                <p className="text-xs text-slate-500 mt-1">Mention processor, RAM, and storage</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dedicated Graphics Card {formData.chosenStream === 'ar-vr' ? '*' : '(Optional)'}
                </label>
                <input 
                  type="text" 
                  placeholder={formData.chosenStream === 'ar-vr' ? "e.g., NVIDIA RTX 3060, 6GB VRAM (Required for VR)" : "e.g., NVIDIA GTX 1650 or None"} 
                  value={formData.graphicsCard || ''} 
                  onChange={handleChange('graphicsCard')} 
                  className="input-marlion" 
                  required={formData.chosenStream === 'ar-vr'}
                />
                {formData.chosenStream === 'ar-vr' && (
                  <p className="text-xs text-amber-400 mt-1">⚠️ VR development requires a dedicated GPU with minimum 4GB VRAM</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Start Date *</label>
                  <input 
                    type="date" 
                    value={formData.internshipStart} 
                    onChange={handleChange('internshipStart')} 
                    min="2025-11-26" 
                    className="input-marlion date-input-light" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">End Date *</label>
                  <input 
                    type="date" 
                    value={formData.internshipEnd} 
                    onChange={handleChange('internshipEnd')} 
                    min={formData.internshipStart || "2025-12-10"} 
                    className="input-marlion date-input-light" 
                    required 
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">Minimum duration: 14 days (2 weeks to 6 months)</p>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Special Requests (Optional)</label>
                <textarea placeholder="Any accommodations or requests..." value={formData.specialRequests} onChange={handleChange('specialRequests')} rows={3} className="input-marlion resize-none" />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep(2)} className="flex-1 px-4 py-3 rounded-xl bg-marlion-surface border border-marlion-border hover:border-marlion-primary/50 transition-all text-slate-300">
                  <ArrowLeft className="w-4 h-4 inline mr-2" />Back
                </button>
                <button onClick={handleSubmit} disabled={!canProceedStep3 || isSubmitting} className="flex-1 btn-primary disabled:opacity-50">
                  {isSubmitting ? 'Submitting...' : 'Complete Registration'}<CheckCircle2 className="w-4 h-4 inline ml-2" />
                </button>
              </div>
            </div>
          )}

          <div className="text-center pt-4 border-t border-marlion-border">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-marlion-primary hover:underline font-medium">Login here</Link>
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
