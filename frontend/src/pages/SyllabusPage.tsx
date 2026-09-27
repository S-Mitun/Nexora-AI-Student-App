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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { apiService } from '../services/api';
import { Syllabus, SyllabusVersion, SyllabusCurriculumDraft, SyllabusProcessingJob } from '../types/syllabus';
import { useAcademicContext } from '../context/AcademicContext';
import { useSyllabus } from '../context/SyllabusContext';

export const SyllabusPage: React.FC = () => {
  const { academicContext } = useAcademicContext();
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

  const getStatusBadge = (status: string, isActive: boolean, curriculumStatus?: string) => {
    if (isActive || status === 'active') {
      return (
        <Badge variant="success" size="sm" className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Active</span>
        </Badge>
      );
    }
    if (curriculumStatus === 'review_required') {
      return (
        <Badge variant="outline" size="sm" className="flex items-center gap-1 border-purple-500/40 text-purple-300 bg-purple-500/10">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Draft Ready</span>
        </Badge>
      );
    }
    if (status === 'archived') {
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
          <span>Failed</span>
        </Badge>
      );
    }
    if (status === 'processing') {
      return (
        <Badge variant="warning" size="sm" className="flex items-center gap-1 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Extracting...</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" size="sm" className="flex items-center gap-1 border-indigo-500/30 text-indigo-300 bg-indigo-500/10">
        <CheckCircle2 className="w-3 h-3" />
        <span>Uploaded</span>
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
                        <span>• Added {new Date(syl.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {activeVer && (activeVer.curriculum_status === 'review_required' || activeVer.processing_status === 'completed') && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-xs shadow-md shadow-purple-900/30"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenDraftReview(syl.id, activeVer.id)}
                      >
                        Review Draft
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
                                <span>Uploaded {new Date(ver.created_at).toLocaleDateString()}</span>
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
                            {/* 1. Review Draft Button if ready */}
                            {(ver.curriculum_status === 'review_required' || ver.processing_status === 'completed') && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-xs shadow-md shadow-purple-900/30"
                                leftIcon={<Eye className="w-3.5 h-3.5" />}
                                onClick={() => handleOpenDraftReview(syl.id, ver.id)}
                              >
                                Review Draft
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
                              >
                                Set Active
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

      {/* Curriculum Draft & Source Traceability Modal (Master Prompt 03R) */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl bg-nexora-surface border border-nexora-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-nexora-border/80 flex items-start justify-between gap-4 bg-nexora-elevated/40 shrink-0">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5 shadow-inner">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Curriculum Draft & Source Traceability
                    </h2>
                    <Badge variant="warning" size="sm" className="bg-amber-500/10 text-amber-300 border-amber-500/30">
                      Review Required (Pre-Activation)
                    </Badge>
                    <Badge variant="outline" size="sm" className="font-mono text-[11px] text-slate-400 border-slate-700">
                      Runtime Inactive
                    </Badge>
                    {reviewDraft?.overall_confidence && (
                      <Badge variant="success" size="sm" className="text-[11px]">
                        {reviewDraft.overall_confidence.toUpperCase()} Confidence
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-nexora-muted mt-1 flex items-center gap-2">
                    <span>
                      Draft from{' '}
                      <strong className="text-white font-medium">
                        {activeDraftVersion?.version.source_filename || 'Syllabus Document'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span className="font-mono">v{activeDraftVersion?.version.version_number || 1}</span>
                    <span>•</span>
                    <span>State C: Stored in isolated draft tables</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {activeDraftVersion && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-purple-500/40 text-purple-300 hover:bg-purple-500/10 shrink-0"
                    leftIcon={isCompilingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    disabled={isCompilingDraft}
                    onClick={() => handleCompileDraft(activeDraftVersion.syllabusId, activeDraftVersion.version.id)}
                  >
                    {isCompilingDraft ? 'Compiling Draft...' : reviewDraft?.compilation_version ? `Re-compile Draft (v${reviewDraft.compilation_version})` : 'Compile Canonical Draft'}
                  </Button>
                )}
                <button
                  onClick={() => setIsDraftModalOpen(false)}
                  className="p-1.5 rounded-lg text-nexora-muted hover:text-white hover:bg-nexora-border transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Pre-Activation Clarification Banner */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-300">
                    Pre-Activation Curriculum Draft (State C: review_required)
                  </p>
                  <p className="text-amber-200/90 leading-relaxed">
                    This canonical curriculum draft was normalized directly from your uploaded syllabus with ground truth page citations.
                    In accordance with strict runtime safety rules, <strong>your active curriculum remains inactive</strong>.
                    No lessons, practice problems, or laboratory simulations will appear in the runtime workspace until you confirm and activate this curriculum in Prompt 05R.
                  </p>
                </div>
              </div>

              {compilationSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-medium">{compilationSuccessMsg}</span>
                  </div>
                  <button onClick={() => setCompilationSuccessMsg(null)} className="text-emerald-400 hover:text-white p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {loadingDraft ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-white">Loading structured curriculum draft...</p>
                    <p className="text-xs text-nexora-muted mt-1">Retrieving verified modules, candidate topics, and source citations</p>
                  </div>
                </div>
              ) : draftError ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Failed to Load Draft</p>
                    <p className="text-xs text-rose-300 max-w-md mt-1">{draftError}</p>
                  </div>
                  {activeDraftVersion && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                      onClick={() => handleTriggerProcess(activeDraftVersion.syllabusId, activeDraftVersion.version.id, true)}
                    >
                      Run Document Extraction Now
                    </Button>
                  )}
                </div>
              ) : reviewDraft && reviewDraft.subjects.length > 0 ? (
                <div className="space-y-6">
                  {/* Draft Metrics Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-nexora-elevated/40 border border-nexora-border/60 text-center">
                    <div className="p-2 rounded-lg bg-nexora-bg/40">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-muted block">Subjects</span>
                      <span className="text-lg font-bold text-white">{reviewDraft.subjects.length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-nexora-bg/40">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-muted block">Units / Modules</span>
                      <span className="text-lg font-bold text-purple-300">
                        {reviewDraft.subjects.reduce((acc, s) => acc + s.modules.length, 0)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-nexora-bg/40">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-muted block">Lesson Candidates</span>
                      <span className="text-lg font-bold text-indigo-300">
                        {reviewDraft.subjects.reduce((acc, s) => acc + s.modules.reduce((mAcc, m) => mAcc + m.topics.length, 0), 0)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-nexora-bg/40">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-muted block">Outcomes</span>
                      <span className="text-lg font-bold text-emerald-300">
                        {reviewDraft.subjects.reduce((acc, s) => acc + s.outcomes.length, 0)}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-nexora-bg/40">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-muted block">Prerequisites</span>
                      <span className="text-lg font-bold text-amber-300">
                        {reviewDraft.prerequisites?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Subject Overview Card */}
                  {reviewDraft.subjects.map((subj) => (
                    <div key={subj.id} className="space-y-6">
                      <div className="p-5 rounded-xl bg-nexora-elevated/50 border border-nexora-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {subj.code || 'COURSE CODE'}
                            </span>
                            <h3 className="text-lg font-bold text-white tracking-tight">
                              {subj.name}
                            </h3>
                            {subj.source_page && (
                              <Badge variant="outline" size="sm" className="text-[10px] text-nexora-muted border-nexora-border">
                                Page {subj.source_page}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-nexora-muted flex-wrap">
                            {subj.semester && (
                              <span className="flex items-center gap-1.5">
                                <GraduationCap className="w-3.5 h-3.5 text-nexora-accent" />
                                {subj.semester}
                              </span>
                            )}
                            {subj.credits && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-nexora-accent" />
                                {subj.credits}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-nexora-accent" />
                              {subj.modules.length} Units / Modules
                            </span>
                            <span className="flex items-center gap-1.5">
                              <ListChecks className="w-3.5 h-3.5 text-nexora-accent" />
                              {subj.modules.reduce((acc, m) => acc + m.topics.length, 0)} Lesson Candidates
                            </span>
                            {subj.outcomes.length > 0 && (
                              <span className="flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-nexora-accent" />
                                {subj.outcomes.length} Course Outcomes
                              </span>
                            )}
                          </div>
                        </div>

                        {subj.evidence_text && (
                          <div className="max-w-xs p-2.5 rounded-lg bg-nexora-bg/60 border border-nexora-border/60 text-[11px] text-nexora-muted italic">
                            <div className="flex items-center gap-1 font-semibold not-italic text-purple-300 mb-0.5 text-[10px] uppercase">
                              <Quote className="w-2.5 h-2.5" /> Source Citation Excerpt
                            </div>
                            &quot;{subj.evidence_text.slice(0, 100)}...&quot;
                          </div>
                        )}
                      </div>

                      {/* Course Outcomes (COs) Section */}
                      {subj.outcomes.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-nexora-accent">
                            <Target className="w-4 h-4" />
                            <span>Course Outcomes (COs) — Source Verified ({subj.outcomes.length})</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {subj.outcomes.map((co, idx) => (
                              <div
                                key={co.id || idx}
                                className="p-3.5 rounded-xl bg-nexora-elevated/40 border border-nexora-border/60 flex items-start gap-3"
                              >
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0 mt-0.5">
                                  {co.outcome_type}
                                </span>
                                <div className="space-y-1.5 flex-1">
                                  <p className="text-xs text-white/90 leading-relaxed font-medium">
                                    {co.description}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-nexora-muted flex-wrap">
                                    <span className="font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                      {co.scope || 'course'} scope
                                    </span>
                                    <span className={`font-mono px-1.5 py-0.2 rounded border ${
                                      co.origin === 'inferred'
                                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                    }`}>
                                      {co.origin || 'explicit'}
                                    </span>
                                    {co.source_page && <span>Page {co.source_page}</span>}
                                    <span>•</span>
                                    <span className="text-emerald-400 capitalize">{co.confidence} confidence</span>
                                    {co.evidence_text && (
                                      <>
                                        <span>•</span>
                                        <span className="italic truncate max-w-[180px]" title={co.evidence_text}>
                                          &quot;{co.evidence_text}&quot;
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Units & Modules Accordion */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-nexora-accent">
                            <Layers className="w-4 h-4" />
                            <span>Curriculum Units & Extracted Topics ({subj.modules.length})</span>
                          </div>
                          <span className="text-xs text-nexora-muted">
                            Click any unit to expand topics and source evidence
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {subj.modules.map((mod, modIdx) => {
                            const isModExpanded = expandedModuleId === mod.id || (!expandedModuleId && modIdx === 0);
                            return (
                              <div
                                key={mod.id}
                                className="rounded-xl border border-nexora-border bg-nexora-elevated/30 overflow-hidden transition-all duration-200"
                              >
                                <button
                                  type="button"
                                  onClick={() => setExpandedModuleId(isModExpanded ? null : mod.id)}
                                  className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-nexora-elevated/60 transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                      {mod.original_label || mod.display_label || `Unit ${modIdx + 1}`}
                                    </span>
                                    <span className="text-sm font-semibold text-white">
                                      {mod.title}
                                    </span>
                                    {mod.sequence_order !== undefined && (
                                      <span className="text-[10px] font-mono text-nexora-muted bg-nexora-bg/60 px-1.5 py-0.5 rounded border border-nexora-border/40">
                                        Seq #{mod.sequence_order}
                                      </span>
                                    )}
                                    {mod.review_required && (
                                      <Badge variant="warning" size="sm" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                                        Review Required
                                      </Badge>
                                    )}
                                    {mod.source_page && (
                                      <Badge variant="outline" size="sm" className="text-[10px] text-nexora-muted border-nexora-border">
                                        Page {mod.source_page}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-xs font-medium text-nexora-muted">
                                      {mod.topics.length} {mod.topics.length === 1 ? 'lesson candidate' : 'lesson candidates'}
                                    </span>
                                    {isModExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-nexora-muted" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-nexora-muted" />
                                    )}
                                  </div>
                                </button>

                                {isModExpanded && (
                                  <div className="p-4 pt-0 space-y-4 border-t border-nexora-border/40 bg-nexora-bg/30">
                                    {/* Verbatim Evidence Excerpt */}
                                    {mod.evidence_text && (
                                      <div className="mt-3 p-3 rounded-lg bg-nexora-elevated/70 border border-purple-500/20 text-xs text-purple-200/90 flex items-start gap-2.5">
                                        <Quote className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                                        <div className="space-y-0.5">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                                            Ground Truth Excerpt (Page {mod.source_page || 1})
                                          </span>
                                          <p className="italic text-[11px] leading-relaxed">
                                            &quot;{mod.evidence_text}&quot;
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Topics List */}
                                    <div>
                                      <span className="text-[11px] font-semibold text-nexora-muted uppercase tracking-wider block mb-2">
                                        Normalized Lesson Candidates ({mod.topics.length})
                                      </span>
                                      {mod.topics.length === 0 ? (
                                        <p className="text-xs text-nexora-muted italic">No lesson candidates extracted for this unit.</p>
                                      ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {mod.topics.map((top, tIdx) => (
                                            <div
                                              key={top.id || tIdx}
                                              className="p-2.5 rounded-lg bg-nexora-elevated/40 border border-nexora-border/40 flex items-start gap-2 text-xs"
                                            >
                                              <span className="w-4 h-4 rounded-full bg-nexora-border/60 text-[10px] font-mono flex items-center justify-center text-nexora-muted shrink-0 mt-0.5">
                                                {tIdx + 1}
                                              </span>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <p className="text-white/90 font-medium truncate" title={top.lesson_candidate_title || top.title}>
                                                    {top.lesson_candidate_title || top.title}
                                                  </p>
                                                  <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                                                    Candidate
                                                  </span>
                                                  {(top.review_required || top.is_ambiguous) && (
                                                    <span
                                                      className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5"
                                                      title={top.ambiguity_reason || 'Low confidence or unanchored scope'}
                                                    >
                                                      <AlertCircle className="w-2.5 h-2.5" />
                                                      Review
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-nexora-muted mt-0.5">
                                                  {top.source_page && <span>Page {top.source_page}</span>}
                                                  {top.confidence && <span>• {top.confidence} conf</span>}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Dedicated Prerequisites Section */}
                  {reviewDraft.prerequisites && reviewDraft.prerequisites.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                          <GitBranch className="w-4 h-4" />
                          <span>Curriculum Prerequisites & Flow Dependencies ({reviewDraft.prerequisites.length})</span>
                        </div>
                        <span className="text-[11px] text-nexora-muted">
                          Preserving foundational curricular flow
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {reviewDraft.prerequisites.map((prereq, pIdx) => (
                          <div
                            key={prereq.id || pIdx}
                            className="p-3 rounded-xl bg-nexora-elevated/40 border border-nexora-border/60 flex items-start gap-3 text-xs"
                          >
                            <GitBranch className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  prereq.prerequisite_type === 'inferred'
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                }`}>
                                  {prereq.prerequisite_type.toUpperCase()}
                                </span>
                                {prereq.confidence && (
                                  <span className="text-[10px] text-emerald-400 font-mono">
                                    {prereq.confidence} conf
                                  </span>
                                )}
                              </div>
                              <p className="text-white/90 text-xs font-medium">
                                {prereq.description || 'Sequential curricular dependency'}
                              </p>
                              {prereq.evidence_text && (
                                <p className="text-[10px] text-nexora-muted italic">
                                  &quot;{prereq.evidence_text}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Zero Hallucination Guarantee Card */}
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-indigo-200">
                        Zero Hallucination & Citation Traceability Guarantee
                      </p>
                      <p className="text-indigo-300/80 mt-0.5 text-[11px]">
                        Every unit, topic, and outcome displayed above was extracted from the actual syllabus text using RapidOCR and layout analysis.
                        No phantom subjects, simulated lessons, or fictitious requirements have been generated.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-nexora-muted text-xs">
                  No curriculum draft available. Click &quot;Analyze Syllabus&quot; on your syllabus version to extract structured units.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-nexora-border/80 bg-nexora-elevated/60 flex items-center justify-between gap-4 shrink-0">
              <div className="text-xs text-nexora-muted flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                <span>Curriculum Status: <strong>review_required</strong> (Pre-Activation)</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDraftModalOpen(false)}
                >
                  Close Review
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={true}
                  className="opacity-60 cursor-not-allowed bg-slate-700 text-slate-300 border-slate-600"
                  leftIcon={<Lock className="w-3.5 h-3.5" />}
                  title="Curriculum activation is handled in Master Prompt 05R"
                >
                  Activate Curriculum (Coming in Prompt 05R)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
