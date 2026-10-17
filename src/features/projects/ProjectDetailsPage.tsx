import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Edit3, Megaphone, Trash2 } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useWorkspace } from '../../context/WorkspaceContext';
import { campaignService, type CampaignRecord } from '../campaigns/campaignService';
import { taskService, type TaskRecord } from '../tasks/taskService';
import { ApiError } from '../api/apiClient';
import { projectService, type ProjectRecord } from './projectService';

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace, hasWorkspace, isLoadingWorkspaces } = useWorkspace();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [progress, setProgress] = useState(0);

  const reloadProject = useCallback(async () => {
    if (!hasWorkspace || !projectId) {
      setProject(null);
      setCampaigns([]);
      setTasks([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      const [record, allCampaigns, allTasks] = await Promise.all([
        projectService.show(currentWorkspace.id, projectId),
        campaignService.list(currentWorkspace.id),
        taskService.list(currentWorkspace.id),
      ]);
      setProject(record);
      setName(record.name);
      setDescription(record.description || '');
      setStatus(record.status);
      setProgress(record.progress);
      setCampaigns(allCampaigns.filter((campaign) => campaign.project_id === record.id));
      setTasks(allTasks.filter((task) => task.project_id === record.id));
    } catch (error) {
      setProject(null);
      setCampaigns([]);
      setTasks([]);
      setPageError(error instanceof Error ? error.message : 'Unable to load this project.');
    } finally {
      setIsLoading(false);
    }
  }, [hasWorkspace, currentWorkspace.id, projectId]);

  useEffect(() => {
    if (!isLoadingWorkspaces) void reloadProject();
  }, [isLoadingWorkspaces, reloadProject]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!project || !hasWorkspace || !name.trim()) return;
    setIsSaving(true);
    setEditError(null);
    try {
      const updated = await projectService.update(currentWorkspace.id, project.id, {
        name: name.trim(),
        description: description.trim() || null,
        status,
        progress,
      });
      setProject(updated);
      setIsEditOpen(false);
    } catch (error) {
      setEditError(error instanceof ApiError && error.errors
        ? Object.values(error.errors).flat().join(' ')
        : error instanceof Error ? error.message : 'Unable to update project.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project || !hasWorkspace || !window.confirm(`Delete project "${project.name}"?`)) return;
    try {
      await projectService.remove(currentWorkspace.id, project.id);
      navigate('/projects');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to delete project.');
    }
  };

  if (isLoading || isLoadingWorkspaces) {
    return <div role="status" className="p-8 text-center text-sm text-[#64748B]">Loading project…</div>;
  }

  if (!hasWorkspace) {
    return <div role="alert" className="m-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Select an active workspace to view projects.</div>;
  }

  if (!project) {
    return (
      <div className="m-8 rounded-xl border border-[#E2E8F0] bg-white p-6">
        <p role={pageError ? 'alert' : 'status'} className="text-sm text-[#64748B]">{pageError || 'Project not found in the active workspace.'}</p>
        {pageError && <button type="button" onClick={() => void reloadProject()} className="mt-3 text-xs font-semibold text-[#6D28D9] underline">Retry</button>}
        <Link to="/projects" className="ml-4 text-xs font-semibold text-[#6D28D9] underline">Back to projects</Link>
      </div>
    );
  }

  const totalBudget = campaigns.reduce((sum, campaign) => sum + Number(campaign.budget), 0);
  const totalSpend = campaigns.reduce((sum, campaign) => sum + Number(campaign.spend), 0);
  const completedTasks = tasks.filter((task) => task.status === 'Completed').length;

  return (
    <div className="min-h-screen space-y-6 bg-[#F8F7FC] p-6 lg:p-8">
      <Link to="/projects" className="inline-flex items-center gap-2 text-xs font-medium text-[#64748B] hover:text-[#6D28D9]">
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>

      {pageError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{pageError}</div>}

      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              <span className="text-xs text-[#64748B]">{currentWorkspace.name}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E1B4B]">{project.name}</h1>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#64748B]">
              {project.description || 'No project description provided.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#64748B]">
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{project.start_date} – {project.end_date}</span>
              <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => { setEditError(null); setIsEditOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[#6D28D9] px-3.5 py-2 text-xs font-semibold text-[#6D28D9] hover:bg-[#F5F3FF]">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
            <button type="button" onClick={() => void handleDelete()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 border-t border-[#F1F5F9] pt-5 sm:grid-cols-4">
          <div><div className="text-xs text-[#64748B]">Progress</div><div className="mt-1 text-lg font-bold text-[#1E1B4B]">{project.progress}%</div></div>
          <div><div className="text-xs text-[#64748B]">Tasks</div><div className="mt-1 text-lg font-bold text-[#1E1B4B]">{completedTasks} / {tasks.length}</div></div>
          <div><div className="text-xs text-[#64748B]">Campaign budget</div><div className="mt-1 text-lg font-bold text-[#1E1B4B]">{totalBudget.toLocaleString()} {currentWorkspace.currency || ''}</div></div>
          <div><div className="text-xs text-[#64748B]">Campaign spend</div><div className="mt-1 text-lg font-bold text-[#1E1B4B]">{totalSpend.toLocaleString()} {currentWorkspace.currency || ''}</div></div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#1E1B4B]"><Megaphone className="h-4 w-4 text-[#6D28D9]" /> Campaigns</h2>
          {campaigns.length === 0 ? <p className="text-xs text-[#94A3B8]">No campaigns are linked to this project.</p> : (
            <ul className="divide-y divide-[#F1F5F9]">
              {campaigns.map((campaign) => (
                <li key={campaign.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link to={`/campaigns/${campaign.id}`} className="truncate text-xs font-semibold text-[#6D28D9] hover:underline">{campaign.name}</Link>
                    <p className="mt-1 text-[11px] text-[#64748B]">{campaign.platform} · {campaign.status}</p>
                  </div>
                  <span className="shrink-0 text-xs text-[#64748B]">{Number(campaign.spend).toLocaleString()} / {Number(campaign.budget).toLocaleString()} {currentWorkspace.currency || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
          <h2 className="mb-4 text-sm font-bold text-[#1E1B4B]">Tasks</h2>
          {tasks.length === 0 ? <p className="text-xs text-[#94A3B8]">No tasks are linked to this project.</p> : (
            <ul className="divide-y divide-[#F1F5F9]">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[#1E1B4B]">{task.title}</p>
                    <p className="mt-1 text-[11px] text-[#64748B]">{task.assignee?.name || 'Unassigned'} · Due {task.due_date}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#F5F3FF] px-2.5 py-1 text-[10px] font-medium text-[#6D28D9]">{task.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {isEditOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="edit-project-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={(event) => { void handleSave(event); }} className="w-full max-w-lg space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xl">
            <h2 id="edit-project-title" className="text-base font-bold text-[#1E1B4B]">Edit project</h2>
            {editError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{editError}</p>}
            <label className="block text-xs font-semibold text-[#1E1B4B]">Name
              <input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-[#1E1B4B]">Description
              <textarea maxLength={5000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-[#1E1B4B]">Status
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
                  {['Active', 'Completed', 'Archived', 'Draft'].map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-[#1E1B4B]">Progress
                <input type="number" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#F1F5F9] pt-4">
              <button type="button" disabled={isSaving} onClick={() => setIsEditOpen(false)} className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#64748B]">Cancel</button>
              <button type="submit" disabled={isSaving || !name.trim()} className="rounded-lg bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{isSaving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
