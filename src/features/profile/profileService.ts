import { apiRequest } from '../api/apiClient';
import type { UserProfile } from '../../types';

interface AuthenticatedProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  timezone: string | null;
  locale: string | null;
  role?: string | null;
  workspaceId?: string | null;
}

interface ProfileResource {
  data: Omit<AuthenticatedProfile, 'role' | 'workspaceId'>
    & Partial<Pick<AuthenticatedProfile, 'role' | 'workspaceId'>>;
}

const languageByLocale: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  es: 'Español',
};

function toUserProfile(profile: AuthenticatedProfile): UserProfile {
  const name = profile.name.trim();
  const parts = name.split(/\s+/);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();

  return {
    name: profile.name,
    initials,
    email: profile.email,
    avatarUrl: profile.avatar_url || undefined,
    phone: profile.phone || '',
    role: profile.role || undefined,
    language: languageByLocale[profile.locale || 'en'] || 'English',
    timezone: profile.timezone || 'Africa/Casablanca',
  };
}

export const profileService = {
  async getCurrentProfile(): Promise<UserProfile> {
    const profile = await apiRequest<AuthenticatedProfile>('/api/user');
    return toUserProfile(profile);
  },

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    const locale = Object.entries(languageByLocale)
      .find(([, language]) => language === profile.language)?.[0];
    const response = await apiRequest<ProfileResource>('/api/profile', {
      method: 'PATCH',
      body: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone || null,
        timezone: profile.timezone || null,
        ...(locale ? { locale } : {}),
      },
    });
    return toUserProfile(response.data);
  },

  async changePassword(payload: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<void> {
    await apiRequest('/api/profile/password', {
      method: 'PATCH',
      body: payload,
    });
  },
};
