import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  FolderOpen,
  ListTodo,
  Pencil,
  Plus,
  Target,
  X,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useWorkspace } from '../../context/WorkspaceContext';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { taskService, type TaskRecord } from '../tasks/taskService';
import type { TaskPriority, TaskStatus } from '../tasks/types';
import { ApiError } from '../api/apiClient';
import { strategyService, type StrategyRecord } from '../strategies/strategyService';
import { projectService, type ProjectActivityRecord, type ProjectMilestoneRecord, type ProjectRecord } from './projectService';
import './ProjectDetailsPage.css';

type ProjectTab = 'Overview' | 'Strategy' | 'Campaigns' | 'Tasks' | 'Budget' | 'Files' | 'Activity';
type MilestoneDraft = {
  id?: string;
  title: string;
  description: string;
  due_date: string;
  status: ProjectMilestoneRecord['status'];
};
type TaskDraft = {
  id?: string;
  title: string;
  description: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
};

const tabs: ProjectTab[] = ['Overview', 'Strategy', 'Campaigns', 'Tasks', 'Budget', 'Files', 'Activity'];
const cardClass = 'rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4 shadow-sm';
const titleClass = 'text-sm font-semibold text-[var(--text-dark)]';
const mutedClass = 'text-xs text-slate-500 dark:text-slate-400';
const inputClass = 'mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-violet-900';
const primaryButtonClass = 'inline-flex items-center justify-center gap-1.5 rounded-md bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

