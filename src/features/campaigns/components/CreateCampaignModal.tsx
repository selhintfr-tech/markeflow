import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { CampaignItem, CampaignPlatform, CampaignStatus } from '../types';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (campaignData: Partial<CampaignItem>) => void;
  initialCampaign?: CampaignItem | null;
  workspaceName: string;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCampaign,
  workspaceName,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectName, setProjectName] = useState('Autumn Sales Growth');
  const [platform, setPlatform] = useState<CampaignPlatform>('Meta Ads');
  const [startDate, setStartDate] = useState('01 Nov 2026');
  const [endDate, setEndDate] = useState('30 Nov 2026');
  const [adBudget, setAdBudget] = useState('5000');
  const [status, setStatus] = useState<CampaignStatus>('Active');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialCampaign) {
      setName(initialCampaign.name);
      setDescription(initialCampaign.description || '');
      setProjectName(initialCampaign.projectName || 'Autumn Sales Growth');
      setPlatform(initialCampaign.platform);
      setStartDate(initialCampaign.startDate);
      setEndDate(initialCampaign.endDate);
      setAdBudget(initialCampaign.adBudget.toString());
      setStatus(initialCampaign.status);
    } else {
      setName('');
      setDescription('');
      setProjectName('Autumn Sales Growth');
      setPlatform('Meta Ads');
      setStartDate('01 Nov 2026');
      setEndDate('30 Nov 2026');
      setAdBudget('5000');
      setStatus('Active');
    }
    setErrors({});
  }, [initialCampaign, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Campaign name is required';
    if (!startDate.trim()) errs.startDate = 'Start date is required';
    if (!endDate.trim()) errs.endDate = 'End date is required';
    const parsedBudget = parseFloat(adBudget);
    if (isNaN(parsedBudget) || parsedBudget < 0) {
      errs.adBudget = 'Budget must be a non-negative number';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || 'Marketing campaign initiative.',
      workspaceName,
      projectName,
      projectId: projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      platform,
      channel: platform,
      startDate,
      endDate,
      periodLabel: `${startDate} – ${endDate}`,
      adBudget: parseFloat(adBudget) || 0,
      status,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1E1B4B]">
            {initialCampaign ? 'Edit Campaign' : 'Create New Campaign'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
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
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of goals and audience..."
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Related Project
              </label>
              <select
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="Autumn Sales Growth">Autumn Sales Growth</option>
                <option value="Holiday Campaign Refresh">Holiday Campaign Refresh</option>
                <option value="Seasonal Sell-through">Seasonal Sell-through</option>
                <option value="Brand Awareness Q4">Brand Awareness Q4</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Platform / Channel
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as CampaignPlatform)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="Meta Ads">Meta Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Email">Email</option>
                <option value="TikTok Ads">TikTok Ads</option>
                <option value="Multi-channel">Multi-channel</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="01 Nov 2026"
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="30 Nov 2026"
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Planned Budget (MAD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={adBudget}
                onChange={(e) => setAdBudget(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                min="0"
              />
              {errors.adBudget && (
                <p className="text-[11px] text-red-500 mt-1">{errors.adBudget}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Status
              </label>
              <select
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
              className="px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs"
            >
              {initialCampaign ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
