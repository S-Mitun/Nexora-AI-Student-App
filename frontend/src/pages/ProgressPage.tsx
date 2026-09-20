import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Calendar,
  ChevronRight,
  FolderKanban,
  FileText,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAcademicContext } from '../context/AcademicContext';
import { AcademicProgressOverview, SubjectProgress } from '../types/learning';

export const ProgressPage: React.FC = () => {
  const { academicContext, isReady } = useAcademicContext();
  const [progressOverview, setProgressOverview] = useState<AcademicProgressOverview | null>(null);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeLevel = academicContext?.academic_level;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      apiService.getWorkspaceProgress().catch(() => null),
      apiService.getNotes().catch(() => []),
    ])
      .then(([prog, notes]) => {
        if (isMounted) {
          if (prog) {
            setProgressOverview(prog);
          }
          if (notes) {
            setNotesCount(notes.length);
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[ProgressPage] Failed to fetch progress:', err);
          setError('Failed to load academic progress.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeLevel, isReady]);

  const completedLessons = progressOverview?.completed_lessons_count || 0;
  const completedQuizzes = progressOverview?.completed_quizzes_count || 0;
  const activeCourses = progressOverview?.enrolled_subjects_count || 0;
  const overallPercent = progressOverview?.overall_progress_percent || 0;
  const subjectsBreakdown: SubjectProgress[] = progressOverview?.subject_progress || [];

  const hasActivity = completedLessons > 0 || completedQuizzes > 0 || notesCount > 0;

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-nexora-accent">
              Academic Mastery
            </span>
            <span className="text-xs text-nexora-muted">&bull;</span>
            <span className="text-xs text-nexora-subtext capitalize">
              {academicContext?.grade_level || 'Active Workspace'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Learning Progress
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Genuine academic metrics derived strictly from your active curriculum interactions and assessments.
          </p>
        </div>

        {academicContext?.curriculum_name && (
          <Badge variant="neutral" size="sm" className="self-start sm:self-auto">
            {academicContext.curriculum_name}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 text-nexora-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* 1. Overall Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-5 border-nexora-border/80">
              <span className="text-xs font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
                Overall Completion
              </span>
              <div className="text-3xl font-extrabold text-white">{overallPercent}%</div>
              <span className="text-[11px] text-nexora-accent font-medium mt-1 block">
                {activeCourses > 0 ? `Across ${activeCourses} Enrolled Subjects` : 'No active courses'}
              </span>
            </Card>

            <Card className="p-5 border-nexora-border/80">
              <span className="text-xs font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
                Completed Lessons
              </span>
              <div className="text-3xl font-extrabold text-white">{completedLessons}</div>
              <span className="text-[11px] text-emerald-400 font-medium mt-1 block">
                {completedLessons > 0 ? 'Verified in curriculum' : 'None completed yet'}
              </span>
            </Card>

            <Card className="p-5 border-nexora-border/80">
              <span className="text-xs font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
                Practice Checks Taken
              </span>
              <div className="text-3xl font-extrabold text-white">{completedQuizzes}</div>
              <span className="text-[11px] text-nexora-subtext font-medium mt-1 block">
                {completedQuizzes > 0 ? `${completedQuizzes} assessments recorded` : 'No checks taken'}
              </span>
            </Card>

            <Card className="p-5 border-nexora-border/80">
              <span className="text-xs font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
                Study Notes Added
              </span>
              <div className="text-3xl font-extrabold text-white">{notesCount}</div>
              <span className="text-[11px] text-indigo-300 font-medium mt-1 block">
                {notesCount > 0 ? 'Personal references' : 'No notes created'}
              </span>
            </Card>
          </div>

          {/* 2. Content Area: Real Progress or Honest Empty State */}
          {!hasActivity ? (
            <Card className="p-8 border-nexora-border/80 text-center">
              <EmptyState
                icon={<TrendingUp className="w-8 h-8 text-nexora-muted" />}
                title="No learning activity yet"
                description="Progress will appear after you start learning concepts, taking practice checks, or recording study notes."
                action={
                  <Link to="/subjects">
                    <Button variant="primary" size="md">
                      Explore Subjects to Start
                    </Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Subject Breakdown Card */}
              <Card className="border-nexora-border/80">
                <CardHeader className="pb-3 border-b border-nexora-border/40">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-nexora-primary" />
                    Enrolled Subject Mastery ({subjectsBreakdown.length})
                  </CardTitle>
                  <CardDescription>Topic mastery within your active academic context</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {subjectsBreakdown.length === 0 ? (
                    <div className="text-center text-xs text-nexora-muted py-4">
                      No subject breakdown available. Enroll in curriculum subjects to track breakdown.
                    </div>
                  ) : (
                    subjectsBreakdown.map((subj) => (
                      <div key={subj.subject_id} className="space-y-1.5 p-3 rounded-xl bg-nexora-bg/60 border border-nexora-border/50">
                        <div className="flex justify-between text-xs font-semibold text-white">
                          <span>{subj.subject_name}</span>
                          <span className="text-nexora-accent">{subj.progress_percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-nexora-elevated rounded-full overflow-hidden">
                          <div
                            className="h-full bg-nexora-primary rounded-full transition-all"
                            style={{ width: `${subj.progress_percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-nexora-muted">
                          <span>{subj.completed_topics_count} of {subj.total_topics_count} concepts verified</span>
                          <Link to={`/subjects`} className="text-nexora-primary hover:underline">View</Link>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
