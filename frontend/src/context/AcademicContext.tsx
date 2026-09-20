import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiService } from '../services/api';
import { AcademicContextResponse } from '../types/context';
import { Subject } from '../types/learning';

interface AcademicContextType {
  academicContext: AcademicContextResponse | null;
  enrolledSubjects: Subject[];
  activeSubject: Subject | null;
  loading: boolean;
  isReady: boolean;
  error: string | null;
  setActiveSubject: (subject: Subject | null) => void;
  refreshAcademicContext: (pointers?: { active_subject?: string; active_concept?: string }) => Promise<void>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export const AcademicContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [academicContext, setAcademicContext] = useState<AcademicContextResponse | null>(null);
  const [enrolledSubjects, setEnrolledSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestReqIdRef = React.useRef(0);

  const refreshAcademicContext = useCallback(async (pointers?: { active_subject?: string; active_concept?: string }) => {
    if (!user) {
      setAcademicContext(null);
      setEnrolledSubjects([]);
      setActiveSubject(null);
      setLoading(false);
      return;
    }

    const reqId = ++latestReqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const [ctx, enrolled] = await Promise.all([
        apiService.getAcademicContext(pointers),
        apiService.getEnrolledSubjects().catch(() => [] as Subject[]),
      ]);

      // Discard response if a newer context refresh was initiated
      if (reqId !== latestReqIdRef.current) return;

      setAcademicContext(ctx);
      setEnrolledSubjects(enrolled);

      // Reset or align active subject
      if (enrolled.length > 0) {
        if (!activeSubject || !enrolled.some((s) => s.id === activeSubject.id)) {
          setActiveSubject(enrolled[0]);
        }
      } else {
        setActiveSubject(null);
      }
    } catch (err: any) {
      if (reqId === latestReqIdRef.current) {
        console.error('[AcademicContext] Failed to load academic context:', err);
        setError(err.response?.data?.detail || 'Failed to load academic context.');
      }
    } finally {
      if (reqId === latestReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [user, profile?.education_level, profile?.education_category, profile?.curriculum_id]);

  useEffect(() => {
    refreshAcademicContext();
  }, [refreshAcademicContext]);

  return (
    <AcademicContext.Provider
      value={{
        academicContext,
        enrolledSubjects,
        activeSubject,
        loading,
        isReady: !loading && academicContext !== null,
        error,
        setActiveSubject,
        refreshAcademicContext,
      }}
    >
      {children}
    </AcademicContext.Provider>
  );
};

export const useAcademicContext = () => {
  const context = useContext(AcademicContext);
  if (!context) {
    throw new Error('useAcademicContext must be used within an AcademicContextProvider');
  }
  return context;
};
