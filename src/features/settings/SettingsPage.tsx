import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sliders,
  Building2,
  Bell,
  Palette,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  Lock,
  Smartphone,
  User,
  Info,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { SettingsSection, AppSettingsState } from './types';
import { loadStoredSettings, saveStoredSettings } from './settingsData';

export const SettingsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();

  // Active section tab
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  // Stored state vs draft state
  const [savedSettings, setSavedSettings] = useState<AppSettingsState>(loadStoredSettings);
  const [draftSettings, setDraftSettings] = useState<AppSettingsState>(loadStoredSettings);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const handleSave = () => {
    const success = saveStoredSettings(draftSettings);
    if (success) {
      setSavedSettings(draftSettings);
      showToast('Settings saved successfully.');
    } else {
      showError('Failed to save settings. Local storage may be full or disabled.');
    }
  };

  const handleCancel = () => {
    setDraftSettings(savedSettings);
    showToast('Changes discarded.');
  };

  // Section list definitions
  const sections: { id: SettingsSection; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'general', label: 'General', icon: Sliders, description: 'Language, timezone, and regional defaults' },
    { id: 'workspace', label: 'Workspace', icon: Building2, description: 'Active workspace overview and display' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert preferences and email digests' },
    { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme mode and interface density' },
    { id: 'team', label: 'Team & Permissions', icon: Users, description: 'Workspace membership and role details' },
    { id: 'security', label: 'Security & Privacy', icon: ShieldCheck, description: 'Account security links and privacy toggles' },
  ];

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
            className="ml-2 text-white/80 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-20 right-8 z-50 bg-red-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs md:text-sm animate-in slide-in-from-top-4 duration-200">
          <AlertCircle className="w-4 h-4 text-red-200 shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-2 text-white/80 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#64748B]">
        <span>Account</span>
        <span className="text-[#94A3B8]">/</span>
        <span className="text-[#6D28D9] font-medium">Settings</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
          Settings
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Manage your workspace, preferences and application settings.
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vertical Navigation (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-3 shadow-xs">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs md:text-sm transition-all group ${
                    isActive
                      ? 'bg-[#F5F3FF] text-[#6D28D9] font-semibold shadow-2xs'
                      : 'text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50'
                  }`}
                >
                  {/* Purple Left Indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#6D28D9] rounded-r-md" />
                  )}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? 'bg-[#EDE9FE] text-[#6D28D9]' : 'bg-slate-100 text-[#64748B] group-hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{section.label}</p>
                    <p className="text-[11px] text-[#94A3B8] font-normal truncate mt-0.5">
                      {section.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Column: Active Section Content (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: GENERAL SETTINGS */}
          {activeSection === 'general' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
              <div className="border-b border-[#F1F5F9] pb-4">
                <h2 className="text-base font-bold text-[#1E1B4B]">General Settings</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Configure language, regional formatting, and default analytics period.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Language */}
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1.5">
                    Preferred Language
                  </label>
                  <select
                    value={draftSettings.general.language}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, language: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  >
                    <option value="English">English</option>
                    <option value="Français">Français</option>
                    <option value="العربية">العربية</option>
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1.5">
                    Timezone
                  </label>
                  <select
                    value={draftSettings.general.timezone}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, timezone: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  >
                    <option value="Africa/Casablanca">Africa/Casablanca (UTC+01:00)</option>
                    <option value="Europe/Paris">Europe/Paris (UTC+01:00)</option>
                    <option value="Europe/London">Europe/London (UTC+00:00)</option>
                    <option value="America/New_York">America/New_York (UTC-05:00)</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1.5">
                    Date Format
                  </label>
                  <select
                    value={draftSettings.general.dateFormat}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, dateFormat: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/10/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/15/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-15)</option>
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1.5">
                    Currency Display
                  </label>
                  <select
                    value={draftSettings.general.currency}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, currency: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  >
                    <option value="MAD">MAD (Moroccan Dirham)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                  </select>
                </div>

                {/* Reporting Period */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-[#1E1B4B] mb-1.5">
                    Default Reporting Period
                  </label>
                  <select
                    value={draftSettings.general.reportingPeriod}
                    onChange={(e) =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, reportingPeriod: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                  >
                    <option value="Current month">Current month</option>
                    <option value="Last 30 days">Last 30 days</option>
                    <option value="Current quarter">Current quarter</option>
                    <option value="Year to date">Year to date</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* SECTION 2: WORKSPACE SETTINGS */}
          {activeSection === 'workspace' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
              <div className="border-b border-[#F1F5F9] pb-4">
                <h2 className="text-base font-bold text-[#1E1B4B]">Workspace Settings</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Information for the active workspace loaded from workspace context.
                </p>
              </div>

              {/* Active Workspace Info Banner */}
              <div className="bg-[#F8F7FC] border border-[#E2E8F0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#1E1B4B]">
                        {currentWorkspace?.name || 'Atlas Retail SARL'}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#059669]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                        {currentWorkspace?.status || 'Active'}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      ID: <span className="font-mono text-[#1E1B4B]">{currentWorkspace?.id || 'ws-atlas-retail'}</span> • {currentWorkspace?.location || 'Casablanca, Morocco'}
                    </p>
                  </div>
                </div>

                <Link
                  to="/workspaces"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:border-[#6D28D9] text-[#6D28D9] text-xs font-semibold rounded-lg shadow-2xs hover:bg-[#F5F3FF] transition-colors shrink-0"
                >
                  <span>Workspaces Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Workspace Display Preferences */}
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-[#1E1B4B] text-xs uppercase tracking-wider text-[#94A3B8]">
                  Display Preferences
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[#1E1B4B] mb-1.5">
                      Workspace Display Name
                    </label>
                    <input
                      type="text"
                      value={draftSettings.workspaceDisplay.displayName}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          workspaceDisplay: { ...prev.workspaceDisplay, displayName: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1E1B4B] mb-1.5">
                      Industry Category
                    </label>
                    <input
                      type="text"
                      value={draftSettings.workspaceDisplay.industry}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          workspaceDisplay: { ...prev.workspaceDisplay, industry: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-semibold text-[#1E1B4B] mb-1.5">
                      Primary Contact Email
                    </label>
                    <input
                      type="email"
                      value={draftSettings.workspaceDisplay.contactEmail}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          workspaceDisplay: { ...prev.workspaceDisplay, contactEmail: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                    />
                  </div>
                </div>
              </div>

              {/* Read-only Safe Summary Info */}
              <div className="bg-[#F0FDFA] border border-[#CCFBF1] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#0F766E]">
                <Info className="w-4 h-4 shrink-0 text-[#0D9488] mt-0.5" />
                <p className="leading-relaxed">
                  Workspace members, project associations, and enterprise billing are managed via the{' '}
                  <Link to="/workspaces" className="font-semibold underline hover:text-[#0D9488]">
                    Workspaces module
                  </Link>. Changes to the organization structure require administrator privileges.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: NOTIFICATION PREFERENCES */}
          {activeSection === 'notifications' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
              <div className="border-b border-[#F1F5F9] pb-4">
                <h2 className="text-base font-bold text-[#1E1B4B]">Notification Preferences</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Choose which alerts and digests you wish to receive across channels.
                </p>
              </div>

              {/* Staging Notice Banner */}
              <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#6D28D9]">
                <Info className="w-4 h-4 shrink-0 text-[#6D28D9] mt-0.5" />
                <p className="leading-relaxed">
                  Preferences are stored in your application settings. External email relay and webhook dispatch services will be synchronized upon backend integration.
                </p>
              </div>

              {/* Toggle Switches */}
              <div className="divide-y divide-[#F1F5F9] text-xs">
                {/* Campaign Budget Alerts */}
                <div className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#1E1B4B]">Campaign Budget Alerts</p>
                    <p className="text-[#64748B] mt-0.5">
                      Receive notices when advertising campaigns exceed 80% or 100% of planned ad budget.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={draftSettings.notifications.campaignBudgetAlerts}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            campaignBudgetAlerts: e.target.checked,
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D28D9]" />
                  </label>
                </div>

                {/* New CRM Leads */}
                <div className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#1E1B4B]">New CRM Leads</p>
                    <p className="text-[#64748B] mt-0.5">
                      Instant alerts when new leads are registered or updated in the CRM pipeline.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={draftSettings.notifications.newCrmLeads}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            newCrmLeads: e.target.checked,
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D28D9]" />
                  </label>
                </div>

                {/* Task Updates */}
                <div className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#1E1B4B]">Task Updates &amp; Deadlines</p>
                    <p className="text-[#64748B] mt-0.5">
                      Alerts on task assignments, milestone completions, and approaching due dates.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={draftSettings.notifications.taskUpdates}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            taskUpdates: e.target.checked,
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D28D9]" />
                  </label>
                </div>

                {/* Report Availability */}
                <div className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#1E1B4B]">Report Availability</p>
                    <p className="text-[#64748B] mt-0.5">
                      Notifications when weekly performance summaries and monthly reports are generated.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={draftSettings.notifications.reportAvailability}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            reportAvailability: e.target.checked,
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D28D9]" />
                  </label>
                </div>

                {/* Workspace Activity */}
                <div className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#1E1B4B]">Workspace Activity</p>
                    <p className="text-[#64748B] mt-0.5">
                      Updates when team members join the workspace or archive assets.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={draftSettings.notifications.workspaceActivity}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            workspaceActivity: e.target.checked,
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D28D9]" />
                  </label>
                </div>

                {/* Email Digest */}
                <div className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#1E1B4B]">Email Digest</p>
                    <p className="text-[#64748B] mt-0.5">
                      Send a consolidated weekly marketing activity recap to your account email.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={draftSettings.notifications.emailDigest}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            emailDigest: e.target.checked,
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D28D9]" />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* SECTION 4: APPEARANCE SETTINGS */}
          {activeSection === 'appearance' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
              <div className="border-b border-[#F1F5F9] pb-4">
                <h2 className="text-base font-bold text-[#1E1B4B]">Appearance Settings</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Customize the visual theme and layout density of your MarketFlow console.
                </p>
              </div>

              {/* Theme Selection Cards */}
              <div className="space-y-3">
                <label className="block font-semibold text-xs text-[#1E1B4B]">
                  Interface Theme
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Light Theme */}
                  <div
                    onClick={() =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, theme: 'light' },
                      }))
                    }
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      draftSettings.appearance.theme === 'light'
                        ? 'border-[#6D28D9] bg-[#F5F3FF]'
                        : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Sun className="w-5 h-5 text-[#6D28D9]" />
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">
                        Current Default
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#1E1B4B]">Light Mode</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Clean high-contrast theme optimized for daily marketing work.
                    </p>
                  </div>

                  {/* Dark Theme */}
                  <div
                    onClick={() =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, theme: 'dark' },
                      }))
                    }
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      draftSettings.appearance.theme === 'dark'
                        ? 'border-[#6D28D9] bg-[#F5F3FF]'
                        : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Moon className="w-5 h-5 text-[#64748B]" />
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B]">
                        Staging Preview
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#1E1B4B]">Dark Mode</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Low-glare palette for dimly lit environments.
                    </p>
                  </div>

                  {/* System Theme */}
                  <div
                    onClick={() =>
                      setDraftSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, theme: 'system' },
                      }))
                    }
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      draftSettings.appearance.theme === 'system'
                        ? 'border-[#6D28D9] bg-[#F5F3FF]'
                        : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Laptop className="w-5 h-5 text-[#64748B]" />
                    </div>
                    <p className="text-xs font-bold text-[#1E1B4B]">System Auto</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Matches your operating system display preferences.
                    </p>
                  </div>
                </div>
              </div>

              {/* Informational notice about dark mode implementation */}
              <div className="bg-[#F8F7FC] border border-[#E2E8F0] rounded-xl p-3.5 text-xs text-[#64748B] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
                <p>
                  MarketFlow is currently rendered using the approved Light theme. Full stylesheet support for system-wide dark mode will be activated in an upcoming milestone.
                </p>
              </div>

              {/* Layout Density */}
              <div className="space-y-3 pt-2">
                <label className="block font-semibold text-xs text-[#1E1B4B]">
                  Interface Density
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      draftSettings.appearance.density === 'comfortable'
                        ? 'border-[#6D28D9] bg-[#F5F3FF]'
                        : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="density"
                      value="comfortable"
                      checked={draftSettings.appearance.density === 'comfortable'}
                      onChange={() =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, density: 'comfortable' },
                        }))
                      }
                      className="mt-0.5 text-[#6D28D9] focus:ring-[#6D28D9]"
                    />
                    <div>
                      <p className="font-bold text-[#1E1B4B]">Comfortable (Default)</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        Standard padding and balanced row spacing across all lists and tables.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      draftSettings.appearance.density === 'compact'
                        ? 'border-[#6D28D9] bg-[#F5F3FF]'
                        : 'border-[#E2E8F0] bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="density"
                      value="compact"
                      checked={draftSettings.appearance.density === 'compact'}
                      onChange={() =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, density: 'compact' },
                        }))
                      }
                      className="mt-0.5 text-[#6D28D9] focus:ring-[#6D28D9]"
                    />
                    <div>
                      <p className="font-bold text-[#1E1B4B]">Compact</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        Increased information density with tighter table rows and cards.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
                >
                  Save Appearance
                </button>
              </div>
            </div>
          )}

          {/* SECTION 5: TEAM & PERMISSIONS */}
          {activeSection === 'team' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
              <div className="border-b border-[#F1F5F9] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#1E1B4B]">Team &amp; Permissions</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Members and roles assigned to <span className="font-semibold text-[#1E1B4B]">{currentWorkspace?.name || 'Atlas Retail SARL'}</span>.
                  </p>
                </div>
                <Link
                  to="/workspaces"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
                >
                  <span>Manage in Workspaces</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#94A3B8]">
                  Workspace Members
                </h4>

                <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden text-xs">
                  {/* Member 1: Sara El Amrani */}
                  <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F8F7FC] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EDE9FE] text-[#6D28D9] font-bold flex items-center justify-center shrink-0">
                        SE
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#1E1B4B]">Sara El Amrani</p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">
                            You
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B]">sara.elamrani@atlasretail.ma</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#6D28D9] bg-[#F5F3FF] px-2.5 py-1 rounded-lg">
                      Workspace Owner
                    </span>
                  </div>

                  {/* Member 2: Karim Tazi */}
                  <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F8F7FC] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#CCFBF1] text-[#0F766E] font-bold flex items-center justify-center shrink-0">
                        KT
                      </div>
                      <div>
                        <p className="font-bold text-[#1E1B4B]">Karim Tazi</p>
                        <p className="text-[11px] text-[#64748B]">karim.tazi@atlasretail.ma</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#475569] bg-slate-100 px-2.5 py-1 rounded-lg">
                      Marketing Lead
                    </span>
                  </div>

                  {/* Member 3: Yasmine Bennani */}
                  <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F8F7FC] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#B45309] font-bold flex items-center justify-center shrink-0">
                        YB
                      </div>
                      <div>
                        <p className="font-bold text-[#1E1B4B]">Yasmine Bennani</p>
                        <p className="text-[11px] text-[#64748B]">yasmine.b@atlasretail.ma</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#475569] bg-slate-100 px-2.5 py-1 rounded-lg">
                      Content Strategist
                    </span>
                  </div>
                </div>
              </div>

              {/* Roles & Permissions Reference */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#94A3B8]">
                  Roles Overview
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#F8F7FC] border border-[#E2E8F0] rounded-xl p-3">
                    <p className="font-bold text-[#6D28D9]">Owner / Admin</p>
                    <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                      Complete control over workspaces, team invitations, billing, and campaign budgets.
                    </p>
                  </div>
                  <div className="bg-[#F8F7FC] border border-[#E2E8F0] rounded-xl p-3">
                    <p className="font-bold text-[#1E1B4B]">Member</p>
                    <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                      Can create campaigns, manage marketing tasks, track CRM leads, and generate reports.
                    </p>
                  </div>
                  <div className="bg-[#F8F7FC] border border-[#E2E8F0] rounded-xl p-3">
                    <p className="font-bold text-[#1E1B4B]">Viewer</p>
                    <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                      Read-only inspection of dashboards, profitability metrics, and campaign reports.
                    </p>
                  </div>
                </div>
              </div>

              {/* Informational notice */}
              <div className="bg-[#F8F7FC] border border-[#E2E8F0] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#64748B]">
                <Info className="w-4 h-4 text-[#6D28D9] shrink-0 mt-0.5" />
                <p>
                  Role permissions and team member invitations are administered centrally. Visit the{' '}
                  <Link to="/workspaces" className="text-[#6D28D9] font-semibold underline">
                    Workspaces module
                  </Link>{' '}
                  to manage organizational access.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 6: SECURITY & PRIVACY */}
          {activeSection === 'security' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
              <div className="border-b border-[#F1F5F9] pb-4">
                <h2 className="text-base font-bold text-[#1E1B4B]">Security &amp; Privacy</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Manage account security shortcuts and local privacy preferences.
                </p>
              </div>

              {/* Navigation Cards to My Profile */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#94A3B8]">
                  Account Credentials &amp; Sessions
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Card 1: My Profile */}
                  <Link
                    to="/profile"
                    className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#6D28D9] hover:shadow-2xs transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <User className="w-4.5 h-4.5" />
                      </div>
                      <p className="font-bold text-[#1E1B4B] group-hover:text-[#6D28D9] transition-colors">
                        Personal Information
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                        Update your display name, contact phone, and avatar photo.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1 font-semibold text-[#6D28D9] text-[11px]">
                      <span>Open Profile</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>

                  {/* Card 2: Change Password */}
                  <Link
                    to="/profile"
                    className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#6D28D9] hover:shadow-2xs transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Lock className="w-4.5 h-4.5" />
                      </div>
                      <p className="font-bold text-[#1E1B4B] group-hover:text-[#6D28D9] transition-colors">
                        Change Password
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                        Update your account password and security credentials.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1 font-semibold text-[#6D28D9] text-[11px]">
                      <span>Go to Security</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>

                  {/* Card 3: Active Sessions */}
                  <Link
                    to="/profile"
                    className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#6D28D9] hover:shadow-2xs transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Smartphone className="w-4.5 h-4.5" />
                      </div>
                      <p className="font-bold text-[#1E1B4B] group-hover:text-[#6D28D9] transition-colors">
                        Active Sessions
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                        Inspect devices currently logged into your MarketFlow account.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1 font-semibold text-[#6D28D9] text-[11px]">
                      <span>View Sessions</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                </div>
              </div>

              {/* Local Privacy Preferences */}
              <div className="space-y-3 pt-3 border-t border-[#F1F5F9]">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#94A3B8]">
                  Privacy &amp; Data Preferences
                </h4>

                <div className="divide-y divide-[#F1F5F9] text-xs">
                  {/* Telemetry */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#1E1B4B]">Anonymous Analytics Telemetry</p>
                      <p className="text-[#64748B] mt-0.5">
                        Help improve MarketFlow by automatically reporting anonymized client performance statistics.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={draftSettings.privacy.analyticsTelemetry}
                        onChange={(e) =>
                          setDraftSettings((prev) => ({
                            ...prev,
                            privacy: {
                              ...prev.privacy,
                              analyticsTelemetry: e.target.checked,
                            },
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D28D9]" />
                    </label>
                  </div>

                  {/* Remember Table Filters */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#1E1B4B]">Remember Table Filters Across Sessions</p>
                      <p className="text-[#64748B] mt-0.5">
                        Automatically persist your table sorting, search queries, and status filters across browser reloads.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={draftSettings.privacy.rememberFilters}
                        onChange={(e) =>
                          setDraftSettings((prev) => ({
                            ...prev,
                            privacy: {
                              ...prev.privacy,
                              rememberFilters: e.target.checked,
                            },
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D28D9]" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
                >
                  Save Privacy Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
