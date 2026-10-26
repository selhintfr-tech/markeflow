import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
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
  type ResearchInput,
  type FindingBackend,
  type SourceBackend,
} from './researchService';
import { validateCompetitor, type CompetitorFieldErrors } from './researchCompetitorValidation';
import { ApiError } from '../api/apiClient';
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

type ResearchCompetitor = Omit<CompetitorComparison, 'priceLevel'> & {
  priceLevel: PriceLevel | 'Not recorded';
  price?: number | string | null;
  currency?: string | null;
  region?: string | null;
  city?: string | null;
  website?: string | null;
  evidence?: string | null;
};
type ResearchObservation = Omit<MarketObservation, 'confidence'> & {
  confidence: ConfidenceLevel | 'Not recorded';
  origin: 'opportunity' | 'threat' | 'notes';
};
type ResearchNeed = Omit<CustomerNeed, 'priority' | 'owner'> & {
  priority: NeedPriority | 'Not recorded';
  owner: string;
};
type ResearchPricingObservation = Omit<PricingObservation, 'impact'> & {
  impact: PricingObservation['impact'] | 'Not recorded';
  price?: number | string | null;
  currency?: string | null;
};
type ResearchSource = Omit<SourceReference, 'reliability'> & {
  reliability: ReliabilityLevel | 'Not recorded';
  url: string;
};
type ResearchStudy = Omit<MarketStudy, 'observations' | 'customerNeeds' | 'competitors' | 'pricingObservations' | 'sourceReferences'> & {
  observations: ResearchObservation[];
  customerNeeds: ResearchNeed[];
  competitors: ResearchCompetitor[];
  pricingObservations: ResearchPricingObservation[];
  sourceReferences: ResearchSource[];
};
type ResearchSectionNotes = {
  customerNeeds: Array<Record<string, unknown>>;
  pricingObservations: Array<Record<string, unknown>>;
  observations: Array<Record<string, unknown>>;
};
type ResearchEntrySection = 'competitor' | 'customerNeed' | 'pricing' | 'source' | 'observation';
type ResearchEntryDraft = {
  section: ResearchEntrySection;
  index: number | null;
  values: Record<string, string>;
  readOnly: boolean;
};
type ResearchEntryField = {
  name: string;
  label: string;
  kind?: 'text' | 'textarea' | 'date' | 'url' | 'number' | 'select';
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

const researchEntryFields: Record<ResearchEntrySection, ResearchEntryField[]> = {
  competitor: [
    { name: 'name', label: 'Competitor name', required: true },
    { name: 'positioning', label: 'Market positioning', kind: 'textarea' },
    { name: 'price_level', label: 'Price level', kind: 'select', options: ['', 'Low', 'Medium', 'High'] },
    { name: 'price', label: 'Actual price', kind: 'number', placeholder: 'Only enter a verified price' },
    { name: 'currency', label: 'Currency (ISO code)', placeholder: 'e.g. MAD, USD' },
    { name: 'main_offer', label: 'Main offer', kind: 'textarea' },
    { name: 'strengths', label: 'Strengths (one per line)', kind: 'textarea' },
    { name: 'weaknesses', label: 'Weaknesses (one per line)', kind: 'textarea' },
    { name: 'region', label: 'Region' },
    { name: 'city', label: 'City' },
    { name: 'reviewed_on', label: 'Review date', kind: 'date' },
    { name: 'website', label: 'Website', kind: 'url' },
    { name: 'evidence', label: 'Evidence URL', kind: 'url' },
  ],
  customerNeed: [
    { name: 'need', label: 'Customer need', kind: 'textarea', required: true },
    { name: 'segment', label: 'Customer segment' },
    { name: 'evidenceSource', label: 'Evidence source', kind: 'textarea' },
    { name: 'priority', label: 'Priority', kind: 'select', options: ['', 'High', 'Medium', 'Low'] },
    { name: 'owner', label: 'Owner initials' },
  ],
  pricing: [
    { name: 'category', label: 'Category', required: true },
    { name: 'observation', label: 'Pricing observation', kind: 'textarea', required: true },
    { name: 'evidence', label: 'Evidence', kind: 'textarea' },
    { name: 'price', label: 'Observed price', kind: 'number' },
    { name: 'currency', label: 'Currency (ISO code)', placeholder: 'e.g. MAD, USD' },
    { name: 'impact', label: 'Impact', kind: 'select', options: ['', 'High', 'Medium', 'Low'] },
  ],
  source: [
    { name: 'title', label: 'Source title', required: true },
    { name: 'url', label: 'Source URL', kind: 'url', required: true },
    { name: 'type', label: 'Source type' },
    { name: 'accessed_on', label: 'Accessed on', kind: 'date' },
    { name: 'notes', label: 'Notes', kind: 'textarea' },
    { name: 'reliability', label: 'Reliability', kind: 'select', options: ['', 'High', 'Medium', 'Low'] },
  ],
  observation: [
    { name: 'observation', label: 'Observation', kind: 'textarea', required: true },
    { name: 'evidence', label: 'Evidence', kind: 'textarea' },
    { name: 'region', label: 'Region or city' },
    { name: 'confidence', label: 'Confidence', kind: 'select', options: ['', 'High', 'Medium', 'Low'] },
    { name: 'recorded_on', label: 'Date recorded', kind: 'date' },
  ],
};

const emptyResearchSectionNotes = (): ResearchSectionNotes => ({
  customerNeeds: [],
  pricingObservations: [],
  observations: [],
});

function parseResearchSectionNotes(notes: string | null): ResearchSectionNotes {
  if (!notes) return emptyResearchSectionNotes();
  try {
    const parsed: unknown = JSON.parse(notes);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyResearchSectionNotes();
    const record = parsed as Record<string, unknown>;
    return {
      customerNeeds: Array.isArray(record.customerNeeds) ? record.customerNeeds as Array<Record<string, unknown>> : [],
      pricingObservations: Array.isArray(record.pricingObservations) ? record.pricingObservations as Array<Record<string, unknown>> : [],
      observations: Array.isArray(record.observations) ? record.observations as Array<Record<string, unknown>> : [],
    };
  } catch {
    return emptyResearchSectionNotes();
  }
}

function researchNotePayload(previousNotes: string | null, sections: ResearchSectionNotes): string {
  let existing: Record<string, unknown> = {};
  if (previousNotes) {
    try {
      const parsed: unknown = JSON.parse(previousNotes);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) existing = parsed as Record<string, unknown>;
      else existing = { legacyNotes: previousNotes };
    } catch {
      existing = { legacyNotes: previousNotes };
    }
  }
  return JSON.stringify({ ...existing, ...sections, marketflowResearchSectionsVersion: 1 });
}

