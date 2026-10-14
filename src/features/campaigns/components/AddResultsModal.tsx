import React, { useState } from 'react';
import { X, TrendingUp } from 'lucide-react';

interface AddResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (results: {
    reportingDate: string;
    adSpend: number;
    leads: number;
    customers: number;
    revenue: number;
    isIncremental: boolean;
  }) => void;
  campaignName: string;
}

export const AddResultsModal: React.FC<AddResultsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  campaignName,
}) => {
  const [reportingDate, setReportingDate] = useState('15 Oct 2026');
  const [adSpend, setAdSpend] = useState('');
  const [leads, setLeads] = useState('');
  const [customers, setCustomers] = useState('');
  const [revenue, setRevenue] = useState('');
  const [isIncremental, setIsIncremental] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!reportingDate.trim()) errs.reportingDate = 'Reporting date is required';
    if (!adSpend || isNaN(Number(adSpend)) || Number(adSpend) < 0) {
      errs.adSpend = 'Enter a valid ad spend amount';
    }
    if (leads && (isNaN(Number(leads)) || Number(leads) < 0)) {
      errs.leads = 'Enter a valid leads count';
    }
    if (customers && (isNaN(Number(customers)) || Number(customers) < 0)) {
      errs.customers = 'Enter a valid customers count';
    }
    if (revenue && (isNaN(Number(revenue)) || Number(revenue) < 0)) {
      errs.revenue = 'Enter a valid revenue amount';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      reportingDate,
      adSpend: parseFloat(adSpend) || 0,
      leads: parseInt(leads, 10) || 0,
      customers: parseInt(customers, 10) || 0,
      revenue: parseFloat(revenue) || 0,
      isIncremental,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-[#E2E8F0] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E1B4B]">Add Campaign Results</h3>
              <p className="text-[11px] text-[#64748B]">{campaignName}</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {/* Mode Switcher */}
          <div className="bg-[#F8F7FC] p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-xs font-medium text-[#1E1B4B]">Submission Mode</span>
            <div className="flex bg-white rounded-md border border-[#E2E8F0] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setIsIncremental(true)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  isIncremental ? 'bg-[#6D28D9] text-white font-semibold' : 'text-[#64748B]'
                }`}
              >
                + Add Incremental
              </button>
              <button
                type="button"
                onClick={() => setIsIncremental(false)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  !isIncremental ? 'bg-[#6D28D9] text-white font-semibold' : 'text-[#64748B]'
                }`}
              >
                Set New Totals
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
              Reporting Date <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reportingDate}
              onChange={(e) => setReportingDate(e.target.value)}
              placeholder="e.g. 15 Oct 2026"
              className={`w-full px-3 py-2 text-xs bg-white border rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                errors.reportingDate ? 'border-red-500' : 'border-[#E2E8F0]'
              }`}
            />
            {errors.reportingDate && (
              <p className="text-[11px] text-red-500 mt-1">{errors.reportingDate}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Ad Spend (MAD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={adSpend}
                onChange={(e) => setAdSpend(e.target.value)}
                placeholder="e.g. 1200"
                min="0"
                className={`w-full px-3 py-2 text-xs bg-white border rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9] ${
                  errors.adSpend ? 'border-red-500' : 'border-[#E2E8F0]'
                }`}
              />
              {errors.adSpend && (
                <p className="text-[11px] text-red-500 mt-1">{errors.adSpend}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Generated Leads
              </label>
              <input
                type="number"
                value={leads}
                onChange={(e) => setLeads(e.target.value)}
                placeholder="e.g. 35"
                min="0"
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Acquired Customers
              </label>
              <input
                type="number"
                value={customers}
                onChange={(e) => setCustomers(e.target.value)}
                placeholder="e.g. 12"
                min="0"
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                Revenue (MAD)
              </label>
              <input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="e.g. 2800"
                min="0"
                className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#1E1B4B] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#1E1B4B] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#5B21B6] transition-colors shadow-2xs"
            >
              Record Results
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
