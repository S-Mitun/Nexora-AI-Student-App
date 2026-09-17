import axios from 'axios';
import { env } from '../config/env';
import { BackendHealth, Subject, ConceptExploreResult } from '../types/learning';
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

  async exploreConcept(query: string, subjectHint?: string): Promise<ConceptExploreResult> {
    const response = await apiClient.post<ConceptExploreResult>('/api/v1/learning/explore', {
      query,
      subject_hint: subjectHint,
    });
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
};
