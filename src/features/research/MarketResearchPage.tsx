import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Download,
  Folder,
  ArrowRight,
  X,
  FileText,
  Users,
  Megaphone,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  researchService,
  type ResearchRecord,
  type ResearchStatus,
  type FindingBackend,
  type SourceBackend,
} from './researchService';
import type {
  MarketStudy,
  ConfidenceLevel,
  NeedPriority,
  FindingStatus,
  StudyStatus,
  PriceLevel,
  ReliabilityLevel,
  MarketObservation,
  CustomerNeed,
  CompetitorComparison,
  PricingObservation,
  SourceReference,
  RecordedFinding,
} from '../../types';

function mapRecordToStudy(r: ResearchRecord, workspaceName: string): MarketStudy {
  let status: StudyStatus = 'Active';
  if (r.status === 'Completed') status = 'Completed';
  else if (r.status === 'Planned') status = 'Draft';
  else if (r.status === 'Archived') status = 'Archived';
  else if (r.status === 'In Progress') status = 'Active';

  const competitors: CompetitorComparison[] = (r.competitor_profiles || []).map((cp, idx) => ({
    id: `comp-${r.id}-${idx}`,
    competitor: cp.name,
    positioning: cp.description || cp.website || 'Direct Competitor',
    priceLevel: 'Medium' as PriceLevel,
    mainOffer: cp.description || 'Core market offering',
    strengths: Array.isArray(cp.strengths) ? cp.strengths.join(', ') : '',
    weaknesses: Array.isArray(cp.weaknesses) ? cp.weaknesses.join(', ') : '',
    lastReviewed: r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'Recent',
  }));

  const recordedFindings: RecordedFinding[] = (r.findings || []).map((f, idx) => ({
    id: `rf-${r.id}-${idx}`,
    finding: f.title && f.insight ? `${f.title}: ${f.insight}` : f.insight || f.title,
    status: 'Ready' as FindingStatus,
    date: r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'Recent',
  }));

  const sourceReferences: SourceReference[] = (r.sources || []).map((s, idx) => ({
    id: `src-${r.id}-${idx}`,
    source: s.title,
    type: 'Document',
    date: s.accessed_on || (r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'Recent'),
    notes: s.url || '',
    reliability: 'High' as ReliabilityLevel,
  }));

  const observations: MarketObservation[] = [
    ...(r.opportunities || []).map((op, idx) => ({
      id: `obs-op-${r.id}-${idx}`,
      observation: op.title,
      evidence: op.description || 'Identified Market Opportunity',
      region: 'National',
      confidence: 'High' as ConfidenceLevel,
      dateRecorded: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent',
    })),
    ...(r.threats || []).map((th, idx) => ({
      id: `obs-th-${r.id}-${idx}`,
      observation: th.title,
      evidence: th.description || 'Identified Market Threat',
      region: 'National',
      confidence: 'Medium' as ConfidenceLevel,
      dateRecorded: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent',
    })),
  ];

  let customerNeeds: CustomerNeed[] = [];
  let pricingObservations: PricingObservation[] = [];
  if (r.notes) {
    try {
      const parsed = JSON.parse(r.notes);
      if (Array.isArray(parsed.customerNeeds)) customerNeeds = parsed.customerNeeds;
      if (Array.isArray(parsed.pricingObservations)) pricingObservations = parsed.pricingObservations;
      if (Array.isArray(parsed.observations) && parsed.observations.length > 0) {
        observations.push(...parsed.observations);
      }
    } catch {
      // Notes contains plain text
    }
  }

  return {
    id: r.id,
    title: r.name,
    workspace: workspaceName,
    status,
    owner: {
      name: 'Lead Researcher',
      initials: 'LR',
      email: 'research@marketflow.io',
      role: 'Researcher',
    },
    period: r.starts_on ? `${r.starts_on}${r.ends_on ? ` – ${r.ends_on}` : ''}` : 'Active Period',
    evidenceCount: competitors.length + recordedFindings.length + sourceReferences.length + observations.length,
    lastUpdated: r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'Recent',
    overviewDescription: r.description || 'Structured market study research record.',
    linkedLinks: {
      projectsUrl: '/projects',
      audiencesUrl: '/audiences',
      campaignsUrl: '/campaigns',
    },
    observations,
    customerNeeds,
    competitors,
    pricingObservations,
    sourceReferences,
    recordedFindings,
  };
}