function newResearchEntryId(): string {
  return globalThis.crypto?.randomUUID?.() || `research-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mapRecordToStudy(r: ResearchRecord, workspaceName: string): ResearchStudy {
  let status: StudyStatus = 'Active';
  if (r.status === 'Completed') status = 'Completed';
  else if (r.status === 'Planned') status = 'Draft';
  else if (r.status === 'Archived') status = 'Archived';
  else if (r.status === 'In Progress') status = 'Active';

  const competitors: ResearchCompetitor[] = (r.competitor_profiles || []).map((cp, idx) => ({
    id: cp.id || `comp-${r.id}-${idx}`,
    competitor: cp.name,
    positioning: cp.positioning || cp.description || '',
    priceLevel: cp.price_level || 'Not recorded',
    price: cp.price,
    currency: cp.currency,
    mainOffer: cp.main_offer || '',
    website: cp.website,
    evidence: cp.evidence,
    region: cp.region,
    city: cp.city,
    strengths: Array.isArray(cp.strengths) ? cp.strengths.join(', ') : '',
    weaknesses: Array.isArray(cp.weaknesses) ? cp.weaknesses.join(', ') : '',
    lastReviewed: cp.reviewed_on ? new Date(`${cp.reviewed_on}T00:00:00`).toLocaleDateString() : '',
  }));

  const recordedFindings: RecordedFinding[] = (r.findings || []).map((f, idx) => ({
    id: `rf-${r.id}-${idx}`,
    finding: mapFindingSummary(f),
    status: toFindingStatus(f.status),
    date: '',
  }));

  const sourceReferences: ResearchSource[] = (r.sources || []).map((s, idx) => ({
    id: s.id || `src-${r.id}-${idx}`,
    source: s.title,
    type: s.type || '',
    date: s.accessed_on ? new Date(`${s.accessed_on}T00:00:00`).toLocaleDateString() : '',
    notes: s.notes || '',
    url: s.url,
    reliability: s.reliability || 'Not recorded',
  }));

  const notesData = parseResearchSectionNotes(r.notes);
  const observations: ResearchObservation[] = [
    ...(r.opportunities || []).map<ResearchObservation>((op, idx) => ({
      id: op.id || `obs-op-${r.id}-${idx}`,
      observation: op.title,
      evidence: op.description || '',
      region: op.region || '',
      confidence: isConfidenceLevel(op.confidence) ? op.confidence : 'Not recorded',
      dateRecorded: op.recorded_on ? new Date(`${op.recorded_on}T00:00:00`).toLocaleDateString() : '',
      origin: 'opportunity' as const,
    })),
    ...(r.threats || []).map<ResearchObservation>((th, idx) => ({
      id: th.id || `obs-th-${r.id}-${idx}`,
      observation: th.title,
      evidence: th.description || '',
      region: th.region || '',
      confidence: isConfidenceLevel(th.confidence) ? th.confidence : 'Not recorded',
      dateRecorded: th.recorded_on ? new Date(`${th.recorded_on}T00:00:00`).toLocaleDateString() : '',
      origin: 'threat' as const,
    })),
    ...notesData.observations.map<ResearchObservation>((observation, idx) => ({
      id: typeof observation.id === 'string' ? observation.id : `obs-note-${r.id}-${idx}`,
      observation: typeof observation.observation === 'string' ? observation.observation : '',
      evidence: typeof observation.evidence === 'string' ? observation.evidence : '',
      region: typeof observation.region === 'string' ? observation.region : '',
      confidence: isConfidenceLevel(observation.confidence) ? observation.confidence : 'Not recorded',
      dateRecorded: typeof observation.dateRecorded === 'string' ? observation.dateRecorded : '',
      origin: 'notes' as const,
    })),
  ];

  const customerNeeds: ResearchNeed[] = notesData.customerNeeds.map((need, idx) => ({
    id: typeof need.id === 'string' ? need.id : `need-${r.id}-${idx}`,
    need: typeof need.need === 'string' ? need.need : '',
    segment: typeof need.segment === 'string' ? need.segment : '',
    evidenceSource: typeof need.evidenceSource === 'string' ? need.evidenceSource : '',
    priority: isNeedPriority(need.priority) ? need.priority : 'Not recorded',
    owner: typeof need.owner === 'string' ? need.owner : '',
  }));
  const pricingObservations: ResearchPricingObservation[] = notesData.pricingObservations.map((pricing, idx) => ({
    id: typeof pricing.id === 'string' ? pricing.id : `pricing-${r.id}-${idx}`,
    category: typeof pricing.category === 'string' ? pricing.category : '',
    observation: typeof pricing.observation === 'string' ? pricing.observation : '',
    evidence: typeof pricing.evidence === 'string' ? pricing.evidence : '',
    impact: isImpactLevel(pricing.impact) ? pricing.impact : 'Not recorded',
    price: typeof pricing.price === 'number' || typeof pricing.price === 'string' ? pricing.price : null,
    currency: typeof pricing.currency === 'string' ? pricing.currency : null,
  }));

  return {
    id: r.id,
    title: r.name,
    workspace: workspaceName,
    status,
    owner: {
      name: 'Research owner unavailable',
      initials: '—',
      email: '',
      role: '—',
    },
    period: r.starts_on ? `${r.starts_on}${r.ends_on ? ` – ${r.ends_on}` : ''}` : 'Not recorded',
    evidenceCount: competitors.length + recordedFindings.length + sourceReferences.length + observations.length,
    lastUpdated: r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'Recent',
    overviewDescription: r.description || 'No study overview has been recorded.',
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

function isConfidenceLevel(value: unknown): value is ConfidenceLevel {
  return value === 'High' || value === 'Medium' || value === 'Low';
}

function isNeedPriority(value: unknown): value is NeedPriority {
  return value === 'High' || value === 'Medium' || value === 'Low';
}

function isImpactLevel(value: unknown): value is PricingObservation['impact'] {
  return value === 'High' || value === 'Medium' || value === 'Low';
}

function mapFindingSummary(finding: FindingBackend): string {
  const title = finding.title?.trim() || '';
  const insight = finding.insight?.trim() || '';
  if (!title) return insight;
  if (!insight) return title;
  if (insight.startsWith(title)) return insight;
  return `${title}: ${insight}`;
}

function toFindingStatus(status?: string): FindingStatus {
  switch (status) {
    case 'New':
    case 'Reviewed':
    case 'Ready':
    case 'Archived':
      return status;
    default:
      return 'Ready';
  }
}

export const MarketResearchPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? '';
  const workspaceName = currentWorkspace?.name ?? 'Atlas Retail SARL';

  const [rawRecords, setRawRecords] = useState<ResearchRecord[]>([]);
  const [studies, setStudies] = useState<ResearchStudy[]>([]);
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
  const [editingFindingIndex, setEditingFindingIndex] = useState<number | null>(null);
  const [entryDraft, setEntryDraft] = useState<ResearchEntryDraft | null>(null);
  const [entryFieldErrors, setEntryFieldErrors] = useState<CompetitorFieldErrors>({});
  const [entrySaveError, setEntrySaveError] = useState<string | null>(null);


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

  const renderConfidenceBadge = (confidence: ConfidenceLevel | 'Not recorded') => {
    if (confidence === 'Not recorded') return <span className="text-[#94A3B8]">Not recorded</span>;
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

  const renderPriorityBadge = (priority: NeedPriority | 'Not recorded') => {
    if (priority === 'Not recorded') return <span className="text-[#94A3B8]">Not recorded</span>;
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
        else if (isDeleteModalOpen) setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewStudyModalOpen, isEditStudyModalOpen, isAddFindingModalOpen, isDeleteModalOpen, entryDraft]);

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
    const summary = newFindingText.trim();
    if (!summary || !currentStudy || !workspaceId) return;

    setIsSubmitting(true);
    try {
      const raw = rawRecords.find((r) => r.id === currentStudy.id);
      const updatedFindings: FindingBackend[] = [...(raw?.findings || [])];
      const finding: FindingBackend = { title: '', insight: summary, status: newFindingStatus };
      if (editingFindingIndex === null) updatedFindings.push(finding);
      else updatedFindings[editingFindingIndex] = finding;

      await researchService.update(
        workspaceId,
        currentStudy.id,
        { findings: updatedFindings }
      );

      await fetchStudies();
      setNewFindingText('');
      setNewFindingStatus('New');
      setEditingFindingIndex(null);
      setIsAddFindingModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add finding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFinding = async (index: number) => {
    if (!currentStudy || !workspaceId || !window.confirm('Delete this finding from the selected study?')) return;
    const raw = rawRecords.find((record) => record.id === currentStudy.id);
    if (!raw) return;
    setIsSubmitting(true);
    try {
      await researchService.update(workspaceId, currentStudy.id, {
        findings: (raw.findings || []).filter((_, findingIndex) => findingIndex !== index),
      });
      await fetchStudies();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete finding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResearchEntry = (section: ResearchEntrySection, index: number | null = null, readOnly = false) => {
    if (!currentStudy) return;
    const raw = rawRecords.find((record) => record.id === currentStudy.id);
    let values: Record<string, string> = {};
    if (index !== null) {
      switch (section) {
        case 'competitor': {
          const item = raw?.competitor_profiles?.[index];
          if (item) values = {
            name: item.name,
            positioning: item.positioning || item.description || '',
            price_level: item.price_level || '',
            price: item.price === null || item.price === undefined ? '' : String(item.price),
            currency: item.currency || '',
            main_offer: item.main_offer || '',
            strengths: (item.strengths || []).join('\n'),
            weaknesses: (item.weaknesses || []).join('\n'),
            region: item.region || '',
            city: item.city || '',
            reviewed_on: item.reviewed_on || '',
            website: item.website || '',
            evidence: item.evidence || '',
          };
          break;
        }
        case 'customerNeed': {
          const item = currentStudy.customerNeeds[index];
          if (item) values = {
            need: item.need,
            segment: item.segment,
            evidenceSource: item.evidenceSource,
            priority: item.priority === 'Not recorded' ? '' : item.priority,
            owner: item.owner,
          };
          break;
        }
        case 'pricing': {
          const item = currentStudy.pricingObservations[index];
          if (item) values = {
            category: item.category,
            observation: item.observation,
            evidence: item.evidence,
            price: item.price === null || item.price === undefined ? '' : String(item.price),
            currency: item.currency || '',
            impact: item.impact === 'Not recorded' ? '' : item.impact,
          };
          break;
        }
        case 'source': {
          const item = raw?.sources?.[index];
          if (item) values = {
            title: item.title,
            url: item.url,
            type: item.type || '',
            accessed_on: item.accessed_on || '',
            notes: item.notes || '',
            reliability: item.reliability || '',
          };
          break;
        }
        case 'observation': {
          const item = currentStudy.observations[index];
          if (!item) break;
          if (item.origin === 'opportunity' || item.origin === 'threat') {
            const key = item.origin === 'opportunity' ? 'opportunities' : 'threats';
            const matchingIndex = currentStudy.observations.slice(0, index).filter((observation) => observation.origin === item.origin).length;
            const backendItem = raw?.[key]?.[matchingIndex];
            values = {
              observation: backendItem?.title || item.observation,
              evidence: backendItem?.description || '',
              region: backendItem?.region || '',
              confidence: backendItem?.confidence || '',
              recorded_on: backendItem?.recorded_on || '',
            };
          } else {
            const matchingIndex = currentStudy.observations.slice(0, index).filter((observation) => observation.origin === 'notes').length;
            const noteItem = parseResearchSectionNotes(raw?.notes || null).observations[matchingIndex];
            values = {
              observation: typeof noteItem?.observation === 'string' ? noteItem.observation : item.observation,
              evidence: typeof noteItem?.evidence === 'string' ? noteItem.evidence : '',
              region: typeof noteItem?.region === 'string' ? noteItem.region : '',
              confidence: isConfidenceLevel(noteItem?.confidence) ? noteItem.confidence : '',
              recorded_on: typeof noteItem?.recorded_on === 'string' ? noteItem.recorded_on : '',
            };
          }
          break;
        }
      }
    }
    setEntryFieldErrors({});
    setEntrySaveError(null);
    setEntryDraft({ section, index, values, readOnly });
  };

  const saveResearchEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!entryDraft) return;
    setEntryFieldErrors({});
    setEntrySaveError(null);
    if (!currentStudy || !workspaceId) {
      setEntrySaveError('Select a study and workspace before saving this competitor.');
      return;
    }
    const raw = rawRecords.find((record) => record.id === currentStudy.id);
    if (!raw) {
      setEntrySaveError('The selected study is no longer available. Refresh the study list and try again.');
      return;
    }
    const values = entryDraft.values;
    const index = entryDraft.index;
    if (entryDraft.section === 'competitor') {
      const validation = validateCompetitor(values);
      if (Object.keys(validation).length > 0) {
        setEntryFieldErrors(validation);
        setEntrySaveError('Review the highlighted competitor fields before saving.');
        return;
      }
    }
    const splitLines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    let patch: Partial<ResearchInput> = {};
    switch (entryDraft.section) {
      case 'competitor': {
        const old = index === null ? undefined : raw.competitor_profiles[index];
        const competitor = {
          ...(old || {}),
          id: old?.id || newResearchEntryId(),
          name: values.name.trim(),
          website: values.website.trim() || null,
          description: old?.description || values.positioning.trim() || null,
          positioning: values.positioning.trim() || null,
          price_level: values.price_level ? values.price_level as 'Low' | 'Medium' | 'High' : null,
          price: values.price ? Number(values.price) : null,
          currency: values.currency.trim().toUpperCase() || null,
          main_offer: values.main_offer.trim() || null,
          strengths: splitLines(values.strengths),
          weaknesses: splitLines(values.weaknesses),
          region: values.region.trim() || null,
          city: values.city.trim() || null,
          reviewed_on: values.reviewed_on || null,
          evidence: values.evidence.trim() || null,
        };
        const records = [...(raw.competitor_profiles || [])];
        if (index === null) records.push(competitor);
        else records[index] = competitor;
        patch = { competitor_profiles: records };
        break;
      }
      case 'customerNeed': {
        const notes = parseResearchSectionNotes(raw.notes);
        const records = [...notes.customerNeeds];
        const item = {
          ...(index === null ? {} : records[index]),
          id: (index === null ? undefined : records[index]?.id) || newResearchEntryId(),
          need: values.need.trim(),
          segment: values.segment.trim(),
          evidenceSource: values.evidenceSource.trim(),
          priority: values.priority || null,
          owner: values.owner.trim(),
        };
        if (index === null) records.push(item);
        else records[index] = item;
        patch = { notes: researchNotePayload(raw.notes, { ...notes, customerNeeds: records }) };
        break;
      }
      case 'pricing': {
        const notes = parseResearchSectionNotes(raw.notes);
        const records = [...notes.pricingObservations];
        const item = {
          ...(index === null ? {} : records[index]),
          id: (index === null ? undefined : records[index]?.id) || newResearchEntryId(),
          category: values.category.trim(),
          observation: values.observation.trim(),
          evidence: values.evidence.trim(),
          price: values.price ? Number(values.price) : null,
          currency: values.currency.trim().toUpperCase() || null,
          impact: values.impact || null,
        };
        if (index === null) records.push(item);
        else records[index] = item;
        patch = { notes: researchNotePayload(raw.notes, { ...notes, pricingObservations: records }) };
        break;
      }
      case 'source': {
        const existing = raw.sources || [];
        const sources = [...existing];
        const item: SourceBackend = {
          ...(index === null ? {} : sources[index]),
          id: (index === null ? undefined : sources[index]?.id) || newResearchEntryId(),
          title: values.title.trim(),
          url: values.url.trim(),
          type: values.type.trim() || null,
          accessed_on: values.accessed_on || null,
          notes: values.notes.trim() || null,
          reliability: values.reliability ? values.reliability as 'High' | 'Medium' | 'Low' : null,
        };
        if (index === null) sources.push(item);
        else sources[index] = item;
        patch = { sources };
        break;
      }
      case 'observation': {
        const notes = parseResearchSectionNotes(raw.notes);
        const existing = index === null ? undefined : currentStudy.observations[index];
        const valuesRecord = {
          ...(index === null ? {} : {}),
          id: existing?.id || newResearchEntryId(),
          title: values.observation.trim(),
          observation: values.observation.trim(),
          description: values.evidence.trim() || null,
          evidence: values.evidence.trim(),
          region: values.region.trim() || null,
          confidence: values.confidence ? values.confidence as ConfidenceLevel : null,
          recorded_on: values.recorded_on || null,
          dateRecorded: values.recorded_on || '',
        };
        const opportunities = [...(raw.opportunities || [])];
        const threats = [...(raw.threats || [])];
        if (!existing || existing.origin === 'notes') {
          const records = [...notes.observations];
          const matchingIndex = index === null ? -1 : currentStudy.observations.slice(0, index).filter((observation) => observation.origin === 'notes').length;
          const note = {
            id: valuesRecord.id,
            observation: valuesRecord.observation,
            evidence: valuesRecord.evidence,
            region: valuesRecord.region,
            confidence: valuesRecord.confidence,
            dateRecorded: valuesRecord.dateRecorded,
            recorded_on: valuesRecord.recorded_on,
          };
          if (matchingIndex < 0) records.push(note);
          else records[matchingIndex] = note;
          patch = { notes: researchNotePayload(raw.notes, { ...notes, observations: records }) };
        } else {
          const source = existing.origin === 'opportunity' ? opportunities : threats;
          const matchingIndex = currentStudy.observations.slice(0, index!).filter((observation) => observation.origin === existing.origin).length;
          const old = source[matchingIndex];
          source[matchingIndex] = {
            ...(old || {}),
            id: old?.id || existing.id,
            title: valuesRecord.title,
            description: valuesRecord.description,
            region: valuesRecord.region,
            confidence: valuesRecord.confidence,
            recorded_on: valuesRecord.recorded_on,
          };
          patch = existing.origin === 'opportunity'
            ? { opportunities }
            : { threats };
        }
        break;
      }
    }
    setIsSubmitting(true);
    try {
      await researchService.update(workspaceId, currentStudy.id, patch);
      await fetchStudies();
      setEntryDraft(null);
    } catch (err) {
      if (entryDraft.section === 'competitor' && err instanceof ApiError && err.errors) {
        const fieldErrors: CompetitorFieldErrors = {};
        for (const [field, messages] of Object.entries(err.errors)) {
          const match = field.match(/^competitor_profiles\.\d+\.([a-z_]+)$/);
          if (match && messages[0]) fieldErrors[match[1]] = messages[0];
        }
        setEntryFieldErrors(fieldErrors);
        setEntrySaveError(Object.keys(fieldErrors).length > 0
          ? 'The server rejected one or more competitor fields. Review the highlighted fields.'
          : err.message);
      } else {
        setEntrySaveError(err instanceof Error ? err.message : 'Failed to save research record.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCompetitor = async (index: number) => {
    if (!currentStudy || !workspaceId) {
      setError('Select a study and workspace before deleting a competitor.');
      return;
    }
    const raw = rawRecords.find((record) => record.id === currentStudy.id);
    if (!raw) {
      setError('The selected study is no longer available. Refresh the study list and try again.');
      return;
    }
    const competitor = raw.competitor_profiles[index];
    if (!competitor || !window.confirm(`Delete "${competitor.name}" from this study?`)) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await researchService.update(workspaceId, currentStudy.id, {
        competitor_profiles: raw.competitor_profiles.filter((_, itemIndex) => itemIndex !== index),
      });
      await fetchStudies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete competitor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteResearchEntry = async () => {
    if (!entryDraft || entryDraft.index === null || !currentStudy || !workspaceId) return;
    const raw = rawRecords.find((record) => record.id === currentStudy.id);
    if (!raw) return;
    const index = entryDraft.index;
    const titles: Record<ResearchEntrySection, string> = {
      competitor: currentStudy.competitors[index]?.competitor || 'this competitor',
      customerNeed: currentStudy.customerNeeds[index]?.need || 'this customer need',
      pricing: currentStudy.pricingObservations[index]?.category || 'this pricing observation',
      source: currentStudy.sourceReferences[index]?.source || 'this source',
      observation: currentStudy.observations[index]?.observation || 'this observation',
    };
    if (!window.confirm(`Delete "${titles[entryDraft.section]}" from this study?`)) return;
    let patch: Partial<ResearchInput> = {};
    switch (entryDraft.section) {
      case 'competitor':
        patch = { competitor_profiles: (raw.competitor_profiles || []).filter((_, itemIndex) => itemIndex !== index) };
        break;
      case 'customerNeed': {
        const notes = parseResearchSectionNotes(raw.notes);
        patch = { notes: researchNotePayload(raw.notes, { ...notes, customerNeeds: notes.customerNeeds.filter((_, itemIndex) => itemIndex !== index) }) };
        break;
      }
      case 'pricing': {
        const notes = parseResearchSectionNotes(raw.notes);
        patch = { notes: researchNotePayload(raw.notes, { ...notes, pricingObservations: notes.pricingObservations.filter((_, itemIndex) => itemIndex !== index) }) };
        break;
      }
      case 'source':
        patch = { sources: (raw.sources || []).filter((_, itemIndex) => itemIndex !== index) };
        break;
      case 'observation': {
        const existing = currentStudy.observations[index];
        if (existing.origin === 'opportunity') {
          const itemIndex = currentStudy.observations.slice(0, index).filter((observation) => observation.origin === 'opportunity').length;
          patch = { opportunities: (raw.opportunities || []).filter((_, arrayIndex) => arrayIndex !== itemIndex) };
        } else if (existing.origin === 'threat') {
          const itemIndex = currentStudy.observations.slice(0, index).filter((observation) => observation.origin === 'threat').length;
          patch = { threats: (raw.threats || []).filter((_, arrayIndex) => arrayIndex !== itemIndex) };
        } else {
          const notes = parseResearchSectionNotes(raw.notes);
          const itemIndex = currentStudy.observations.slice(0, index).filter((observation) => observation.origin === 'notes').length;
          patch = { notes: researchNotePayload(raw.notes, { ...notes, observations: notes.observations.filter((_, arrayIndex) => arrayIndex !== itemIndex) }) };
        }
        break;
      }
    }
    setIsSubmitting(true);
    try {
      await researchService.update(workspaceId, currentStudy.id, patch);
      await fetchStudies();
      setEntryDraft(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete research record.');
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
                    onClick={() => {
                      setSelectedStudyId(study.id);
                      setEntryDraft(null);
                      setIsAddFindingModalOpen(false);
                      setEditingFindingIndex(null);
                    }}
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
                   onClick={() => {
                     setEditingFindingIndex(null);
                     setNewFindingText('');
                     setNewFindingStatus('New');
                     setIsAddFindingModalOpen(true);
                   }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#6D28D9]" />
                    <span>Add Finding</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openResearchEntry('source')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#1E1B4B] hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Add Source</span>
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
                  <div id="market-observations" className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                        Market observations ({currentStudy.observations.length})
                      </h3>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => document.getElementById('market-observations')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer">
                          <span>View all</span><ArrowRight className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => openResearchEntry('observation')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6]">
                          <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                      </div>
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
                            <th className="pb-2.5 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {currentStudy.observations.map((obs, index) => (
                            <tr key={obs.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 text-[#1E1B4B] font-medium max-w-xs pr-4 whitespace-normal break-words">
                                {obs.observation}
                              </td>
                              <td className="py-3 text-[#64748B] whitespace-normal break-words">
                                {obs.evidence || '—'}
                              </td>
                              <td className="py-3 text-[#64748B] whitespace-normal break-words">
                                {obs.region || '—'}
                              </td>
                              <td className="py-3 whitespace-nowrap">
                                {renderConfidenceBadge(obs.confidence)}
                              </td>
                              <td className="py-3 text-[#94A3B8] text-right whitespace-nowrap">
                                {obs.dateRecorded || '—'}
                              </td>
                              <td className="py-3 text-right whitespace-nowrap">
                                <button type="button" onClick={() => openResearchEntry('observation', index, true)} className="px-1 text-[#6D28D9] hover:underline">View</button>
                                <button type="button" onClick={() => openResearchEntry('observation', index)} className="px-1 text-[#6D28D9] hover:underline">Edit</button>
                                <button type="button" onClick={() => openResearchEntry('observation', index)} className="px-1 text-rose-600 hover:underline">Delete</button>
                              </td>
                            </tr>
                          ))}
                          {currentStudy.observations.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-xs text-[#94A3B8]">
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
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setActiveTab('Customer Needs')} className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer">
                            <span>View all</span><ArrowRight className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => openResearchEntry('customerNeed')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6]">
                            <Plus className="h-3.5 w-3.5" /> Add
                          </button>
                        </div>
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
                              {activeTab === 'Customer Needs' && <th className="pb-2.5 text-right font-medium">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {currentStudy.customerNeeds.map((need, index) => (
                              <tr key={need.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 text-[#1E1B4B] font-medium pr-3 whitespace-normal break-words">
                                  {need.need}
                                </td>
                                <td className="py-2.5 text-[#64748B]">
                                  {need.segment || '—'}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-normal break-words">
                                  {need.evidenceSource || '—'}
                                </td>
                                <td className="py-2.5 whitespace-nowrap">
                                  {renderPriorityBadge(need.priority)}
                                </td>
                                <td className="py-2.5 text-right whitespace-nowrap">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D28D9] text-[10px] font-bold">
                                    {need.owner || '—'}
                                  </span>
                                </td>
                                {activeTab === 'Customer Needs' && <td className="py-2.5 text-right whitespace-nowrap">
                                  <button type="button" aria-label={`View customer need ${need.need}`} onClick={() => openResearchEntry('customerNeed', index, true)} className="px-1 text-[#6D28D9] hover:underline">View</button>
                                  <button type="button" aria-label={`Edit customer need ${need.need}`} onClick={() => openResearchEntry('customerNeed', index)} className="px-1 text-[#6D28D9] hover:underline">Edit</button>
                                  <button type="button" aria-label={`Delete customer need ${need.need}`} onClick={() => openResearchEntry('customerNeed', index)} className="px-1 text-rose-600 hover:underline">Delete</button>
                                </td>}
                              </tr>
                            ))}
                            {currentStudy.customerNeeds.length === 0 && (
                              <tr>
                                <td colSpan={activeTab === 'Customer Needs' ? 6 : 5} className="py-6 text-center text-xs text-[#94A3B8]">
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
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setActiveTab('Competitors')} className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer">
                            <span>View all</span><ArrowRight className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => openResearchEntry('competitor')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6]">
                            <Plus className="h-3.5 w-3.5" /> Add competitor
                          </button>
                        </div>
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
                              {activeTab === 'Competitors' && <th className="pb-2.5 text-right font-medium">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {currentStudy.competitors.map((comp, index) => (
                              <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-semibold text-[#1E1B4B] whitespace-nowrap">
                                  {comp.competitor}
                                </td>
                                <td className="py-2.5 text-[#64748B] max-w-[180px] whitespace-normal break-words">
                                  {comp.positioning || '—'}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap">
                                  {comp.price !== null && comp.price !== undefined
                                    ? `${Number(comp.price).toLocaleString()} ${comp.currency || ''}`.trim()
                                    : comp.priceLevel === 'Not recorded' ? '—' : comp.priceLevel}
                                </td>
                                <td className="py-2.5 text-[#64748B] max-w-[180px] whitespace-normal break-words">
                                  {comp.mainOffer || '—'}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap max-w-[120px] truncate" title={comp.strengths}>
                                  {comp.strengths || '—'}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap max-w-[120px] truncate" title={comp.weaknesses}>
                                  {comp.weaknesses || '—'}
                                </td>
                                <td className="py-2.5 text-[#94A3B8] text-right whitespace-nowrap">
                                  {comp.lastReviewed || '—'}
                                </td>
                                {activeTab === 'Competitors' && <td className="py-2.5 text-right whitespace-nowrap">
                                  <button type="button" onClick={() => openResearchEntry('competitor', index, true)} className="px-1 text-[#6D28D9] hover:underline">View</button>
                                  <button type="button" onClick={() => openResearchEntry('competitor', index)} className="px-1 text-[#6D28D9] hover:underline">Edit</button>
                                  <button type="button" disabled={isSubmitting} onClick={() => void deleteCompetitor(index)} className="px-1 text-rose-600 hover:underline disabled:opacity-50">Delete</button>
                                </td>}
                              </tr>
                            ))}
                            {currentStudy.competitors.length === 0 && (
                              <tr>
                                <td colSpan={activeTab === 'Competitors' ? 8 : 7} className="py-6 text-center text-xs text-[#94A3B8]">
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
                <div className={activeTab === 'Findings' ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
                  {/* Pricing observations */}
                  {(activeTab === 'Overview' || activeTab === 'Pricing') && (
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-[#1E1B4B] tracking-tight">
                          Pricing observations ({currentStudy.pricingObservations.length})
                        </h3>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setActiveTab('Pricing')} className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer">
                            <span>View all</span><ArrowRight className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => openResearchEntry('pricing')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6]">
                            <Plus className="h-3.5 w-3.5" /> Add
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                              <th className="pb-2.5 font-medium">Category</th>
                              <th className="pb-2.5 font-medium">Observation</th>
                              <th className="pb-2.5 font-medium">Observed price</th>
                              <th className="pb-2.5 font-medium">Evidence</th>
                              <th className="pb-2.5 font-medium text-right">Impact</th>
                              {activeTab === 'Pricing' && <th className="pb-2.5 text-right font-medium">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {currentStudy.pricingObservations.map((pr, index) => (
                              <tr key={pr.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-medium text-[#1E1B4B] whitespace-nowrap pr-2">
                                  {pr.category}
                                </td>
                                <td className="py-2.5 text-[#64748B] text-[11px] pr-2 whitespace-normal break-words">
                                  {pr.observation}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap pr-2">
                                  {pr.price !== null && pr.price !== undefined ? `${Number(pr.price).toLocaleString()} ${pr.currency || ''}`.trim() : '—'}
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-normal break-words pr-2">
                                  {pr.evidence || '—'}
                                </td>
                                <td className="py-2.5 text-right whitespace-nowrap">
                                  {pr.impact === 'High' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
                                      High
                                    </span>
                                  ) : pr.impact === 'Medium' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                                      Medium
                                    </span>
                                  ) : pr.impact === 'Low' ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">Low</span> : '—'}
                                </td>
                                {activeTab === 'Pricing' && <td className="py-2.5 text-right whitespace-nowrap">
                                  <button type="button" onClick={() => openResearchEntry('pricing', index, true)} className="px-1 text-[#6D28D9] hover:underline">View</button>
                                  <button type="button" onClick={() => openResearchEntry('pricing', index)} className="px-1 text-[#6D28D9] hover:underline">Edit</button>
                                  <button type="button" onClick={() => openResearchEntry('pricing', index)} className="px-1 text-rose-600 hover:underline">Delete</button>
                                </td>}
                              </tr>
                            ))}
                            {currentStudy.pricingObservations.length === 0 && (
                              <tr>
                                <td colSpan={activeTab === 'Pricing' ? 6 : 5} className="py-6 text-center text-xs text-[#94A3B8]">
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
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setActiveTab('Sources')} className="text-xs font-medium text-[#6D28D9] hover:text-[#5B21B6] inline-flex items-center gap-1 transition-colors cursor-pointer">
                            <span>View all</span><ArrowRight className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => openResearchEntry('source')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:text-[#5B21B6]">
                            <Plus className="h-3.5 w-3.5" /> Add
                          </button>
                        </div>
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
                              {activeTab === 'Sources' && <th className="pb-2.5 text-right font-medium">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {currentStudy.sourceReferences.map((src, index) => (
                              <tr key={src.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 font-medium text-[#1E1B4B] flex items-center gap-1.5 whitespace-nowrap pr-2">
                                  <FileText className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                                  <span className="truncate max-w-[110px]">{src.source}</span>
                                </td>
                                <td className="py-2.5 text-[#64748B] whitespace-nowrap pr-2">
                                  {src.type || '—'}
                                </td>
                                <td className="py-2.5 text-[#94A3B8] whitespace-nowrap pr-2">
                                  {src.date || '—'}
                                </td>
                                <td className="py-2.5 text-[#64748B] text-[11px] whitespace-normal break-words pr-2">
                                  {src.notes || src.url || '—'}
                                </td>
                                <td className="py-2.5 text-right whitespace-nowrap">
                                  {src.reliability === 'High' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#CCFBF1] text-[#0D9488]">
                                      High
                                    </span>
                                  ) : src.reliability === 'Medium' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                                      Medium
                                    </span>
                                  ) : src.reliability === 'Low' ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B]">Low</span> : '—'}
                                </td>
                                {activeTab === 'Sources' && <td className="py-2.5 text-right whitespace-nowrap">
                                  <button type="button" onClick={() => openResearchEntry('source', index, true)} className="px-1 text-[#6D28D9] hover:underline">View</button>
                                  <button type="button" onClick={() => openResearchEntry('source', index)} className="px-1 text-[#6D28D9] hover:underline">Edit</button>
                                  <button type="button" onClick={() => openResearchEntry('source', index)} className="px-1 text-rose-600 hover:underline">Delete</button>
                                </td>}
                              </tr>
                            ))}
                            {currentStudy.sourceReferences.length === 0 && (
                              <tr>
                                <td colSpan={activeTab === 'Sources' ? 6 : 5} className="py-6 text-center text-xs text-[#94A3B8]">
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
                        <table className="w-full table-fixed text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#F1F5F9] text-[11px] font-semibold text-[#94A3B8]">
                              <th className={`${activeTab === 'Findings' ? 'w-[68%]' : 'w-[72%]'} pb-2.5 font-medium`}>Finding</th>
                              <th className="w-[14%] pb-2.5 font-medium">Status</th>
                              <th className="w-[14%] pb-2.5 font-medium text-right">Date</th>
                              {activeTab === 'Findings' && <th className="w-[4%] pb-2.5 font-medium"><span className="sr-only">Actions</span></th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {currentStudy.recordedFindings.map((rf, index) => (
                              <tr key={rf.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 text-[#1E1B4B] font-medium pr-3 text-[11px] leading-snug whitespace-normal break-words [overflow-wrap:anywhere]">
                                  {rf.finding}
                                </td>
                                <td className="py-2.5 whitespace-nowrap pr-2">
                                  {renderFindingStatusBadge(rf.status)}
                                </td>
                                <td className="py-2.5 text-[#94A3B8] text-right whitespace-nowrap">
                                  {rf.date || '—'}
                                </td>
                                {activeTab === 'Findings' && <td className="w-12 py-2.5 text-right">
                                  <button
                                    type="button"
                                    aria-label={`Edit finding ${index + 1}`}
                                    onClick={() => {
                                      setEditingFindingIndex(index);
                                      setNewFindingText(rf.finding);
                                      setNewFindingStatus(rf.status);
                                      setIsAddFindingModalOpen(true);
                                    }}
                                    className="rounded-md p-1.5 text-[#64748B] hover:bg-[#F3F0FF] hover:text-[#6D28D9]"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" aria-label={`Delete finding ${index + 1}`} onClick={() => void handleDeleteFinding(index)} className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>}
                              </tr>
                            ))}
                            {currentStudy.recordedFindings.length === 0 && (
                              <tr>
                                <td colSpan={activeTab === 'Findings' ? 4 : 3} className="py-6 text-center text-xs text-[#94A3B8]">
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
              <h3 id="add-finding-modal-title" className="text-base font-bold text-[#1E1B4B]">{editingFindingIndex === null ? 'Add Market Finding' : 'Edit Market Finding'}</h3>
              <button
                type="button"
                onClick={() => { setIsAddFindingModalOpen(false); setEditingFindingIndex(null); }}
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
                  maxLength={5000}
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
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => { setIsAddFindingModalOpen(false); setEditingFindingIndex(null); }}
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
                  <span>{editingFindingIndex === null ? 'Add Finding' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {entryDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B4B]/40 p-4" role="dialog" aria-modal="true" aria-labelledby="research-entry-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <h3 id="research-entry-title" className="text-base font-bold text-[#1E1B4B]">
                {entryDraft.readOnly ? 'Research record details' : entryDraft.index === null ? 'Add ' : 'Edit '}
                {entryDraft.section === 'competitor' ? 'Competitor' : entryDraft.section === 'customerNeed' ? 'Customer Need' : entryDraft.section === 'pricing' ? 'Pricing Observation' : entryDraft.section === 'source' ? 'Source Reference' : 'Market Observation'}
              </h3>
              <button type="button" onClick={() => setEntryDraft(null)} className="rounded p-1 text-[#94A3B8] hover:bg-slate-100" aria-label="Close research record">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form noValidate={entryDraft.section === 'competitor'} onSubmit={(event) => void saveResearchEntry(event)} className="space-y-4">
              {entrySaveError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{entrySaveError}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {researchEntryFields[entryDraft.section].map((field) => {
                  const fieldId = `research-entry-${field.name}`;
                  const value = entryDraft.values[field.name] || '';
                  const sharedClass = 'w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#1E1B4B] focus:border-[#6D28D9] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 disabled:bg-slate-50';
                  return (
                    <label key={field.name} htmlFor={fieldId} className={`block text-xs font-semibold text-[#1E1B4B] ${field.kind === 'textarea' ? 'sm:col-span-2' : ''}`}>
                      {field.label}
                      {field.kind === 'textarea' ? (
                        <textarea id={fieldId} required={field.required} disabled={entryDraft.readOnly || isSubmitting} aria-invalid={Boolean(entryFieldErrors[field.name])} aria-describedby={entryFieldErrors[field.name] ? `${fieldId}-error` : undefined} rows={3} maxLength={5000} value={value} onChange={(event) => { setEntryDraft((draft) => draft ? { ...draft, values: { ...draft.values, [field.name]: event.target.value } } : draft); setEntryFieldErrors((errors) => ({ ...errors, [field.name]: '' })); }} className={`${sharedClass} mt-1 ${entryFieldErrors[field.name] ? 'border-rose-500' : ''}`} />
                      ) : field.kind === 'select' ? (
                        <select id={fieldId} required={field.required} disabled={entryDraft.readOnly || isSubmitting} aria-invalid={Boolean(entryFieldErrors[field.name])} aria-describedby={entryFieldErrors[field.name] ? `${fieldId}-error` : undefined} value={value} onChange={(event) => { setEntryDraft((draft) => draft ? { ...draft, values: { ...draft.values, [field.name]: event.target.value } } : draft); setEntryFieldErrors((errors) => ({ ...errors, [field.name]: '' })); }} className={`${sharedClass} mt-1 bg-white ${entryFieldErrors[field.name] ? 'border-rose-500' : ''}`}>
                          {(field.options || []).map((option) => <option key={option || 'none'} value={option}>{option || 'Not recorded'}</option>)}
                        </select>
                      ) : (
                        <input id={fieldId} type={field.kind === 'url' && entryDraft.section === 'competitor' ? 'text' : field.kind || 'text'} required={field.required} disabled={entryDraft.readOnly || isSubmitting} min={field.kind === 'number' ? 0 : undefined} step={field.kind === 'number' ? 'any' : undefined} maxLength={field.name === 'currency' ? 3 : undefined} pattern={field.name === 'currency' ? '[A-Za-z]{3}' : undefined} placeholder={field.placeholder} value={value} aria-invalid={Boolean(entryFieldErrors[field.name])} aria-describedby={entryFieldErrors[field.name] ? `${fieldId}-error` : undefined} onChange={(event) => { setEntryDraft((draft) => draft ? { ...draft, values: { ...draft.values, [field.name]: event.target.value } } : draft); setEntryFieldErrors((errors) => ({ ...errors, [field.name]: '' })); }} className={`${sharedClass} mt-1 ${entryFieldErrors[field.name] ? 'border-rose-500' : ''}`} />
                      )}
                      {entryFieldErrors[field.name] && <span id={`${fieldId}-error`} role="alert" className="mt-1 block font-normal text-rose-700">{entryFieldErrors[field.name]}</span>}
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F5F9] pt-3">
                <div>
                  {entryDraft.index !== null && !entryDraft.readOnly && <button type="button" disabled={isSubmitting} onClick={() => void deleteResearchEntry()} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEntryDraft(null)} className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-slate-50">{entryDraft.readOnly ? 'Close' : 'Cancel'}</button>
                  {!entryDraft.readOnly && <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5 rounded-lg bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-50">
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {isSubmitting ? 'Saving…' : 'Save'}
                  </button>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
