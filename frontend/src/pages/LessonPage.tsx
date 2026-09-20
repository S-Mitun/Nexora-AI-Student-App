import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Sparkles,
  Gamepad2,
  Car,
  Activity,
  Compass,
  CheckCircle2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { apiService } from '../services/api';
import { LessonDetail } from '../types/learning';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

import { AcademicContentRenderer } from '../components/common/AcademicContentRenderer';

export const LessonPage: React.FC = () => {
  const { lessonSlug, moduleId } = useParams<{ lessonSlug: string; moduleId?: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonSlug) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    apiService
      .getLesson(lessonSlug)
      .then((data) => {
        if (isMounted) {
          setLesson(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || `Lesson '${lessonSlug}' not found.`);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lessonSlug]);

  const getContentTypeBadge = (contentType: string) => {
    switch (contentType?.toLowerCase()) {
      case 'explanation':
        return <Badge variant="primary" size="sm">Core Theory</Badge>;
      case 'example':
        return <Badge variant="accent" size="sm">Example Walkthrough</Badge>;
      case 'key_points':
        return <Badge variant="success" size="sm">Key Takeaways</Badge>;
      case 'visual':
        return <Badge variant="warning" size="sm">Visual</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Lesson</Badge>;
    }
  };

  const getInterestIcon = (interest: string) => {
    switch (interest.toLowerCase()) {
      case 'gaming':
        return <Gamepad2 className="w-4 h-4 text-purple-400" />;
      case 'cars':
        return <Car className="w-4 h-4 text-red-400" />;
      case 'cricket':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
        <div className="h-6 w-48 bg-nexora-surface rounded-lg animate-pulse" />
        <div className="h-28 bg-nexora-surface rounded-2xl animate-pulse" />
        <div className="h-64 bg-nexora-surface rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-nexora-muted" />}
          title="Lesson Not Found"
          description={error || "The requested educational lesson could not be loaded."}
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/subjects')}>
              Browse Subjects
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fadeIn pb-12">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-nexora-subtext flex-wrap">
        <Link to="/subjects" className="hover:text-white transition-colors">
          Subjects
        </Link>
        {lesson.subject_slug && (
          <>
            <span>/</span>
            <Link to={`/subjects/${lesson.subject_slug}`} className="hover:text-white transition-colors">
              {lesson.subject_name || 'Subject'}
            </Link>
          </>
        )}
        {lesson.concept_slug && (
          <>
            <span>/</span>
            <Link to={`/concepts/${lesson.concept_slug}`} className="hover:text-white transition-colors">
              {lesson.concept_name || 'Concept'}
            </Link>
          </>
        )}
        {lesson.module_id && (
          <>
            <span>/</span>
            <Link to={`/modules/${lesson.module_id}`} className="hover:text-white transition-colors">
              {lesson.module_title || 'Module'}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-white font-medium truncate max-w-[200px]">{lesson.title}</span>
      </div>

      {/* Lesson Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-nexora-surface to-nexora-elevated/40 border border-nexora-border/70 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {getContentTypeBadge(lesson.content_type)}
            <Badge variant="neutral" size="sm" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lesson.estimated_minutes || 5} mins reading
            </Badge>
          </div>

          {lesson.concept_name && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/learn?q=${encodeURIComponent(lesson.concept_name!)}`)}
              leftIcon={<Sparkles className="w-4 h-4 text-nexora-accent" />}
              className="border border-nexora-border/60 text-xs"
            >
              Launch Interactive Simulation
            </Button>
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {lesson.title}
          </h1>
          {lesson.module_title && (
            <p className="text-xs text-nexora-muted">
              Unit: {lesson.module_title}
            </p>
          )}
        </div>
      </div>

      {/* Prompt 04 Personalization Card (if student has registered interests) */}
      {lesson.personalized_context && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-950/30 via-nexora-surface to-nexora-surface border border-purple-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
              {getInterestIcon(lesson.personalized_context.interest)}
            </span>
            <span className="text-xs font-semibold text-purple-300">
              Tailored Perspective: {lesson.personalized_context.interest}
            </span>
            <Badge variant="accent" size="sm" className="text-[10px]">
              Prompt 04 Lens
            </Badge>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm sm:text-base font-semibold text-white">
              {lesson.personalized_context.headline}
            </h4>
            <div className="text-xs text-nexora-subtext leading-relaxed">
              <AcademicContentRenderer content={lesson.personalized_context.analogy_explanation} compact />
            </div>
          </div>

          {lesson.personalized_context.real_world_application && (
            <div className="pt-2 border-t border-purple-500/20 flex flex-col gap-1 text-xs text-purple-200/80">
              <span className="font-semibold text-purple-300">Real-World Application:</span>
              <AcademicContentRenderer content={lesson.personalized_context.real_world_application} compact />
            </div>
          )}
        </div>
      )}

      {/* Core Educational Reading Content */}
      <div className="p-6 sm:p-8 rounded-2xl bg-nexora-surface/80 border border-nexora-border/60 shadow-xl space-y-6">
        <AcademicContentRenderer content={lesson.content} />
      </div>

      {/* Lesson Navigation Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-nexora-surface/60 border border-nexora-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        {lesson.previous_lesson_slug ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/lessons/${lesson.previous_lesson_slug}`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Previous Lesson
          </Button>
        ) : (
          <div className="hidden sm:block" />
        )}

        {lesson.module_id && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/modules/${lesson.module_id}`)}
            className="text-xs text-nexora-muted hover:text-white"
          >
            Back to Module Syllabus
          </Button>
        )}

        {lesson.next_lesson_slug ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/lessons/${lesson.next_lesson_slug}`)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Next Lesson
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => lesson.concept_slug ? navigate(`/concepts/${lesson.concept_slug}`) : navigate('/subjects')}
            rightIcon={<CheckCircle2 className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Module Completed
          </Button>
        )}
      </div>
    </div>
  );
};
