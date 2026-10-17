import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  X,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Check,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  researchService,
  type ResearchRecord,
  type SwotItemBackend,
  type SwotCategoryBackend,
} from '../research/researchService';
import { ApiError } from '../api/apiClient';
import type {
  SwotAnalysisData,
  SwotItem,
  SwotCategory,
  StrategicAction,
} from '../../types';

function categoryToBackend(cat: SwotCategory): SwotCategoryBackend {
  switch (cat) {
    case 'strengths':
      return 'strength';
    case 'weaknesses':
      return 'weakness';
    case 'opportunities':
      return 'opportunity';
    case 'threats':
      return 'threat';
  }
}

function categoryFromBackend(cat: SwotCategoryBackend): SwotCategory {
  switch (cat) {
    case 'strength':
      return 'strengths';
    case 'weakness':
      return 'weaknesses';
    case 'opportunity':
      return 'opportunities';
    case 'threat':
      return 'threats';
  }
}

export const SwotAnalysisPage: React.FC = () => {
  const { strategyId } = useParams<{ strategyId?: string }>();
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();

  // Research projects state
  const [projects, setProjects] = useState<ResearchRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeCategoryForAdd, setActiveCategoryForAdd] = useState<SwotCategory>('strengths');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemTarget, setEditItemTarget] = useState<{
    category: SwotCategory;
    item: SwotItem;
  } | null>(null);

  const [isEditMetaModalOpen, setIsEditMetaModalOpen] = useState(false);
  const [metaAuthor, setMetaAuthor] = useState('Marketing Strategy Lead');
  const [metaStrategyName, setMetaStrategyName] = useState('Strategic SWOT Assessment');

  // Form states for adding item
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Dropdown menus for 3-dot buttons
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<{
    category: SwotCategory;
    itemId: string;
    itemTitle: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load research projects
  const loadData = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      let records = await researchService.list(currentWorkspace.id);

      // If no research project exists in workspace yet, auto-create a primary SWOT study
      if (records.length === 0) {
        const created = await researchService.create(currentWorkspace.id, {
          name: 'Core Market & SWOT Strategy',
          category: 'SWOT Analysis',
          status: 'In Progress',
          description: 'Comprehensive SWOT analysis evaluating internal capabilities and external market dynamics.',
          swot: [
            { category: 'strength', item: 'Agile Marketing Execution', notes: 'Quick campaign turnaround time' },
            { category: 'weakness', item: 'Limited International Presence', notes: 'Targeting expansion over next 2 quarters' },
            { category: 'opportunity', item: 'Emerging E-Commerce Segments', notes: 'Growing digital consumer demand in Morocco' },
            { category: 'threat', item: 'Aggressive Competitor Pricing', notes: 'Monitored across digital ad auctions' },
          ],
        });
        records = [created];
      }

      setProjects(records);
      setSelectedProjectId((prev) => (records.some((r) => r.id === prev) ? prev : records[0].id));
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Unable to load research data for SWOT analysis.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!isLoadingWorkspaces) {
      loadData();
    }
  }, [isLoadingWorkspaces, loadData]);

  // Current active research record
  const currentRecord = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Convert currentRecord.swot into SwotAnalysisData
  const swotData: SwotAnalysisData = useMemo(() => {
    const defaultData: SwotAnalysisData = {
      id: currentRecord?.id || 'swot-1',
      strategyId: strategyId || currentRecord?.id || 'strat-1',
      strategyName: currentRecord?.name || 'Strategic Market SWOT',
      author: currentRecord?.notes || 'Marketing Strategy Lead',
      lastUpdated: currentRecord?.updated_at
        ? new Date(currentRecord.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Recent',
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
      strategicActions: [],
    };

    if (!currentRecord?.swot) return defaultData;

    currentRecord.swot.forEach((item, idx) => {
      const cat = categoryFromBackend(item.category);
      const swotItem: SwotItem = {
        id: `swot-${idx}`,
        number: 0,
        title: item.item,
        description: item.notes || '',
      };
      defaultData[cat].push(swotItem);
    });

    // Re-index numbers
    (['strengths', 'weaknesses', 'opportunities', 'threats'] as SwotCategory[]).forEach((cat) => {
      defaultData[cat].forEach((item, idx) => {
        item.number = idx + 1;
      });
    });

    // Generate derived Strategic Actions based on opportunities & threats
    const actions: StrategicAction[] = [];
    if (defaultData.opportunities.length > 0) {
      actions.push({
        id: 'act-1',
        action: `Leverage: ${defaultData.opportunities[0].title}`,
        factorCategory: 'Opportunity',
        factorTitle: defaultData.opportunities[0].title,
        status: 'In progress',
        owner: { name: 'Growth Team', initials: 'GT' },
        dueDate: 'Q4 2026',
      });
    }
    if (defaultData.threats.length > 0) {
      actions.push({
        id: 'act-2',
        action: `Mitigate: ${defaultData.threats[0].title}`,
        factorCategory: 'Threat',
        factorTitle: defaultData.threats[0].title,
        status: 'Planned',
        owner: { name: 'Operations', initials: 'OP' },
        dueDate: 'Q1 2027',
      });
    }

    defaultData.strategicActions = actions;
    return defaultData;
  }, [currentRecord, strategyId]);

  // Escape key handler for all active modals & menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteItemTarget) setDeleteItemTarget(null);
        else if (isAddItemModalOpen) setIsAddItemModalOpen(false);
        else if (isEditModalOpen) {
          setIsEditModalOpen(false);
          setEditItemTarget(null);
        } else if (isEditMetaModalOpen) setIsEditMetaModalOpen(false);
        else if (openDropdownId) setOpenDropdownId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteItemTarget, isAddItemModalOpen, isEditModalOpen, isEditMetaModalOpen, openDropdownId]);

  // Open Add Item modal configured for specific category
  const handleOpenAdd = (category: SwotCategory) => {
    setActiveCategoryForAdd(category);
    setNewItemTitle('');
    setNewItemDesc('');
    setIsAddItemModalOpen(true);
  };

  // Persist updated SWOT array to the backend
  const persistSwot = async (updatedSwot: SwotItemBackend[]) => {
    if (!currentWorkspace?.id || !currentRecord || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const updated = await researchService.update(currentWorkspace.id, currentRecord.id, {
        swot: updatedSwot,
      });

      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update SWOT analysis in backend.';
      setActionError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit new SWOT item
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim() || !currentRecord) return;

    const currentSwot: SwotItemBackend[] = (currentRecord.swot || []).slice();
    const newItem: SwotItemBackend = {
      category: categoryToBackend(activeCategoryForAdd),
      item: newItemTitle.trim(),
      notes: newItemDesc.trim() || null,
    };

    try {
      await persistSwot([...currentSwot, newItem]);
      setIsAddItemModalOpen(false);
      showToast(`Added ${activeCategoryForAdd.slice(0, -1)} factor`);
    } catch {
      // error handled in persistSwot
    }
  };

  // Open edit modal for specific SWOT item
  const handleOpenEditItem = (category: SwotCategory, item: SwotItem) => {
    setEditItemTarget({ category, item });
    setOpenDropdownId(null);
    setIsEditModalOpen(true);
  };

  // Submit edit item
  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemTarget || !editItemTarget.item.title.trim() || !currentRecord) return;

    const currentSwot: SwotItemBackend[] = (currentRecord.swot || []).slice();
    const targetIdx = Number(editItemTarget.item.id.replace('swot-', ''));

    if (!isNaN(targetIdx) && currentSwot[targetIdx]) {
      currentSwot[targetIdx] = {
        category: categoryToBackend(editItemTarget.category),
        item: editItemTarget.item.title.trim(),
        notes: editItemTarget.item.description?.trim() || null,
      };

      try {
        await persistSwot(currentSwot);
        setIsEditModalOpen(false);
        setEditItemTarget(null);
        showToast('SWOT item updated');
      } catch {
        // handled in persistSwot
      }
    }
  };

  // Delete SWOT item confirmation handler
  const handleConfirmDelete = async () => {
    if (!deleteItemTarget || !currentRecord) return;

    const currentSwot: SwotItemBackend[] = (currentRecord.swot || []).slice();
    const targetIdx = Number(deleteItemTarget.itemId.replace('swot-', ''));

    if (!isNaN(targetIdx) && currentSwot[targetIdx]) {
      currentSwot.splice(targetIdx, 1);

      try {
        await persistSwot(currentSwot);
        setDeleteItemTarget(null);
        showToast('SWOT item deleted');
      } catch {
        // handled in persistSwot
      }
    }
  };

  // Save Analysis metadata
  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !currentRecord || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const updated = await researchService.update(currentWorkspace.id, currentRecord.id, {
        name: metaStrategyName.trim() || currentRecord.name,
        notes: metaAuthor.trim() || currentRecord.notes,
      });

      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setIsEditMetaModalOpen(false);
      showToast('Analysis metadata saved');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update analysis details.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export PDF
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B4B] text-white px-4 py-2.5 rounded-lg shadow-xl text-sm flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B] print:hidden">
        <Link to="/strategies" className="hover:text-[#1E1B4B] transition-colors">
          Strategies
        </Link>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium truncate max-w-[300px]">
          {swotData.strategyName}
        </span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">SWOT Analysis</span>
      </div>

      {/* Action / Load Error Notification */}
      {(loadError || actionError) && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadError || actionError}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 2. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-[28px] font-bold text-[#1E1B4B] tracking-tight">
            SWOT Analysis
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Evaluate internal capabilities and external market conditions in {currentWorkspace?.name || 'your workspace'}
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          {projects.length > 1 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#1E1B4B] bg-white outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              setMetaStrategyName(swotData.strategyName);
              setMetaAuthor(swotData.author);
              setIsEditMetaModalOpen(true);
            }}
            disabled={!hasWorkspace}
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

      {isLoading && (
        <div className="py-24 bg-white rounded-xl border border-[#E2E8F0] flex flex-col items-center justify-center text-xs text-[#64748B]">
          <Loader2 className="w-8 h-8 text-[#6D28D9] animate-spin mb-3" />
          <span>Loading SWOT analysis...</span>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {/* 3. Strategy Information Strip (3 columns with dividers) */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#F1F5F9] gap-4 md:gap-0">
              {/* Col 1: Strategy / Study */}
              <div className="flex items-center gap-3.5 md:pr-6">
                <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[11px] text-[#94A3B8] font-medium">Research Study</span>
                  <span className="text-xs font-bold text-[#6D28D9]">{swotData.strategyName}</span>
                </div>
              </div>

              {/* Col 2: Author */}
              <div className="flex items-center gap-3.5 md:px-6 pt-3 md:pt-0">
                <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[11px] text-[#94A3B8] font-medium">Lead / Author</span>
                  <span className="text-xs font-bold text-[#1E1B4B]">{swotData.author}</span>
                </div>
              </div>

              {/* Col 3: Last updated */}
              <div className="flex items-center gap-3.5 md:pl-6 pt-3 md:pt-0">
                <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[11px] text-[#94A3B8] font-medium">Last updated</span>
                  <span className="text-xs font-bold text-[#1E1B4B]">{swotData.lastUpdated}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. SWOT MATRIX — EXACT 2x2 LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD 1: STRENGTHS */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#1E1B4B]">Strengths</h2>
                      <p className="text-xs text-[#64748B]">Internal capabilities that give us an advantage</p>
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
                  {swotData.strengths.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#94A3B8]">
                      No strengths recorded yet. Click &quot;Add Item&quot; to record one.
                    </div>
                  )}
                  {swotData.strengths.map((item) => (
                    <div key={item.id} className="py-4 flex items-start justify-between gap-3 group">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {item.number}
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-[#1E1B4B]">{item.title}</h3>
                          <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{item.description}</p>
                        </div>
                      </div>

                      <div className="relative shrink-0 print:hidden">
                        <button
                          type="button"
                          onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
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
                              onClick={() => {
                                setOpenDropdownId(null);
                                setDeleteItemTarget({
                                  category: 'strengths',
                                  itemId: item.id,
                                  itemTitle: item.title,
                                });
                              }}
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

            {/* CARD 2: WEAKNESSES */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#1E1B4B]">Weaknesses</h2>
                      <p className="text-xs text-[#64748B]">Internal limitations that we need to address</p>
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
                  {swotData.weaknesses.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#94A3B8]">
                      No weaknesses recorded yet. Click &quot;Add Item&quot; to record one.
                    </div>
                  )}
                  {swotData.weaknesses.map((item) => (
                    <div key={item.id} className="py-4 flex items-start justify-between gap-3 group">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {item.number}
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-[#1E1B4B]">{item.title}</h3>
                          <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{item.description}</p>
                        </div>
                      </div>

                      <div className="relative shrink-0 print:hidden">
                        <button
                          type="button"
                          onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
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
                              onClick={() => {
                                setOpenDropdownId(null);
                                setDeleteItemTarget({
                                  category: 'weaknesses',
                                  itemId: item.id,
                                  itemTitle: item.title,
                                });
                              }}
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

            {/* CARD 3: OPPORTUNITIES */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                      <BarChart2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#1E1B4B]">Opportunities</h2>
                      <p className="text-xs text-[#64748B]">External trends and conditions we can capitalize on</p>
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
                  {swotData.opportunities.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#94A3B8]">
                      No opportunities recorded yet. Click &quot;Add Item&quot; to record one.
                    </div>
                  )}
                  {swotData.opportunities.map((item) => (
                    <div key={item.id} className="py-4 flex items-start justify-between gap-3 group">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {item.number}
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-[#1E1B4B]">{item.title}</h3>
                          <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{item.description}</p>
                        </div>
                      </div>

                      <div className="relative shrink-0 print:hidden">
                        <button
                          type="button"
                          onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
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
                              onClick={() => {
                                setOpenDropdownId(null);
                                setDeleteItemTarget({
                                  category: 'opportunities',
                                  itemId: item.id,
                                  itemTitle: item.title,
                                });
                              }}
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

            {/* CARD 4: THREATS */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#1E1B4B]">Threats</h2>
                      <p className="text-xs text-[#64748B]">External challenges that could jeopardize success</p>
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
                  {swotData.threats.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#94A3B8]">
                      No threats recorded yet. Click &quot;Add Item&quot; to record one.
                    </div>
                  )}
                  {swotData.threats.map((item) => (
                    <div key={item.id} className="py-4 flex items-start justify-between gap-3 group">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {item.number}
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-[#1E1B4B]">{item.title}</h3>
                          <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{item.description}</p>
                        </div>
                      </div>

                      <div className="relative shrink-0 print:hidden">
                        <button
                          type="button"
                          onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
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
                              onClick={() => {
                                setOpenDropdownId(null);
                                setDeleteItemTarget({
                                  category: 'threats',
                                  itemId: item.id,
                                  itemTitle: item.title,
                                });
                              }}
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

          {/* 5. Strategic Actions Derived from SWOT */}
          {swotData.strategicActions.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#1E1B4B]">Derived Strategic Actions</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">High-priority initiatives based on SWOT findings</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#64748B] font-medium border-b border-[#F1F5F9]">
                      <th className="pb-3 pr-3">Action Item</th>
                      <th className="pb-3 pr-3">Related Factor</th>
                      <th className="pb-3 pr-3">Status</th>
                      <th className="pb-3 pr-3">Owner</th>
                      <th className="pb-3">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {swotData.strategicActions.map((action) => (
                      <tr key={action.id}>
                        <td className="py-3.5 pr-3 font-semibold text-[#1E1B4B]">{action.action}</td>
                        <td className="py-3.5 pr-3">{renderRelatedFactorBadge(action)}</td>
                        <td className="py-3.5 pr-3">{renderActionStatusBadge(action.status)}</td>
                        <td className="py-3.5 pr-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-[9px]">
                              {action.owner.initials}
                            </div>
                            <span className="text-[#1E1B4B]">{action.owner.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-[#64748B]">{action.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- ADD ITEM MODAL --- */}
      {isAddItemModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#1E1B4B] capitalize">
                Add {activeCategoryForAdd.slice(0, -1)}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddItemSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Strong customer retention rate"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed notes or supporting evidence..."
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Factor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT ITEM MODAL --- */}
      {isEditModalOpen && editItemTarget && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#1E1B4B] capitalize">
                Edit {editItemTarget.category.slice(0, -1)}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditItemTarget(null);
                }}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditItemSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Title *</label>
                <input
                  type="text"
                  value={editItemTarget.item.title}
                  onChange={(e) =>
                    setEditItemTarget({
                      ...editItemTarget,
                      item: { ...editItemTarget.item, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editItemTarget.item.description || ''}
                  onChange={(e) =>
                    setEditItemTarget({
                      ...editItemTarget,
                      item: { ...editItemTarget.item, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditItemTarget(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT METADATA MODAL --- */}
      {isEditMetaModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#1E1B4B]">Edit Analysis Details</h3>
              <button
                type="button"
                onClick={() => setIsEditMetaModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMeta} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Study / Strategy Name *</label>
                <input
                  type="text"
                  value={metaStrategyName}
                  onChange={(e) => setMetaStrategyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Author / Lead *</label>
                <input
                  type="text"
                  value={metaAuthor}
                  onChange={(e) => setMetaAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditMetaModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] font-semibold text-[#64748B] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteItemTarget && (
        <div
          className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[#1E1B4B]">Delete SWOT Item?</h4>
            <p className="text-xs text-[#64748B] mt-1.5">
              Are you sure you want to delete <span className="font-semibold text-[#1E1B4B]">&quot;{deleteItemTarget.itemTitle}&quot;</span>?
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteItemTarget(null)}
                className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Item</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
