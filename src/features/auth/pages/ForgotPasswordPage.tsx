import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { authService } from '../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validate = () => {
    if (!email.trim()) {
      setEmailError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await authService.forgotPassword({ email: email.trim() });

      if (response.success) {
        setIsSubmitted(true);
      } else {
        setErrorMessage(response.message || 'Unable to process reset request.');
      }
    } catch {
      setErrorMessage('Unable to connect to password recovery service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Top Icon Tile */}
        <div className="w-14 h-14 rounded-2xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center">
          <Lock className="w-6 h-6 stroke-[2.2]" />
        </div>

        {/* Header */}
        <div>
          <h2 className="text-3xl sm:text-[34px] font-extrabold text-[#1E1B4B] tracking-tight">
            Reset your password
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] mt-2 max-w-sm leading-relaxed">
            Enter your email address and we’ll send you a secure reset link.
          </p>
        </div>

        {/* Success Confirmation State */}
        {isSubmitted ? (
          <div className="p-5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 text-[#059669]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm text-[#065F46]">Reset Link Dispatched</h4>
            </div>
            <p className="text-xs text-[#065F46] leading-relaxed">
              If an account is associated with <span className="font-semibold">{email}</span>, a secure password reset link has been dispatched. Please check your inbox and spam folders.
            </p>
            <div className="pt-2 border-t border-[#A7F3D0]/50 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                className="text-[#059669] hover:underline font-semibold"
              >
                Send another link
              </button>
              <Link to="/login" className="font-bold text-[#6D28D9] hover:underline">
                Return to sign in →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Global Error Notice */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-semibold text-amber-900">Backend Notice</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="reset-email-input"
                  className="block text-xs font-semibold text-[#1E1B4B] mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder="you@company.com"
                    autoComplete="email"
                    disabled={isLoading}
                    className={`w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border rounded-lg text-[#1E1B4B] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                      emailError ? 'border-red-500 bg-red-50/20' : 'border-[#E2E8F0] hover:border-slate-300'
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="text-[11px] text-red-500 mt-1">{emailError}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send reset link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Back to Sign In Link */}
        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#6D28D9] hover:underline"
          >
            <span>Back to sign in</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
