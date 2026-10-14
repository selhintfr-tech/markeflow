import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FileText,
  User,
  Calendar,
  Plus,
  Edit2,
  Download,
  Trophy,
  AlertTriangle,
  BarChart2,
  ShieldAlert,
  MoreHorizontal,
  Target,
  ArrowRight,
  X,
  Trash2,
} from 'lucide-react';
import { initialSwotData } from '../../data/mock';
import type {
  SwotAnalysisData,
  SwotItem,
  SwotCategory,
  StrategicAction,
} from '../../types';

export const SwotAnalysisPage: React.FC = () => {
  const { strategyId: _strategyId } = useParams<{ strategyId?: string }>();

  // State
  const [swotData, setSwotData] = useState<SwotAnalysisData>(initialSwotData);

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeCategoryForAdd, setActiveCategoryForAdd] = useState<SwotCategory>('strengths');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemTarget, setEditItemTarget] = useState<{
    category: SwotCategory;
    item: SwotItem;
  } | null>(null);

  const [isEditMetaModalOpen, setIsEditMetaModalOpen] = useState(false);
  const [metaAuthor, setMetaAuthor] = useState(swotData.author);
  const [metaStrategyName, setMetaStrategyName] = useState(swotData.strategyName);

  // Form states for adding item
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Dropdown menus for 3-dot buttons
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Open Add Item modal configured for specific category
  const handleOpenAdd = (category: SwotCategory) => {
    setActiveCategoryForAdd(category);
    setNewItemTitle('');
    setNewItemDesc('');
    setIsAddItemModalOpen(true);
  };

  // Submit new SWOT item
  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    const list = swotData[activeCategoryForAdd];
    const newItem: SwotItem = {
      id: `${activeCategoryForAdd.slice(0, 3)}-${Date.now()}`,
      number: list.length + 1,
      title: newItemTitle.trim(),
      description: newItemDesc.trim(),
    };

    setSwotData((prev) => ({
      ...prev,
      [activeCategoryForAdd]: [...prev[activeCategoryForAdd], newItem],
      lastUpdated: '12 Oct 2026',
    }));

    setIsAddItemModalOpen(false);
  };

  // Open edit modal for specific SWOT item
  const handleOpenEditItem = (category: SwotCategory, item: SwotItem) => {
    setEditItemTarget({ category, item });
    setOpenDropdownId(null);
    setIsEditModalOpen(true);
  };

  // Submit edit item
  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemTarget || !editItemTarget.item.title.trim()) return;

    setSwotData((prev) => ({
      ...prev,
      [editItemTarget.category]: prev[editItemTarget.category].map((i) =>
        i.id === editItemTarget.item.id ? editItemTarget.item : i
      ),
      lastUpdated: '12 Oct 2026',
    }));

    setIsEditModalOpen(false);
    setEditItemTarget(null);
  };

  // Delete SWOT item with confirmation
  const handleDeleteItem = (category: SwotCategory, itemId: string) => {
    setOpenDropdownId(null);
    if (!window.confirm('Are you sure you want to delete this SWOT item?')) {
      return;
    }

    setSwotData((prev) => {
      const updatedList = prev[category]
        .filter((i) => i.id !== itemId)
        .map((item, idx) => ({ ...item, number: idx + 1 }));

      return {
        ...prev,
        [category]: updatedList,
        lastUpdated: '12 Oct 2026',
      };
    });
  };

  // Save Analysis metadata
  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    setSwotData((prev) => ({
      ...prev,
      author: metaAuthor,
      strategyName: metaStrategyName,
      lastUpdated: '12 Oct 2026',
    }));
    setIsEditMetaModalOpen(false);
  };

  // Export PDF: Creates a clean printable view and triggers browser PDF export
  const handleExportPDF = () => {
    window.print();
  };

  // Helper for related factor styling
  const renderRelatedFactorBadge = (action: StrategicAction) => {
    switch (action.factorCategory) {
      case 'Weakness':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEE2E2] text-[#DC2626]">
            Weakness — {action.factorTitle}
          </span>
        );
      case 'Opportunity':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#EDE9FE] text-[#6D28D9]">
            Opportunity — {action.factorTitle}
          </span>
        );
      case 'Strength':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#CCFBF1] text-[#0D9488]">
            Strength — {action.factorTitle}
          </span>
        );
      case 'Threat':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF3C7] text-[#D97706]">
            Threat — {action.factorTitle}
          </span>
        );
    }
  };

  // Helper for strategic action status badge
  const renderActionStatusBadge = (status: string) => {
    switch (status) {
      case 'In progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EDE9FE] text-[#6D28D9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
            In progress
          </span>
        );
      case 'Planned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
            Planned
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12 print:p-0 print:space-y-4">
      {/* 1. Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B] print:hidden">
        <Link to="/strategies" className="hover:text-[#1E1B4B] transition-colors">
          Strategies
        </Link>
        <span>/</span>
        <Link
          to={`/strategies`}
          className="hover:text-[#1E1B4B] transition-colors truncate max-w-[300px]"
        >
          {swotData.strategyName}
        </Link>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">SWOT Analysis</span>
      </div>

      {/* 2. Page Header: Title + Subtitle + Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-[28px] font-bold text-[#1E1B4B] tracking-tight">
            SWOT Analysis
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Evaluate internal capabilities and external market conditions
          </p>
        </div>

        {/* Top-right action buttons */}
        <div className="flex items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={() => setIsEditMetaModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#DDD6FE] bg-white text-xs font-semibold text-[#6D28D9] hover:bg-[#F5F3FF] shadow-2xs transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Analysis</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* 3. Strategy Information Strip (3 columns with dividers) */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#F1F5F9] gap-4 md:gap-0">
          {/* Col 1: Strategy */}
          <div className="flex items-center gap-3.5 md:pr-6">
            <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[11px] text-[#94A3B8] font-medium">
                Strategy
              </span>
              <Link
                to="/strategies"
                className="text-xs font-bold text-[#6D28D9] hover:underline"
              >
                {swotData.strategyName}
              </Link>
            </div>
          </div>

          {/* Col 2: Author */}
          <div className="flex items-center gap-3.5 md:px-6 pt-3 md:pt-0">
            <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[11px] text-[#94A3B8] font-medium">
                Author
              </span>
              <span className="text-xs font-bold text-[#1E1B4B]">
                {swotData.author}
              </span>
            </div>
          </div>

          {/* Col 3: Last updated */}
          <div className="flex items-center gap-3.5 md:pl-6 pt-3 md:pt-0">
            <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[11px] text-[#94A3B8] font-medium">
                Last updated
              </span>
              <span className="text-xs font-bold text-[#1E1B4B]">
                {swotData.lastUpdated}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SWOT MATRIX — EXACT 2x2 LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: STRENGTHS (TOP-LEFT) */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1E1B4B]">Strengths</h2>
                  <p className="text-xs text-[#64748B]">
                    Internal capabilities that give us an advantage
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAdd('strengths')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors shrink-0 print:hidden"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border-t border-[#F1F5F9] divide-y divide-[#F1F5F9]">
              {swotData.strengths.map((item) => (
                <div key={item.id} className="py-4 flex items-start justify-between gap-3 group">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {item.number}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-[#1E1B4B]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0 print:hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDropdownId(openDropdownId === item.id ? null : item.id)
                      }
                      className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {openDropdownId === item.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg border border-[#E2E8F0] shadow-md py-1 z-20">
                        <button
                          type="button"
                          onClick={() => handleOpenEditItem('strengths', item)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] flex items-center gap-2"
                        >
                          <Edit2 className="w-3 h-3 text-[#64748B]" />
                          <span>Edit item</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem('strengths', item.id)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#DC2626] hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete item</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 2: WEAKNESSES (TOP-RIGHT) */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1E1B4B]">Weaknesses</h2>
                  <p className="text-xs text-[#64748B]">
                    Internal limitations that we need to address
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAdd('weaknesses')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors shrink-0 print:hidden"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border-t border-[#F1F5F9] divide-y divide-[#F1F5F9]">
              {swotData.weaknesses.map((item) => (
                <div key={item.id} className="py-4 flex items-start justify-between gap-3 group">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {item.number}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-[#1E1B4B]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0 print:hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDropdownId(openDropdownId === item.id ? null : item.id)
                      }
                      className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {openDropdownId === item.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg border border-[#E2E8F0] shadow-md py-1 z-20">
                        <button
                          type="button"
                          onClick={() => handleOpenEditItem('weaknesses', item)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] flex items-center gap-2"
                        >
                          <Edit2 className="w-3 h-3 text-[#64748B]" />
                          <span>Edit item</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem('weaknesses', item.id)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#DC2626] hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete item</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 3: OPPORTUNITIES (BOTTOM-LEFT) */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1E1B4B]">Opportunities</h2>
                  <p className="text-xs text-[#64748B]">
                    External factors we can leverage for growth
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAdd('opportunities')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors shrink-0 print:hidden"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border-t border-[#F1F5F9] divide-y divide-[#F1F5F9]">
              {swotData.opportunities.map((item) => (
                <div key={item.id} className="py-4 flex items-start justify-between gap-3 group">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {item.number}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-[#1E1B4B]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0 print:hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDropdownId(openDropdownId === item.id ? null : item.id)
                      }
                      className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {openDropdownId === item.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg border border-[#E2E8F0] shadow-md py-1 z-20">
                        <button
                          type="button"
                          onClick={() => handleOpenEditItem('opportunities', item)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] flex items-center gap-2"
                        >
                          <Edit2 className="w-3 h-3 text-[#64748B]" />
                          <span>Edit item</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem('opportunities', item.id)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#DC2626] hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete item</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 4: THREATS (BOTTOM-RIGHT) */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1E1B4B]">Threats</h2>
                  <p className="text-xs text-[#64748B]">
                    External risks that could impact our success
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAdd('threats')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors shrink-0 print:hidden"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border-t border-[#F1F5F9] divide-y divide-[#F1F5F9]">
              {swotData.threats.map((item) => (
                <div key={item.id} className="py-4 flex items-start justify-between gap-3 group">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {item.number}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-[#1E1B4B]">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0 print:hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDropdownId(openDropdownId === item.id ? null : item.id)
                      }
                      className="p-1 rounded text-[#94A3B8] hover:text-[#1E1B4B] hover:bg-slate-100 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {openDropdownId === item.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg border border-[#E2E8F0] shadow-md py-1 z-20">
                        <button
                          type="button"
                          onClick={() => handleOpenEditItem('threats', item)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#1E1B4B] hover:bg-[#F5F3FF] flex items-center gap-2"
                        >
                          <Edit2 className="w-3 h-3 text-[#64748B]" />
                          <span>Edit item</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem('threats', item.id)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#DC2626] hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete item</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. STRATEGIC ACTIONS — BOTTOM TABLE */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E1B4B]">Strategic Actions</h2>
              <p className="text-xs text-[#64748B]">
                Turn SWOT insights into actionable steps
              </p>
            </div>
          </div>

          <Link
            to="/strategies"
            className="text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors print:hidden"
          >
            <span>View Strategy Overview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                <th className="pb-3 font-medium">Action</th>
                <th className="pb-3 font-medium">Related Factor</th>
                <th className="pb-3 font-medium">Owner</th>
                <th className="pb-3 font-medium">Due Date</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {swotData.strategicActions.map((action) => (
                <tr key={action.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 font-medium text-[#1E1B4B] max-w-sm pr-4">
                    {action.action}
                  </td>
                  <td className="py-3.5 whitespace-nowrap pr-4">
                    {renderRelatedFactorBadge(action)}
                  </td>
                  <td className="py-3.5 whitespace-nowrap pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center text-[10px] font-bold">
                        {action.owner.initials}
                      </span>
                      <span className="text-[#64748B]">{action.owner.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-[#64748B] whitespace-nowrap pr-4">
                    {action.dueDate}
                  </td>
                  <td className="py-3.5 whitespace-nowrap">
                    {renderActionStatusBadge(action.status)}
                  </td>
                  <td className="py-3.5 text-right whitespace-nowrap print:hidden">
                    <button
                      type="button"
                      className="p-1 text-[#94A3B8] hover:text-[#1E1B4B] rounded transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add SWOT Item */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#1E1B4B] capitalize">
                Add {activeCategoryForAdd.slice(0, -1)} Item
              </h3>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Category
                </label>
                <select
                  value={activeCategoryForAdd}
                  onChange={(e) => setActiveCategoryForAdd(e.target.value as SwotCategory)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-[#F8F7FC] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] capitalize"
                >
                  <option value="strengths">Strengths</option>
                  <option value="weaknesses">Weaknesses</option>
                  <option value="opportunities">Opportunities</option>
                  <option value="threats">Threats</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g. Omnichannel loyalty program"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Elaborate on how this factor impacts current strategy..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit SWOT Item */}
      {isEditModalOpen && editItemTarget && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#1E1B4B]">Edit SWOT Item</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditItemSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  required
                  value={editItemTarget.item.title}
                  onChange={(e) =>
                    setEditItemTarget({
                      ...editItemTarget,
                      item: { ...editItemTarget.item, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editItemTarget.item.description}
                  onChange={(e) =>
                    setEditItemTarget({
                      ...editItemTarget,
                      item: { ...editItemTarget.item, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Analysis Info */}
      {isEditMetaModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 className="text-base font-bold text-[#1E1B4B]">Edit SWOT Information</h3>
              <button
                type="button"
                onClick={() => setIsEditMetaModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMeta} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Strategy Name
                </label>
                <input
                  type="text"
                  required
                  value={metaStrategyName}
                  onChange={(e) => setMetaStrategyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Author
                </label>
                <input
                  type="text"
                  required
                  value={metaAuthor}
                  onChange={(e) => setMetaAuthor(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditMetaModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Save Information
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