function displayDate(value: string | null | undefined): string {
  if (!value) return 'No deadline';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

function initials(name: string | null | undefined): string {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
}

function apiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.errors) return Object.values(error.errors).flat().join(' ');
  return error instanceof Error ? error.message : fallback;
}

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [allCampaigns, setAllCampaigns] = useState<CampaignRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [activities, setActivities] = useState<ProjectActivityRecord[]>([]);
  const [projectLoading, setProjectLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState('');
  const relatedController = useRef<AbortController | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [pageError, setPageError] = useState('');
  const [activeTab, setActiveTab] = useState<ProjectTab>('Overview');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objectivesText, setObjectivesText] = useState('');
  const [status, setStatus] = useState('Active');
  const [progress, setProgress] = useState(0);
  const [editError, setEditError] = useState('');
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [milestoneDraft, setMilestoneDraft] = useState<MilestoneDraft | null>(null);
  const [milestoneSaving, setMilestoneSaving] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);

  const campaigns = useMemo(
    () => allCampaigns.filter((campaign) => campaign.project_id === project?.id),
    [allCampaigns, project?.id],
  );
  const availableCampaigns = useMemo(
    () => allCampaigns.filter((campaign) => !campaign.project_id),
    [allCampaigns],
  );
  const milestones = project?.milestones || [];
  const completedTasks = tasks.filter((task) => task.status === 'Completed').length;
  const completedMilestones = milestones.filter((milestone) => milestone.status === 'completed').length;
  const totalBudget = campaigns.reduce((sum, campaign) => sum + Number(campaign.budget), 0);
  const totalSpend = campaigns.reduce((sum, campaign) => sum + Number(campaign.spend), 0);
  const remainingBudget = totalBudget - totalSpend;

  const loadRelated = useCallback(async (workspaceId: string, id: string, active: () => boolean) => {
    relatedController.current?.abort();
    setRelatedLoading(true);
    setRelatedError('');
    const controller = new AbortController();
    relatedController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    const [campaignResult, taskResult, strategyResult] = await Promise.allSettled([
      campaignService.list(workspaceId, {}, { signal: controller.signal }),
      taskService.list(workspaceId, { project_id: id }, { signal: controller.signal }),
      strategyService.list(workspaceId, { project_id: id }, { signal: controller.signal }),
    ]);
    window.clearTimeout(timeout);
    if (relatedController.current === controller) relatedController.current = null;
    if (!active()) return;
    const errors: string[] = [];
    const message = (error: unknown, fallback: string) => (
      error instanceof Error && error.name === 'AbortError'
        ? 'The request timed out. Check your connection and retry.'
        : apiError(error, fallback)
    );
    if (campaignResult.status === 'fulfilled') setAllCampaigns(campaignResult.value);
    else errors.push(`Linked campaigns could not be loaded: ${message(campaignResult.reason, 'Unknown error.')}`);
    if (taskResult.status === 'fulfilled') setTasks(taskResult.value);
    else errors.push(`Project tasks could not be loaded: ${message(taskResult.reason, 'Unknown error.')}`);
    if (strategyResult.status === 'fulfilled') setStrategies(strategyResult.value);
    else errors.push(`Project strategies could not be loaded: ${message(strategyResult.reason, 'Unknown error.')}`);
    setRelatedError(errors.join(' '));
    setRelatedLoading(false);
  }, []);

  useEffect(() => {
    if (isLoadingWorkspaces) return;
    let active = true;
    const load = async () => {
      if (!hasWorkspace || !projectId) {
        setProject(null);
        setProjectLoading(false);
        setRelatedLoading(false);
        return;
      }
      setProjectLoading(true);
      setRelatedLoading(true);
      setPageError('');
      setRelatedError('');
      setProject(null);
      setAllCampaigns([]);
      setTasks([]);
      setStrategies([]);
      try {
        const record = await projectService.show(currentWorkspace.id, projectId);
        if (!active) return;
        setProject(record);
        setActivities(record.activities || []);
        setName(record.name);
        setDescription(record.description || '');
        setObjectivesText((record.objectives || []).join('\n'));
        setStatus(record.status);
        setProgress(record.progress);
        setProjectLoading(false);
        void loadRelated(currentWorkspace.id, record.id, () => active);
      } catch (error) {
        if (!active) return;
        setPageError(apiError(error, 'Unable to load this project.'));
        setProjectLoading(false);
        setRelatedLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      relatedController.current?.abort();
    };
  }, [isLoadingWorkspaces, hasWorkspace, currentWorkspace.id, projectId, reloadVersion, loadRelated]);

  const refreshActivity = async (id: string) => {
    try {
      const refreshed = await projectService.show(currentWorkspace.id, id);
      setActivities(refreshed.activities || []);
      setProject((current) => current ? { ...current, milestones: refreshed.milestones || current.milestones } : current);
    } catch (error) {
      setPageError(apiError(error, 'The change was saved, but project activity could not be refreshed.'));
    }
  };

  const handleSaveProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!project || !name.trim()) return;
    setIsSaving(true);
    setEditError('');
    try {
      const updated = await projectService.update(currentWorkspace.id, project.id, {
        name: name.trim(),
        description: description.trim() || null,
        objectives: objectivesText.split(/\r?\n/).map((objective) => objective.trim()).filter(Boolean),
        status,
        progress,
      });
      setProject(updated);
      setActivities(updated.activities || activities);
      setIsEditOpen(false);
    } catch (error) {
      setEditError(apiError(error, 'Unable to update project.'));
    } finally {
      setIsSaving(false);
    }
  };

  const openMilestone = (milestone?: ProjectMilestoneRecord) => setMilestoneDraft(milestone ? {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description || '',
    due_date: milestone.due_date || '',
    status: milestone.status,
  } : { title: '', description: '', due_date: '', status: 'planned' });

  const saveMilestone = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!project || !milestoneDraft?.title.trim()) return;
    setMilestoneSaving(true);
    setPageError('');
    try {
      const payload = {
        title: milestoneDraft.title.trim(),
        description: milestoneDraft.description.trim() || null,
        due_date: milestoneDraft.due_date || null,
        status: milestoneDraft.status,
      };
      const saved = milestoneDraft.id
        ? await projectService.updateMilestone(currentWorkspace.id, project.id, milestoneDraft.id, payload)
        : await projectService.createMilestone(currentWorkspace.id, project.id, payload);
      setProject((current) => current ? {
        ...current,
        milestones: [...(current.milestones || []).filter((item) => item.id !== saved.id), saved]
          .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')),
      } : current);
      setMilestoneDraft(null);
      await refreshActivity(project.id);
    } catch (error) {
      setPageError(apiError(error, 'Unable to save milestone.'));
    } finally {
      setMilestoneSaving(false);
    }
  };

  const deleteMilestone = async (milestone: ProjectMilestoneRecord) => {
    if (!project || !window.confirm(`Delete milestone "${milestone.title}"?`)) return;
    setPageError('');
    try {
      await projectService.removeMilestone(currentWorkspace.id, project.id, milestone.id);
      setProject((current) => current ? {
        ...current,
        milestones: (current.milestones || []).filter((item) => item.id !== milestone.id),
      } : current);
      await refreshActivity(project.id);
    } catch (error) {
      setPageError(apiError(error, 'Unable to delete milestone.'));
    }
  };

  const openTask = (task?: TaskRecord) => setTaskDraft(task ? {
    id: task.id,
    title: task.title,
    description: task.description || '',
    due_date: task.due_date ? task.due_date.slice(0, 10) : '',
    priority: task.priority,
    status: task.status,
  } : { title: '', description: '', due_date: '', priority: 'Medium', status: 'To Do' });

  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!project || !taskDraft?.title.trim()) return;
    setTaskSaving(true);
    setPageError('');
    try {
      const payload = {
        title: taskDraft.title.trim(),
        description: taskDraft.description.trim() || null,
        due_date: taskDraft.due_date || null,
        project_id: project.id,
        priority: taskDraft.priority,
        status: taskDraft.status,
      };
      const saved = taskDraft.id
        ? await taskService.update(currentWorkspace.id, taskDraft.id, payload)
        : await taskService.create(currentWorkspace.id, payload);
      setTasks((current) => [...current.filter((item) => item.id !== saved.id), saved]
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')));
      setTaskDraft(null);
      void refreshActivity(project.id);
    } catch (error) {
      setPageError(apiError(error, 'Unable to save task.'));
    } finally {
      setTaskSaving(false);
    }
  };

  const completeTask = async (task: TaskRecord) => {
    if (!project || task.status === 'Completed') return;
    setTaskSaving(true);
    setPageError('');
    try {
      const updated = await taskService.update(currentWorkspace.id, task.id, { status: 'Completed' });
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
      void refreshActivity(project.id);
    } catch (error) {
      setPageError(apiError(error, 'Unable to complete task.'));
    } finally {
      setTaskSaving(false);
    }
  };

  const deleteTask = async (task: TaskRecord) => {
    if (!project || !window.confirm(`Delete task "${task.title}"?`)) return;
    setPageError('');
    try {
      await taskService.remove(currentWorkspace.id, task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      void refreshActivity(project.id);
    } catch (error) {
      setPageError(apiError(error, 'Unable to delete task.'));
    }
  };

  const linkCampaign = async (campaign: CampaignRecord) => {
    if (!project) return;
    setCampaignSaving(true);
    setPageError('');
    try {
      const linked = await campaignService.update(currentWorkspace.id, campaign.id, { project_id: project.id });
      setAllCampaigns((current) => current.map((item) => item.id === linked.id ? linked : item));
      setCampaignPickerOpen(false);
    } catch (error) {
      setPageError(apiError(error, 'Unable to link campaign.'));
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project || !window.confirm(`Delete project "${project.name}"?`)) return;
    try {
      await projectService.remove(currentWorkspace.id, project.id);
      navigate('/projects');
    } catch (error) {
      setPageError(apiError(error, 'Unable to delete project.'));
    }
  };

  if (isLoadingWorkspaces) {
    return <div role="status" className="p-6 text-center text-sm text-slate-500">Loading project…</div>;
  }
  if (!hasWorkspace) {
    return <div role="alert" className="m-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Select an active workspace to view projects.</div>;
  }
  if (!project && projectLoading) {
    return (
      <main className="space-y-4 p-4 sm:p-6">
        <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
        <div className="h-10 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
        <div role="status" className="sr-only">Loading project details</div>
      </main>
    );
  }
  if (!project) {
    return <div className="m-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <p role={pageError ? 'alert' : 'status'} className={mutedClass}>{pageError || 'Project not found in the active workspace.'}</p>
      {pageError && <button type="button" onClick={() => setReloadVersion((version) => version + 1)} className="mr-4 mt-3 text-xs font-semibold text-violet-700 underline">Retry</button>}
      <Link to="/projects" className="mt-3 text-xs font-semibold text-violet-700 underline">Back to projects</Link>
    </div>;
  }

  const remaining = availableCampaigns.length;
  const dateRange = `${displayDate(project.start_date)} – ${displayDate(project.end_date)}`;

  return (
    <main className="project-details-page mx-auto max-w-[1500px] space-y-3 p-3 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500"><Link to="/projects" className="hover:text-violet-700">Projects</Link><span className="px-1.5 text-slate-300">/</span>{project.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-dark)] sm:text-2xl">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 border-r border-slate-200 pr-4 dark:border-slate-700">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200">{initials(project.owner?.name)}</span>
              <span><span className="block font-medium text-slate-700 dark:text-slate-200">{project.owner?.name || 'Owner unavailable'}</span><span className="block text-[9px]">Owner</span></span>
            </span>
            <span className="inline-flex items-center gap-1.5 border-r border-slate-200 pr-4 dark:border-slate-700"><FolderOpen className="h-3.5 w-3.5" />{currentWorkspace.name}<span className="text-[9px]">Workspace</span></span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{dateRange}<span className="text-[9px]">Date range</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { setEditError(''); setIsEditOpen(true); }} className={secondaryButtonClass}><Pencil className="h-3.5 w-3.5" /> Edit Project</button>
          <div className="relative">
            <button type="button" onClick={() => setCampaignPickerOpen((open) => !open)} disabled={campaignSaving || (!relatedLoading && remaining === 0)} className={primaryButtonClass}><Plus className="h-3.5 w-3.5" /> Add Campaign</button>
            {campaignPickerOpen && <div className="absolute right-0 z-20 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {relatedLoading && <p className="px-2.5 py-2 text-xs text-slate-500">Loading campaigns…</p>}
              {availableCampaigns.map((campaign) => <button key={campaign.id} type="button" disabled={campaignSaving} onClick={() => void linkCampaign(campaign)} className="block w-full rounded px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-violet-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800">{campaign.name}</button>)}
              {remaining === 0 && <p className="px-2.5 py-2 text-xs text-slate-500">No unlinked workspace campaigns.</p>}
            </div>}
          </div>
        </div>
      </div>

      {pageError && <div role="alert" className="flex items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{pageError}<button type="button" aria-label="Dismiss error" onClick={() => setPageError('')}><X className="h-3.5 w-3.5" /></button></div>}
      {relatedError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"><span>{relatedError}</span><button type="button" onClick={() => setReloadVersion((version) => version + 1)} className="font-semibold underline">Retry</button></div>}

      <nav aria-label="Project sections" className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => <button key={tab} type="button" aria-current={activeTab === tab ? 'page' : undefined} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[11px] font-medium transition ${activeTab === tab ? 'border-violet-700 text-violet-800 dark:text-violet-300' : 'border-transparent text-slate-500 hover:text-violet-700 dark:text-slate-400'}`}>{tab}</button>)}
      </nav>

      {activeTab === 'Overview' && <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.95fr_0.8fr]">
          <section className={cardClass}>
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-violet-700" /><h2 className={titleClass}>Executive Summary</h2></div>
            <p className="mt-2 min-h-12 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{project.description || 'No executive summary has been recorded.'}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2.5 dark:border-slate-800">
              <button type="button" onClick={() => setActiveTab('Strategy')} className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 hover:underline dark:text-violet-300"><Target className="h-3.5 w-3.5" /> View Strategy</button>
              <button type="button" onClick={() => setActiveTab('Tasks')} className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 hover:underline dark:text-violet-300"><ListTodo className="h-3.5 w-3.5" /> Open Tasks</button>
              <button type="button" onClick={() => setActiveTab('Budget')} className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 hover:underline dark:text-violet-300"><BarChart3 className="h-3.5 w-3.5" /> Budget Overview</button>
            </div>
          </section>

          <section className={cardClass}>
            <div className="mb-2 flex items-center justify-between gap-2"><h2 className={titleClass}>Objectives</h2><button type="button" onClick={() => { setEditError(''); setIsEditOpen(true); }} className="text-[10px] font-semibold text-violet-700 hover:underline dark:text-violet-300">Edit objectives <ArrowRight className="inline h-3 w-3" /></button></div>
            {(project.objectives || []).length === 0 ? <p className={`${mutedClass} py-3`}>No objectives have been recorded yet.</p> : <ul className="space-y-2">{(project.objectives || []).map((objective, index) => <li key={`${index}-${objective}`} className="flex gap-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />{objective}</li>)}</ul>}
          </section>

          <section className={cardClass}>
            <h2 className={titleClass}>Project Progress</h2>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#0d9488 ${Math.max(0, Math.min(100, project.progress))}%, #e2e8f0 0)` }}>
                <div className="grid h-[4.35rem] w-[4.35rem] place-items-center rounded-full bg-white text-center dark:bg-slate-900"><span className="text-lg font-bold text-indigo-950 dark:text-white">{project.progress}%</span></div>
              </div>
              <div className="min-w-0 border-l border-slate-200 pl-3 dark:border-slate-700">
                <p className={mutedClass}>Completed tasks</p><p className="text-sm font-semibold text-indigo-950 dark:text-white">{completedTasks} / {tasks.length}</p>
                <p className={`${mutedClass} mt-2`}>Milestones achieved</p><p className="text-sm font-semibold text-indigo-950 dark:text-white">{completedMilestones} / {milestones.length}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <section className={cardClass}>
            <div className="mb-2 flex items-center justify-between gap-2"><h2 className={titleClass}>Milestones</h2><button type="button" onClick={() => openMilestone()} className="text-[10px] font-semibold text-violet-700 hover:underline dark:text-violet-300">Add milestone <ArrowRight className="inline h-3 w-3" /></button></div>
            {relatedLoading && !project.milestones ? <p role="status" className={mutedClass}>Loading milestones…</p> : milestones.length === 0 ? <p className={`${mutedClass} py-3`}>No milestones have been recorded.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[360px] text-left"><thead><tr className="text-[9px] text-slate-500"><th className="py-1.5 font-medium">Milestone</th><th className="py-1.5 font-medium">Status</th><th className="py-1.5 font-medium">Due date</th><th /></tr></thead><tbody>{milestones.map((milestone, index) => <tr key={milestone.id} className="border-t border-slate-100 text-[10px] dark:border-slate-800"><td className="py-2 pr-2"><span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-violet-50 text-[9px] text-violet-700 dark:bg-violet-950 dark:text-violet-200">{index + 1}</span>{milestone.title}</td><td><MilestoneStatus status={milestone.status} /></td><td className="whitespace-nowrap text-slate-500">{displayDate(milestone.due_date)}</td><td className="whitespace-nowrap text-right"><button type="button" onClick={() => openMilestone(milestone)} className="px-1 text-violet-700 hover:underline dark:text-violet-300">Edit</button><button type="button" onClick={() => void deleteMilestone(milestone)} className="px-1 text-slate-500 hover:text-red-600">Delete</button></td></tr>)}</tbody></table></div>}
          </section>

          <CampaignsCard campaigns={campaigns} currency={currentWorkspace.currency || ''} loading={relatedLoading} onAdd={() => setCampaignPickerOpen(true)} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <TaskCompletionCard tasks={tasks} loading={relatedLoading} completed={completedTasks} onAdd={() => openTask()} onEdit={openTask} onComplete={(task) => void completeTask(task)} taskSaving={taskSaving} onViewAll={() => setActiveTab('Tasks')} />
          <BudgetCard budget={totalBudget} spend={totalSpend} remaining={remainingBudget} currency={currentWorkspace.currency || ''} onView={() => setActiveTab('Budget')} />
        </div>
      </div>}

      {activeTab === 'Strategy' && <section className={cardClass}>
        <div className="mb-3 flex items-center justify-between"><h2 className={titleClass}>Project Strategy</h2><Link to="/strategies" className="text-[10px] font-semibold text-violet-700 hover:underline dark:text-violet-300">Open Strategies <ArrowRight className="inline h-3 w-3" /></Link></div>
        {relatedLoading ? <p role="status" className={mutedClass}>Loading strategies…</p> : strategies.length === 0 ? <p className={mutedClass}>No strategy is linked to this project.</p> : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{strategies.map((strategy) => <li key={strategy.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{strategy.name}</p><p className={mutedClass}>{strategy.status} · {strategy.progress}%{strategy.starts_on ? ` · ${displayDate(strategy.starts_on)}` : ''}</p></div><Link to="/strategies" className="text-[10px] font-semibold text-violet-700 hover:underline dark:text-violet-300">View strategy</Link></li>)}</ul>}
      </section>}

      {activeTab === 'Campaigns' && <section className={cardClass}><div className="mb-3 flex items-center justify-between"><h2 className={titleClass}>Linked Campaigns</h2><button type="button" onClick={() => setCampaignPickerOpen(true)} disabled={campaignSaving || (!relatedLoading && !availableCampaigns.length)} className="text-[10px] font-semibold text-violet-700 hover:underline disabled:text-slate-400 dark:text-violet-300">Add campaign <ArrowRight className="inline h-3 w-3" /></button></div><CampaignsTable campaigns={campaigns} currency={currentWorkspace.currency || ''} loading={relatedLoading} /></section>}

      {activeTab === 'Tasks' && <section className={cardClass}>
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className={titleClass}>Project Tasks</h2><button type="button" onClick={() => openTask()} className={primaryButtonClass}><Plus className="h-3.5 w-3.5" /> Add Task</button></div>
        {relatedLoading ? <p role="status" className={mutedClass}>Loading tasks…</p> : tasks.length === 0 ? <p className={`${mutedClass} py-4`}>No tasks are linked to this project yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left"><thead><tr className="text-[10px] text-slate-500"><th className="py-2">Task</th><th>Assignee</th><th>Due date</th><th>Status</th><th>Priority</th><th /></tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className="border-t border-slate-100 text-[11px] dark:border-slate-800"><td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{task.title}</td><td className="text-slate-500">{task.assignee?.name || 'Unassigned'}</td><td className="text-slate-500">{displayDate(task.due_date)}</td><td><TaskStatusBadge status={task.status} /></td><td className="text-slate-500">{task.priority}</td><td className="whitespace-nowrap text-right"><button type="button" onClick={() => openTask(task)} className="px-1.5 text-violet-700 hover:underline dark:text-violet-300">Edit</button><button type="button" onClick={() => void deleteTask(task)} className="px-1.5 text-slate-500 hover:text-red-600">Delete</button></td></tr>)}</tbody></table></div>}
      </section>}

      {activeTab === 'Budget' && <BudgetDetailCard budget={totalBudget} spend={totalSpend} remaining={remainingBudget} currency={currentWorkspace.currency || ''} campaigns={campaigns} />}

      {activeTab === 'Files' && <section className={`${cardClass} py-10 text-center`}><FolderOpen className="mx-auto h-8 w-8 text-slate-300" /><h2 className={`${titleClass} mt-3`}>Project files aren’t available yet</h2><p className={`${mutedClass} mx-auto mt-1 max-w-lg`}>There is no project-file API or persisted project attachment storage in this workspace. Files can’t be uploaded or listed here yet.</p></section>}

      {activeTab === 'Activity' && <section className={cardClass}>
        <h2 className={`${titleClass} mb-3`}>Project Activity</h2>
        {activities.length === 0 ? <p className={`${mutedClass} py-3`}>No activity has been recorded for this project yet.</p> : <ol className="space-y-3">{activities.map((activity) => <li key={activity.id} className="flex gap-2.5 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500" /><div><p className="text-xs text-slate-800 dark:text-slate-200">{activity.summary}</p><p className={`mt-1 ${mutedClass}`}>{activity.user || 'Workspace member'} · {new Date(activity.created_at).toLocaleString()}</p></div></li>)}</ol>}
      </section>}

      {isEditOpen && <Modal title="Edit Project" onClose={() => setIsEditOpen(false)}>
        <form onSubmit={(event) => void handleSaveProject(event)} className="space-y-3">
          {editError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{editError}</p>}
          <Field label="Project name"><input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></Field>
          <Field label="Executive summary"><textarea maxLength={5000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} /></Field>
          <Field label="Objectives (one per line)"><textarea maxLength={10000} rows={4} value={objectivesText} onChange={(event) => setObjectivesText(event.target.value)} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}><option>Active</option><option>Draft</option><option>Completed</option><option>Archived</option></select></Field>
            <Field label="Progress (%)"><input type="number" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} className={inputClass} /></Field>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <button type="button" onClick={() => void handleDelete()} className="text-xs font-semibold text-red-600 hover:underline">Delete project</button>
          </div>
          <ModalActions onCancel={() => setIsEditOpen(false)} saving={isSaving} />
        </form>
      </Modal>}

      {milestoneDraft && <Modal title={milestoneDraft.id ? 'Edit Milestone' : 'Add Milestone'} onClose={() => setMilestoneDraft(null)}>
        <form onSubmit={(event) => void saveMilestone(event)} className="space-y-3">
          <Field label="Title"><input required maxLength={255} value={milestoneDraft.title} onChange={(event) => setMilestoneDraft({ ...milestoneDraft, title: event.target.value })} className={inputClass} /></Field>
          <Field label="Description"><textarea maxLength={5000} rows={2} value={milestoneDraft.description} onChange={(event) => setMilestoneDraft({ ...milestoneDraft, description: event.target.value })} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Due date"><input type="date" value={milestoneDraft.due_date} onChange={(event) => setMilestoneDraft({ ...milestoneDraft, due_date: event.target.value })} className={inputClass} /></Field><Field label="Status"><select value={milestoneDraft.status} onChange={(event) => setMilestoneDraft({ ...milestoneDraft, status: event.target.value as MilestoneDraft['status'] })} className={inputClass}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></Field></div>
          <ModalActions onCancel={() => setMilestoneDraft(null)} saving={milestoneSaving} />
        </form>
      </Modal>}

      {taskDraft && <Modal title={taskDraft.id ? 'Edit Task' : 'Add Task'} onClose={() => setTaskDraft(null)}>
        <form onSubmit={(event) => void saveTask(event)} className="space-y-3">
          <Field label="Title"><input required maxLength={255} value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} className={inputClass} /></Field>
          <Field label="Description"><textarea maxLength={5000} rows={2} value={taskDraft.description} onChange={(event) => setTaskDraft({ ...taskDraft, description: event.target.value })} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Due date (optional)"><input type="date" value={taskDraft.due_date} onChange={(event) => setTaskDraft({ ...taskDraft, due_date: event.target.value, status: !event.target.value && taskDraft.status === 'Overdue' ? 'To Do' : taskDraft.status })} className={inputClass} /></Field><Field label="Priority"><select value={taskDraft.priority} onChange={(event) => setTaskDraft({ ...taskDraft, priority: event.target.value as TaskPriority })} className={inputClass}><option>High</option><option>Medium</option><option>Low</option></select></Field></div>
          <Field label="Status"><select value={taskDraft.status} onChange={(event) => setTaskDraft({ ...taskDraft, status: event.target.value as TaskStatus })} className={inputClass}><option>To Do</option><option>In Progress</option><option>In Review</option><option>Completed</option><option disabled={!taskDraft.due_date}>Overdue {!taskDraft.due_date ? '(requires due date)' : ''}</option></select></Field>
          <ModalActions onCancel={() => setTaskDraft(null)} saving={taskSaving} />
        </form>
      </Modal>}
    </main>
  );
};

