import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useAcademicContext } from './AcademicContext';
import { apiService } from '../services/api';
import { SyllabusCanonicalState } from '../types/syllabus';

interface SyllabusContextType {
  syllabusState: SyllabusCanonicalState | null;
  hasSyllabus: boolean;
  isCurriculumActive: boolean;
  curriculumStatus: string;
  uploadStatus: string | null;
  processingStatus: string;
  loading: boolean;
  error: string | null;
  refreshSyllabusState: () => Promise<void>;
}

const SyllabusContext = createContext<SyllabusContextType | undefined>(undefined);

export const SyllabusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { academicContext } = useAcademicContext();
  const [syllabusState, setSyllabusState] = useState<SyllabusCanonicalState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const latestReqIdRef = useRef<number>(0);

  const activeContextId = academicContext?.context_id;

  const refreshSyllabusState = useCallback(async () => {
    if (!user) {
      setSyllabusState(null);
      setLoading(false);
      return;
    }

    const reqId = ++latestReqIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const state = await apiService.getSyllabusState(activeContextId);
      // Discard response if a newer request was initiated (Request Race Protection)
      if (reqId !== latestReqIdRef.current) return;

      setSyllabusState(state);
    } catch (err: any) {
      if (reqId === latestReqIdRef.current) {
        console.error('[SyllabusContext] Failed to load canonical syllabus state:', err);
        setError(err.response?.data?.detail || 'Failed to load syllabus state.');
      }
    } finally {
      if (reqId === latestReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [user, activeContextId]);

  useEffect(() => {
    refreshSyllabusState();
  }, [refreshSyllabusState]);

  const hasSyllabus = Boolean(syllabusState?.has_syllabus);
  const isCurriculumActive = Boolean(syllabusState?.is_curriculum_active);
  const curriculumStatus = syllabusState?.curriculum_status || 'none';
  const uploadStatus = syllabusState?.upload_status || null;
  const processingStatus = syllabusState?.processing_status || 'not_started';

  return (
    <SyllabusContext.Provider
      value={{
        syllabusState,
        hasSyllabus,
        isCurriculumActive,
        curriculumStatus,
        uploadStatus,
        processingStatus,
        loading,
        error,
        refreshSyllabusState,
      }}
    >
      {children}
    </SyllabusContext.Provider>
  );
};

export const useSyllabus = () => {
  const context = useContext(SyllabusContext);
  if (!context) {
    throw new Error('useSyllabus must be used within a SyllabusProvider');
  }
  return context;
};
