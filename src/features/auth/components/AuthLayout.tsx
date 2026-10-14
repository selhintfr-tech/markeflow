import React from 'react';
import { AuthBrandingPanel } from './AuthBrandingPanel';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row antialiased font-inter">
      {/* Left Branding Panel */}
      <AuthBrandingPanel />

      {/* Right Form Area */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 bg-white min-h-[600px] lg:min-h-screen">
        <div className="w-full max-w-[420px] mx-auto animate-in fade-in duration-200">
          {children}
        </div>
      </div>
    </div>
  );
};
