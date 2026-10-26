import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Target,
  Plus,
  Users,
  ShoppingCart,
  ArrowRight,
  Share2,
  Mail,
  Search,
  FileText,
  Compass,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Edit2,
  Check,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { strategyService, type StrategyRecord, type StrategyInput, type ActionPlanItem } from './strategyService';
import { projectService, type ProjectRecord } from '../projects/projectService';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { audienceService, type AudienceRecord } from '../audiences/audienceService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ApiError } from '../api/apiClient';
import type { StrategyDetail, StrategicInitiative, StrategyMeasurableObjective, StrategyChannelAllocation } from '../../types';

function recordToDetail(
  record: StrategyRecord,
  workspaceName: string,
): StrategyDetail {
  const objectives = record.objectives || [];
  const metrics = record.success_metrics || [];
  const channels = record.channels || [];
  const actionPlan = record.action_plan || [];

  const initiatives: StrategicInitiative[] = actionPlan.map((item, idx) => {
    const statusVal: StrategicInitiative['status'] =
      item.status === 'Completed'
        ? 'Completed'
        : item.status === 'Pending'
        ? 'Planned'
        : 'In progress';

    return {
      id: `init-${idx}`,
      name: item.title,
      relatedArea: 'Strategic Initiative',
      status: statusVal,
      owner: {
        name: 'Team Member',
        initials: 'TM',
      },
      nextStep: item.description || (item.due_date ? `Target: ${item.due_date}` : 'Executing roadmap'),
    };
  });

  const mappedAudiences = (record.audiences || []).map((aud, idx) => ({
    id: aud.id,
    title: aud.name,
    description: aud.description || `${aud.name} target customer segment`,
    iconType: idx % 2 === 0 ? ('users' as const) : ('cart' as const),
  }));

  const mappedObjectives: StrategyMeasurableObjective[] = objectives.map((obj, idx) => ({
    id: `obj-${idx}`,
    kpi: obj,
    target: metrics[idx] || 'Measurable target milestone',
    currentProgressText: 'Not measured',
    progressPercentage: null,
    owner: {
      name: 'Marketing Lead',
      initials: 'ML',
    },
    deadline: record.ends_on || 'Ongoing',
    statusType: 'purple',
  }));

  const mappedChannels: StrategyChannelAllocation[] = channels.map((ch, idx) => {
    const iconType =
      ch.toLowerCase().includes('social')
        ? ('social' as const)
        : ch.toLowerCase().includes('email')
        ? ('email' as const)
        : ch.toLowerCase().includes('search') || ch.toLowerCase().includes('google')
        ? ('search' as const)
        : ('content' as const);

    const share = channels.length > 0 ? Math.round(100 / channels.length) : 100;

    return {
      id: `ch-${idx}`,
      channel: ch,
      percentage: share,
      badge: 'Active focus',
      iconType,
    };
  });
  const allInitiativesMeasurable = actionPlan.length > 0
    && actionPlan.every((item) => ['Pending', 'In Progress', 'Completed'].includes(item.status || ''));
  const completedInitiatives = allInitiativesMeasurable
    ? actionPlan.filter((item) => item.status === 'Completed').length
    : null;

  const periodLabel =
    record.starts_on && record.ends_on
      ? `${record.starts_on} — ${record.ends_on}`
      : record.starts_on || 'Active Period';

  return {
    id: record.id,
    title: record.name,
    projectId: record.project_id || '',
    projectName: record.project?.name || 'Workspace Project',
    status: record.status === 'Completed' ? 'Completed' : record.status === 'Active' ? 'Active' : 'Draft',
    owner: {
      name: 'Marketing Team',
      initials: 'MT',
      email: 'team@marketflow.io',
      role: 'Strategist',
    },
    workspace: workspaceName,
    period: periodLabel,
    overviewDescription:
      record.description ||
      'Comprehensive marketing strategy outlining clear growth targets, audiences, and channel allocation.',
    audiences: mappedAudiences,
    completionPercentage: record.progress,
    objectivesOnTrack: completedInitiatives,
    objectivesTotal: allInitiativesMeasurable ? actionPlan.length : null,
    channelsActive: channels.length,
    channelsTotal: Math.max(channels.length, 1),
    initiativesInProgressCount: actionPlan.filter((item) => item.status === 'In Progress').length,
    objectives: mappedObjectives,
    channelAllocations: mappedChannels,
    initiatives,
  };
}