export const MarketResearchPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? '';
  const workspaceName = currentWorkspace?.name ?? 'Atlas Retail SARL';

  const [rawRecords, setRawRecords] = useState<ResearchRecord[]>([]);
  const [studies, setStudies] = useState<MarketStudy[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isNewStudyModalOpen, setIsNewStudyModalOpen] = useState(false);
  const [isEditStudyModalOpen, setIsEditStudyModalOpen] = useState(false);
  const [isAddFindingModalOpen, setIsAddFindingModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);

  // New study form state
  const [newStudyTitle, setNewStudyTitle] = useState('');
  const [newStudyPeriod, setNewStudyPeriod] = useState('October 2026');
  const [newStudyStatus, setNewStudyStatus] = useState<StudyStatus>('Active');
  const [newStudyDesc, setNewStudyDesc] = useState('');

  // Edit study form state
  const [editTitle, setEditTitle] = useState('');
  const [editPeriod, setEditPeriod] = useState('');
  const [editStatus, setEditStatus] = useState<StudyStatus>('Active');
  const [editDesc, setEditDesc] = useState('');

  // Add finding form state
  const [newFindingText, setNewFindingText] = useState('');
  const [newFindingStatus, setNewFindingStatus] = useState<FindingStatus>('New');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudies = useCallback(async () => {
    if (!workspaceId) {
      setStudies([]);
      setRawRecords([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const records = await researchService.list(workspaceId);
      setRawRecords(records);
      const mapped = records.map((r) => mapRecordToStudy(r, workspaceName));
      setStudies(mapped);

      if (mapped.length > 0) {
        setSelectedStudyId((prev) => {
          const exists = mapped.find((s) => s.id === prev);
          return exists ? prev : mapped[0].id;
        });
      } else {
        setSelectedStudyId('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market research studies.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, workspaceName]);

  useEffect(() => {
    fetchStudies();
  }, [fetchStudies]);

  // Current study
  const currentStudy = studies.find((s) => s.id === selectedStudyId) || studies[0];

  const filteredStudies = studies.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    'Overview',
    'Competitors',
    'Customer Needs',
    'Pricing',
    'Sources',
    'Findings',
  ];

  const renderConfidenceBadge = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'High':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">
            Low
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: NeedPriority) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EDE9FE] text-[#6D28D9]">
            Low
          </span>
        );
    }
  };

  const renderStudyStatusBadge = (status: StudyStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            Active
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EDE9FE] text-[#6D28D9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
            Completed
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            Draft
          </span>
        );
      case 'Archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
            Archived
          </span>
        );
    }
  };

  const renderFindingStatusBadge = (status: FindingStatus) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#EDE9FE] text-[#6D28D9]">
            New
          </span>
        );
      case 'Reviewed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#E0F2FE] text-[#0284C7]">
            Reviewed
          </span>
        );
      case 'Ready':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
            Ready
          </span>
        );
      case 'Archived':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">
            Archived
          </span>
        );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNewStudyModalOpen) setIsNewStudyModalOpen(false);
        else if (isEditStudyModalOpen) setIsEditStudyModalOpen(false);
        else if (isAddFindingModalOpen) setIsAddFindingModalOpen(false);
        else if (isUploadDocModalOpen) setIsUploadDocModalOpen(false);
        else if (isDeleteModalOpen) setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewStudyModalOpen, isEditStudyModalOpen, isAddFindingModalOpen, isUploadDocModalOpen, isDeleteModalOpen]);

  const handleExportCSV = () => {
    if (!currentStudy) return;
    const csvRows: string[] = [];
    csvRows.push(`"Market Study","${currentStudy.title}"`);
    csvRows.push(`"Workspace","${currentStudy.workspace}"`);
    csvRows.push(`"Period","${currentStudy.period}"`);
    csvRows.push(`"Last Updated","${currentStudy.lastUpdated}"`);
    csvRows.push('');
    csvRows.push('"SECTION 1: Market Observations"');
    csvRows.push('"Observation","Evidence","Region","Confidence","Date Recorded"');
    currentStudy.observations.forEach((obs) => {
      csvRows.push(
        `"${obs.observation.replace(/"/g, '""')}","${obs.evidence}","${obs.region}","${obs.confidence}","${obs.dateRecorded}"`
      );
    });

    csvRows.push('');
    csvRows.push('"SECTION 2: Customer Needs"');
    csvRows.push('"Need","Segment","Evidence Source","Priority","Owner"');
    currentStudy.customerNeeds.forEach((cn) => {
      csvRows.push(
        `"${cn.need.replace(/"/g, '""')}","${cn.segment}","${cn.evidenceSource}","${cn.priority}","${cn.owner}"`
      );
    });

    csvRows.push('');
    csvRows.push('"SECTION 3: Competitor Comparison"');
    csvRows.push('"Competitor","Positioning","Price Level","Main Offer","Strengths","Weaknesses","Last Reviewed"');
    currentStudy.competitors.forEach((comp) => {
      csvRows.push(
        `"${comp.competitor}","${comp.positioning}","${comp.priceLevel}","${comp.mainOffer.replace(/"/g, '""')}","${comp.strengths.replace(/"/g, '""')}","${comp.weaknesses.replace(/"/g, '""')}","${comp.lastReviewed}"`
      );
    });

    csvRows.push('');
    csvRows.push('"SECTION 4: Pricing Observations"');
    csvRows.push('"Category","Observation","Evidence","Impact"');
    currentStudy.pricingObservations.forEach((pr) => {
      csvRows.push(
        `"${pr.category}","${pr.observation.replace(/"/g, '""')}","${pr.evidence}","${pr.impact}"`
      );
    });

    csvRows.push('');
    csvRows.push('"SECTION 5: Source References"');
    csvRows.push('"Source","Type","Date","Notes","Reliability"');
    currentStudy.sourceReferences.forEach((src) => {
      csvRows.push(
        `"${src.source}","${src.type}","${src.date}","${src.notes}","${src.reliability}"`
      );
    });

    csvRows.push('');
    csvRows.push('"SECTION 6: Recorded Findings"');
    csvRows.push('"Finding","Status","Date"');
    currentStudy.recordedFindings.forEach((rf) => {
      csvRows.push(
        `"${rf.finding.replace(/"/g, '""')}","${rf.status}","${rf.date}"`
      );
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${currentStudy.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenEdit = () => {
    if (!currentStudy) return;
    setEditTitle(currentStudy.title);
    setEditPeriod(currentStudy.period);
    setEditStatus(currentStudy.status);
    setEditDesc(currentStudy.overviewDescription);
    setIsEditStudyModalOpen(true);
  };

  const handleSaveEditStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !currentStudy || !workspaceId) return;

    setIsSubmitting(true);
    try {
      let backendStatus: ResearchStatus = 'In Progress';
      if (editStatus === 'Completed') backendStatus = 'Completed';
      else if (editStatus === 'Draft') backendStatus = 'Planned';
      else if (editStatus === 'Archived') backendStatus = 'Archived';

      await researchService.update(
        workspaceId,
        currentStudy.id,
        {
          name: editTitle.trim(),
          status: backendStatus,
          description: editDesc.trim() || undefined,
        }
      );

      await fetchStudies();
      setIsEditStudyModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update study.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudyTitle.trim() || !workspaceId) return;

    setIsSubmitting(true);
    try {
      let backendStatus: ResearchStatus = 'In Progress';
      if (newStudyStatus === 'Completed') backendStatus = 'Completed';
      else if (newStudyStatus === 'Draft') backendStatus = 'Planned';
      else if (newStudyStatus === 'Archived') backendStatus = 'Archived';

      const created = await researchService.create(
        workspaceId,
        {
          name: newStudyTitle.trim(),
          category: 'Market Research',
          status: backendStatus,
          description: newStudyDesc.trim() || undefined,
          starts_on: new Date().toISOString().split('T')[0],
          competitor_profiles: [],
          opportunities: [],
          threats: [],
          findings: [],
          swot: [],
          sources: [],
        }
      );

      await fetchStudies();
      setSelectedStudyId(created.id);
      setIsNewStudyModalOpen(false);
      setNewStudyTitle('');
      setNewStudyDesc('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create study.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudy = async () => {
    if (!currentStudy || !workspaceId) return;

    setIsSubmitting(true);
    try {
      await researchService.delete(workspaceId, currentStudy.id);
      await fetchStudies();
      setIsDeleteModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete study.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFindingText.trim() || !currentStudy || !workspaceId) return;

    setIsSubmitting(true);
    try {
      const raw = rawRecords.find((r) => r.id === currentStudy.id);
      const existingFindings: FindingBackend[] = raw?.findings || [];
      const updatedFindings: FindingBackend[] = [
        ...existingFindings,
        {
          title: newFindingText.trim().slice(0, 60),
          insight: newFindingText.trim(),
        },
      ];

      await researchService.update(
        workspaceId,
        currentStudy.id,
        { findings: updatedFindings }
      );

      await fetchStudies();
      setNewFindingText('');
      setIsAddFindingModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add finding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadFile || !currentStudy || !workspaceId) return;

    setIsSubmitting(true);
    try {
      const raw = rawRecords.find((r) => r.id === currentStudy.id);
      const existingSources: SourceBackend[] = raw?.sources || [];
      const updatedSources: SourceBackend[] = [
        ...existingSources,
        {
          title: selectedUploadFile.name,
          url: `document://${selectedUploadFile.name}`,
          accessed_on: new Date().toISOString().split('T')[0],
        },
      ];

      await researchService.update(
        workspaceId,
        currentStudy.id,
        { sources: updatedSources }
      );

      await fetchStudies();
      setSelectedUploadFile(null);
      setIsUploadDocModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record document source.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <span className="hover:text-[#1E1B4B] cursor-pointer">Management</span>
        <span>/</span>
        <span className="text-[#1E1B4B] font-medium">Market Research</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-[28px] font-bold text-[#1E1B4B] tracking-tight">
            Market Research
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Track structured market studies, competitor evidence and customer insights for {workspaceName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewStudyModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New study</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchStudies}
            className="px-3 py-1 bg-white border border-rose-200 rounded-md font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center shadow-xs flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#6D28D9] animate-spin mb-3" />
          <p className="text-sm font-semibold text-[#1E1B4B]">Loading research studies...</p>
          <p className="text-xs text-[#64748B] mt-1">Retrieving workspace research records</p>
        </div>
      )}

      {/* Empty state when no studies exist */}
      {!loading && studies.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center shadow-xs">
          <Folder className="w-12 h-12 text-[#6D28D9]/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#1E1B4B]">No Market Studies Yet</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1 mb-5">
            Start structuring competitor benchmarks, market observations, and strategic findings for {workspaceName}.
          </p>
          <button
            type="button"
            onClick={() => setIsNewStudyModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create First Study</span>
          </button>
        </div>
      )}

      {/* Main Container when studies exist */}
      {!loading && studies.length > 0 && currentStudy && (
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* LEFT PANEL: Saved studies */}
          <aside className="w-full lg:w-[260px] shrink-0 bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#F1F5F9]">
              <h2 className="text-xs font-bold text-[#1E1B4B] uppercase tracking-wider">
                Saved studies ({studies.length})
              </h2>
              <button
                type="button"
                onClick={() => setIsNewStudyModalOpen(true)}
                className="p-1 text-[#64748B] hover:text-[#6D28D9] hover:bg-[#F5F3FF] rounded transition-colors cursor-pointer"
                title="Add study"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick search input */}
            <div className="px-3 py-2 border-b border-[#F1F5F9]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter studies..."
                  className="w-full pl-8 pr-2 py-1 text-xs rounded border border-[#E2E8F0] focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
                />
              </div>
            </div>

            <div className="divide-y divide-[#F1F5F9] max-h-[600px] overflow-y-auto">
              {filteredStudies.map((study) => {
                const isSelected = study.id === currentStudy.id;
                return (
                  <div
                    key={study.id}
                    onClick={() => setSelectedStudyId(study.id)}
                    className={`p-3.5 cursor-pointer transition-all border-l-[3px] ${
                      isSelected
                        ? 'bg-[#F5F3FF] border-[#6D28D9]'
                        : 'border-transparent hover:bg-slate-50/70'
                    }`}
                  >
                    <h3
                      className={`text-xs font-semibold leading-snug line-clamp-2 ${
                        isSelected ? 'text-[#6D28D9]' : 'text-[#1E1B4B]'
                      }`}
                    >
                      {study.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2.5">
                      {renderStudyStatusBadge(study.status)}
                      <span className="text-[11px] text-[#94A3B8] font-medium">
                        {study.lastUpdated}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredStudies.length === 0 && (
                <div className="p-4 text-center text-xs text-[#94A3B8]">
                  No matching studies found.
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT AREA: Selected study details */}
          <div className="flex-1 min-w-0 space-y-6 w-full">
            {/* Header Card for Selected Study */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 pb-5 border-b border-[#F1F5F9]">
                {/* Study Title & Subtitle */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0 mt-0.5">
                    <Folder className="w-5 h-5 fill-[#6D28D9]/20" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg lg:text-xl font-bold text-[#1E1B4B]">
                        {currentStudy.title}
                      </h2>
                      {renderStudyStatusBadge(currentStudy.status)}
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      In {currentStudy.workspace}
                    </p>
                  </div>
                </div>

                {/* Study Metadata Row */}
                <div className="flex items-center gap-6 text-xs text-[#64748B] flex-wrap">
                  {/* Owner */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center text-[10px] font-bold">
                      {currentStudy.owner.initials}
                    </div>
                    <div>
                      <span className="block text-[11px] text-[#94A3B8] leading-none">
                        Owner
                      </span>
                      <span className="text-xs font-semibold text-[#1E1B4B]">
                        {currentStudy.owner.name}
                      </span>
                    </div>
                  </div>

                  <div className="h-7 w-px bg-[#E2E8F0]" />

                  {/* Period */}
                  <div>
                    <span className="block text-[11px] text-[#94A3B8] leading-none">
                      Period
                    </span>
                    <span className="text-xs font-semibold text-[#1E1B4B]">
                      {currentStudy.period}
                    </span>
                  </div>

                  <div className="h-7 w-px bg-[#E2E8F0]" />

                  {/* Evidence */}
                  <div>
                    <span className="block text-[11px] text-[#94A3B8] leading-none">
                      Evidence
                    </span>
                    <span className="text-xs font-semibold text-[#1E1B4B]">
                      {currentStudy.evidenceCount} Evidence items
                    </span>
                  </div>

                  <div className="h-7 w-px bg-[#E2E8F0]" />

                  {/* Last updated */}
                  <div>
                    <span className="block text-[11px] text-[#94A3B8] leading-none">
                      Last updated
                    </span>
                    <span className="text-xs font-semibold text-[#1E1B4B]">
                      {currentStudy.lastUpdated}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-bar: Tabs & Action Buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto border-b md:border-b-0 border-[#F1F5F9] pb-2 md:pb-0">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === tab
                          ? 'bg-[#F5F3FF] text-[#6D28D9] font-bold'
                          : 'text-[#64748B] hover:text-[#1E1B4B] hover:bg-slate-50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddFindingModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#6D28D9]" />
                    <span>Add Finding</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUploadDocModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Upload Document</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-xs font-medium text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer"
                    title="Delete Study"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TAB CONTENT */}
            <div className="space-y-6">
              {/* ROW 1: Study Overview (1/3) + Market Observations (2/3) */}
              {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Card: Study overview */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight mb-3">
                        Study overview
                      </h3>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        {currentStudy.overviewDescription}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 pt-4 mt-6 border-t border-[#F1F5F9] text-xs font-semibold text-[#6D28D9]">
                      <a
                        href="/projects"
                        className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>Projects</span>
                      </a>
                      <a
                        href="/audiences"
                        className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Audiences</span>
                      </a>
                      <a
                        href="/campaigns"
                        className="flex items-center gap-1.5 hover:text-[#5B21B6] transition-colors"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Campaigns</span>
                      </a>
                    </div>
                  </div>

                  {/* Card: Market observations */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                        Market observations ({currentStudy.observations.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('Overview')}
                        className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                            <th className="pb-2.5 font-medium">Observation</th>
                            <th className="pb-2.5 font-medium">Evidence</th>
                            <th className="pb-2.5 font-medium">Region</th>
                            <th className="pb-2.5 font-medium">Confidence</th>
                            <th className="pb-2.5 font-medium text-right">Date recorded</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {currentStudy.observations.map((obs) => (
                            <tr key={obs.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 text-[#1E1B4B] font-medium max-w-xs pr-4">
                                {obs.observation}
                              </td>
                              <td className="py-3 text-[#64748B] whitespace-nowrap">
                                {obs.evidence}
                              </td>
                              <td className="py-3 text-[#64748B] whitespace-nowrap">
                                {obs.region}
                              </td>
                              <td className="py-3 whitespace-nowrap">
                                {renderConfidenceBadge(obs.confidence)}
                              </td>
                              <td className="py-3 text-[#94A3B8] text-right whitespace-nowrap">
                                {obs.dateRecorded}
                              </td>
                            </tr>
                          ))}
                          {currentStudy.observations.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-xs text-[#94A3B8]">
                                No market observations recorded for this study.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ROW 2: Customer Needs & Competitor comparison */}
              {(activeTab === 'Overview' || activeTab === 'Customer Needs' || activeTab === 'Competitors') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Customer needs */}
                  {(activeTab === 'Overview' || activeTab === 'Customer Needs') && (
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                          Customer needs ({currentStudy.customerNeeds.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab('Customer Needs')}
                          className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>View all</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mb-4">
                        Customer needs linked to market insights.
                      </p>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                              <th className="pb-2.5 font-medium">Need</th>
                              <th className="pb-2.5 font-medium">Segment</th>
                              <th className="pb-2.5 font-medium">Evidence Source</th>
                              <th className="pb-2.5 font-medium">Priority</th>
                              <th className="pb-2.5 font-medium text-right">Owner</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {currentStudy.customerNeeds.map((need) => (
                              <tr key={need.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 text-[#1E1B4B] font-medium pr-3">
                                  {need.need}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                  {need.segment}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                  {need.evidenceSource}
                                </td>
                                <td className="py-2.5 whitespace-nowrap">
                                  {renderPriorityBadge(need.priority)}
                                </td>
                                <td className="py-2.5 text-right whitespace-nowrap">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D28D9] text-[10px] font-bold">
                                    {need.owner}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {currentStudy.customerNeeds.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-xs text-[#94A3B8]">
                                  No customer needs recorded.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Competitor comparison */}
                  {(activeTab === 'Overview' || activeTab === 'Competitors') && (
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                          Competitor comparison ({currentStudy.competitors.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab('Competitors')}
                          className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>View all</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                              <th className="pb-2.5 font-medium">Competitor</th>
                              <th className="pb-2.5 font-medium">Positioning</th>
                              <th className="pb-2.5 font-medium">Price</th>
                              <th className="pb-2.5 font-medium">Main Offer</th>
                              <th className="pb-2.5 font-medium">Strengths</th>
                              <th className="pb-2.5 font-medium">Weaknesses</th>
                              <th className="pb-2.5 font-medium text-right">Reviewed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {currentStudy.competitors.map((comp) => (
                              <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-semibold text-[#1E1B4B] whitespace-nowrap">
                                  {comp.competitor}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                  {comp.positioning}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                  {comp.priceLevel}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                  {comp.mainOffer}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap max-w-[120px] truncate" title={comp.strengths}>
                                  {comp.strengths || '—'}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap max-w-[120px] truncate" title={comp.weaknesses}>
                                  {comp.weaknesses || '—'}
                                </td>
                                <td className="py-2.5 text-[#94A3B8] text-right whitespace-nowrap">
                                  {comp.lastReviewed}
                                </td>
                              </tr>
                            ))}
                            {currentStudy.competitors.length === 0 && (
                              <tr>
                                <td colSpan={7} className="py-6 text-center text-xs text-[#94A3B8]">
                                  No competitor comparisons recorded.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ROW 3: Pricing observations + Source references + Recorded findings */}
              {(activeTab === 'Overview' || activeTab === 'Pricing' || activeTab === 'Sources' || activeTab === 'Findings') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Pricing observations */}
                  {(activeTab === 'Overview' || activeTab === 'Pricing') && (
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                          Pricing observations ({currentStudy.pricingObservations.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab('Pricing')}
                          className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>View all</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                              <th className="pb-2.5 font-medium">Category</th>
                              <th className="pb-2.5 font-medium">Observation</th>
                              <th className="pb-2.5 font-medium">Evidence</th>
                              <th className="pb-2.5 font-medium text-right">Impact</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {currentStudy.pricingObservations.map((pr) => (
                              <tr key={pr.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-medium text-[#1E1B4B] whitespace-nowrap pr-2">
                                  {pr.category}
                                </td>
                                <td className="py-2.5 text-[#64748B] text-[11px] pr-2">
                                  {pr.observation}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap pr-2">
                                  {pr.evidence}
                                </td>
                                <td className="py-2.5 text-right whitespace-nowrap">
                                  {pr.impact === 'High' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
                                      High
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                                      Medium
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {currentStudy.pricingObservations.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-xs text-[#94A3B8]">
                                  No pricing observations recorded.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Source references */}
                  {(activeTab === 'Overview' || activeTab === 'Sources') && (
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                          Source references ({currentStudy.sourceReferences.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab('Sources')}
                          className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>View all</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                              <th className="pb-2.5 font-medium">Source</th>
                              <th className="pb-2.5 font-medium">Type</th>
                              <th className="pb-2.5 font-medium">Date</th>
                              <th className="pb-2.5 font-medium">Notes</th>
                              <th className="pb-2.5 font-medium text-right">Reliability</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {currentStudy.sourceReferences.map((src) => (
                              <tr key={src.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-medium text-[#1E1B4B] flex items-center gap-1.5 whitespace-nowrap pr-2">
                                  <FileText className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                                  <span className="truncate max-w-[110px]">{src.source}</span>
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap pr-2">
                                  {src.type}
                                </td>
                                <td className="py-2.5 text-[#94A3B8] whitespace-nowrap pr-2">
                                  {src.date}
                                </td>
                                <td className="py-2.5 text-[#64748B] text-[11px] whitespace-nowrap pr-2">
                                  {src.notes}
                                </td>
                                <td className="py-2.5 text-right whitespace-nowrap">
                                  {src.reliability === 'High' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
                                      High
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                                      Medium
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {currentStudy.sourceReferences.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-xs text-[#94A3B8]">
                                  No source references recorded. Click "Upload Document" to add.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recorded findings */}
                  {(activeTab === 'Overview' || activeTab === 'Findings') && (
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                          Recorded findings ({currentStudy.recordedFindings.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab('Findings')}
                          className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>View all</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                              <th className="pb-2.5 font-medium">Finding</th>
                              <th className="pb-2.5 font-medium">Status</th>
                              <th className="pb-2.5 font-medium text-right">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {currentStudy.recordedFindings.map((rf) => (
                              <tr key={rf.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 text-[#1E1B4B] font-medium pr-2 text-[11px] leading-snug">
                                  {rf.finding}
                                </td>
                                <td className="py-2.5 whitespace-nowrap pr-2">
                                  {renderFindingStatusBadge(rf.status)}
                                </td>
                                <td className="py-2.5 text-[#94A3B8] text-right whitespace-nowrap">
                                  {rf.date}
                                </td>
                              </tr>
                            ))}
                            {currentStudy.recordedFindings.length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-6 text-center text-xs text-[#94A3B8]">
                                  No recorded findings yet. Click "Add Finding" to record one.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: New study */}
      {isNewStudyModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="new-study-modal-title">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 id="new-study-modal-title" className="text-base font-bold text-[#1E1B4B]">Create New Market Study</h3>
              <button
                type="button"
                onClick={() => setIsNewStudyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewStudy} className="space-y-4 pt-4">
              <div>
                <label htmlFor="new-study-title" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Study Title *
                </label>
                <input
                  id="new-study-title"
                  type="text"
                  required
                  value={newStudyTitle}
                  onChange={(e) => setNewStudyTitle(e.target.value)}
                  placeholder="e.g. Morocco Retail Market – Autumn 2026"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new-study-period" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Period
                  </label>
                  <input
                    id="new-study-period"
                    type="text"
                    value={newStudyPeriod}
                    onChange={(e) => setNewStudyPeriod(e.target.value)}
                    placeholder="e.g. October 2026"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label htmlFor="new-study-status" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Status
                  </label>
                  <select
                    id="new-study-status"
                    value={newStudyStatus}
                    onChange={(e) => setNewStudyStatus(e.target.value as StudyStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="new-study-desc" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Study Overview & Objective
                </label>
                <textarea
                  id="new-study-desc"
                  rows={3}
                  value={newStudyDesc}
                  onChange={(e) => setNewStudyDesc(e.target.value)}
                  placeholder="Detail the research scope, questions and goals..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsNewStudyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] disabled:bg-[#A78BFA] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Study</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit study */}
      {isEditStudyModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-study-modal-title">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 id="edit-study-modal-title" className="text-base font-bold text-[#1E1B4B]">Edit Study Details</h3>
              <button
                type="button"
                onClick={() => setIsEditStudyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudy} className="space-y-4 pt-4">
              <div>
                <label htmlFor="edit-study-title" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Study Title *
                </label>
                <input
                  id="edit-study-title"
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-study-period" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Period
                  </label>
                  <input
                    id="edit-study-period"
                    type="text"
                    value={editPeriod}
                    onChange={(e) => setEditPeriod(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-study-status" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                    Status
                  </label>
                  <select
                    id="edit-study-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as StudyStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-study-desc" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Study Overview & Objective
                </label>
                <textarea
                  id="edit-study-desc"
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsEditStudyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] disabled:bg-[#A78BFA] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation */}
      {isDeleteModalOpen && currentStudy && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-study-modal-title">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 id="delete-study-modal-title" className="text-base font-bold text-rose-600">Delete Study</h3>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pt-4 space-y-3">
              <p className="text-xs text-[#1E1B4B]">
                Are you sure you want to delete <span className="font-semibold text-rose-600">{currentStudy.title}</span>? This action will permanently remove this research study and cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStudy}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Delete Permanently</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Finding */}
      {isAddFindingModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-finding-modal-title">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 id="add-finding-modal-title" className="text-base font-bold text-[#1E1B4B]">Add Market Finding</h3>
              <button
                type="button"
                onClick={() => setIsAddFindingModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFinding} className="space-y-4 pt-4">
              <div>
                <label htmlFor="new-finding-text" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Finding Summary *
                </label>
                <textarea
                  id="new-finding-text"
                  rows={3}
                  required
                  value={newFindingText}
                  onChange={(e) => setNewFindingText(e.target.value)}
                  placeholder="e.g. In-store digital payments increased by 40% in tier-1 supermarkets..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                />
              </div>

              <div>
                <label htmlFor="new-finding-status" className="block text-xs font-semibold text-[#1E1B4B] mb-1">
                  Status
                </label>
                <select
                  id="new-finding-status"
                  value={newFindingStatus}
                  onChange={(e) => setNewFindingStatus(e.target.value as FindingStatus)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                >
                  <option value="New">New</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Ready">Ready</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsAddFindingModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] disabled:bg-[#A78BFA] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Finding</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Upload Document */}
      {isUploadDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E1B4B]/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="upload-doc-modal-title">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9]">
              <h3 id="upload-doc-modal-title" className="text-base font-bold text-[#1E1B4B]">Upload Research Document</h3>
              <button
                type="button"
                onClick={() => setIsUploadDocModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-[#94A3B8] hover:text-[#1E1B4B] cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4">
              <div>
                <label htmlFor="upload-doc-file" className="block text-xs font-semibold text-[#1E1B4B] mb-2">
                  Select Document / Evidence File
                </label>
                <input
                  id="upload-doc-file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#DDD6FE] hover:border-[#6D28D9] bg-[#F8F7FC] rounded-xl p-6 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-8 h-8 text-[#6D28D9] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#1E1B4B]">
                    {selectedUploadFile
                      ? selectedUploadFile.name
                      : 'Click to select a local research file'}
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    {selectedUploadFile
                      ? `${(selectedUploadFile.size / 1024).toFixed(1)} KB`
                      : 'PDF, DOCX, XLSX, CSV or Image files'}
                  </p>
                </div>
              </div>

              <div className="bg-[#EDE9FE]/50 rounded-lg p-3 text-[11px] text-[#6D28D9]">
                Document will be cataloged in this study's Source references.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsUploadDocModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedUploadFile || isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#6D28D9] disabled:bg-slate-300 hover:bg-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Upload & Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