function CampaignsCard({ campaigns, currency, loading, onAdd }: { campaigns: CampaignRecord[]; currency: string; loading: boolean; onAdd: () => void }) {
  return <section className={cardClass}><div className="mb-2 flex items-center justify-between"><h2 className={titleClass}>Linked Campaigns</h2><button type="button" onClick={onAdd} className="text-[10px] font-semibold text-violet-700 hover:underline dark:text-violet-300">Add campaign <ArrowRight className="inline h-3 w-3" /></button></div><CampaignsTable campaigns={campaigns} currency={currency} loading={loading} compact /></section>;
}

function CampaignsTable({ campaigns, currency, loading = false, compact = false }: { campaigns: CampaignRecord[]; currency: string; loading?: boolean; compact?: boolean }) {
  if (loading) return <p role="status" className={mutedClass}>Loading campaigns…</p>;
  if (!campaigns.length) return <p className={`${mutedClass} py-3`}>No campaigns are linked to this project.</p>;
  return <div className="overflow-x-auto"><table className={`w-full ${compact ? 'min-w-[440px]' : 'min-w-[620px]'} text-left`}><thead><tr className="text-[9px] text-slate-500"><th className="py-1.5 font-medium">Campaign</th><th className="py-1.5 font-medium">Channel</th><th className="py-1.5 font-medium">Status</th><th className="py-1.5 text-right font-medium">Leads</th><th className="py-1.5 text-right font-medium">Budget</th></tr></thead><tbody>{campaigns.map((campaign) => <tr key={campaign.id} className="border-t border-slate-100 text-[10px] dark:border-slate-800"><td className="py-2"><Link to={`/campaigns/${campaign.id}`} className="font-medium text-violet-700 hover:underline dark:text-violet-300">{campaign.name}</Link></td><td className="text-slate-500">{campaign.channel || campaign.platform}</td><td><StatusBadge status={campaign.status} /></td><td className="text-right tabular-nums text-slate-600 dark:text-slate-300">{campaign.leads}</td><td className="text-right tabular-nums text-slate-600 dark:text-slate-300">{Number(campaign.budget).toLocaleString()} {currency}</td></tr>)}</tbody></table></div>;
}