export const MarketingStrategiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();

  // State
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [audiences, setAudiences] = useState<AudienceRecord[]>([]);

  // Async UI states
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isCreateStrategyModalOpen, setIsCreateStrategyModalOpen] = useState(false);
  const [isEditStrategyModalOpen, setIsEditStrategyModalOpen] = useState(false);
  const [isAddInitiativeModalOpen, setIsAddInitiativeModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Form states for Create / Edit Strategy
  const [stratName, setStratName] = useState('');
  const [stratDesc, setStratDesc] = useState('');
  const [stratProjectId, setStratProjectId] = useState('');
  const [stratCampaignId, setStratCampaignId] = useState('');
  const [stratBudget, setStratBudget] = useState('50000');
  const [stratChannels, setStratChannels] = useState('Social Media, Search Marketing, Content & SEO');
  const [stratObjectives, setStratObjectives] = useState('Grow brand awareness, Increase qualified inbound leads');
  const [stratStartsOn, setStratStartsOn] = useState('2026-10-01');
  const [stratEndsOn, setStratEndsOn] = useState('2027-03-31');
  const [stratStatus, setStratStatus] = useState<'Draft' | 'Planned' | 'Active' | 'Completed' | 'On Hold'>('Active');
  const [stratAudienceIds, setStratAudienceIds] = useState<string[]>([]);

  // Form states for Add Initiative
  const [newInitName, setNewInitName] = useState('');
  const [newInitNextStep, setNewInitNextStep] = useState('');
  const [newInitDueDate, setNewInitDueDate] = useState('');
  const [newInitStatus, setNewInitStatus] = useState<'Pending' | 'In Progress' | 'Completed'>('In Progress');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load data for workspace
  const loadData = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setStrategies([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const [stratRecords, projRecords, campRecords, audRecords] = await Promise.all([
        strategyService.list(currentWorkspace.id),
        projectService.list(currentWorkspace.id).catch(() => [] as ProjectRecord[]),
        campaignService.list(currentWorkspace.id).catch(() => [] as CampaignRecord[]),
        audienceService.list(currentWorkspace.id).catch(() => [] as AudienceRecord[]),
      ]);

      setStrategies(stratRecords);
      setProjects(projRecords);
      setCampaigns(campRecords);
      setAudiences(audRecords);

      if (stratRecords.length > 0) {
        setSelectedStrategyId((prev) => (stratRecords.some((s) => s.id === prev) ? prev : stratRecords[0].id));
      } else {
        setSelectedStrategyId('');
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Unable to load marketing strategies for this workspace.';
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

  // Selected Strategy Record & Derived Detail View
  const selectedRecord = useMemo(() => {
    return strategies.find((s) => s.id === selectedStrategyId) || strategies[0] || null;
  }, [strategies, selectedStrategyId]);

  const strategy: StrategyDetail | null = useMemo(() => {
    if (!selectedRecord) return null;
    return recordToDetail(selectedRecord, currentWorkspace?.name || 'Workspace');
  }, [selectedRecord, currentWorkspace?.name]);

  // Filter campaigns available for selected project
  const availableCampaigns = useMemo(() => {
    if (!stratProjectId) return campaigns;
    return campaigns.filter((c) => c.project_id === stratProjectId);
  }, [campaigns, stratProjectId]);

  // Escape key handler for active modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmOpen) setDeleteConfirmOpen(false);
        else if (isCreateStrategyModalOpen) setIsCreateStrategyModalOpen(false);
        else if (isEditStrategyModalOpen) setIsEditStrategyModalOpen(false);
        else if (isAddInitiativeModalOpen) setIsAddInitiativeModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirmOpen, isCreateStrategyModalOpen, isEditStrategyModalOpen, isAddInitiativeModalOpen]);

  // SVG circular completion indicator (Teal)
  const completionRadius = 40;
  const completionCircumference = 2 * Math.PI * completionRadius;
  const completionPercentage = strategy?.completionPercentage ?? 0;
  const completionOffset =
    completionCircumference - (completionPercentage / 100) * completionCircumference;

  // Handlers
  const handleOpenCreate = () => {
    setActionError(null);
    setStratName('');
    setStratDesc('');
    setStratProjectId(projects[0]?.id || '');
    setStratCampaignId('');
    setStratBudget('50000');
    setStratChannels('Social Media, Search Marketing, Content & SEO');
    setStratObjectives('Brand visibility in target regions, Acquire qualified leads');
    setStratStartsOn('2026-10-01');
    setStratEndsOn('2027-03-31');
    setStratStatus('Active');
    setStratAudienceIds([]);
    setIsCreateStrategyModalOpen(true);
  };

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !stratName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const channelList = stratChannels
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const objectiveList = stratObjectives
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      const input: StrategyInput = {
        name: stratName.trim(),
        description: stratDesc.trim() || null,
        project_id: stratProjectId || null,
        campaign_id: stratCampaignId || null,
        channels: channelList.length > 0 ? channelList : ['Digital Channels'],
        objectives: objectiveList.length > 0 ? objectiveList : ['Market Growth'],
        success_metrics: objectiveList.map((o) => `Target milestone for ${o}`),
        budget: Number(stratBudget) || null,
        starts_on: stratStartsOn || null,
        ends_on: stratEndsOn || null,
        status: stratStatus,
        audience_ids: stratAudienceIds.length > 0 ? stratAudienceIds : undefined,
      };

      const created = await strategyService.create(currentWorkspace.id, input);
      setStrategies((prev) => [created, ...prev]);
      setSelectedStrategyId(created.id);
      setIsCreateStrategyModalOpen(false);
      showToast(`Created strategy "${created.name}"`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create marketing strategy.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = () => {
    if (!selectedRecord) return;
    setActionError(null);
    setStratName(selectedRecord.name);
    setStratDesc(selectedRecord.description || '');
    setStratProjectId(selectedRecord.project_id || '');
    setStratCampaignId(selectedRecord.campaign_id || '');
    setStratBudget(selectedRecord.budget ? String(selectedRecord.budget) : '0');
    setStratChannels((selectedRecord.channels || []).join(', '));
    setStratObjectives((selectedRecord.objectives || []).join(', '));
    setStratStartsOn(selectedRecord.starts_on || '');
    setStratEndsOn(selectedRecord.ends_on || '');
    setStratStatus(
      selectedRecord.status === 'Archived' ? 'Draft' : selectedRecord.status
    );
    setStratAudienceIds(selectedRecord.audience_ids || []);
    setIsEditStrategyModalOpen(true);
  };

  const handleSaveEditStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !selectedRecord || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const channelList = stratChannels
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const objectiveList = stratObjectives
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      const input: Partial<StrategyInput> = {
        name: stratName.trim() || selectedRecord.name,
        description: stratDesc.trim() || null,
        project_id: stratProjectId || null,
        campaign_id: stratCampaignId || null,
        channels: channelList.length > 0 ? channelList : null,
        objectives: objectiveList.length > 0 ? objectiveList : null,
        success_metrics: objectiveList.map((o) => `Target milestone for ${o}`),
        budget: Number(stratBudget) || null,
        starts_on: stratStartsOn || null,
        ends_on: stratEndsOn || null,
        status: stratStatus,
        audience_ids: stratAudienceIds,
      };

      const updated = await strategyService.update(currentWorkspace.id, selectedRecord.id, input);
      setStrategies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setIsEditStrategyModalOpen(false);
      showToast(`Updated strategy "${updated.name}"`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update marketing strategy.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStrategy = async () => {
    if (!currentWorkspace?.id || !selectedRecord || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      await strategyService.delete(currentWorkspace.id, selectedRecord.id);
      const remaining = strategies.filter((s) => s.id !== selectedRecord.id);
      setStrategies(remaining);
      setSelectedStrategyId(remaining.length > 0 ? remaining[0].id : '');
      setDeleteConfirmOpen(false);
      showToast('Strategy deleted successfully.');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete strategy.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInitiative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !selectedRecord || !newInitName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const currentActionPlan = (selectedRecord.action_plan || []).slice();
      const newPlanItem: ActionPlanItem = {
        title: newInitName.trim(),
        description: newInitNextStep.trim() || null,
        due_date: newInitDueDate || null,
        status: newInitStatus,
      };

      const updatedActionPlan = [...currentActionPlan, newPlanItem];
      const updated = await strategyService.update(currentWorkspace.id, selectedRecord.id, {
        action_plan: updatedActionPlan,
      });

      setStrategies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setNewInitName('');
      setNewInitNextStep('');
      setNewInitDueDate('');
      setIsAddInitiativeModalOpen(false);
      showToast(`Added initiative "${newPlanItem.title}"`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to add strategic initiative.';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInitiative = async (index: number) => {
    if (!currentWorkspace?.id || !selectedRecord || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const currentActionPlan = (selectedRecord.action_plan || []).slice();
      currentActionPlan.splice(index, 1);

      const updated = await strategyService.update(currentWorkspace.id, selectedRecord.id, {
        action_plan: currentActionPlan,
      });

      setStrategies((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast('Initiative removed.');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete initiative.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateInitiativeStatus = async (
    index: number,
    status: ActionPlanItem['status'],
  ) => {
    if (!currentWorkspace?.id || !selectedRecord || !status || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const updatedActionPlan = (selectedRecord.action_plan || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, status } : item,
      );
      const updated = await strategyService.update(currentWorkspace.id, selectedRecord.id, {
        action_plan: updatedActionPlan,
      });
      setStrategies((prev) => prev.map((strategyRecord) => strategyRecord.id === updated.id ? updated : strategyRecord));
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update initiative status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAudienceIcon = (type: string) => {
    switch (type) {
      case 'cart':
        return (
          <div className="p-2.5 rounded-xl bg-[#CCFBF1] text-[#0D9488] shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
        );
      case 'users':
      default:
        return (
          <div className="p-2.5 rounded-xl bg-[#EDE9FE] text-[#6D28D9] shrink-0">
            <Users className="w-5 h-5" />
          </div>
        );
    }
  };

  const renderChannelIcon = (type: string) => {
    switch (type) {
      case 'social':
        return <Share2 className="w-4 h-4 text-[#6D28D9]" />;
      case 'email':
        return <Mail className="w-4 h-4 text-[#6D28D9]" />;
      case 'search':
        return <Search className="w-4 h-4 text-[#6D28D9]" />;
      case 'content':
      default:
        return <FileText className="w-4 h-4 text-[#6D28D9]" />;
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B4B] text-white px-4 py-2.5 rounded-lg shadow-xl text-sm flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span className="hover:text-[#1E1B4B] cursor-pointer" onClick={() => navigate('/')}>
          Management
        </span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">Strategies</span>
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

      {/* 2. Page Heading & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#1E1B4B]">
            Marketing Strategies
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Turn business objectives into structured marketing plans in {currentWorkspace?.name || 'your workspace'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {strategies.length > 1 && (
            <div className="relative">
              <select
                value={selectedStrategyId}
                onChange={(e) => setSelectedStrategyId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] font-medium focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] cursor-pointer"
              >
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenCreate}
            disabled={!hasWorkspace}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] disabled:opacity-50 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create strategy</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-24 bg-white rounded-xl border border-[#E2E8F0] flex flex-col items-center justify-center text-xs text-[#64748B]">
          <Loader2 className="w-8 h-8 text-[#6D28D9] animate-spin mb-3" />
          <span>Loading marketing strategy data...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && strategies.length === 0 && (
        <div className="py-20 bg-white rounded-xl border border-[#E2E8F0] p-8 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center mx-auto mb-4">
            <Target className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#1E1B4B]">No marketing strategies found</h3>
          <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
            Create your first strategic marketing roadmap to connect business goals with campaigns, target audiences, and budget allocation.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Strategy</span>
          </button>
        </div>
      )}

      {/* Main Strategy Dashboard */}
      {!isLoading && strategy && selectedRecord && (
        <div className="space-y-6">
          {/* 3. Strategy Header Card with Target Icon & Metadata */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <Target className="w-6 h-6 text-[#6D28D9]" />
                </div>

                <div>
                  <h2 className="text-lg lg:text-xl font-extrabold text-[#1E1B4B]">{strategy.title}</h2>
                  <div className="text-xs text-[#64748B] mt-1 flex flex-wrap items-center gap-2">
                    {strategy.projectId ? (
                      <span>
                        Linked to project:{' '}
                        <Link
                          to={`/projects/${strategy.projectId}`}
                          className="font-semibold text-[#6D28D9] hover:underline"
                        >
                          {strategy.projectName}
                        </Link>
                      </span>
                    ) : (
                      <span>Global Strategy (Workspace-wide)</span>
                    )}
                    {selectedRecord.campaign && (
                      <span>
                        • Campaign:{' '}
                        <Link
                          to={`/campaigns`}
                          className="font-semibold text-[#6D28D9] hover:underline"
                        >
                          {selectedRecord.campaign.name}
                        </Link>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata badges & Actions */}
              <div className="flex flex-wrap items-center gap-5 text-xs text-[#64748B]">
                <div>
                  <StatusBadge status={strategy.status} />
                  <span className="text-[10px] text-[#94A3B8] block text-center mt-0.5">Status</span>
                </div>

                <div className="h-6 w-[1px] bg-[#E2E8F0]" />

                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-[10px]">
                    {strategy.owner.initials}
                  </div>
                  <div>
                    <span className="font-semibold text-[#1E1B4B] block">{strategy.owner.name}</span>
                    <span className="text-[10px] text-[#94A3B8]">Owner</span>
                  </div>
                </div>

                <div className="h-6 w-[1px] bg-[#E2E8F0]" />

                <div>
                  <span className="font-semibold text-[#1E1B4B] block">{strategy.workspace}</span>
                  <span className="text-[10px] text-[#94A3B8]">Workspace</span>
                </div>

                <div className="h-6 w-[1px] bg-[#E2E8F0]" />

                <div>
                  <span className="font-semibold text-[#1E1B4B] block">{strategy.period}</span>
                  <span className="text-[10px] text-[#94A3B8]">Timeline</span>
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-[#64748B] hover:text-[#1E1B4B]"
                    title="Edit Strategy"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-rose-50 text-[#94A3B8] hover:text-rose-600"
                    title="Delete Strategy"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. FIRST ROW — THREE CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Overview */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1E1B4B] mb-3">Overview</h2>
                <p className="text-xs text-[#64748B] leading-relaxed">{strategy.overviewDescription}</p>
                {selectedRecord.budget && (
                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-xs">
                    <span className="text-[#94A3B8] block text-[10px] uppercase font-semibold">Allocated Budget</span>
                    <span className="text-base font-bold text-[#1E1B4B]">
                      ${Number(selectedRecord.budget).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center gap-4 text-xs font-semibold text-[#6D28D9] mt-4">
                <Link
                  to={`/strategies/${strategy.id}/swot`}
                  className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>SWOT Analysis</span>
                </Link>
                <Link to="/audiences" className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors">
                  <Users className="w-3.5 h-3.5" />
                  <span>Audiences</span>
                </Link>
              </div>
            </div>

            {/* Card 2: Target audience */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-[#1E1B4B]">Target audience</h2>
                  <Link
                    to="/audiences"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
                  >
                    <span>Open Audiences</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-3.5 max-h-56 overflow-y-auto">
                  {strategy.audiences.length > 0 ? (
                    strategy.audiences.map((aud) => (
                      <div key={aud.id} className="flex items-start gap-3">
                        {renderAudienceIcon(aud.iconType)}
                        <div>
                          <h3 className="text-xs font-bold text-[#1E1B4B]">{aud.title}</h3>
                          <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">{aud.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-[#94A3B8] p-3 text-center bg-slate-50 rounded-lg">
                      No target audiences connected yet. Connect segments via Edit Strategy.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Strategy status */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-[#1E1B4B]">Strategy status</h2>
                  <StatusBadge status={strategy.status} />
                </div>

                <div className="flex items-center justify-around my-3">
                  {/* Circular progress */}
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r={completionRadius}
                        stroke="#F1F5F9"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r={completionRadius}
                        stroke="#0D9488"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={completionCircumference}
                        strokeDashoffset={completionOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-extrabold text-[#1E1B4B]">
                        {strategy.completionPercentage === null ? '—' : `${strategy.completionPercentage}%`}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-medium">
                        {strategy.completionPercentage === null ? 'Not measured' : 'Completion'}
                      </span>
                    </div>
                  </div>

                  {/* Metrics breakdown */}
                  <div className="space-y-2.5 pl-2">
                    <div>
                      <span className="text-[11px] text-[#64748B] block">Initiatives completed</span>
                      <span className="text-base font-bold text-[#1E1B4B]">
                        {strategy.objectivesOnTrack === null || strategy.objectivesTotal === null
                          ? 'Not measured'
                          : `${strategy.objectivesOnTrack} / ${strategy.objectivesTotal}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#64748B] block">Channels active</span>
                      <span className="text-base font-bold text-[#1E1B4B]">
                        {strategy.channelsActive} / {strategy.channelsTotal}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#64748B] block">Initiatives in progress</span>
                      <span className="text-base font-bold text-[#1E1B4B]">
                        {strategy.initiativesInProgressCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. SECOND ROW — Measurable Objectives & Channel Allocation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card: Measurable objectives (2/3 width) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#1E1B4B]">Measurable objectives</h2>
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
                >
                  <span>Edit objectives</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[#64748B] font-medium border-b border-[#F1F5F9]">
                      <th className="pb-3 pr-3">Objective</th>
                      <th className="pb-3 pr-3">Target</th>
                      <th className="pb-3 pr-3 w-40">Progress</th>
                      <th className="pb-3">Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {strategy.objectives.map((obj) => (
                      <tr key={obj.id}>
                        <td className="py-3.5 pr-3 font-semibold text-[#1E1B4B]">{obj.kpi}</td>
                        <td className="py-3.5 pr-3 text-[#64748B]">{obj.target}</td>
                        <td className="py-3.5 pr-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#1E1B4B] font-medium">{obj.currentProgressText}</span>
                              <span className="font-semibold text-[#64748B]">{obj.progressPercentage === null ? 'Not measured' : `${obj.progressPercentage}%`}</span>
                            </div>
                            <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                              {obj.progressPercentage !== null && <div
                                className="bg-[#6D28D9] h-1.5 rounded-full"
                                style={{ width: `${obj.progressPercentage}%` }}
                              />}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-[#64748B]">{obj.deadline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card: Channel allocation (1/3 width) */}
            <div className="lg:col-span-1 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-[#1E1B4B]">Channel allocation</h2>
                  <Link
                    to="/campaigns"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
                  >
                    <span>Open Campaigns</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-4">
                  {strategy.channelAllocations.map((ch) => (
                    <div key={ch.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {renderChannelIcon(ch.iconType)}
                          <span className="font-semibold text-[#1E1B4B]">{ch.channel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1E1B4B]">{ch.percentage}%</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[10px] font-medium text-[#64748B]">
                            {ch.badge}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#6D28D9] h-1.5 rounded-full"
                          style={{ width: `${ch.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 6. THIRD ROW — Strategic Initiatives */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1E1B4B]">Strategic initiatives</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Execution roadmap and initiative checkpoints</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewInitName('');
                  setNewInitNextStep('');
                  setNewInitDueDate('');
                  setIsAddInitiativeModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDE9FE] text-[#6D28D9] hover:bg-[#DDD6FE] text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add initiative</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#64748B] font-medium border-b border-[#F1F5F9]">
                    <th className="pb-3 pr-3">Initiative</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 pr-3">Target / Next Step</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {strategy.initiatives.map((init, idx) => (
                    <tr key={init.id}>
                      <td className="py-3.5 pr-3 font-semibold text-[#1E1B4B]">{init.name}</td>
                      <td className="py-3.5 pr-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            init.status === 'Active' || init.status === 'Completed'
                              ? 'bg-[#CCFBF1] text-[#0D9488]'
                              : init.status === 'In progress'
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}
                        >
                          {init.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3 text-[#64748B]">{init.nextStep}</td>
                      <td className="py-3.5 text-right">
                        {selectedRecord?.action_plan?.[idx] && (
                          <select
                            aria-label={`Status for ${init.name}`}
                            disabled={isSubmitting}
                            value={selectedRecord.action_plan[idx].status || 'Pending'}
                            onChange={(event) => void handleUpdateInitiativeStatus(
                              idx,
                              event.target.value as ActionPlanItem['status'],
                            )}
                            className="mr-2 rounded border border-[#E2E8F0] px-2 py-1 text-[10px]"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteInitiative(idx)}
                          className="p-1 rounded text-[#94A3B8] hover:text-rose-600 transition-colors"
                          title="Delete initiative"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {strategy.initiatives.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#94A3B8]">
                        No strategic initiatives added yet. Click &quot;Add initiative&quot; to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE STRATEGY MODAL --- */}
      {isCreateStrategyModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#1E1B4B]">Create Marketing Strategy</h3>
              <button
                type="button"
                onClick={() => setIsCreateStrategyModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStrategy} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Strategy Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Customer Acquisition & Brand Campaign"
                  value={stratName}
                  onChange={(e) => setStratName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Overview Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe your strategy objectives, market rationale, and execution..."
                  value={stratDesc}
                  onChange={(e) => setStratDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Project</label>
                  <select
                    value={stratProjectId}
                    onChange={(e) => {
                      setStratProjectId(e.target.value);
                      setStratCampaignId('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] outline-none"
                  >
                    <option value="">No Project (Global)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Campaign</label>
                  <select
                    value={stratCampaignId}
                    onChange={(e) => setStratCampaignId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] outline-none"
                  >
                    <option value="">No Campaign</option>
                    {availableCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Budget ($)</label>
                  <input
                    type="number"
                    value={stratBudget}
                    onChange={(e) => setStratBudget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Status</label>
                  <select
                    value={stratStatus}
                    onChange={(e) => setStratStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Planned">Planned</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">
                  Marketing Channels (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Social Media, Google Search, Email, Content"
                  value={stratChannels}
                  onChange={(e) => setStratChannels(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">
                  Measurable Objectives (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50% brand recognition, 1500 leads"
                  value={stratObjectives}
                  onChange={(e) => setStratObjectives(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Starts On</label>
                  <input
                    type="date"
                    value={stratStartsOn}
                    onChange={(e) => setStratStartsOn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Ends On</label>
                  <input
                    type="date"
                    value={stratEndsOn}
                    onChange={(e) => setStratEndsOn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  />
                </div>
              </div>

              {audiences.length > 0 && (
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">
                    Connect Target Audiences
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-[#E2E8F0] rounded-lg p-2">
                    {audiences.map((aud) => (
                      <label key={aud.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded">
                        <input
                          type="checkbox"
                          checked={stratAudienceIds.includes(aud.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStratAudienceIds([...stratAudienceIds, aud.id]);
                            } else {
                              setStratAudienceIds(stratAudienceIds.filter((id) => id !== aud.id));
                            }
                          }}
                          className="rounded text-[#6D28D9] focus:ring-[#6D28D9]"
                        />
                        <span className="text-xs text-[#1E1B4B] font-medium">{aud.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsCreateStrategyModalOpen(false)}
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
                  <span>Save Strategy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT STRATEGY MODAL --- */}
      {isEditStrategyModalOpen && selectedRecord && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#1E1B4B]">Edit Marketing Strategy</h3>
              <button
                type="button"
                onClick={() => setIsEditStrategyModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditStrategy} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Strategy Title *</label>
                <input
                  type="text"
                  value={stratName}
                  onChange={(e) => setStratName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Overview Description</label>
                <textarea
                  rows={3}
                  value={stratDesc}
                  onChange={(e) => setStratDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Budget ($)</label>
                  <input
                    type="number"
                    value={stratBudget}
                    onChange={(e) => setStratBudget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Status</label>
                  <select
                    value={stratStatus}
                    onChange={(e) => setStratStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Planned">Planned</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#64748B]">Progress is calculated from persisted initiative statuses. Objectives without completion records remain unmeasured.</p>
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">
                  Marketing Channels (comma-separated)
                </label>
                <input
                  type="text"
                  value={stratChannels}
                  onChange={(e) => setStratChannels(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">
                  Objectives (comma-separated)
                </label>
                <input
                  type="text"
                  value={stratObjectives}
                  onChange={(e) => setStratObjectives(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                />
              </div>

              {audiences.length > 0 && (
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">
                    Connected Target Audiences
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-[#E2E8F0] rounded-lg p-2">
                    {audiences.map((aud) => (
                      <label key={aud.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded">
                        <input
                          type="checkbox"
                          checked={stratAudienceIds.includes(aud.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStratAudienceIds([...stratAudienceIds, aud.id]);
                            } else {
                              setStratAudienceIds(stratAudienceIds.filter((id) => id !== aud.id));
                            }
                          }}
                          className="rounded text-[#6D28D9] focus:ring-[#6D28D9]"
                        />
                        <span className="text-xs text-[#1E1B4B] font-medium">{aud.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditStrategyModalOpen(false)}
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

      {/* --- ADD INITIATIVE MODAL --- */}
      {isAddInitiativeModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#1E1B4B]">Add Strategic Initiative</h3>
              <button
                type="button"
                onClick={() => setIsAddInitiativeModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#1E1B4B] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddInitiative} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Initiative Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Omnichannel Retargeting Pilot"
                  value={newInitName}
                  onChange={(e) => setNewInitName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1E1B4B] mb-1">Description / Next Step</label>
                <input
                  type="text"
                  placeholder="e.g. Finalize ad creatives and test landing page conversions"
                  value={newInitNextStep}
                  onChange={(e) => setNewInitNextStep(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newInitDueDate}
                    onChange={(e) => setNewInitDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#1E1B4B] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1E1B4B] mb-1">Status</label>
                  <select
                    value={newInitStatus}
                    onChange={(e) => setNewInitStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1E1B4B] outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsAddInitiativeModalOpen(false)}
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
                  <span>Save Initiative</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE STRATEGY CONFIRMATION MODAL --- */}
      {deleteConfirmOpen && selectedRecord && (
        <div
          className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[#1E1B4B]">Delete Strategy?</h4>
            <p className="text-xs text-[#64748B] mt-1.5">
              Are you sure you want to delete <span className="font-semibold text-[#1E1B4B]">{selectedRecord.name}</span>? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E1B4B]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteStrategy}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Strategy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
