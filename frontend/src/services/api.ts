import axios from 'axios';
import { env } from '../config/env';
import {
  BackendHealth,
  Subject,
  SubjectDetail,
  TopicDetail,
  ConceptDetail,
  LearningModuleDetail,
  LessonDetail,
  ConceptExploreResult,
} from '../types/learning';
import { StudentProfile } from '../types/auth';

export const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentAccessToken: string | null = null;

export const setApiAccessToken = (token: string | null) => {
  currentAccessToken = token;
};

// Automatic Authorization Bearer interceptor
apiClient.interceptors.request.use((config) => {
  const token = currentAccessToken || localStorage.getItem('nexora_access_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  async getHealth(): Promise<BackendHealth> {
    const response = await apiClient.get<BackendHealth>('/health');
    return response.data;
  },

  async getSubjects(params?: { curriculum_id?: string; education_level?: string }): Promise<Subject[]> {
    const response = await apiClient.get<Subject[]>('/api/v1/learning/subjects', { params });
    return response.data;
  },

  // --- ACADEMIC WORKSPACE & ENROLLMENT (PROMPT 06) ---
  async getWorkspace(): Promise<import('../types/learning').WorkspaceOverview> {
    const response = await apiClient.get<import('../types/learning').WorkspaceOverview>('/api/v1/workspace');
    return response.data;
  },

  async enrollSubject(subjectId: string, enrollmentSource: string = 'student_selected'): Promise<import('../types/learning').StudentSubject> {
    const response = await apiClient.post<import('../types/learning').StudentSubject>(
      '/api/v1/workspace/enroll-subject',
      { subject_id: subjectId, enrollment_source: enrollmentSource }
    );
    return response.data;
  },

  async unenrollSubject(subjectId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/workspace/enroll-subject/${encodeURIComponent(subjectId)}`
    );
    return response.data;
  },

  async getAcademicContext(params?: { active_subject?: string; active_concept?: string }): Promise<import('../types/context').AcademicContextResponse> {
    const response = await apiClient.get<import('../types/context').AcademicContextResponse>('/api/v1/workspace/context', { params });
    return response.data;
  },

  async getEnrolledSubjects(): Promise<Subject[]> {
    const response = await apiClient.get<Subject[]>('/api/v1/workspace/enrolled-subjects');
    return response.data;
  },

  async getSubject(slugOrId: string): Promise<SubjectDetail> {
    const response = await apiClient.get<SubjectDetail>(`/api/v1/learning/subjects/${encodeURIComponent(slugOrId)}`);
    return response.data;
  },

  async getTopic(slugOrId: string): Promise<TopicDetail> {
    const response = await apiClient.get<TopicDetail>(`/api/v1/learning/topics/${encodeURIComponent(slugOrId)}`);
    return response.data;
  },

  async getConcept(slugOrId: string): Promise<ConceptDetail> {
    const response = await apiClient.get<ConceptDetail>(`/api/v1/learning/concepts/${encodeURIComponent(slugOrId)}`);
    return response.data;
  },

  async getModule(slugOrId: string): Promise<LearningModuleDetail> {
    const response = await apiClient.get<LearningModuleDetail>(`/api/v1/learning/modules/${encodeURIComponent(slugOrId)}`);
    return response.data;
  },

  async getLesson(slugOrId: string): Promise<LessonDetail> {
    const response = await apiClient.get<LessonDetail>(`/api/v1/learning/lessons/${encodeURIComponent(slugOrId)}`);
    return response.data;
  },

  async exploreConcept(
    query: string,
    subjectHint?: string,
    interestHint?: string
  ): Promise<ConceptExploreResult> {
    const response = await apiClient.post<ConceptExploreResult>('/api/v1/learning/explore', {
      query,
      subject_hint: subjectHint,
      interest_hint: interestHint,
    });
    return response.data;
  },

  async getRecommendations(): Promise<import('../types/learning').RecommendedTopic[]> {
    const response = await apiClient.get<import('../types/learning').RecommendedTopic[]>(
      '/api/v1/learning/recommendations'
    );
    return response.data;
  },

  async getPerspectives(conceptSlug: string): Promise<import('../types/learning').PersonalizedContext[]> {
    const response = await apiClient.get<import('../types/learning').PersonalizedContext[]>(
      `/api/v1/learning/perspectives/${encodeURIComponent(conceptSlug)}`
    );
    return response.data;
  },

  async getAuthMe(): Promise<{ id: string; email?: string; role: string; is_authenticated: boolean }> {
    const response = await apiClient.get('/api/v1/auth/me');
    return response.data;
  },

  async getProfile(): Promise<StudentProfile> {
    const response = await apiClient.get<StudentProfile>('/api/v1/profile');
    return response.data;
  },

  async updateProfile(updates: Partial<StudentProfile>): Promise<StudentProfile> {
    const response = await apiClient.put<StudentProfile>('/api/v1/profile', updates);
    return response.data;
  },

  async getPreferences(): Promise<import('../types/auth').StudentPreferences> {
    const response = await apiClient.get<import('../types/auth').StudentPreferences>(
      '/api/v1/profile/preferences'
    );
    return response.data;
  },

  async updatePreferences(
    prefs: Partial<import('../types/auth').StudentPreferences>
  ): Promise<import('../types/auth').StudentPreferences> {
    const response = await apiClient.patch<import('../types/auth').StudentPreferences>(
      '/api/v1/profile/preferences',
      prefs
    );
    return response.data;
  },

  async resetPreferences(): Promise<import('../types/auth').StudentPreferences> {
    const response = await apiClient.post<import('../types/auth').StudentPreferences>(
      '/api/v1/profile/preferences/reset'
    );
    return response.data;
  },

  // --- CURRICULUM DECOUPLING ---
  async getCurricula(educationLevel?: string): Promise<import('../types/learning').Curriculum[]> {
    const params = educationLevel ? { education_level: educationLevel } : {};
    const response = await apiClient.get<import('../types/learning').Curriculum[]>(
      '/api/v1/learning/curricula',
      { params }
    );
    return response.data;
  },

  // --- ASYNCHRONOUS DOCUMENT INGESTION & MATERIALS ---
  async getDocuments(): Promise<import('../types/learning').StudyMaterialDocument[]> {
    const response = await apiClient.get<import('../types/learning').StudyMaterialDocument[]>(
      '/api/v1/documents'
    );
    return response.data;
  },

  async uploadDocument(formData: FormData): Promise<{
    id: string;
    title: string;
    status: string;
    processing_stage: string;
    progress_percent: number;
    message: string;
    status_url: string;
  }> {
    const response = await apiClient.post('/api/v1/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getDocumentStatus(id: string): Promise<{
    id: string;
    status: string;
    processing_stage: string;
    progress_percent: number;
    error_message?: string;
    updated_at: string;
  }> {
    const response = await apiClient.get(`/api/v1/documents/${encodeURIComponent(id)}/status`);
    return response.data;
  },

  async deleteDocument(id: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete(`/api/v1/documents/${encodeURIComponent(id)}`);
    return response.data;
  },

  // --- REAL STUDENT-OWNED NOTES (PROMPT 06) ---
  async getNotes(params?: {
    academic_level?: string;
    subject_id?: string;
    concept_id?: string;
    tag?: string;
    is_pinned?: boolean;
  }): Promise<import('../types/learning').StudentNote[]> {
    const response = await apiClient.get<import('../types/learning').StudentNote[]>('/api/v1/notes', { params });
    return response.data;
  },

  async getNote(id: string): Promise<import('../types/learning').StudentNote> {
    const response = await apiClient.get<import('../types/learning').StudentNote>(`/api/v1/notes/${encodeURIComponent(id)}`);
    return response.data;
  },

  async createNote(note: {
    title: string;
    content: string;
    subject_id?: string | null;
    concept_id?: string | null;
    lesson_id?: string | null;
    academic_level?: string;
    tags?: string[];
    source_reference?: string | null;
    is_pinned?: boolean;
  }): Promise<import('../types/learning').StudentNote> {
    const response = await apiClient.post<import('../types/learning').StudentNote>('/api/v1/notes', note);
    return response.data;
  },

  async updateNote(
    id: string,
    updates: Partial<{
      title: string;
      content: string;
      subject_id?: string | null;
      concept_id?: string | null;
      tags: string[];
      source_reference?: string | null;
      is_pinned: boolean;
      is_archived: boolean;
    }>
  ): Promise<import('../types/learning').StudentNote> {
    const response = await apiClient.put<import('../types/learning').StudentNote>(`/api/v1/notes/${encodeURIComponent(id)}`, updates);
    return response.data;
  },

  async deleteNote(id: string): Promise<{ success: boolean; message: string; id: string }> {
    const response = await apiClient.delete(`/api/v1/notes/${encodeURIComponent(id)}`);
    return response.data;
  },

  async togglePinNote(id: string): Promise<import('../types/learning').StudentNote> {
    const response = await apiClient.patch<import('../types/learning').StudentNote>(`/api/v1/notes/${encodeURIComponent(id)}/pin`);
    return response.data;
  },

  // --- PRACTICE SETS & EVALUATION (PROMPT 06) ---
  async getPracticeSets(params?: {
    academic_level?: string;
    subject_id?: string;
    concept_id?: string;
  }): Promise<import('../types/learning').PracticeSet[]> {
    const response = await apiClient.get<import('../types/learning').PracticeSet[]>('/api/v1/learning/practice/sets', { params });
    return response.data;
  },

  async getPracticeSet(setId: string): Promise<import('../types/learning').PracticeSet> {
    const response = await apiClient.get<import('../types/learning').PracticeSet>(`/api/v1/learning/practice/sets/${encodeURIComponent(setId)}`);
    return response.data;
  },

  async submitPractice(submission: {
    set_id: string;
    answers: { question_id: string; selected_index: number }[];
  }): Promise<import('../types/learning').PracticeResult> {
    const response = await apiClient.post<import('../types/learning').PracticeResult>('/api/v1/learning/practice/submit', submission);
    return response.data;
  },

  // --- WORKSPACE ACTIVITY & PROGRESS (PROMPT 06) ---
  async getWorkspaceActivity(limit: number = 20): Promise<import('../types/learning').AcademicActivityLog[]> {
    const response = await apiClient.get<import('../types/learning').AcademicActivityLog[]>('/api/v1/workspace/activity', {
      params: { limit },
    });
    return response.data;
  },

  async logWorkspaceActivity(activity: {
    activity_type: string;
    title: string;
    description?: string;
    subject_id?: string;
    concept_id?: string;
    lesson_id?: string;
    meta?: Record<string, any>;
  }): Promise<import('../types/learning').AcademicActivityLog> {
    const response = await apiClient.post<import('../types/learning').AcademicActivityLog>('/api/v1/workspace/activity', activity);
    return response.data;
  },

  async getWorkspaceProgress(): Promise<import('../types/learning').AcademicProgressOverview> {
    const response = await apiClient.get<import('../types/learning').AcademicProgressOverview>('/api/v1/workspace/progress');
    return response.data;
  },

  // --- UNIVERSAL SYLLABUS & VERSION LIFECYCLE (MASTER PROMPT 02R) ---
  async uploadSyllabus(formData: FormData): Promise<import('../types/syllabus').SyllabusUploadResponse> {
    const response = await apiClient.post<import('../types/syllabus').SyllabusUploadResponse>(
      '/api/v1/syllabi',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  // --- SYLLABUS UPLOAD & CANONICAL STATE LIFECYCLE (PROMPTS 02R & 02R-A) ---
  async getSyllabusState(academicContextId?: string): Promise<import('../types/syllabus').SyllabusCanonicalState> {
    const params = academicContextId ? { academic_context_id: academicContextId } : {};
    const response = await apiClient.get<import('../types/syllabus').SyllabusCanonicalState>('/api/v1/syllabi/state', { params });
    return response.data;
  },

  async getSyllabi(academicLevel?: string): Promise<import('../types/syllabus').Syllabus[]> {
    const response = await apiClient.get<import('../types/syllabus').Syllabus[]>('/api/v1/syllabi', {
      params: academicLevel ? { academic_level: academicLevel } : undefined,
    });
    return response.data;
  },

  async getSyllabus(syllabusId: string): Promise<import('../types/syllabus').Syllabus> {
    const response = await apiClient.get<import('../types/syllabus').Syllabus>(
      `/api/v1/syllabi/${encodeURIComponent(syllabusId)}`
    );
    return response.data;
  },

  async getSyllabusVersions(syllabusId: string): Promise<import('../types/syllabus').SyllabusVersion[]> {
    const response = await apiClient.get<import('../types/syllabus').SyllabusVersion[]>(
      `/api/v1/syllabi/${encodeURIComponent(syllabusId)}/versions`
    );
    return response.data;
  },

  async uploadSyllabusVersion(
    syllabusId: string,
    formData: FormData
  ): Promise<import('../types/syllabus').SyllabusUploadResponse> {
    const response = await apiClient.post<import('../types/syllabus').SyllabusUploadResponse>(
      `/api/v1/syllabi/${encodeURIComponent(syllabusId)}/versions`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  async activateSyllabusVersion(
    syllabusId: string,
    versionId: string
  ): Promise<import('../types/syllabus').Syllabus> {
    const response = await apiClient.patch<import('../types/syllabus').Syllabus>(
      `/api/v1/syllabi/${encodeURIComponent(syllabusId)}/versions/${encodeURIComponent(versionId)}/activate`
    );
    return response.data;
  },

  async archiveSyllabusVersion(
    syllabusId: string,
    versionId: string
  ): Promise<import('../types/syllabus').SyllabusVersion> {
    const response = await apiClient.patch<import('../types/syllabus').SyllabusVersion>(
      `/api/v1/syllabi/${encodeURIComponent(syllabusId)}/versions/${encodeURIComponent(versionId)}/archive`
    );
    return response.data;
  },

  async deleteSyllabus(syllabusId: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete<{ message: string; id: string }>(
      `/api/v1/syllabi/${encodeURIComponent(syllabusId)}`
    );
    return response.data;
  },

  async downloadSyllabusFile(syllabusId: string, versionId: string, filename: string): Promise<void> {
    const response = await apiClient.get(
      `/api/v1/syllabi/${encodeURIComponent(syllabusId)}/versions/${encodeURIComponent(versionId)}/download`,
      { responseType: 'blob' }
    );
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },
};