function TaskCompletionCard({ tasks, loading, completed, onAdd, onEdit, onComplete, taskSaving, onViewAll }: { tasks: TaskRecord[]; loading: boolean; completed: number; onAdd: () => void; onEdit: (task: TaskRecord) => void; onComplete: (task: TaskRecord) => void; taskSaving: boolean; onViewAll: () => void }) {
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  return <section className={cardClass}>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className={titleClass}>Task Completion</h2><div className="flex items-center gap-3"><span className="text-[9px] text-slate-500">{completed} of {tasks.length} tasks completed</span><button type="button" onClick={onViewAll} className="text-[10px] font-semibold text-violet-700 hover:underline dark:text-violet-300">Open Tasks <ArrowRight className="inline h-3 w-3" /></button></div></div>
    <div className="mb-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${percent}%` }} /></div><span className="w-8 text-right text-[10px] font-semibold">{percent}%</span><button type="button" onClick={onAdd} aria-label="Add task" className="text-violet-700 dark:text-violet-300"><Plus className="h-3.5 w-3.5" /></button></div>
    {loading ? <p role="status" className={mutedClass}>Loading tasks…</p> : tasks.length === 0 ? <p className={`${mutedClass} py-2`}>No tasks yet. Add a task to start tracking progress.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left"><thead><tr className="text-[9px] text-slate-500"><th className="py-1 font-medium">Task</th><th className="py-1 font-medium">Assignee</th><th className="py-1 font-medium">Due date</th><th className="py-1 font-medium">Status</th><th /></tr></thead><tbody>{tasks.slice(0, 4).map((task) => <tr key={task.id} className="border-t border-slate-100 text-[10px] dark:border-slate-800"><td className="py-2"><button type="button" disabled={taskSaving || task.status === 'Completed'} onClick={() => onComplete(task)} aria-label={`Complete ${task.title}`} className="mr-2 inline-grid h-3.5 w-3.5 place-items-center rounded border border-slate-300 align-middle text-white disabled:border-teal-600 disabled:bg-teal-600"><Check className="h-2.5 w-2.5" /></button><button type="button" onClick={() => onEdit(task)} className="align-middle text-left text-violet-700 hover:underline dark:text-violet-300">{task.title}</button></td><td className="text-slate-500">{task.assignee?.name || 'Unassigned'}</td><td className="whitespace-nowrap text-slate-500">{displayDate(task.due_date)}</td><td><TaskStatusBadge status={task.status} /></td><td /></tr>)}</tbody></table></div>}
  </section>;
}

function BudgetCard({ budget, spend, remaining, currency, onView }: { budget: number; spend: number; remaining: number; currency: string; onView: () => void }) {
  const percent = budget > 0 ? Math.max(0, Math.min(100, spend / budget * 100)) : 0;
  return <section className={cardClass}>
    <div className="mb-2 flex items-center justify-between"><h2 className={titleClass}>Budget Overview</h2><button type="button" onClick={onView} className="text-[10px] font-semibold text-violet-700 hover:underline dark:text-violet-300">Budget &amp; Expenses <ArrowRight className="inline h-3 w-3" /></button></div>
    {budget === 0 && spend === 0 ? <p className={`${mutedClass} py-3`}>No budget or spend is recorded against linked campaigns.</p> : <div className="flex items-center gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#0d9488 ${percent}%, #e2e8f0 0)` }}><div className="grid h-14 w-14 place-items-center rounded-full bg-white text-center dark:bg-slate-900"><span className="text-sm font-bold">{Math.round(percent)}%</span></div></div><div className="flex-1 space-y-2 text-[10px]"><MoneyRow label="Allocated budget" value={budget} currency={currency} /><MoneyRow label="Spent" value={spend} currency={currency} /><MoneyRow label="Remaining" value={remaining} currency={currency} emphasis /></div></div>}
    <p className="mt-2 text-[9px] text-slate-400">Based on linked campaign records; excludes workspace expenses.</p>
  </section>;
}

function BudgetDetailCard({ budget, spend, remaining, currency, campaigns }: { budget: number; spend: number; remaining: number; currency: string; campaigns: CampaignRecord[] }) {
  return <section className={cardClass}><h2 className={`${titleClass} mb-2`}>Budget Overview</h2><p className={`${mutedClass} mb-4`}>Project-level finance budgets and expenses aren’t linked to projects in the current API. The figures below are totals from this project’s linked campaign records only.</p><div className="grid gap-3 sm:grid-cols-3"><MoneyTile label="Allocated campaign budget" value={budget} currency={currency} /><MoneyTile label="Campaign spend" value={spend} currency={currency} /><MoneyTile label="Remaining" value={remaining} currency={currency} /></div><div className="mt-4"><CampaignsTable campaigns={campaigns} currency={currency} /></div><Link to="/finance/budget" className="mt-4 inline-flex text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300">Open workspace budgets <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></section>;
}

function MoneyRow({ label, value, currency, emphasis = false }: { label: string; value: number; currency: string; emphasis?: boolean }) {
  return <div className="flex justify-between gap-2"><span className="text-slate-500">{label}</span><span className={`font-semibold tabular-nums ${emphasis ? 'text-teal-700 dark:text-teal-300' : 'text-slate-800 dark:text-slate-100'}`}>{value.toLocaleString()} {currency}</span></div>;
}

function MoneyTile({ label, value, currency }: { label: string; value: number; currency: string }) {
  return <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800"><p className={mutedClass}>{label}</p><p className="mt-1 text-base font-semibold tabular-nums">{value.toLocaleString()} {currency}</p></div>;
}

function MilestoneStatus({ status }: { status: ProjectMilestoneRecord['status'] }) {
  const label = status === 'in_progress' ? 'In progress' : status === 'completed' ? 'Completed' : 'Upcoming';
  const colors = status === 'completed' ? 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200' : status === 'in_progress' ? 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-medium ${colors}`}>{label}</span>;
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const colors = status === 'Completed' ? 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200' : status === 'In Progress' ? 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-medium ${colors}`}>{status}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><h2 className={titleClass}>{title}</h2><button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div>{children}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">{label}{children}</label>;
}

function ModalActions({ onCancel, saving }: { onCancel: () => void; saving: boolean }) {
  return <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"><button type="button" disabled={saving} onClick={onCancel} className={secondaryButtonClass}>Cancel</button><button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Saving…' : 'Save changes'}</button></div>;
}
