import React, { useState } from 'react';
import {
  Lock,
  Monitor,
  Laptop,
  Smartphone,
  Power,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react';
import type { ActiveSession } from '../../../types';

interface AccountSecurityCardProps {
  sessions: ActiveSession[];
  onChangePasswordClick: () => void;
  onReviewSessionsClick: () => void;
  onSignOutAllClick: () => void;
  onRevokeSession: (sessionId: string) => void;
}

export const AccountSecurityCard: React.FC<AccountSecurityCardProps> = ({
  sessions,
  onChangePasswordClick,
  onReviewSessionsClick,
  onSignOutAllClick,
  onRevokeSession,
}) => {
  const [activeSessionMenuId, setActiveSessionMenuId] = useState<string | null>(null);

  const getDeviceIcon = (session: ActiveSession) => {
    if (session.deviceType === 'mobile') {
      return <Smartphone className="w-4 h-4 text-[#64748B]" />;
    }
    return <Laptop className="w-4 h-4 text-[#64748B]" />;
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <h3 className="text-lg font-bold text-[#1E1B4B]">Account Security</h3>
        <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
          Manage your password, active sessions and account security settings.
        </p>
      </div>

      {/* Card 1: Change Password */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#1E1B4B]">Change Password</h4>
            <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
              Update your password regularly to keep your account secure.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onChangePasswordClick}
          className="w-full mt-4 py-2 px-3 rounded-lg border border-[#6D28D9] text-[#6D28D9] hover:bg-[#F5F3FF] text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
        >
          Change Password
        </button>
      </div>

      {/* Card 2: Active Sessions */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#1E1B4B]">Active Sessions</h4>
            <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
              These are the devices currently signed in to your account.
            </p>
          </div>
        </div>

        {/* Sessions list */}
        <div className="mt-4 pt-3 border-t border-[#F1F5F9] space-y-3.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start justify-between gap-2 text-xs relative group"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">{getDeviceIcon(session)}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#1E1B4B]">{session.device}</span>
                    {session.isCurrent && (
                      <span className="bg-[#CCFBF1] text-[#0D9488] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Current Session
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    {session.location}
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {session.isCurrent ? (
                      <span className="text-[#0D9488] font-medium">Active now</span>
                    ) : (
                      <span className="text-[#64748B]">{session.lastActive}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Three-dot action button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveSessionMenuId(
                      activeSessionMenuId === session.id ? null : session.id
                    )
                  }
                  className="p-1 text-[#94A3B8] hover:text-[#475569] rounded-md hover:bg-slate-100 transition-colors"
                  aria-label="Session options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {activeSessionMenuId === session.id && (
                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSessionMenuId(null);
                        onReviewSessionsClick();
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] transition-colors"
                    >
                      View Details
                    </button>
                    {!session.isCurrent && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSessionMenuId(null);
                          onRevokeSession(session.id);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                      >
                        End Session
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Review All Sessions button */}
        <button
          type="button"
          onClick={onReviewSessionsClick}
          className="w-full mt-4 py-2 px-3 rounded-lg border border-[#6D28D9] text-[#6D28D9] hover:bg-[#F5F3FF] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Review All Sessions</span>
        </button>
      </div>

      {/* Card 3: Sign Out All Sessions */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
            <Power className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#1E1B4B]">Sign Out All Sessions</h4>
            <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
              Sign out from all devices, except for your current session. You will need to sign in again on all other devices.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOutAllClick}
          className="w-full mt-4 py-2 px-3 rounded-lg border border-[#DC2626] text-[#DC2626] hover:bg-red-50 text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
        >
          Sign Out All Sessions
        </button>
      </div>
    </div>
  );
};
