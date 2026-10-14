import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { currentUser, initialActiveSessions } from '../../data/mock';
import type { UserProfile, ActiveSession } from '../../types';
import { ProfileSummaryCard } from './components/ProfileSummaryCard';
import { PersonalInformationForm } from './components/PersonalInformationForm';
import { AccountSecurityCard } from './components/AccountSecurityCard';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { ActiveSessionsModal } from './components/ActiveSessionsModal';
import { SignOutConfirmationModal } from './components/SignOutConfirmationModal';

export const MyProfilePage: React.FC = () => {
  // User Profile state
  const [user, setUser] = useState<UserProfile>(currentUser);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Active Sessions state
  const [sessions, setSessions] = useState<ActiveSession[]>(initialActiveSessions);

  // Success alert initial visibility matches Screenshot 2
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Modals state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSaveProfile = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setShowSuccessAlert(true);
    setToastMessage('Profile changes saved successfully.');
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setToastMessage('Session has been ended.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmSignOutAll = () => {
    // Keep only the current session
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    setIsSignOutModalOpen(false);
    setToastMessage('Signed out of 2 other active devices successfully.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#065F46] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs md:text-sm animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#A7F3D0] shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Dismiss notification"
          >
            <span aria-hidden="true" className="font-bold text-base">&times;</span>
          </button>
        </div>
      )}

      {/* Breadcrumb matching Screenshot 2 */}
      <div className="flex items-center gap-2 text-xs text-[#64748B]">
        <span>Account</span>
        <span className="text-[#94A3B8]">/</span>
        <span className="text-[#6D28D9] font-medium">My Profile</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
          My Profile
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Manage your personal information and account security
        </p>
      </div>

      {/* 2-Column Layout matching Screenshot 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (~60%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Profile Summary Card */}
          <ProfileSummaryCard
            user={user}
            avatarPreview={avatarPreview}
            showSuccessAlert={showSuccessAlert}
            onDismissAlert={() => setShowSuccessAlert(false)}
          />

          {/* Card 2: Personal Information Form */}
          <PersonalInformationForm
            key={user.name + user.email + (user.phone || '')}
            initialUser={user}
            avatarPreview={avatarPreview}
            onAvatarChange={setAvatarPreview}
            onSave={handleSaveProfile}
          />
        </div>

        {/* Right Column (~40%) */}
        <div className="lg:col-span-5">
          <AccountSecurityCard
            sessions={sessions}
            onChangePasswordClick={() => setIsPasswordModalOpen(true)}
            onReviewSessionsClick={() => setIsSessionsModalOpen(true)}
            onSignOutAllClick={() => setIsSignOutModalOpen(true)}
            onRevokeSession={handleRevokeSession}
          />
        </div>
      </div>

      {/* Security Modals */}
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <ActiveSessionsModal
        isOpen={isSessionsModalOpen}
        sessions={sessions}
        onClose={() => setIsSessionsModalOpen(false)}
        onRevokeSession={handleRevokeSession}
      />

      <SignOutConfirmationModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={handleConfirmSignOutAll}
      />
    </div>
  );
};
