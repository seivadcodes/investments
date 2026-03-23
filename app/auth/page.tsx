'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EMAIL_STORAGE_KEY = 'truelabel.auth.email';

type CountryInfo = {
  country: string;
};

export default function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const router = useRouter();

  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);

  // Redirect to dashboard after auth
  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Detect returning user via saved email
  useEffect(() => {
    if (loading) return;
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem(EMAIL_STORAGE_KEY);
      if (savedEmail && savedEmail.includes('@')) {
        setEmail(savedEmail);
        setAuthMode('sign-in');
      }
    }
  }, [loading]);

  // Fetch user's country (non-blocking)
  useEffect(() => {
    const fetchCountry = async () => {
      try {
        const res = await fetch('/api/country');
        if (!res.ok) throw new Error('Failed to fetch country');
        const data: CountryInfo = await res.json();
        setUserCountry(data.country);
      } catch {
        console.warn('Could not detect country, proceeding without it');
      }
    };
    fetchCountry();
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (typeof window !== 'undefined' && value.includes('@')) {
      localStorage.setItem(EMAIL_STORAGE_KEY, value);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (authMode === 'sign-in') {
        await signIn(email, password);
        setSuccess('Signed in successfully. Redirecting...');
      } else {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        await signUp(email, password, fullName.trim(), userCountry);
        setSuccess('Account created! Please check your email to verify.');
        // Optional: auto sign in after sign up if your Supabase config allows
        // await signIn(email, password);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Initializing secure session...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, show a clean redirect state
  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Authenticated</h2>
          <p className="text-slate-500 mb-6">Redirecting to your dashboard...</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Go to Dashboard Now
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <span className="text-xl font-bold text-white tracking-tight">TrueLabel</span>
          </div>
          <p className="text-slate-400 text-sm">
            {authMode === 'sign-in' ? 'Welcome back, Contributor' : 'Join the verification network'}
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2"
              >
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'sign-up' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Minimum 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                submitting 
                  ? "bg-slate-400 cursor-not-allowed" 
                  : "bg-slate-900 hover:bg-slate-800 hover:shadow-lg"
              )}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : authMode === 'sign-in' ? (
                'Sign In to Dashboard'
              ) : (
                'Create Contributor Account'
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in');
                setError('');
                setSuccess('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {authMode === 'sign-in'
                ? "Don't have an account? Join TrueLabel"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center mb-3">
              Secure • Encrypted • GDPR Compliant
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-300">
              <span>🔒 TLS 1.3</span>
              <span>•</span>
              <span>🛡️ SOC 2</span>
              <span>•</span>
              <span>✅ Verified</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Helper for Tailwind class merging
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}