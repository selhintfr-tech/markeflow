import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { UserProfile } from '../../types';
import { ApiError } from '../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ProfileSummaryCard } from './components/ProfileSummaryCard';
import { PersonalInformationForm } from './components/PersonalInformationForm';
import { AccountSecurityCard } from './components/AccountSecurityCard';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { profileService } from './profileService';

export const MyProfilePage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const { updateAvatar } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    profileService.getCurrentProfile()
      .then((profile) => {
        if (isMounted) setUser(profile);
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load your profile.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const displayUser = user
    ? { ...user, workspaceName: currentWorkspace.name || undefined }
    : null;

  const handleSaveProfile = async (updatedUser: UserProfile) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const savedProfile = await profileService.updateProfile(updatedUser);
      setUser((current) => ({
        ...savedProfile,
        role: savedProfile.role || current?.role,
        workspaceName: currentWorkspace.name || undefined,
      }));
      setShowSuccessAlert(true);
      setToastMessage('Profile changes saved successfully.');
    } catch (error) {
      setSaveError(error instanceof ApiError && error.status === 404
        ? 'Profile changes were not saved: the backend has not registered PATCH /api/profile.'
        : error instanceof Error ? error.message : 'Unable to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setIsAvatarSaving(true);
    setAvatarError(null);
    try {
      const updatedProfile = await profileService.uploadAvatar(file);
      setUser((current) => current ? { ...current, avatarUrl: updatedProfile.avatarUrl } : current);
      updateAvatar(updatedProfile.avatarUrl || null);
      setToastMessage('Profile photo updated successfully.');
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Unable to upload your profile photo.');
    } finally {
      setIsAvatarSaving(false);
    }
  };

  const handleAvatarRemove = async () => {
    setIsAvatarSaving(true);
    setAvatarError(null);
    try {
      const updatedProfile = await profileService.deleteAvatar();
      setUser((current) => current ? { ...current, avatarUrl: updatedProfile.avatarUrl } : current);
      updateAvatar(null);
      setToastMessage('Profile photo removed.');
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Unable to remove your profile photo.');
    } finally {
      setIsAvatarSaving(false);
    }
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

      {saveError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}
      {avatarError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{avatarError}</span>
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
      {isLoading ? (
        <div role="status" className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-sm text-[#64748B]">
          Loading your profile…
        </div>
      ) : loadError ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : displayUser ? (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (~60%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Profile Summary Card */}
          <ProfileSummaryCard
            user={displayUser}
            showSuccessAlert={showSuccessAlert}
            onDismissAlert={() => setShowSuccessAlert(false)}
          />

          {/* Card 2: Personal Information Form */}
          <PersonalInformationForm
            key={displayUser.name + displayUser.email + (displayUser.phone || '')}
            initialUser={displayUser}
            onSave={handleSaveProfile}
            isSaving={isSaving}
            onAvatarUpload={handleAvatarUpload}
            onAvatarRemove={handleAvatarRemove}
            isAvatarSaving={isAvatarSaving}
          />
        </div>

        {/* Right Column (~40%) */}
        <div className="lg:col-span-5">
          <AccountSecurityCard
            onChangePasswordClick={() => setIsPasswordModalOpen(true)}
          />
        </div>
      </div>

      {/* Security Modals */}
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={profileService.changePassword}
      />
      </>
      ) : null}
    </div>
  );
};
