import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Sparkles,
  Info,
  Shield,
  Layers,
  X,
  ListChecks,
  Check,
  Quote,
  Target,
  GraduationCap,
  GitBranch,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Edit2,
  Clock,
  Zap,
  CheckSquare,
  Square,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  SyllabusVersion,
  SyllabusCurriculumDraft,
  SyllabusDraftSubject,
  SyllabusDraftModule,
  SyllabusDraftTopic,
  SyllabusDraftCorrectionRequest,
  SyllabusCurriculumActivationResponse,
  SyllabusActivationEligibilityResponse,
} from '../../types/syllabus';
import { apiService } from '../../services/api';
import { useAcademicContext } from '../../context/AcademicContext';
import { useSyllabus } from '../../context/SyllabusContext';

interface CurriculumReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  syllabusId: string;
  version: SyllabusVersion;
  draft: SyllabusCurriculumDraft;
  onDraftUpdated: (updatedDraft: SyllabusCurriculumDraft) => void;
  onActivated: (result: SyllabusCurriculumActivationResponse) => void;
}

export const CurriculumReviewModal: React.FC<CurriculumReviewModalProps> = ({
  isOpen,
  onClose,
  syllabusId,
  version,
  draft,
  onDraftUpdated,
  onActivated,
}) => {
  const navigate = useNavigate();
  const { academicContext, refreshAcademicContext } = useAcademicContext();
  const { refreshSyllabusState } = useSyllabus();

  // Local editable draft copy
  const [editedDraft, setEditedDraft] = useState<SyllabusCurriculumDraft>(() => JSON.parse(JSON.stringify(draft)));
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  // Status and feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pre-Activation Confirmation Dialog
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [eligibility, setEligibility] = useState<SyllabusActivationEligibilityResponse | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  // Post-Activation Success Dialog
  const [activationResult, setActivationResult] = useState<SyllabusCurriculumActivationResponse | null>(null);

  // Synchronize when incoming draft prop updates
  useEffect(() => {
    setEditedDraft(JSON.parse(JSON.stringify(draft)));
    if (draft.subjects.length > 0 && draft.subjects[0].modules.length > 0) {
      setExpandedModuleId(draft.subjects[0].modules[0].id);
    }
  }, [draft]);

  // Compute dirty (unsaved changes) state
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(editedDraft);
  }, [draft, editedDraft]);

  // Summary counts of active vs excluded
  const summaryMetrics = useMemo(() => {
    let totalSubjects = 0;
    let includedSubjects = 0;
    let totalModules = 0;
    let includedModules = 0;
    let totalTopics = 0;
    let includedTopics = 0;
    let totalOutcomes = 0;
    let reviewRequiredCount = 0;

    editedDraft.subjects.forEach((s) => {
      totalSubjects += 1;
      if (!s.is_excluded) includedSubjects += 1;
      if (s.review_required) reviewRequiredCount += 1;
      totalOutcomes += s.outcomes?.length || 0;

      s.modules.forEach((m) => {
        totalModules += 1;
        if (!s.is_excluded && !m.is_excluded) includedModules += 1;
        if (m.review_required) reviewRequiredCount += 1;

        m.topics.forEach((t) => {
          totalTopics += 1;
          if (!s.is_excluded && !m.is_excluded && !t.is_excluded) includedTopics += 1;
          if (t.review_required || t.is_ambiguous) reviewRequiredCount += 1;
        });
      });
    });

    return {
      totalSubjects,
      includedSubjects,
      excludedSubjects: totalSubjects - includedSubjects,
      totalModules,
      includedModules,
      excludedModules: totalModules - includedModules,
      totalTopics,
      includedTopics,
      excludedTopics: totalTopics - includedTopics,
      totalOutcomes,
      reviewRequiredCount,
      prerequisitesCount: editedDraft.prerequisites?.length || 0,
    };
  }, [editedDraft]);

  if (!isOpen) return null;

  // --- Handlers for Subject Corrections ---
  const handleUpdateSubject = (subjectId: string, updates: Partial<SyllabusDraftSubject>) => {
    setEditedDraft((prev) => {
      const copy = { ...prev };
      copy.subjects = copy.subjects.map((s) => (s.id === subjectId ? { ...s, ...updates } : s));
      return copy;
    });
    setSaveSuccessMsg(null);
  };

  // --- Handlers for Module Corrections ---
  const handleUpdateModule = (subjectId: string, moduleId: string, updates: Partial<SyllabusDraftModule>) => {
    setEditedDraft((prev) => {
      const copy = { ...prev };
      copy.subjects = copy.subjects.map((s) => {
        if (s.id !== subjectId) return s;
        return {
          ...s,
          modules: s.modules.map((m) => (m.id === moduleId ? { ...m, ...updates } : m)),
        };
      });
      return copy;
    });
    setSaveSuccessMsg(null);
  };

  const handleMoveModule = (subjectId: string, moduleIndex: number, direction: 'up' | 'down') => {
    setEditedDraft((prev) => {
      const copy = { ...prev };
      copy.subjects = copy.subjects.map((s) => {
        if (s.id !== subjectId) return s;
        const modules = [...s.modules];
        const targetIndex = direction === 'up' ? moduleIndex - 1 : moduleIndex + 1;
        if (targetIndex < 0 || targetIndex >= modules.length) return s;

        // Swap modules
        const temp = modules[moduleIndex];
        modules[moduleIndex] = modules[targetIndex];
        modules[targetIndex] = temp;

        // Re-index sequence_order
        modules.forEach((mod, idx) => {
          mod.sequence_order = idx + 1;
          mod.sort_order = idx;
        });

        return { ...s, modules };
      });
      return copy;
    });
    setSaveSuccessMsg(null);
  };

  // --- Handlers for Topic / Lesson Corrections ---
  const handleUpdateTopic = (
    subjectId: string,
    moduleId: string,
    topicId: string,
    updates: Partial<SyllabusDraftTopic>
  ) => {
    setEditedDraft((prev) => {
      const copy = { ...prev };
      copy.subjects = copy.subjects.map((s) => {
        if (s.id !== subjectId) return s;
        return {
          ...s,
          modules: s.modules.map((m) => {
            if (m.id !== moduleId) return m;
            return {
              ...m,
              topics: m.topics.map((t) => (t.id === topicId ? { ...t, ...updates } : t)),
            };
          }),
        };
      });
      return copy;
    });
    setSaveSuccessMsg(null);
  };

  // --- Save Review Changes to Backend ---
  const handleSaveCorrections = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccessMsg(null);

      // Build payload matching SyllabusDraftCorrectionRequest
      const payload: SyllabusDraftCorrectionRequest = {
        subjects: editedDraft.subjects.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          credits: s.credits,
          semester: s.semester,
          is_excluded: s.is_excluded ?? false,
          sort_order: s.sort_order ?? 0,
          review_required: s.review_required ?? false,
        })),
        modules: editedDraft.subjects.flatMap((s) =>
          s.modules.map((m) => ({
            id: m.id,
            title: m.title,
            display_label: m.display_label,
            draft_subject_id: s.id,
            is_excluded: m.is_excluded ?? false,
            sort_order: m.sort_order ?? 0,
            review_required: m.review_required ?? false,
          }))
        ),
        topics: editedDraft.subjects.flatMap((s) =>
          s.modules.flatMap((m) =>
            m.topics.map((t) => ({
              id: t.id,
              title: t.title,
              lesson_candidate_title: t.lesson_candidate_title || t.title,
              draft_module_id: m.id,
              is_lesson_candidate: t.is_lesson_candidate ?? true,
              is_excluded: t.is_excluded ?? false,
              sort_order: t.sort_order ?? 0,
              review_required: t.review_required ?? false,
            }))
          )
        ),
      };

      const updatedDraft = await apiService.saveDraftCorrections(syllabusId, version.id, payload);
      onDraftUpdated(updatedDraft);
      setEditedDraft(JSON.parse(JSON.stringify(updatedDraft)));
      setSaveSuccessMsg('Review changes saved successfully. Your draft is authoritative.');
      await refreshSyllabusState();
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Failed to save curriculum corrections. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Pre-Activation Verification ---
  const handleOpenActivationModal = async () => {
    try {
      setIsCheckingEligibility(true);
      setEligibilityError(null);
      setActivationError(null);
      const res = await apiService.checkActivationEligibility(syllabusId, version.id);
      setEligibility(res);
      setIsConfirmModalOpen(true);
    } catch (err: any) {
      setEligibilityError(err.response?.data?.detail || 'Could not verify activation eligibility.');
      setIsConfirmModalOpen(true);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  // --- Explicit Activation Execution ---
  const handleConfirmActivation = async () => {
    try {
      setIsActivating(true);
      setActivationError(null);

      // If there are unsaved changes, auto-save them first to ensure activation incorporates them
      if (hasUnsavedChanges) {
        await handleSaveCorrections();
      }

      const res = await apiService.activateCurriculum(syllabusId, version.id, {
        confirm_activation: true,
        academic_context_id: academicContext?.context_id,
      });

      setActivationResult(res);
      setIsConfirmModalOpen(false);
      onActivated(res);

      // Invalidate and refresh all global academic and syllabus caches
      await Promise.all([
        refreshSyllabusState().catch(() => {}),
        refreshAcademicContext().catch(() => {}),
      ]);
    } catch (err: any) {
      setActivationError(err.response?.data?.detail || 'Curriculum activation failed. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCloseReview = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved review changes. Are you sure you want to exit without saving?')) {
        return;
      }
    }
    onClose();
  };

  const isAlreadyActive = version.is_active || editedDraft.status === 'approved';

  return (
    <>
      {/* 1. Main Curriculum Review & Correction Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-5xl bg-nexora-surface border border-nexora-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-nexora-border/80 flex items-start justify-between gap-4 bg-nexora-elevated/40 shrink-0">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5 shadow-inner">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Curriculum Review & Activation
                  </h2>
                  {isAlreadyActive ? (
                    <Badge variant="success" size="sm" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Curriculum Active (State D)</span>
                    </Badge>
                  ) : editedDraft.status === 'changes_saved' ? (
                    <Badge variant="outline" size="sm" className="bg-indigo-500/15 text-indigo-300 border-indigo-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Changes Saved (State C)</span>
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm" className="bg-amber-500/15 text-amber-300 border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Review Required (State C)</span>
                    </Badge>
                  )}
                  {hasUnsavedChanges && (
                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                      Unsaved Changes
                    </span>
                  )}
                  {editedDraft.overall_confidence && (
                    <Badge variant="outline" size="sm" className="font-mono text-[11px] text-slate-400 border-slate-700">
                      {editedDraft.overall_confidence.toUpperCase()} Confidence
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-nexora-muted mt-1 flex items-center gap-2 flex-wrap">
                  <span>
                    Syllabus:{' '}
                    <strong className="text-white font-medium">
                      {version.source_filename || 'Syllabus Document'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span className="font-mono font-medium text-slate-300">v{version.version_number}</span>
                  {editedDraft.compilation_version && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400">Compiler v{editedDraft.compilation_version}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Evidence-Backed Canonical Draft</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className={`text-xs ${
                  hasUnsavedChanges
                    ? 'border-purple-500 text-purple-300 hover:bg-purple-500/20 shadow-md shadow-purple-900/20'
                    : 'border-nexora-border text-nexora-muted opacity-60'
                }`}
                disabled={!hasUnsavedChanges || isSaving}
                leftIcon={isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                onClick={handleSaveCorrections}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                className={`text-xs shadow-md ${
                  isAlreadyActive
                    ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/40'
                }`}
                leftIcon={isCheckingEligibility ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                disabled={isCheckingEligibility}
                onClick={handleOpenActivationModal}
              >
                {isAlreadyActive ? 'Re-activate / Update' : 'Review & Activate'}
              </Button>

              <button
                onClick={handleCloseReview}
                className="p-1.5 rounded-lg text-nexora-muted hover:text-white hover:bg-nexora-border transition-colors ml-1"
                title="Close Review"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* Status Banners */}
            {saveSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">{saveSuccessMsg}</span>
                </div>
                <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-400 hover:text-white p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {saveError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-medium">{saveError}</span>
                </div>
                <button onClick={() => setSaveError(null)} className="text-rose-400 hover:text-white p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isAlreadyActive ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-300">Curriculum is Active in Learning Workspace</p>
                  <p className="text-emerald-200/80 mt-0.5">
                    This curriculum version is currently active. All subjects, modules, and lessons are live in your Subjects and Learning Workspace. You can make adjustments and re-activate if you wish to apply updates.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-300">
                    Draft Review & Correction Workflow (State C: review_required)
                  </p>
                  <p className="text-amber-200/90 leading-relaxed">
                    Review and refine the extracted curriculum below before activation. You can rename subjects, units, or topics, toggle items to exclude irrelevant detections, and reorder modules. Once verified, click <strong>&quot;Review &amp; Activate&quot;</strong> to atomically deploy your curriculum to the runtime workspace.
                  </p>
                </div>
              </div>
            )}

            {/* Metrics Breakdown Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-xl bg-nexora-elevated/40 border border-nexora-border/60 text-center">
              <div className="p-2 rounded-lg bg-nexora-bg/40">
                <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-muted block">Subjects</span>
                <span className="text-lg font-bold text-white">
                  {summaryMetrics.includedSubjects}{' '}
                  {summaryMetrics.excludedSubjects > 0 && (
                    <span className="text-xs font-normal text-rose-400" title="Excluded">
                      (-{summaryMetrics.excludedSubjects})
                    </span>
                  )}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-nexora-bg/40">
                <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-muted block">Units / Modules</span>
                <span className="text-lg font-bold text-purple-300">
                  {summaryMetrics.includedModules}{' '}
                  {summaryMetrics.excludedModules > 0 && (
                    <span className="text-xs font-normal text-rose-400" title="Excluded">
                      (-{summaryMetrics.excludedModules})
                    </span>
                  )}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-nexora-bg/40">
                <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-muted block">Lesson Candidates</span>
                <span className="text-lg font-bold text-indigo-300">
                  {summaryMetrics.includedTopics}{' '}
                  {summaryMetrics.excludedTopics > 0 && (
                    <span className="text-xs font-normal text-rose-400" title="Excluded">
                      (-{summaryMetrics.excludedTopics})
                    </span>
                  )}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-nexora-bg/40">
                <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-muted block">Outcomes</span>
                <span className="text-lg font-bold text-emerald-300">{summaryMetrics.totalOutcomes}</span>
              </div>
              <div className="p-2 rounded-lg bg-nexora-bg/40">
                <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-muted block">Prerequisites</span>
                <span className="text-lg font-bold text-amber-300">{summaryMetrics.prerequisitesCount}</span>
              </div>
            </div>

            {/* Subjects & Hierarchical Correction View */}
            {editedDraft.subjects.map((subj) => {
              const isSubjExcluded = subj.is_excluded ?? false;

              return (
                <div
                  key={subj.id}
                  className={`space-y-5 rounded-2xl border transition-all p-5 ${
                    isSubjExcluded
                      ? 'bg-rose-950/10 border-rose-500/30 opacity-70'
                      : 'bg-nexora-elevated/40 border-nexora-border/80'
                  }`}
                >
                  {/* Subject Header & Controls */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-nexora-border/50">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isSubjExcluded ? (
                          <Badge variant="outline" size="sm" className="bg-rose-500/20 text-rose-300 border-rose-500/40">
                            Excluded from Activation
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm" className="bg-purple-500/20 text-purple-300 border-purple-500/40 font-mono">
                            {subj.code || 'COURSE CODE'}
                          </Badge>
                        )}
                        {subj.source_page && (
                          <span className="text-[11px] font-mono text-nexora-muted bg-nexora-bg/60 px-2 py-0.5 rounded border border-nexora-border/40">
                            Page {subj.source_page}
                          </span>
                        )}
                        {subj.review_required && (
                          <Badge variant="warning" size="sm" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                            Review Required
                          </Badge>
                        )}
                      </div>

                      {/* Subject Editable Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
                            Subject / Course Name
                          </label>
                          <input
                            type="text"
                            value={subj.name}
                            disabled={isSubjExcluded}
                            onChange={(e) => handleUpdateSubject(subj.id, { name: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg bg-nexora-bg/80 border border-nexora-border text-white focus:border-purple-500 focus:outline-none transition-colors"
                            placeholder="Course Name"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
                            Course Code
                          </label>
                          <input
                            type="text"
                            value={subj.code || ''}
                            disabled={isSubjExcluded}
                            onChange={(e) => handleUpdateSubject(subj.id, { code: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm font-mono rounded-lg bg-nexora-bg/80 border border-nexora-border text-purple-300 focus:border-purple-500 focus:outline-none transition-colors"
                            placeholder="e.g. CS201"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-nexora-muted pt-1 flex-wrap">
                        {subj.semester && (
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-nexora-accent" />
                            {subj.semester}
                          </span>
                        )}
                        {subj.credits && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-nexora-accent" />
                            {subj.credits} Credits
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-nexora-accent" />
                          {subj.modules.length} Units
                        </span>
                        <span className="flex items-center gap-1.5">
                          <ListChecks className="w-3.5 h-3.5 text-nexora-accent" />
                          {subj.modules.reduce((acc, m) => acc + m.topics.length, 0)} Lessons
                        </span>
                      </div>
                    </div>

                    {/* Exclude / Include Subject Toggle */}
                    <div className="flex items-center gap-2 self-start md:self-center">
                      <Button
                        variant={isSubjExcluded ? 'outline' : 'ghost'}
                        size="sm"
                        className={`text-xs ${
                          isSubjExcluded
                            ? 'border-rose-500/40 text-rose-300 hover:bg-rose-500/20'
                            : 'text-nexora-muted hover:text-white'
                        }`}
                        leftIcon={isSubjExcluded ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5" />}
                        onClick={() => handleUpdateSubject(subj.id, { is_excluded: !isSubjExcluded })}
                      >
                        {isSubjExcluded ? 'Include Subject' : 'Exclude Subject'}
                      </Button>
                    </div>
                  </div>

                  {/* Subject Ground Truth Excerpt */}
                  {subj.evidence_text && (
                    <div className="p-3 rounded-lg bg-nexora-bg/50 border border-purple-500/20 text-xs text-purple-200/90 flex items-start gap-2.5">
                      <Quote className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block mb-0.5">
                          Subject Ground Truth Excerpt (Page {subj.source_page || 1})
                        </span>
                        <p className="italic text-[11px] leading-relaxed">&quot;{subj.evidence_text}&quot;</p>
                      </div>
                    </div>
                  )}

                  {/* Units & Modules Hierarchy */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-nexora-accent">
                        <Layers className="w-4 h-4" />
                        <span>Curriculum Units & Extracted Topics ({subj.modules.length})</span>
                      </div>
                      <span className="text-[11px] text-nexora-muted">
                        Use arrows to reorder units or checkboxes to exclude items
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {subj.modules.map((mod, modIdx) => {
                        const isModExpanded = expandedModuleId === mod.id;
                        const isModExcluded = isSubjExcluded || (mod.is_excluded ?? false);

                        return (
                          <div
                            key={mod.id}
                            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                              isModExcluded
                                ? 'bg-rose-950/5 border-rose-500/25 opacity-70'
                                : 'bg-nexora-elevated/30 border-nexora-border/60 hover:border-nexora-border'
                            }`}
                          >
                            {/* Module Header Bar */}
                            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                {/* Up / Down Order Buttons */}
                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={modIdx === 0 || isModExcluded}
                                    onClick={() => handleMoveModule(subj.id, modIdx, 'up')}
                                    className="p-1 rounded hover:bg-nexora-bg text-nexora-muted hover:text-white disabled:opacity-20 transition-colors"
                                    title="Move Unit Up"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={modIdx === subj.modules.length - 1 || isModExcluded}
                                    onClick={() => handleMoveModule(subj.id, modIdx, 'down')}
                                    className="p-1 rounded hover:bg-nexora-bg text-nexora-muted hover:text-white disabled:opacity-20 transition-colors"
                                    title="Move Unit Down"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Editable Display Label (Unit 1, etc.) */}
                                <input
                                  type="text"
                                  value={mod.display_label || mod.original_label || `Unit ${modIdx + 1}`}
                                  disabled={isModExcluded}
                                  onChange={(e) =>
                                    handleUpdateModule(subj.id, mod.id, { display_label: e.target.value })
                                  }
                                  className="w-20 px-2 py-1 text-xs font-mono font-bold rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 focus:outline-none focus:border-purple-400 shrink-0 text-center"
                                  placeholder="Unit 1"
                                />

                                {/* Editable Title */}
                                <input
                                  type="text"
                                  value={mod.title}
                                  disabled={isModExcluded}
                                  onChange={(e) => handleUpdateModule(subj.id, mod.id, { title: e.target.value })}
                                  className={`flex-1 min-w-[150px] px-2.5 py-1 text-sm font-semibold rounded bg-nexora-bg/60 border border-nexora-border/60 text-white focus:border-purple-400 focus:outline-none ${
                                    isModExcluded ? 'line-through text-slate-500' : ''
                                  }`}
                                  placeholder="Module / Unit Title"
                                />

                                {mod.source_page && (
                                  <span className="text-[10px] font-mono text-nexora-muted bg-nexora-bg/60 px-1.5 py-0.5 rounded border border-nexora-border/40 shrink-0 hidden md:inline">
                                    Page {mod.source_page}
                                  </span>
                                )}

                                {mod.review_required && (
                                  <Badge variant="warning" size="sm" className="text-[9px] bg-amber-500/20 text-amber-300 border-amber-500/40 shrink-0">
                                    Review
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                                {/* Exclude / Include Module Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateModule(subj.id, mod.id, { is_excluded: !isModExcluded })}
                                  className={`text-[11px] font-medium px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                                    isModExcluded
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      : 'text-nexora-muted hover:text-white hover:bg-nexora-elevated'
                                  }`}
                                  title={isModExcluded ? 'Click to Include' : 'Click to Exclude'}
                                >
                                  {isModExcluded ? <EyeOff className="w-3 h-3 text-rose-400" /> : <Eye className="w-3 h-3" />}
                                  <span>{isModExcluded ? 'Excluded' : 'Exclude'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setExpandedModuleId(isModExpanded ? null : mod.id)}
                                  className="text-xs text-nexora-muted hover:text-white px-2 py-1 rounded hover:bg-nexora-elevated flex items-center gap-1.5"
                                >
                                  <span>{mod.topics.length} Lessons</span>
                                  {isModExpanded ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Topics & Citations */}
                            {isModExpanded && (
                              <div className="p-4 pt-0 space-y-4 border-t border-nexora-border/40 bg-nexora-bg/30">
                                {/* Verbatim Evidence Excerpt */}
                                {mod.evidence_text && (
                                  <div className="mt-3 p-3 rounded-lg bg-nexora-elevated/70 border border-purple-500/20 text-xs text-purple-200/90 flex items-start gap-2.5">
                                    <Quote className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block mb-0.5">
                                        Unit Ground Truth Excerpt (Page {mod.source_page || 1})
                                      </span>
                                      <p className="italic text-[11px] leading-relaxed">&quot;{mod.evidence_text}&quot;</p>
                                    </div>
                                  </div>
                                )}

                                {/* Topics List */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-semibold text-nexora-muted uppercase tracking-wider block">
                                      Normalized Lesson Candidates ({mod.topics.length})
                                    </span>
                                    <span className="text-[10px] text-nexora-muted">
                                      Click candidate title to edit • Exclude unwanted subtopics
                                    </span>
                                  </div>

                                  {mod.topics.length === 0 ? (
                                    <p className="text-xs text-nexora-muted italic">No lesson candidates extracted for this unit.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {mod.topics.map((top, tIdx) => {
                                        const isTopExcluded = isModExcluded || (top.is_excluded ?? false);

                                        return (
                                          <div
                                            key={top.id || tIdx}
                                            className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs transition-colors ${
                                              isTopExcluded
                                                ? 'bg-rose-950/10 border-rose-500/20 opacity-60'
                                                : 'bg-nexora-elevated/40 border-nexora-border/50 hover:border-nexora-border'
                                            }`}
                                          >
                                            <span className="w-4 h-4 rounded-full bg-nexora-border/60 text-[10px] font-mono flex items-center justify-center text-nexora-muted shrink-0 mt-1">
                                              {tIdx + 1}
                                            </span>

                                            <div className="flex-1 min-w-0 space-y-1">
                                              {/* Editable Candidate Title */}
                                              <input
                                                type="text"
                                                value={top.lesson_candidate_title || top.title}
                                                disabled={isTopExcluded}
                                                onChange={(e) =>
                                                  handleUpdateTopic(subj.id, mod.id, top.id, {
                                                    lesson_candidate_title: e.target.value,
                                                    title: e.target.value,
                                                  })
                                                }
                                                className={`w-full px-2 py-0.5 text-xs font-medium rounded bg-nexora-bg/80 border border-nexora-border/60 text-white focus:border-purple-400 focus:outline-none ${
                                                  isTopExcluded ? 'line-through text-slate-500' : ''
                                                }`}
                                                placeholder="Lesson Title"
                                              />

                                              <div className="flex items-center gap-2 text-[10px] text-nexora-muted flex-wrap">
                                                {top.source_page && <span>Page {top.source_page}</span>}
                                                {top.confidence && <span>• {top.confidence} conf</span>}
                                                {(top.review_required || top.is_ambiguous) && (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleUpdateTopic(subj.id, mod.id, top.id, {
                                                        review_required: false,
                                                        is_ambiguous: false,
                                                      })
                                                    }
                                                    className="font-mono text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors flex items-center gap-0.5"
                                                    title="Click to mark as verified and clear warning"
                                                  >
                                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                                    <span>Dismiss Warning</span>
                                                  </button>
                                                )}
                                              </div>
                                            </div>

                                            {/* Exclude / Include Topic Checkbox */}
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleUpdateTopic(subj.id, mod.id, top.id, {
                                                  is_excluded: !isTopExcluded,
                                                })
                                              }
                                              className={`p-1 rounded text-[10px] transition-colors shrink-0 ${
                                                isTopExcluded
                                                  ? 'text-rose-400 hover:bg-rose-500/20'
                                                  : 'text-nexora-muted hover:text-white hover:bg-nexora-elevated'
                                              }`}
                                              title={isTopExcluded ? 'Click to Include' : 'Click to Exclude'}
                                            >
                                              {isTopExcluded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                          </div>
                                        );
                                      })}
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
              );
            })}

            {/* Course Outcomes & Prerequisites Traceability */}
            {editedDraft.subjects[0]?.outcomes?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-nexora-accent">
                  <Target className="w-4 h-4" />
                  <span>Course Outcomes (COs) — Verified ({editedDraft.subjects[0].outcomes.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {editedDraft.subjects[0].outcomes.map((co, idx) => (
                    <div
                      key={co.id || idx}
                      className="p-3.5 rounded-xl bg-nexora-elevated/40 border border-nexora-border/60 flex items-start gap-3"
                    >
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0 mt-0.5">
                        {co.outcome_type}
                      </span>
                      <div className="space-y-1.5 flex-1">
                        <p className="text-xs text-white/90 leading-relaxed font-medium">{co.description}</p>
                        <div className="flex items-center gap-2 text-[10px] text-nexora-muted flex-wrap">
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

            {/* Zero Hallucination Guarantee Card */}
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-3">
              <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="font-semibold text-indigo-200">Zero Hallucination Guarantee</p>
                <p className="text-indigo-300/80 mt-0.5 text-[11px]">
                  All units, topics, and outcomes above are derived directly from your official uploaded syllabus document with verified page citations. NEXORA never fabricates curriculum content.
                </p>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 px-6 border-t border-nexora-border/80 bg-nexora-elevated/60 flex items-center justify-between gap-4 shrink-0">
            <div className="text-xs text-nexora-muted flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  isAlreadyActive ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span>
                Status:{' '}
                <strong className="text-white">
                  {isAlreadyActive ? 'active (State D)' : hasUnsavedChanges ? 'unsaved changes' : editedDraft.status}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleCloseReview}>
                Close
              </Button>

              <Button
                variant="outline"
                size="sm"
                className={`text-xs ${
                  hasUnsavedChanges ? 'border-purple-500 text-purple-300 hover:bg-purple-500/20' : 'opacity-50'
                }`}
                disabled={!hasUnsavedChanges || isSaving}
                leftIcon={isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                onClick={handleSaveCorrections}
              >
                {isSaving ? 'Saving...' : 'Save Review Changes'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold shadow-lg shadow-purple-900/30"
                leftIcon={isCheckingEligibility ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                disabled={isCheckingEligibility}
                onClick={handleOpenActivationModal}
              >
                {isAlreadyActive ? 'Re-activate Curriculum' : 'Review & Activate Curriculum'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Pre-Activation Confirmation Dialog */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-nexora-surface border border-nexora-border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Confirm Curriculum Activation
                </h3>
                <p className="text-xs text-nexora-muted">
                  Translate your reviewed syllabus draft into the active learning workspace.
                </p>
              </div>
            </div>

            {/* Error or Warnings */}
            {eligibilityError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-200">Eligibility Warning</p>
                  <p className="mt-0.5">{eligibilityError}</p>
                </div>
              </div>
            )}

            {activationError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-200">Activation Error</p>
                  <p className="mt-0.5">{activationError}</p>
                </div>
              </div>
            )}

            {/* Target Breakdown Box */}
            <div className="p-4 rounded-xl bg-nexora-elevated/60 border border-nexora-border/80 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-nexora-border/60">
                <span className="text-nexora-muted">Syllabus Document</span>
                <span className="font-medium text-white truncate max-w-[220px]">
                  {version.source_filename || 'Syllabus'} (v{version.version_number})
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-nexora-border/60">
                <span className="text-nexora-muted">Academic Context</span>
                <span className="font-medium text-white">
                  {academicContext?.degree || academicContext?.program || academicContext?.institution || 'Primary Workspace'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-nexora-border/60">
                <span className="text-nexora-muted">Active Scope to Deploy</span>
                <span className="font-semibold text-purple-300">
                  {summaryMetrics.includedSubjects} Subjects • {summaryMetrics.includedModules} Units • {summaryMetrics.includedTopics} Lessons
                </span>
              </div>
              {summaryMetrics.excludedTopics > 0 && (
                <div className="flex items-center justify-between text-rose-400">
                  <span>Excluded Subtopics</span>
                  <span>{summaryMetrics.excludedTopics} items will be skipped</span>
                </div>
              )}
            </div>

            {/* Explanation Note */}
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs space-y-1.5">
              <p className="font-semibold text-indigo-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Authoritative Activation &amp; Safe Supersession
              </p>
              <p className="text-indigo-300/85 text-[11px] leading-relaxed">
                Activating will make this reviewed syllabus the authoritative curriculum for your academic workspace.
                Any previously active syllabus for this context will be preserved in your history and safely archived without data loss.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isActivating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold shadow-lg shadow-purple-900/30"
                disabled={isActivating || summaryMetrics.includedSubjects === 0}
                leftIcon={isActivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                onClick={handleConfirmActivation}
              >
                {isActivating ? 'Activating Curriculum...' : 'Confirm & Activate Curriculum'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Post-Activation Success Dialog */}
      {activationResult && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-nexora-surface border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 text-center animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Curriculum Successfully Activated!
              </h3>
              <p className="text-xs text-nexora-muted">
                Your syllabus is now the live, authoritative curriculum for your learning workspace.
              </p>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-nexora-elevated/60 border border-nexora-border/60 text-center">
              <div className="p-2 rounded-lg bg-nexora-bg/60">
                <span className="text-[10px] uppercase font-bold text-nexora-muted block">Subjects</span>
                <span className="text-base font-bold text-emerald-400">{activationResult.subjects_activated}</span>
              </div>
              <div className="p-2 rounded-lg bg-nexora-bg/60">
                <span className="text-[10px] uppercase font-bold text-nexora-muted block">Units</span>
                <span className="text-base font-bold text-purple-300">{activationResult.modules_activated}</span>
              </div>
              <div className="p-2 rounded-lg bg-nexora-bg/60">
                <span className="text-[10px] uppercase font-bold text-nexora-muted block">Lessons</span>
                <span className="text-base font-bold text-indigo-300">{activationResult.lessons_activated}</span>
              </div>
            </div>

            <p className="text-xs text-nexora-muted leading-relaxed">
              You are automatically enrolled in your new subjects. All lessons and module concepts are ready in your workspace.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs"
                onClick={() => {
                  setActivationResult(null);
                  onClose();
                  navigate('/subjects');
                }}
              >
                Explore Subjects
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto text-xs bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500"
                onClick={() => {
                  setActivationResult(null);
                  onClose();
                  navigate('/learn');
                }}
              >
                Open Learning Workspace
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
