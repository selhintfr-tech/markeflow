import React from 'react';
import { Lock, Monitor, ShieldAlert } from 'lucide-react';

interface AccountSecurityCardProps {
  onChangePasswordClick: () => void;
}

export const AccountSecurityCard: React.FC<AccountSecurityCardProps> = ({
  onChangePasswordClick,
}) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-bold text-[#1E1B4B]">Account Security</h3>
      <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
        Manage your password and account security settings.
      </p>
    </div>

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

    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
          <Monitor className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[#1E1B4B]">Active Sessions</h4>
          <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
            Session details and remote sign-out are not available in the current backend API.
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Session listing, revocation, and sign-out-all endpoints have not been registered.</p>
      </div>
    </div>
  </div>
);
