import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { authService } from '../services/authService';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [email] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = 'New password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your new password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
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
      const response = await authService.resetPassword({
        token,
        email,
        password,
        password_confirmation: confirmPassword,
      });

      if (response.success) {
        setIsSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setErrorMessage(response.message || 'Password reset could not be completed.');
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
        <div className="w-14 h-14 rounded-2xl bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center">
          <KeyRound className="w-6 h-6 stroke-[2.2]" />
        </div>

        <div>
          <h2 className="text-3xl sm:text-[34px] font-extrabold text-[#1E1B4B] tracking-tight">
            Set new password
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] mt-1.5 leading-relaxed">
            Please enter your new password to secure your account.
          </p>
        </div>

        {isSuccess ? (
          <div className="p-5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 text-[#059669]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm text-[#065F46]">Password Updated</h4>
            </div>
            <p className="text-xs text-[#065F46] leading-relaxed">
              Your password has been successfully updated. Redirecting you to sign in...
            </p>
            <div className="pt-2 border-t border-[#A7F3D0]/50">
              <Link to="/login" className="font-bold text-[#6D28D9] hover:underline text-xs">
                Proceed to sign in immediately →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-semibold text-amber-900">Backend Notice</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="new-password-input"
                  className="block text-xs font-semibold text-[#1E1B4B] mb-1.5"
                >
                  New password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="new-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white border rounded-lg text-[#1E1B4B] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                      errors.password ? 'border-red-500 bg-red-50/20' : 'border-[#E2E8F0] hover:border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirm-new-password-input"
                  className="block text-xs font-semibold text-[#1E1B4B] mb-1.5"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirm-new-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword)
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white border rounded-lg text-[#1E1B4B] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                      errors.confirmPassword
                        ? 'border-red-500 bg-red-50/20'
                        : 'border-[#E2E8F0] hover:border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#64748B] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

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
