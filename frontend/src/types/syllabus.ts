export interface SyllabusVersion {
  id: string;
  syllabus_id: string;
  version_number: number;
  status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'active' | 'archived' | string;
  upload_status?: 'pending' | 'uploaded' | 'verified' | 'failed' | string;
  processing_status?: 'not_started' | 'processing' | 'completed' | 'failed' | string;
  curriculum_status?: 'not_built' | 'draft' | 'review_required' | 'active' | 'archived' | string;
  source_filename?: string;
  file_size_bytes: number;
  mime_type?: string;
  checksum?: string;
  storage_path?: string;
  error_message?: string;
  document_id?: string;
  is_active: boolean;
  activated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Syllabus {
  id: string;
  user_id: string;
  title: string;
  academic_level: string;
  academic_context_id?: string;
  institution?: string;
  program_degree?: string;
  academic_year?: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'active' | 'archived' | string;
  created_at: string;
  updated_at: string;
  active_version?: SyllabusVersion;
  versions: SyllabusVersion[];
}

export interface SyllabusUploadResponse {
  syllabus_id: string;
  version_id: string;
  document_id: string;
  title: string;
  filename: string;
  status: string;
  version_number: number;
  checksum: string;
  academic_context_id?: string;
  is_duplicate: boolean;
  message: string;
}

export interface SyllabusCanonicalState {
  has_syllabus: boolean;
  syllabus_id: string | null;
  current_version_id: string | null;
  academic_context_id: string | null;
  upload_status: 'pending' | 'uploaded' | 'verified' | 'failed' | string | null;
  processing_status: 'not_started' | 'processing' | 'completed' | 'failed' | string;
  curriculum_status: 'none' | 'not_built' | 'draft' | 'review_required' | 'active' | 'archived' | string;
  is_curriculum_active: boolean;
  title: string | null;
  active_version_number: number | null;
  source_filename: string | null;
  document_role?: string;
  has_draft?: boolean;
  draft_id?: string | null;
  updated_at?: string | null;
}

export type SyllabusLifecycleState =
  | 'NO_SYLLABUS'
  | 'PROCESSING'
  | 'UPLOADED_PENDING'
  | 'DRAFT_READY_FOR_REVIEW'
  | 'WAITING_FOR_ACTIVATION'
  | 'ACTIVE_CURRICULUM';

export function computeSyllabusLifecycleState(state: SyllabusCanonicalState | null): SyllabusLifecycleState {
  if (!state || !state.has_syllabus) {
    return 'NO_SYLLABUS';
  }
  if (state.is_curriculum_active && state.curriculum_status === 'active') {
    return 'ACTIVE_CURRICULUM';
  }
  if (state.has_draft || state.curriculum_status === 'review_required' || state.curriculum_status === 'draft') {
    return 'DRAFT_READY_FOR_REVIEW';
  }
  if (state.processing_status === 'processing' || state.upload_status === 'processing') {
    return 'PROCESSING';
  }
  if (state.processing_status === 'completed' && !state.is_curriculum_active) {
    return 'WAITING_FOR_ACTIVATION';
  }
  return 'UPLOADED_PENDING';
}

export interface SyllabusDraftPrerequisite {
  id: string;
  draft_id: string;
  draft_subject_id: string;
  source_module_id?: string | null;
  target_module_id?: string | null;
  source_topic_id?: string | null;
  target_topic_id?: string | null;
  title: string;
  description?: string | null;
  prerequisite_type: 'explicit' | 'inferred' | string;
  confidence: 'high' | 'medium' | 'low' | string;
  evidence_text?: string | null;
  review_required: boolean;
}

export interface SyllabusDraftTopic {
  id: string;
  title: string;
  is_lesson_candidate?: boolean;
  lesson_candidate_title?: string | null;
  source_section_id?: string | null;
  source_page?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  evidence_text?: string | null;
  confidence: 'high' | 'medium' | 'low' | string;
  review_required?: boolean;
  is_ambiguous?: boolean;
  ambiguity_reason?: string | null;
  sort_order: number;
}

export interface SyllabusDraftModule {
  id: string;
  title: string;
  display_label: string;
  original_label?: string | null;
  sequence_order?: number;
  source_section_id?: string | null;
  source_page?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  evidence_text?: string | null;
  confidence: 'high' | 'medium' | 'low' | string;
  review_required?: boolean;
  is_ambiguous?: boolean;
  sort_order: number;
  topics: SyllabusDraftTopic[];
  lesson_candidates?: SyllabusDraftTopic[];
  outcomes?: SyllabusDraftOutcome[];
}

export interface SyllabusDraftOutcome {
  id: string;
  outcome_type: string;
  scope?: 'course' | 'subject' | 'module' | 'lesson' | string;
  scope_level?: 'course' | 'subject' | 'module' | 'lesson' | string;
  origin?: 'explicit' | 'inferred' | string;
  draft_module_id?: string | null;
  description: string;
  source_section_id?: string | null;
  source_page?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  evidence_text?: string | null;
  confidence: 'high' | 'medium' | 'low' | string;
  review_required?: boolean;
  sort_order?: number;
}

export interface SyllabusDraftSubject {
  id: string;
  name: string;
  code?: string | null;
  credits?: string | null;
  semester?: string | null;
  source_section_id?: string | null;
  source_page?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  evidence_text?: string | null;
  confidence: 'high' | 'medium' | 'low' | string;
  review_required?: boolean;
  is_ambiguous?: boolean;
  sort_order: number;
  modules: SyllabusDraftModule[];
  outcomes: SyllabusDraftOutcome[];
  prerequisites?: SyllabusDraftPrerequisite[];
}

export interface SyllabusCurriculumDraft {
  id: string;
  syllabus_version_id: string;
  syllabus_id: string;
  title: string;
  academic_level: string;
  institution?: string | null;
  raw_text_summary?: string | null;
  overall_confidence: 'high' | 'medium' | 'low' | string;
  status: 'draft' | 'review_required' | 'approved' | 'rejected' | string;
  compilation_status?: 'not_started' | 'queued' | 'compiling' | 'draft_ready' | 'failed' | string;
  compilation_version?: number;
  compilation_error?: string | null;
  compiled_at?: string | null;
  subjects: SyllabusDraftSubject[];
  prerequisites?: SyllabusDraftPrerequisite[];
  created_at: string;
  updated_at: string;
}

export interface SyllabusProcessingJob {
  id: string;
  syllabus_id?: string | null;
  version_id?: string | null;
  syllabus_version_id?: string | null;
  status: 'queued' | 'extracting' | 'analyzing' | 'completed' | 'failed' | string;
  stage: string;
  error_message?: string | null;
  progress_percent: number;
  total_pages: number;
  processed_pages: number;
  started_at: string;
  completed_at?: string | null;
}

export interface SyllabusCompilationResult {
  draft_id: string;
  syllabus_version_id: string;
  compilation_status: string;
  compilation_version: number;
  subject_count: number;
  module_count: number;
  lesson_candidate_count: number;
  outcome_count: number;
  prerequisite_count: number;
  review_required_count: number;
  is_curriculum_active: boolean;
  message: string;
}

