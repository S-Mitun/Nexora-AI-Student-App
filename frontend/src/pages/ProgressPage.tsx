import React, { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import {
  studentActivityService,
  OverallStudentProgress,
  CompletedTopicRecord,
  PracticeAttemptRecord,
} from '../services/studentActivity';

export const ProgressPage: React.FC = () => {
  const [overall] = useState<OverallStudentProgress>(() => studentActivityService.getOverallProgress());
  const [completedTopics] = useState<CompletedTopicRecord[]>(() => studentActivityService.getCompletedLessons());
  const [recentPractice] = useState<PracticeAttemptRecord[]>(() => studentActivityService.getPracticeAttempts());

  const notesCount = (() => {
    try {
      const raw = localStorage.getItem('nexora_student_notes');
      return raw ? JSON.parse(raw).length : 0;
    } catch {
      return 0;
    }
  })();

  const averageAccuracy = (() => {
    if (recentPractice.length === 0) return '0%';
    const totalScore = recentPractice.reduce((sum, p) => sum + p.score, 0);
    const totalQuestions = recentPractice.reduce((sum, p) => sum + p.totalQuestions, 0);
    if (totalQuestions === 0) return '0%';
    return `${Math.round((totalScore / totalQuestions) * 100)}%`;
  })();

  const hasActivity = completedTopics.length > 0 || recentPractice.length > 0 || notesCount > 0;

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Learning Progress
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Track your course completions, practice question accuracy, and study history.
          </p>
        </div>
      </div>

      {/* 1. Overall Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5 border-nexora-border/80">
          <span className="text-xs font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
            Overall Completion
          </span>
          <div className="text-3xl font-extrabold text-white">{overall.overallProgressPercent}%</div>
          <span className="text-[11px] text-nexora-accent font-medium mt-1 block">
            {overall.activeSubjects > 0 ? `Across ${overall.activeSubjects} Courses` : 'No active courses'}
          </span>
        </Card>

        <Card className="p-5 border-nexora-border/80">
          <span className="text-xs font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
            Completed Lessons
          </span>
          <div className="text-3xl font-extrabold text-white">{overall.completedLessons}</div>
          <span className="text-[11px] text-emerald-400 font-medium mt-1 block">
            {overall.completedLessons > 0 ? 'Verified in syllabus' : 'None completed yet'}
          </span>
        </Card>

        <Card className="p-5 border-nexora-border/80">
          <span className="text-xs font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
            Practice Accuracy
          </span>
          <div className="text-3xl font-extrabold text-white">{averageAccuracy}</div>
          <span className="text-[11px] text-nexora-subtext font-medium mt-1 block">
            {overall.completedQuizzes > 0 ? `${overall.completedQuizzes} checks completed` : 'No checks taken'}
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
            title="No progress recorded yet"
            description="Your course completions, practice question accuracy, and study history will appear here as you learn."
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completed Topics */}
          <Card className="border-nexora-border/80">
            <CardHeader className="pb-3 border-b border-nexora-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Completed Topics ({completedTopics.length})
              </CardTitle>
              <CardDescription>Verified curriculum lessons</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-nexora-border/40">
              {completedTopics.length === 0 ? (
                <div className="p-6 text-center text-xs text-nexora-muted">
                  No completed lessons yet. Start a lesson to track completion.
                </div>
              ) : (
                completedTopics.map((topic) => (
                  <div key={topic.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-medium text-white truncate">
                        {topic.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-nexora-primary font-medium">{topic.subject}</span>
                        <span className="text-xs text-nexora-border">&bull;</span>
                        <span className="text-[10px] text-nexora-muted">{topic.completedOn}</span>
                      </div>
                    </div>
                    <Badge variant="success" size="sm" className="shrink-0">
                      {topic.score || 'Completed'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Practice Activity */}
          <Card className="border-nexora-border/80">
            <CardHeader className="pb-3 border-b border-nexora-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-nexora-accent" />
                  Recent Practice Checks ({recentPractice.length})
                </CardTitle>
                <Link to="/practice">
                  <Button variant="ghost" size="sm">
                    Practice Now
                  </Button>
                </Link>
              </div>
              <CardDescription>Targeted retention quiz sets</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-nexora-border/40">
              {recentPractice.length === 0 ? (
                <div className="p-6 text-center text-xs text-nexora-muted">
                  No practice attempts yet. Try a concept check question in Practice.
                </div>
              ) : (
                recentPractice.map((prac) => (
                  <div key={prac.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-medium text-white truncate">
                        {prac.topic}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-nexora-primary font-medium">{prac.subject}</span>
                        <span className="text-xs text-nexora-border">&bull;</span>
                        <span className="text-[10px] text-nexora-muted">{prac.date}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-emerald-400 block">{prac.accuracy}</span>
                      <span className="text-[10px] text-nexora-muted">Score: {prac.score}/{prac.totalQuestions}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
