import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, X, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../../../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  // Legal Modal
  const [showLegalModal, setShowLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    }

    if (!email.trim()) {
      newErrors.email = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid work email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must agree to the Terms and Privacy Policy to register.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await register({
        name: fullName.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
        terms_accepted: termsAccepted,
      });

      if (response.success) {
        navigate('/login', { state: { registered: true, email: email.trim() } });
      } else {
        setErrorMessage(response.message || 'Registration could not be completed.');
      }
    } catch {
      setErrorMessage(
        'Backend registration service is offline or unreachable. Please verify the Laravel API connection at http://localhost:8000.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-5">
        {/* Step Indicator & Header */}
        <div>
          <p className="text-xs text-[#64748B] font-medium mb-1">
            Step 1 of 2 — Account setup
          </p>
          <h2 className="text-3xl sm:text-[34px] font-extrabold text-[#1E1B4B] tracking-tight">
            Create your account
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] mt-1.5">
            Start organizing your marketing operations.
          </p>
        </div>

        {/* Global Error Notice */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-semibold text-amber-900">Registration Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          {/* Full Name */}
          <div>
            <label
              htmlFor="name-input"
              className="block text-xs font-semibold text-[#1E1B4B] mb-1.5"
            >
              Full name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                <User className="w-4 h-4" />
              </div>
              <input
                id="name-input"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                placeholder="John Doe"
                autoComplete="name"
                disabled={isLoading}
                className={`w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border rounded-lg text-[#1E1B4B] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                  errors.fullName ? 'border-red-500 bg-red-50/20' : 'border-[#E2E8F0] hover:border-slate-300'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="text-[11px] text-red-500 mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Work Email */}
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-semibold text-[#1E1B4B] mb-1.5"
            >
              Work email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@company.com"
                autoComplete="email"
                disabled={isLoading}
                className={`w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border rounded-lg text-[#1E1B4B] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                  errors.email ? 'border-red-500 bg-red-50/20' : 'border-[#E2E8F0] hover:border-slate-300'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password-input"
              className="block text-xs font-semibold text-[#1E1B4B] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={isLoading}
                className={`w-full pl-10 pr-28 py-2.5 text-xs sm:text-sm bg-white border rounded-lg text-[#1E1B4B] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                  errors.password ? 'border-red-500 bg-red-50/20' : 'border-[#E2E8F0] hover:border-slate-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-[#94A3B8]" /> : <Eye className="w-4 h-4 text-[#94A3B8]" />}
                <span>{showPassword ? 'Hide password' : 'Show password'}</span>
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirm-password-input"
              className="block text-xs font-semibold text-[#1E1B4B] mb-1.5"
            >
              Confirm password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={isLoading}
                className={`w-full pl-10 pr-28 py-2.5 text-xs sm:text-sm bg-white border rounded-lg text-[#1E1B4B] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                  errors.confirmPassword
                    ? 'border-red-500 bg-red-50/20'
                    : 'border-[#E2E8F0] hover:border-slate-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B] transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4 text-[#94A3B8]" />
                ) : (
                  <Eye className="w-4 h-4 text-[#94A3B8]" />
                )}
                <span>{showConfirmPassword ? 'Hide password' : 'Show password'}</span>
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Terms & Privacy Policy Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#6D28D9] focus:ring-[#6D28D9] accent-[#6D28D9]"
              />
              <span className="text-xs text-[#475569] leading-tight">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowLegalModal('terms');
                  }}
                  className="font-medium text-[#6D28D9] hover:underline"
                >
                  Terms
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowLegalModal('privacy');
                  }}
                  className="font-medium text-[#6D28D9] hover:underline"
                >
                  Privacy Policy
                </button>
              </span>
            </label>
            {errors.terms && (
              <p className="text-[11px] text-red-500 mt-1">{errors.terms}</p>
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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#F1F5F9]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-[#94A3B8]">
              Already have an account?
            </span>
          </div>
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#6D28D9] hover:underline"
          >
            <span>Sign in</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Legal Modal (Terms / Privacy) */}
      {showLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#1E1B4B]">
                <ShieldCheck className="w-5 h-5 text-[#6D28D9]" />
                <h3 className="font-bold text-base">
                  {showLegalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLegalModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 text-xs text-slate-600 space-y-3 max-h-80 overflow-y-auto leading-relaxed">
              {showLegalModal === 'terms' ? (
                <>
                  <p className="font-semibold text-slate-800">1. Acceptance of Terms</p>
                  <p>
                    By creating an account on MarketFlow, you agree to comply with and be bound by these terms. MarketFlow provides marketing campaign management and workflow tools.
                  </p>
                  <p className="font-semibold text-slate-800">2. Account Responsibility</p>
                  <p>
                    You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                  </p>
                  <p className="font-semibold text-slate-800">3. Workspace Data</p>
                  <p>
                    Workspace owners retain ownership of all marketing, project, and campaign data entered into MarketFlow.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-800">1. Data Collection</p>
                  <p>
                    We collect your name, work email address, and authentication credentials solely to provide account access and multi-tenant workspace isolation.
                  </p>
                  <p className="font-semibold text-slate-800">2. Data Security</p>
                  <p>
                    All passwords are cryptographically hashed. We implement CSRF protection, secure sessions, and multi-tenant scoping to ensure your marketing data remains strictly private.
                  </p>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLegalModal(null)}
                className="px-4 py-2 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};
