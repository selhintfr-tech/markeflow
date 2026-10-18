import React from 'react';
import { Building2, CheckCircle2, X } from 'lucide-react';
import type { UserProfile } from '../../../types';

interface ProfileSummaryCardProps {
  user: UserProfile;
  avatarPreview: string | null;
  showSuccessAlert: boolean;
  onDismissAlert: () => void;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({
  user,
  avatarPreview,
  showSuccessAlert,
  onDismissAlert,
}) => {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
      <div className="flex items-start gap-5">
        {/* Large Lavender Avatar */}
        <div className="w-20 h-20 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center text-2xl font-bold border border-[#DDD6FE] shrink-0 overflow-hidden shadow-2xs">
          {avatarPreview || user.avatarUrl ? (
            <img
              src={avatarPreview || user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{user.initials}</span>
          )}
        </div>

        {/* User Metadata */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#1E1B4B] tracking-tight">{user.name}</h2>
          <p className="text-sm text-[#64748B] mt-0.5">{user.role || 'Workspace member'}</p>

          <div className="flex items-center gap-1.5 text-sm font-medium text-[#1E1B4B] mt-2">
            <Building2 className="w-4 h-4 text-[#94A3B8]" />
            <span>{user.workspaceName || 'Workspace unavailable'}</span>
          </div>

          {user.memberSince && (
            <p className="text-xs text-[#64748B] mt-1.5">Member since {user.memberSince}</p>
          )}
        </div>
      </div>

      {/* Light-Teal Success Notification matching Screenshot 2 */}
      {showSuccessAlert && (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-4 py-3 flex items-center justify-between mt-6 text-sm text-[#065F46] animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
            <span className="text-xs md:text-sm font-medium">Profile updated successfully</span>
          </div>
          <button
            type="button"
            onClick={onDismissAlert}
            className="text-[#059669] hover:text-[#047857] p-1 rounded-md transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      )}
    </div>
  );
};
