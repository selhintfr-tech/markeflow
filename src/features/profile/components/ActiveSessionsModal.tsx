import React, { useEffect } from 'react';
import { X, Monitor, Smartphone, CheckCircle, ShieldAlert, Laptop } from 'lucide-react';
import type { ActiveSession } from '../../../types';

interface ActiveSessionsModalProps {
  isOpen: boolean;
  sessions: ActiveSession[];
  onClose: () => void;
  onRevokeSession: (sessionId: string) => void;
}

export const ActiveSessionsModal: React.FC<ActiveSessionsModalProps> = ({
  isOpen,
  sessions,
  onClose,
  onRevokeSession,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#94A3B8] hover:text-[#475569] p-1 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 stroke-[2.2]" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1E1B4B]">Review All Active Sessions</h3>
            <p className="text-xs text-[#64748B]">
              Active devices and login locations associated with your account
            </p>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mb-4 p-3 bg-[#F8F7FC] border border-[#E2E8F0] rounded-xl text-xs text-[#64748B] flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#1E1B4B] block">Demo Device Records</span>
            These are mock sessions for demonstration. Live device revocation will take effect once backend session management is enabled.
          </div>
        </div>

        {/* Session List */}
        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
          {sessions.map((session) => {
            const isDesktop = session.deviceType === 'desktop';
            return (
              <div
                key={session.id}
                className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                    {isDesktop ? (
                      <Laptop className="w-4 h-4" />
                    ) : (
                      <Smartphone className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1E1B4B]">{session.device}</span>
                      {session.isCurrent && (
                        <span className="bg-[#CCFBF1] text-[#0D9488] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="text-[#64748B] text-[11px] mt-0.5">
                      {session.location} • {session.browser} • {session.ipAddress}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      {session.isCurrent ? (
                        <span className="text-[#0D9488] font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Active now
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">Last active: {session.lastActive}</span>
                      )}
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => onRevokeSession(session.id)}
                    className="px-2.5 py-1 text-[11px] font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-[#F1F5F9] mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#6D28D9] text-white text-xs font-semibold rounded-lg hover:bg-[#5B21B6] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
