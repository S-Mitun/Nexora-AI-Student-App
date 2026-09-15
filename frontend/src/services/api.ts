import axios from 'axios';
import { env } from '../config/env';
import { BackendHealth, Subject, ConceptExploreResult } from '../types/learning';

export const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
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
};
