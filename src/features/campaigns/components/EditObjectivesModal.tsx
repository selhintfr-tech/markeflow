import React, { useState } from 'react';
import { X, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import type { CampaignObjective } from '../types';

interface EditObjectivesModalProps {
  isOpen: boolean;
  onClose: () => void;
  objectives: CampaignObjective[];
  onSave: (updated: CampaignObjective[]) => void;
}

export const EditObjectivesModal: React.FC<EditObjectivesModalProps> = ({
  isOpen,
  onClose,
  objectives,
  onSave,
}) => {
  const [list, setList] = useState<CampaignObjective[]>(objectives);
  const [newText, setNewText] = useState('');

  if (!isOpen) return null;

  const handleStatusChange = (id: string, status: CampaignObjective['status']) => {
    setList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const handleTextChange = (id: string, text: string) => {
    setList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
  };

  const handleDelete = (id: string) => {
    setList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAdd = () => {
    if (!newText.trim()) return;
    const newObj: CampaignObjective = {
      id: `obj-${Date.now()}`,
      text: newText.trim(),
      status: 'On track',
    };
    setList((prev) => [...prev, newObj]);
    setNewText('');
  };

  const handleSave = () => {
    onSave(list);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-[#E2E8F0] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#0D9488] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E1B4B]">Edit Campaign Objectives</h3>
              <p className="text-[11px] text-[#64748B]">Update milestones and track status</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2.5">
            {list.map((obj) => (
              <div
                key={obj.id}
                className="flex items-center gap-2.5 p-2 rounded-lg border border-[#E2E8F0] bg-[#F8F7FC]"
              >
                <input
                  type="text"
                  value={obj.text}
                  onChange={(e) => handleTextChange(obj.id, e.target.value)}
                  className="flex-1 bg-white border border-[#E2E8F0] rounded px-2.5 py-1 text-xs text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                />
                <select
                  value={obj.status}
                  onChange={(e) =>
                    handleStatusChange(obj.id, e.target.value as CampaignObjective['status'])
                  }
                  className="bg-white border border-[#E2E8F0] rounded px-2 py-1 text-xs text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                >
                  <option value="On track">On track</option>
                  <option value="In progress">In progress</option>
                  <option value="Behind">Behind</option>
                  <option value="Completed">Completed</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleDelete(obj.id)}
                  className="p-1 text-[#94A3B8] hover:text-red-500 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add new objective */}
          <div className="pt-2 border-t border-[#F1F5F9] flex items-center gap-2">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Add another objective..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="px-3 py-1.5 text-xs font-semibold text-[#6D28D9] border border-[#6D28D9] hover:bg-[#F5F3FF] rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2 bg-[#FAF5FF]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#1E1B4B] border border-[#E2E8F0] rounded-lg bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs"
          >
            Save Objectives
          </button>
        </div>
      </div>
    </div>
  );
};
