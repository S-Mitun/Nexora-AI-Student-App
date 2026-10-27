import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Download,
  Plus,
  RefreshCw,
  Archive,
  ChevronDown,
  ChevronUp,
  History,
  Sparkles,
  Info,
  Shield,
  Layers,
  X,
  Eye,
  BookOpen,
  ListChecks,
  Check,
  Quote,
  Target,
  Lock,
  GraduationCap,
  GitBranch,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { CurriculumReviewModal } from '../components/syllabus/CurriculumReviewModal';
import { apiService } from '../services/api';
import { Syllabus, SyllabusVersion, SyllabusCurriculumDraft, SyllabusProcessingJob } from '../types/syllabus';
import { formatISTDate, formatISTDateTime } from '../utils/dateUtils';
import { useAcademicContext } from '../context/AcademicContext';
import { useSyllabus } from '../context/SyllabusContext';

export const SyllabusPage: React.FC = () => {
  const { academicContext, refreshAcademicContext } = useAcademicContext();
  const { refreshSyllabusState } = useSyllabus();
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Form States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [syllabusTitle, setSyllabusTitle] = useState('');
  const [targetSyllabusId, setTargetSyllabusId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedSyllabusId, setExpandedSyllabusId] = useState<string | null>(null);

  // Document Understanding & Curriculum Draft States (Master Prompt 03R)
  const [analyzingVersionId, setAnalyzingVersionId] = useState<string | null>(null);
  const [processingJobs, setProcessingJobs] = useState<Record<string, SyllabusProcessingJob>>({});
  const [reviewDraft, setReviewDraft] = useState<SyllabusCurriculumDraft | null>(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [activeDraftVersion, setActiveDraftVersion] = useState<{ syllabusId: string; version: SyllabusVersion } | null>(null);
  const [isCompilingDraft, setIsCompilingDraft] = useState(false);
  const [compilationSuccessMsg, setCompilationSuccessMsg] = useState<string | null>(null);

  // Phase 6: Visible Cancel Active Curriculum State
  const [deactivatingTarget, setDeactivatingTarget] = useState<{ syllabusId: string; versionId: string } | null>(null);
  const [isDeactivatingTarget, setIsDeactivatingTarget] = useState(false);
  const [deactivateTargetError, setDeactivateTargetError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSyllabi = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSyllabi();
      setSyllabi(data);
      if (data.length > 0 && !expandedSyllabusId) {
        setExpandedSyllabusId(data[0].id);
      }
      setError(null);
      refreshSyllabusState().catch(() => {});
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load syllabus records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyllabi();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadError(null);
      if (!syllabusTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setSyllabusTitle(cleanName);
      }
    }
  };

  const openUploadModal = (forSyllabusId: string | null = null) => {
    setTargetSyllabusId(forSyllabusId);
    setSelectedFile(null);
    setSyllabusTitle('');
    setUploadError(null);
    setUploadStatusMsg(null);
    setIsUploadModalOpen(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a syllabus file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadStatusMsg('Uploading syllabus file...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      if (targetSyllabusId) {
        setUploadStatusMsg('Processing new syllabus version...');
        const res = await apiService.uploadSyllabusVersion(targetSyllabusId, formData);
        setUploadStatusMsg(res.message);
      } else {
        formData.append('title', syllabusTitle.trim() || selectedFile.name);
        setUploadStatusMsg('Processing syllabus...');
        const res = await apiService.uploadSyllabus(formData);
        setUploadStatusMsg(res.message);
      }

      await loadSyllabi();
      await refreshSyllabusState();
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setIsUploading(false);
        setUploadStatusMsg(null);
      }, 1000);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Unable to process this syllabus. Please try again.');
      setIsUploading(false);
    }
  };

  const handleActivateVersion = async (syllabusId: string, versionId: string) => {
    try {
      await apiService.activateSyllabusVersion(syllabusId, versionId);
      await loadSyllabi();
      await refreshSyllabusState();
      await refreshAcademicContext().catch(() => {});
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not activate syllabus version.');
    }
  };

  const handleArchiveVersion = async (syllabusId: string, versionId: string) => {
    if (!confirm('Are you sure you want to archive this version?')) return;
    try {
      await apiService.archiveSyllabusVersion(syllabusId, versionId);
      await loadSyllabi();
      await refreshSyllabusState();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not archive syllabus version.');
    }
  };

  const handleDeleteSyllabus = async (syllabusId: string) => {
    if (!confirm('Are you sure you want to delete this syllabus and its complete version history?')) return;
    try {
      await apiService.deleteSyllabus(syllabusId);
      setSyllabi((prev) => prev.filter((s) => s.id !== syllabusId));
      await refreshSyllabusState();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not delete syllabus.');
    }
  };

  const handleConfirmTargetDeactivation = async () => {
    if (!deactivatingTarget) return;
    try {
      setIsDeactivatingTarget(true);
      setDeactivateTargetError(null);
      await apiService.deactivateCurriculum(deactivatingTarget.syllabusId, deactivatingTarget.versionId);
      setDeactivatingTarget(null);
      await loadSyllabi();
      await refreshSyllabusState();
      await refreshAcademicContext().catch(() => {});
    } catch (err: any) {
      setDeactivateTargetError(err.response?.data?.detail || 'Failed to cancel active curriculum.');
    } finally {
      setIsDeactivatingTarget(false);
    }
  };

  const handleDownload = async (syllabusId: string, version: SyllabusVersion) => {
    try {
      const filename = version.source_filename || `syllabus_v${version.version_number}.pdf`;
      await apiService.downloadSyllabusFile(syllabusId, version.id, filename);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download syllabus file.');
    }
  };

  const handleTriggerProcess = async (sylId: string, verId: string, force: boolean = false) => {
    try {
      setAnalyzingVersionId(verId);
      const job = await apiService.triggerSyllabusProcessing(sylId, verId, force);
      setProcessingJobs((prev) => ({ ...prev, [verId]: job }));

      const pollInterval = setInterval(async () => {
        try {
          const status = await apiService.getSyllabusProcessingStatus(sylId, verId);
          setProcessingJobs((prev) => ({ ...prev, [verId]: status }));

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setAnalyzingVersionId(null);
            await loadSyllabi();
            await refreshSyllabusState();
            handleOpenDraftReview(sylId, verId);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setAnalyzingVersionId(null);
            alert(status.error_message || 'Syllabus document extraction encountered an error.');
            await loadSyllabi();
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          setAnalyzingVersionId(null);
        }
      }, 1500);
    } catch (err: any) {
      setAnalyzingVersionId(null);
      alert(err.response?.data?.detail || 'Failed to start syllabus document analysis.');
    }
  };

  const handleOpenDraftReview = async (sylId: string, verId: string) => {
    const syl = syllabi.find((s) => s.id === sylId);
    const ver = syl?.versions.find((v) => v.id === verId);
    if (syl && ver) {
      setActiveDraftVersion({ syllabusId: sylId, version: ver });
    }
    setIsDraftModalOpen(true);
    setLoadingDraft(true);
    setDraftError(null);
    try {
      const draft = await apiService.getSyllabusCurriculumDraft(sylId, verId);
      setReviewDraft(draft);
      if (draft.subjects.length > 0 && draft.subjects[0].modules.length > 0) {
        setExpandedModuleId(draft.subjects[0].modules[0].id);
      }
    } catch (err: any) {
      setDraftError(err.response?.data?.detail || 'Could not load curriculum draft. Please process the syllabus first.');
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleCompileDraft = async (sylId: string, verId: string) => {
    try {
      setIsCompilingDraft(true);
      setCompilationSuccessMsg(null);
      setDraftError(null);
      const res = await apiService.compileSyllabusCurriculumDraft(sylId, verId);
      const updatedDraft = await apiService.getSyllabusCurriculumDraft(sylId, verId);
      setReviewDraft(updatedDraft);
      setCompilationSuccessMsg(res.message || 'Curriculum draft successfully compiled and normalized.');
      await loadSyllabi();
      await refreshSyllabusState();
    } catch (err: any) {
      setDraftError(err.response?.data?.detail || 'Failed to compile canonical curriculum draft.');
    } finally {
      setIsCompilingDraft(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string, isDocumentActive: boolean, curriculumStatus?: string) => {
    if (curriculumStatus === 'active') {
      return (
        <Badge variant="success" size="sm" className="flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Curriculum Active (Live)</span>
        </Badge>
      );
    }
    if (curriculumStatus === 'changes_saved') {
      return (
        <Badge variant="outline" size="sm" className="flex items-center gap-1 border-indigo-500/40 text-indigo-300 bg-indigo-500/10">
          <Check className="w-3 h-3 text-indigo-400" />
          <span>Review Changes Saved (Pending Activation)</span>
        </Badge>
      );
    }
    if (curriculumStatus === 'review_required' || curriculumStatus === 'draft_ready') {
      return (
        <Badge variant="warning" size="sm" className="flex items-center gap-1 border-amber-500/40 text-amber-300 bg-amber-500/10">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Draft Ready for Review</span>
        </Badge>
      );
    }
    if (isDocumentActive) {
      return (
        <Badge variant="outline" size="sm" className="flex items-center gap-1 border-sky-500/30 text-sky-300 bg-sky-500/10">
          <FileText className="w-3 h-3 text-sky-400" />
          <span>Primary File Version</span>
        </Badge>
      );
    }
    if (status === 'archived' || curriculumStatus === 'archived') {
      return (
        <Badge variant="outline" size="sm" className="flex items-center gap-1 border-nexora-border text-nexora-muted">
          <Archive className="w-3 h-3" />
          <span>Archived</span>
        </Badge>
      );
    }
    if (status === 'failed') {
      return (
        <Badge variant="outline" size="sm" className="flex items-center gap-1 border-rose-500/40 text-rose-300 bg-rose-500/10">
          <AlertCircle className="w-3 h-3" />
          <span>Processing Failed</span>
        </Badge>
      );
    }
    if (status === 'processing') {
      return (
        <Badge variant="warning" size="sm" className="flex items-center gap-1 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Extracting Structure...</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" size="sm" className="flex items-center gap-1 border-indigo-500/30 text-indigo-300 bg-indigo-500/10">
        <CheckCircle2 className="w-3 h-3" />
        <span>File Uploaded</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20">
              Primary Academic Curriculum Source
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Prescribed Syllabus Hub
          </h1>
          <p className="text-sm text-nexora-subtext mt-1 max-w-2xl">
            Upload your official syllabus to build your learning workspace. NEXORA treats your syllabus as the authoritative blueprint for your curriculum.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSyllabi}
            disabled={loading}
            title="Refresh Syllabus Records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => openUploadModal(null)}
          >
            Upload Syllabus
          </Button>
        </div>
      </div>

      {/* 2. Academic Context Indicator */}
      {academicContext && (
        <div className="p-4 rounded-xl bg-nexora-surface/70 border border-nexora-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-nexora-subtext">
            <Shield className="w-4 h-4 text-nexora-accent shrink-0" />
            <span>Active Academic Context:</span>
            <span className="font-semibold text-white capitalize">
              {academicContext.academic_level.replace(/_/g, ' ')}
            </span>
            {academicContext.institution && (
              <span className="text-nexora-muted">• {academicContext.institution}</span>
            )}
            {academicContext.program && (
              <span className="text-nexora-muted">• {academicContext.program}</span>
            )}
            {academicContext.grade_level && (
              <span className="text-nexora-muted">• {academicContext.grade_level}</span>
            )}
          </div>
          <span className="text-[11px] text-nexora-muted font-mono">
            {academicContext.context_id}
          </span>
        </div>
      )}

      {/* State C Top Banner: Curriculum Draft Ready for Review */}
      {syllabi.some((s) => s.versions.some((v) => v.curriculum_status === 'review_required')) && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-nexora-surface border border-purple-500/40 shadow-glow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                    Curriculum Draft Ready
                  </span>
                  <span className="text-xs text-nexora-muted">&bull;</span>
                  <span className="text-xs text-nexora-subtext">Review Required (Pre-Activation)</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Document understanding completed. Your curriculum draft is ready for review.
                </h3>
                <p className="text-xs text-nexora-subtext mt-0.5">
                  Extracted subjects, units, candidate topics, and course outcomes with complete source citations. Review before activation.
                </p>
              </div>
            </div>
            {(() => {
              const reviewSyl = syllabi.find((s) => s.versions.some((v) => v.curriculum_status === 'review_required'));
              const reviewVer = reviewSyl?.versions.find((v) => v.curriculum_status === 'review_required');
              if (!reviewSyl || !reviewVer) return null;
              return (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 shrink-0 shadow-md shadow-purple-900/30"
                  leftIcon={<Eye className="w-4 h-4" />}
                  onClick={() => handleOpenDraftReview(reviewSyl.id, reviewVer.id)}
                >
                  Review Curriculum Draft
                </Button>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. Empty State (Master Prompt 02R Mandatory Behavior) */}
      {!loading && syllabi.length === 0 && (
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-nexora-surface via-nexora-surface to-indigo-950/20 border border-nexora-border shadow-card text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div className="inline-block text-[11px] font-bold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-3 py-1 rounded-full border border-nexora-primary/20 mb-2">
            Your Academic Workspace
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            No active syllabus has been added yet.
          </h2>
          <p className="text-sm text-nexora-subtext max-w-lg mx-auto mb-6">
            Upload your syllabus to build your learning workspace. Supported formats: PDF, DOCX, PPTX, TXT, JPG, PNG.
          </p>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Upload className="w-5 h-5" />}
            onClick={() => openUploadModal(null)}
          >
            Upload Syllabus
          </Button>
        </div>
      )}

      {/* 4. Syllabus Cards & Versions */}
      <div className="space-y-6">
        {syllabi.map((syl) => {
          const isExpanded = expandedSyllabusId === syl.id;
          const activeVer = syl.active_version || syl.versions.find((v) => v.is_active) || syl.versions[0];

          return (
            <Card key={syl.id} className="border-nexora-border/80 bg-nexora-surface/90 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          {syl.title}
                        </h3>
                        {getStatusBadge(syl.status, !!(syl.active_version?.is_active), activeVer?.curriculum_status)}
                        <span className="text-[11px] font-mono text-nexora-muted bg-nexora-elevated px-2 py-0.5 rounded border border-nexora-border">
                          {syl.versions.length} {syl.versions.length === 1 ? 'version' : 'versions'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-nexora-muted flex-wrap">
                        <span className="capitalize">{syl.academic_level.replace(/_/g, ' ')}</span>
                        {syl.program_degree && <span>• {syl.program_degree}</span>}
                        {syl.academic_year && <span>• {syl.academic_year}</span>}
                        <span>• Added {formatISTDate(syl.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                    {activeVer && (activeVer.curriculum_status === 'review_required' || activeVer.curriculum_status === 'active' || activeVer.curriculum_status === 'changes_saved' || activeVer.processing_status === 'completed') && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-xs shadow-md shadow-purple-900/30"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenDraftReview(syl.id, activeVer.id)}
                      >
                        {activeVer.curriculum_status === 'active' ? 'View Active Curriculum' : 'Review & Activate'}
                      </Button>
                    )}
                    {activeVer?.curriculum_status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                        leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                        onClick={() => setDeactivatingTarget({ syllabusId: syl.id, versionId: activeVer.id })}
                        title="Cancel curriculum activation and return to review mode"
                      >
                        Cancel Activation
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => openUploadModal(syl.id)}
                    >
                      New Version
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      onClick={() => handleDeleteSyllabus(syl.id)}
                      title="Delete Syllabus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedSyllabusId(isExpanded ? null : syl.id)}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Versions Accordion */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-nexora-border/60">
                    <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-nexora-muted">
                      <History className="w-3.5 h-3.5 text-nexora-accent" />
                      <span>Version Lifecycle History</span>
                    </div>

                    <div className="space-y-2">
                      {syl.versions.map((ver) => (
                        <div
                          key={ver.id}
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            ver.is_active
                              ? 'bg-indigo-950/20 border-indigo-500/40'
                              : 'bg-nexora-elevated/40 border-nexora-border/50 hover:border-nexora-border'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-nexora-elevated text-nexora-text border border-nexora-border">
                              v{ver.version_number}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white">
                                  {ver.source_filename || 'syllabus_document'}
                                </span>
                                {getStatusBadge(ver.status, ver.is_active, ver.curriculum_status)}
                              </div>
                              <div className="text-[11px] text-nexora-muted flex items-center gap-2 mt-0.5">
                                <span>{formatFileSize(ver.file_size_bytes)}</span>
                                <span>•</span>
                                <span>Uploaded {formatISTDateTime(ver.created_at)}</span>
                                {ver.checksum && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono" title={`SHA-256: ${ver.checksum}`}>
                                      SHA: {ver.checksum.slice(0, 8)}...
                                    </span>
                                  </>
                                )}
                              </div>
                              {/* Live Processing Indicator */}
                              {analyzingVersionId === ver.id && (
                                <div className="mt-2 text-xs">
                                  <div className="flex items-center justify-between text-purple-300 mb-1">
                                    <span className="flex items-center gap-1.5 font-medium">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                                      {processingJobs[ver.id]?.stage || 'Analyzing document structure...'}
                                    </span>
                                    <span className="font-mono font-bold text-[11px]">
                                      {processingJobs[ver.id]?.progress_percent || 25}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-nexora-bg rounded-full h-1.5 overflow-hidden border border-purple-500/20">
                                    <div
                                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 transition-all duration-300"
                                      style={{ width: `${Math.max(10, processingJobs[ver.id]?.progress_percent || 25)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                            {/* 1. Review Draft / View Active Curriculum Button if ready */}
                            {(ver.curriculum_status === 'review_required' || ver.curriculum_status === 'active' || ver.curriculum_status === 'changes_saved' || ver.processing_status === 'completed') && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-xs shadow-md shadow-purple-900/30"
                                leftIcon={<Eye className="w-3.5 h-3.5" />}
                                onClick={() => handleOpenDraftReview(syl.id, ver.id)}
                              >
                                {ver.curriculum_status === 'active' ? 'View Active Curriculum' : 'Review & Activate'}
                              </Button>
                            )}

                            {ver.curriculum_status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                                leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                                onClick={() => setDeactivatingTarget({ syllabusId: syl.id, versionId: ver.id })}
                                title="Cancel curriculum activation and return to review mode"
                              >
                                Cancel Activation
                              </Button>
                            )}

                            {/* 2. Analyze Syllabus Button if not started */}
                            {ver.status !== 'archived' && ver.curriculum_status !== 'review_required' && ver.processing_status !== 'completed' && analyzingVersionId !== ver.id && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                                onClick={() => handleTriggerProcess(syl.id, ver.id, false)}
                              >
                                Analyze Syllabus
                              </Button>
                            )}

                            {/* 3. Re-analyze option for already analyzed versions */}
                            {(ver.curriculum_status === 'review_required' || ver.processing_status === 'completed') && analyzingVersionId !== ver.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-nexora-muted hover:text-white"
                                onClick={() => handleTriggerProcess(syl.id, ver.id, true)}
                                title="Re-run multimodal extraction"
                              >
                                Re-analyze
                              </Button>
                            )}

                            {!ver.is_active && ver.status !== 'archived' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-nexora-primary hover:text-white"
                                onClick={() => handleActivateVersion(syl.id, ver.id)}
                                title="Select this version as the primary uploaded syllabus document"
                              >
                                Select as Primary File
                              </Button>
                            )}
                            {ver.status !== 'archived' && !ver.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-nexora-muted hover:text-white"
                                onClick={() => handleArchiveVersion(syl.id, ver.id)}
                              >
                                Archive
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              leftIcon={<Download className="w-3.5 h-3.5" />}
                              onClick={() => handleDownload(syl.id, ver)}
                              title="Download Raw File"
                            >
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* 5. Upload Syllabus Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-nexora-surface border border-nexora-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-6 border-b border-nexora-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {targetSyllabusId ? 'Upload New Syllabus Version' : 'Upload Primary Syllabus'}
                  </h3>
                  <p className="text-xs text-nexora-subtext">
                    Primary Academic Document Foundation
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isUploading && setIsUploadModalOpen(false)}
                className="text-nexora-muted hover:text-white transition-colors"
                disabled={isUploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {!targetSyllabusId && (
                <div>
                  <label className="block text-xs font-semibold text-nexora-subtext mb-1.5">
                    Syllabus Title
                  </label>
                  <input
                    type="text"
                    value={syllabusTitle}
                    onChange={(e) => setSyllabusTitle(e.target.value)}
                    placeholder="e.g. Computer Science Engineering B.Tech 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-nexora-elevated border border-nexora-border text-white text-xs placeholder:text-nexora-muted focus:outline-none focus:border-nexora-primary"
                    disabled={isUploading}
                  />
                </div>
              )}

              {/* Drag-and-drop / File Selector */}
              <div>
                <label className="block text-xs font-semibold text-nexora-subtext mb-1.5">
                  Syllabus Document File
                </label>
                <div
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-indigo-500/60 bg-indigo-950/20'
                      : 'border-nexora-border/80 hover:border-indigo-500/40 bg-nexora-elevated/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3 text-left">
                      <FileText className="w-8 h-8 text-indigo-400 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-white line-clamp-1">
                          {selectedFile.name}
                        </div>
                        <div className="text-[11px] text-nexora-muted">
                          {formatFileSize(selectedFile.size)} • Click to change file
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-nexora-muted mx-auto mb-2" />
                      <div className="text-xs font-semibold text-white mb-1">
                        Click to select or drag and drop your syllabus
                      </div>
                      <div className="text-[11px] text-nexora-muted">
                        PDF, DOCX, PPTX, TXT, JPG, PNG (Max 50 MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Supported format badges */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {['PDF', 'DOCX', 'PPTX', 'TXT', 'JPG', 'PNG'].map((ext) => (
                  <span
                    key={ext}
                    className="px-2 py-0.5 rounded bg-nexora-elevated border border-nexora-border text-[10px] font-mono font-bold text-nexora-subtext"
                  >
                    {ext}
                  </span>
                ))}
              </div>

              {/* Status or Error Notice */}
              {uploadStatusMsg && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>{uploadStatusMsg}</span>
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-nexora-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!selectedFile || isUploading}
                  leftIcon={isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                >
                  {isUploading ? 'Uploading...' : targetSyllabusId ? 'Upload Version' : 'Upload Syllabus'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Curriculum Review & Activation Modal (Master Prompt 05R) */}
      {isDraftModalOpen && reviewDraft && activeDraftVersion && (
        <CurriculumReviewModal
          isOpen={isDraftModalOpen}
          onClose={() => setIsDraftModalOpen(false)}
          syllabusId={activeDraftVersion.syllabusId}
          version={activeDraftVersion.version}
          draft={reviewDraft}
          onDraftUpdated={async (updatedDraft) => {
            setReviewDraft(updatedDraft);
            setActiveDraftVersion((prev) => prev ? {
              ...prev,
              version: {
                ...prev.version,
                curriculum_status: updatedDraft.status === 'approved' ? 'active' : 'changes_saved',
              }
            } : null);
            await loadSyllabi();
            await refreshSyllabusState();
          }}
          onActivated={async (activationRes) => {
            setActiveDraftVersion((prev) => prev ? {
              ...prev,
              version: { ...prev.version, curriculum_status: 'active', is_active: true }
            } : null);
            await loadSyllabi();
            await refreshSyllabusState();
            await refreshAcademicContext().catch(() => {});
          }}
          onDeactivated={async () => {
            setActiveDraftVersion((prev) => prev ? {
              ...prev,
              version: { ...prev.version, curriculum_status: 'review_required' }
            } : null);
            await loadSyllabi();
            await refreshSyllabusState();
            await refreshAcademicContext().catch(() => {});
          }}
        />
      )}

      {/* Draft Loading or Error Fallback if modal opened before draft loaded */}
      {isDraftModalOpen && (!reviewDraft || loadingDraft) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-nexora-surface border border-nexora-border rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            {loadingDraft ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-sm font-semibold text-white">Loading curriculum draft...</p>
                <p className="text-xs text-nexora-muted">Retrieving verified modules, candidate topics, and citations</p>
              </div>
            ) : draftError ? (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Failed to Load Draft</p>
                  <p className="text-xs text-rose-300 mt-1">{draftError}</p>
                </div>
                <div className="flex justify-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsDraftModalOpen(false)}>
                    Close
                  </Button>
                  {activeDraftVersion && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleTriggerProcess(activeDraftVersion.syllabusId, activeDraftVersion.version.id, true)}
                    >
                      Extract Syllabus Now
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Phase 6: Visible Cancel Active Curriculum Confirmation Dialog */}
      {deactivatingTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" style={{ zIndex: 100 }}>
          <div className="w-full max-w-lg bg-nexora-surface border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Cancel Activation?
                </h3>
                <p className="text-xs text-nexora-muted leading-relaxed">
                  This will remove this curriculum as the active curriculum for the selected academic context. Your uploaded syllabus, draft, saved review changes, source evidence and historical records will be preserved.
                </p>
              </div>
            </div>

            {deactivateTargetError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-200">Cancellation Error</p>
                  <p className="mt-0.5">{deactivateTargetError}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeactivatingTarget(null)}
                disabled={isDeactivatingTarget}
              >
                Keep Active
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-900/30"
                disabled={isDeactivatingTarget}
                leftIcon={isDeactivatingTarget ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                onClick={handleConfirmTargetDeactivation}
              >
                {isDeactivatingTarget ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
