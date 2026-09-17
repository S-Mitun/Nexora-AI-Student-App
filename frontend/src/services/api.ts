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

  async getSubjects(): Promise<Subject[]> {
    const response = await apiClient.get<Subject[]>('/api/v1/learning/subjects');
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
};
