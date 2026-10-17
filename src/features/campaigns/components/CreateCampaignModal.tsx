import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CampaignItem, CampaignStatus, CampaignPlatform } from '../types';
import { useWorkspace } from '../../../context/WorkspaceContext';
import type { ProjectRecord } from '../../projects/projectService';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (campaignData: Partial<CampaignItem>) => Promise<void>;
  initialCampaign?: CampaignItem | null;
  workspaceName?: string;
  projects: ProjectRecord[];
  isSaving: boolean;
  saveError: string | null;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCampaign,
  workspaceName: propWorkspaceName,
  projects,
  isSaving,
  saveError,
}) => {
  const { currentWorkspace } = useWorkspace();
  const defaultWsName = propWorkspaceName ?? currentWorkspace.name;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');
  const [workspaceName, setWorkspaceName] = useState(defaultWsName);
  const [projectId, setProjectId] = useState('');
  const [platform, setPlatform] = useState<CampaignPlatform>('Meta Ads');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adBudget, setAdBudget] = useState('2000');
  const [status, setStatus] = useState<CampaignStatus>('Planned');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Sync state during render when initialCampaign or isOpen changes (avoids cascading effect renders)
  const [prevCampaign, setPrevCampaign] = useState(initialCampaign);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen || initialCampaign !== prevCampaign) {
    setPrevIsOpen(isOpen);
    setPrevCampaign(initialCampaign);
    if (initialCampaign) {
      setName(initialCampaign.name);
      setDescription(initialCampaign.description || '');
      setObjective(initialCampaign.objectiveType || '');
      setWorkspaceName(initialCampaign.workspaceName);
      setProjectId(initialCampaign.projectId);
      setPlatform(initialCampaign.platform);
      setStartDate(initialCampaign.startDate.slice(0, 10));
      setEndDate(initialCampaign.endDate.slice(0, 10));
      setAdBudget(initialCampaign.adBudget ? initialCampaign.adBudget.toString() : '2000');
      setStatus(initialCampaign.status);
    } else {
      setName('');
      setDescription('');
      setObjective('');
      setWorkspaceName(currentWorkspace.name);
      setProjectId(projects[0]?.id || '');
      setPlatform('Meta Ads');
      setStartDate('');
      setEndDate('');
      setAdBudget('2000');
      setStatus('Planned');
    }
    setErrors({});
  }

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Campaign name is required';
    }
    if (!adBudget || !Number.isFinite(Number(adBudget)) || Number(adBudget) < 0) {
      newErrors.adBudget = 'Please enter a valid budget';
    }
    if (!projectId) newErrors.project = 'Select a project in this workspace';
    if (!startDate || !endDate) newErrors.dates = 'Start and end dates are required';
    else if (endDate < startDate) newErrors.dates = 'End date must be on or after the start date';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSave({
      name: name.trim(),
      description: description.trim(),
      objectiveType: objective.trim(),
      workspaceName,
      projectName: projects.find((project) => project.id === projectId)?.name || '',
      projectId,
      platform,
      channel: platform,
      startDate,
      endDate,
      adBudget: parseFloat(adBudget) || 0,
      status,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-campaign-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 id="create-campaign-modal-title" className="text-base font-bold text-[#1E1B4B]">
            {initialCampaign ? 'Edit Campaign' : 'Create New Campaign'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(event) => { void handleSubmit(event); }} className="p-5 space-y-3.5">
          {saveError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{saveError}</p>}
          <div>
            <label htmlFor="create-campaign-name-input" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              id="create-campaign-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Winter Flash Sale"
              className={`w-full px-3 py-2 text-xs bg-white border rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                errors.name ? 'border-red-500' : 'border-[#E2E8F0]'
              }`}
            />
            {errors.name && (
              <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="create-campaign-desc-input" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
              Description
            </label>
            <textarea
              id="create-campaign-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of goals and audience..."
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
            />
          </div>

          <div>
            <label htmlFor="create-campaign-objective-input" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
              Objective
            </label>
            <input
              id="create-campaign-objective-input"
              type="text"
              maxLength={255}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g. Generate qualified leads"
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="create-campaign-project-select" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Related Project
              </label>
              <select
                id="create-campaign-project-select"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="">Select a project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              {errors.project && <p className="mt-1 text-[11px] text-red-500">{errors.project}</p>}
            </div>

            <div>
              <label htmlFor="create-campaign-platform-select" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Platform / Channel
              </label>
              <select
                id="create-campaign-platform-select"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as CampaignPlatform)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="Meta Ads">Meta Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Email">Email</option>
                <option value="TikTok Ads">TikTok Ads</option>
                <option value="LinkedIn Ads">LinkedIn Ads</option>
                <option value="Multi-channel">Multi-channel</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="create-campaign-start-input" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="create-campaign-start-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>

            <div>
              <label htmlFor="create-campaign-end-input" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                id="create-campaign-end-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>
            {errors.dates && <p className="text-[11px] text-red-500">{errors.dates}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="create-campaign-budget-input" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Planned Budget{currentWorkspace.currency ? ` (${currentWorkspace.currency})` : ''} <span className="text-red-500">*</span>
              </label>
              <input
                id="create-campaign-budget-input"
                type="number"
                value={adBudget}
                onChange={(e) => setAdBudget(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                min="0"
                step="0.01"
              />
              {errors.adBudget && (
                <p className="text-[11px] text-red-500 mt-1">{errors.adBudget}</p>
              )}
            </div>

            <div>
              <label htmlFor="create-campaign-status-select" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Status
              </label>
              <select
                id="create-campaign-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="Active">Active</option>
                <option value="Planned">Planned</option>
                <option value="Completed">Completed</option>
                <option value="Archived">Archived</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E1B4B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || projects.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : initialCampaign ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
