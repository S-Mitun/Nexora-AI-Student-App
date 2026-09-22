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
  file_size_bytes: number | null;
  document_role?: string;
  updated_at?: string | null;
}
