import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

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

  // Redirect to login if user is not authenticated, preserving current destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
