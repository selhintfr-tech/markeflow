import React, { useState, useRef } from 'react';
import { Camera, AlertCircle, ChevronDown } from 'lucide-react';
import type { UserProfile } from '../../../types';

interface PersonalInformationFormProps {
  initialUser: UserProfile;
  onSave: (updatedUser: UserProfile) => Promise<void>;
  isSaving: boolean;
  onAvatarUpload: (file: File) => Promise<void>;
  onAvatarRemove: () => Promise<void>;
  isAvatarSaving: boolean;
}

export const PersonalInformationForm: React.FC<PersonalInformationFormProps> = ({
  initialUser,
  onSave,
  isSaving,
  onAvatarUpload,
  onAvatarRemove,
  isAvatarSaving,
}) => {
  const [fullName, setFullName] = useState(initialUser.name);
  const [email, setEmail] = useState(initialUser.email);
  const [phone, setPhone] = useState(initialUser.phone || '');
  const [language, setLanguage] = useState(initialUser.language || 'English');
  const [timezone, setTimezone] = useState(initialUser.timezone || 'Africa/Casablanca');
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setFullName(initialUser.name);
    setEmail(initialUser.email);
    setPhone(initialUser.phone || '');
    setLanguage(initialUser.language || 'English');
    setTimezone(initialUser.timezone || 'Africa/Casablanca');
    setFormError(null);
    setUploadError(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid format. Please select a JPG, PNG, or WebP file.');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File exceeds 5MB size limit. Please choose a smaller image.');
      e.target.value = '';
      return;
    }

    setUploadError(null);
    e.target.value = '';
    void onAvatarUpload(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }

    // Derive initials from full name
    const parts = fullName.trim().split(/\s+/);
    const initials = parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : fullName.slice(0, 2).toUpperCase();

    const updatedUser: UserProfile = {
      ...initialUser,
      name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      language,
      timezone,
      initials,
      avatarUrl: initialUser.avatarUrl,
    };

    void onSave(updatedUser);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
      {/* Form Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[#1E1B4B]">Personal information</h3>
        <p className="text-xs text-[#64748B] mt-0.5">
          Update your personal details and preferences
        </p>
      </div>

      {formError && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Full Name & Email Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] shadow-2xs transition-all"
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] shadow-2xs transition-all"
              placeholder="Email address"
            />
          </div>
        </div>

        {/* Row 2: Phone Number & Preferred Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1.5">
              Phone Number <span className="text-[#64748B] font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] shadow-2xs transition-all"
              placeholder="+212 6 XX XX XX XX"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1.5">
              Preferred Language
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full appearance-none px-3.5 pr-8 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] cursor-pointer shadow-2xs"
              >
                <option value="English">English</option>
                <option value="Français">Français</option>
                <option value="العربية">العربية</option>
                <option value="Español">Español</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#94A3B8]">
                <ChevronDown className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Timezone (full-width) */}
        <div>
          <label className="block text-xs font-semibold text-[#1E1B4B] mb-1.5">
            Timezone
          </label>
          <div className="relative">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full appearance-none px-3.5 pr-8 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] focus:border-[#6D28D9] cursor-pointer shadow-2xs"
            >
              {!['Africa/Casablanca', 'Europe/Paris', 'Europe/London', 'America/New_York'].includes(timezone) && (
                <option value={timezone}>{timezone}</option>
              )}
              <option value="Africa/Casablanca">
                Africa/Casablanca (UTC+01:00)
              </option>
              <option value="Europe/Paris">
                Europe/Paris (UTC+02:00)
              </option>
              <option value="Europe/London">
                Europe/London (UTC+01:00)
              </option>
              <option value="America/New_York">
                America/New_York (UTC-04:00)
              </option>
              <option value="Asia/Dubai (UTC+04:00)">
                Asia/Dubai (UTC+04:00)
              </option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#94A3B8]">
              <ChevronDown className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Profile Photo Upload Section matching Screenshot 2 */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-[#1E1B4B] mb-2">
            Profile Photo
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/jpeg,image/png,image/webp"
            disabled={isAvatarSaving}
            className="hidden"
          />

          <div className="flex items-center gap-4">
            {/* Dashed Upload Box matching Screenshot 2 */}
            <div
              onClick={() => !isAvatarSaving && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isAvatarSaving) fileInputRef.current?.click();
              }}
              aria-disabled={isAvatarSaving}
              className={`w-28 h-24 border-2 border-dashed border-[#CBD5E1] hover:border-[#6D28D9] hover:bg-[#F5F3FF]/40 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors bg-[#F8FAFC] group text-center shrink-0 ${isAvatarSaving ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
            >
              {initialUser.avatarUrl ? (
                <div className="relative w-full h-full p-1">
                  <img
                    src={initialUser.avatarUrl}
                    alt={`${initialUser.name}'s current profile photo`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              ) : (
                <>
                  <Camera className="w-5 h-5 text-[#64748B] group-hover:text-[#6D28D9] transition-colors" />
                  <span className="text-[11px] font-medium text-[#475569] group-hover:text-[#6D28D9]">
                    {isAvatarSaving ? 'Uploading…' : 'Upload photo'}
                  </span>
                </>
              )}
            </div>

            {/* Supporting Text */}
            <div className="text-xs text-[#64748B] space-y-0.5">
              <p>Upload a profile photo to personalize your account.</p>
              <p className="text-[11px] text-[#94A3B8]">JPG, PNG or WebP. Max size 5MB.</p>
              {isAvatarSaving && <p role="status" className="text-[11px] text-[#6D28D9]">Saving profile photo…</p>}
              {initialUser.avatarUrl && (
                <button
                  type="button"
                  onClick={() => void onAvatarRemove()}
                  disabled={isAvatarSaving}
                  className="text-xs text-red-600 hover:underline pt-1 inline-block disabled:opacity-50"
                >
                  Remove profile photo
                </button>
              )}
            </div>
          </div>

          {uploadError && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{uploadError}</span>
            </p>
          )}
        </div>

        {/* Bottom Form Actions matching Screenshot 2 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9] mt-6">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#475569] hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-medium shadow-xs hover:shadow-md transition-all"
          >
            {isSaving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};
