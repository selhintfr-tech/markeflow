import React, { useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isApiAvailable, lastError, revalidateSession } = useAuth();
  const location = useLocation();
  const [retrying, setRetrying] = useState(false);

  // Show accessible loading spinner while verifying server session
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Verifying authentication session"
        className="flex flex-col items-center justify-center min-h-screen w-full bg-[#F8FAFC]"
      >
        <div className="w-10 h-10 border-4 border-[#EDE9FE] border-t-[#6D28D9] rounded-full animate-spin" />
        <span className="sr-only">Verifying session, please wait...</span>
        <p className="mt-3 text-xs font-medium text-[#64748B]">Verifying session...</p>
      </div>
    );
  }

  if (!isApiAvailable) {
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC] p-6 text-center">
        <p className="max-w-md text-sm text-[#64748B]">
          {lastError || 'MarketFlow could not validate your session. Your account has not been signed out.'}
        </p>
        <button
          type="button"
          disabled={retrying}
          onClick={async () => {
            setRetrying(true);
            try {
              await revalidateSession();
            } finally {
              setRetrying(false);
            }
          }}
          className="rounded-lg bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {retrying ? 'Checking session…' : 'Retry connection'}
        </button>
      </div>
    );
  }

  // Redirect to login if user is not authenticated, preserving current destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
