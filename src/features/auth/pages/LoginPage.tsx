import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Retrieve destination path from location state or fallback to dashboard
  const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
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
      const response = await login({
        email: email.trim(),
        password,
        remember,
      });

      if (response.success && response.user) {
        // Redirect to intended protected destination
        navigate(destination, { replace: true });
      } else {
        setErrorMessage(
          response.message || 'Authentication failed. Please verify your email and password.'
        );
      }
    } catch {
      setErrorMessage(
        'Backend authentication service is offline or unreachable. Please start the Laravel 12 API server at http://localhost:8000.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl sm:text-[34px] font-extrabold text-[#1E1B4B] tracking-tight">
            Welcome back
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] mt-1.5">
            Sign in to your workspace
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-semibold text-amber-900">Authentication Service Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email Address */}
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-semibold text-[#1E1B4B] mb-1.5"
            >
              Email address
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
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <span>{errors.email}</span>
              </p>
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
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white border rounded-lg text-[#1E1B4B] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                  errors.password ? 'border-red-500 bg-red-50/20' : 'border-[#E2E8F0] hover:border-slate-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#64748B] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <span>{errors.password}</span>
              </p>
            )}
          </div>

          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#6D28D9] focus:ring-[#6D28D9] accent-[#6D28D9]"
              />
              <span className="font-medium text-[#1E1B4B]">Remember me</span>
            </label>

            <Link
              to="/forgot-password"
              className="font-medium text-[#6D28D9] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
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
              Don't have an account?
            </span>
          </div>
        </div>

        {/* Create Account Link */}
        <div className="text-center">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#6D28D9] hover:underline"
          >
            <span>Create an account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
