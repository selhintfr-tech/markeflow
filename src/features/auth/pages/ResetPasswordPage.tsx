import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { authService } from '../services/authService';

const inputClass = 'w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#1E1B4B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] disabled:opacity-60';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email) {
      setError('The recovery email is missing. Request a new verification code.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    setLoading(true);
    const response = await authService.verifyRecoveryCode({ email, code });
    setLoading(false);
    if (!response.success || !response.recoveryToken) {
      setError(response.message || 'That code is incorrect, expired, or unavailable. Request a new code.');
      return;
    }
    setRecoveryToken(response.recoveryToken);
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Use at least 12 characters, including a letter and a number.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    const response = await authService.resetPassword({
      recovery_token: recoveryToken,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
    setLoading(false);
    if (!response.success) {
      setError(response.message || 'Password reset could not be completed. Verify your email code again.');
      return;
    }
    setSuccess(true);
    window.setTimeout(() => navigate('/login', { replace: true }), 2500);
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#6D28D9]">
          {success ? <CheckCircle2 className="h-6 w-6" /> : recoveryToken ? <Lock className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
        </div>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            {success ? 'Password updated' : recoveryToken ? 'Choose a new password' : 'Verify your email'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            {success
              ? 'Your password was changed successfully. Redirecting you to sign in...'
              : recoveryToken
                ? 'Your email is verified. Choose a strong password for your account.'
                : `Enter the six-digit code sent to ${email || 'your email address'}. Codes expire after 10 minutes.`}
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>{error}</p>
          </div>
        )}

        {success ? (
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6D28D9] hover:underline">
            Sign in now <ArrowRight className="h-4 w-4" />
          </Link>
        ) : recoveryToken ? (
          <form onSubmit={submitPassword} className="space-y-4">
            <label className="block text-xs font-semibold text-[#1E1B4B]">
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClass} mt-1.5`}
                disabled={loading}
                required
              />
            </label>
            <p className="-mt-2 text-[11px] text-[#64748B]">At least 12 characters, including a letter and a number.</p>
            <label className="block text-xs font-semibold text-[#1E1B4B]">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                className={`${inputClass} mt-1.5`}
                disabled={loading}
                required
              />
            </label>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6D28D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Update password
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-4">
            <label className="block text-xs font-semibold text-[#1E1B4B]">
              Six-digit verification code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${inputClass} mt-1.5 text-center text-lg tracking-[0.4em]`}
                disabled={loading}
                required
              />
            </label>
            <button type="submit" disabled={loading || !email} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6D28D9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Verify code
            </button>
            <Link to="/forgot-password" className="block text-center text-xs font-semibold text-[#6D28D9] hover:underline">
              Request a new code
            </Link>
          </form>
        )}

        <div className="text-center pt-2">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D28D9] hover:underline">
            Back to sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
