import React from 'react';
import { FolderKanban, Megaphone, FileText, Files } from 'lucide-react';
import type { ArchiveCategory } from '../../../types';

interface ArchiveCategoryTabsProps {
  activeTab: ArchiveCategory | 'All';
  onTabChange: (tab: ArchiveCategory) => void;
}

export const ArchiveCategoryTabs: React.FC<ArchiveCategoryTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs: Array<{ id: ArchiveCategory; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'Projects', label: 'Projects', icon: FolderKanban },
    { id: 'Campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'Reports', label: 'Reports', icon: FileText },
    { id: 'Files', label: 'Files', icon: Files },
  ];

  return (
    <div className="border-b border-[#E2E8F0] flex items-center gap-8 pt-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`pb-3 -mb-[1px] flex items-center gap-2 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
              isActive
                ? 'border-[#6D28D9] text-[#6D28D9] font-semibold'
                : 'border-transparent text-[#64748B] hover:text-[#1E1B4B]'
            }`}
          >
            <Icon
              className={`w-4 h-4 transition-colors ${
                isActive ? 'text-[#6D28D9]' : 'text-[#94A3B8]'
              }`}
            />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
