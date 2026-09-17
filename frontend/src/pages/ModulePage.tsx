import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock,
  Target,
  FileText,
  Play,
  Sparkles,
  HelpCircle,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { LearningModuleDetail, Lesson } from '../types/learning';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export const ModulePage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState<LearningModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!moduleId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiService
      .getModule(moduleId)
      .then((data) => {
        if (isMounted) {
          setModuleData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || `Learning module '${moduleId}' not found.`);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [moduleId]);

  const getContentTypeBadge = (contentType: string) => {
    switch (contentType.toLowerCase()) {
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

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="h-6 w-48 bg-nexora-surface rounded-lg animate-pulse" />
        <div className="h-36 bg-nexora-surface rounded-2xl animate-pulse" />
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !moduleData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Curriculum
        </Button>
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-nexora-muted" />}
          title="Module Not Found"
          description={error || "The requested learning module does not exist."}
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/subjects')}>
              Browse Subjects
            </Button>
          }
        />
      </div>
    );
  }

  const lessons = moduleData.lessons || [];
  const firstLesson = lessons[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs text-nexora-subtext flex-wrap">
        <Link to="/subjects" className="hover:text-white transition-colors">
          Subjects
        </Link>
        {moduleData.subject_slug && (
          <>
            <span>/</span>
            <Link to={`/subjects/${moduleData.subject_slug}`} className="hover:text-white transition-colors">
              {moduleData.subject_name || 'Subject'}
            </Link>
          </>
        )}
        {moduleData.concept_slug && (
          <>
            <span>/</span>
            <Link to={`/concepts/${moduleData.concept_slug}`} className="hover:text-white transition-colors">
              {moduleData.concept_name || 'Concept'}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-white font-medium">{moduleData.title}</span>
      </div>

      {/* Module Overview Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-nexora-surface to-nexora-elevated/40 border border-nexora-border/70 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" size="sm">
                Module
              </Badge>
              <Badge variant="neutral" size="sm" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {moduleData.estimated_minutes || 20} mins
              </Badge>
              <Badge variant="neutral" size="sm">
                {moduleData.difficulty_level || 'Intermediate'}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {moduleData.title}
            </h1>
            {moduleData.description && (
              <p className="text-sm text-nexora-subtext leading-relaxed">
                {moduleData.description}
              </p>
            )}
          </div>

          <div className="flex sm:flex-col items-center gap-2 shrink-0">
            {firstLesson && (
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/lessons/${firstLesson.slug}`)}
                leftIcon={<Play className="w-4 h-4 fill-current" />}
                className="w-full sm:w-auto"
              >
                Start Module
              </Button>
            )}
            {moduleData.concept_name && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/learn?q=${encodeURIComponent(moduleData.concept_name!)}`)}
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-nexora-accent" />}
                className="border border-nexora-border/60 text-xs w-full sm:w-auto"
              >
                Simulation
              </Button>
            )}
          </div>
        </div>

        {/* Learning Objective & Prerequisites Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-nexora-border/50">
          {moduleData.learning_objective && (
            <div className="p-3.5 rounded-xl bg-nexora-bg/50 border border-nexora-border/40 space-y-1">
              <div className="text-xs font-semibold text-nexora-accent flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Learning Objective
              </div>
              <p className="text-xs text-nexora-subtext leading-relaxed">
                {moduleData.learning_objective}
              </p>
            </div>
          )}

          {moduleData.prerequisites && moduleData.prerequisites.length > 0 && (
            <div className="p-3.5 rounded-xl bg-nexora-bg/50 border border-nexora-border/40 space-y-1">
              <div className="text-xs font-semibold text-nexora-subtext flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Prerequisites
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {moduleData.prerequisites.map((p, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-nexora-elevated border border-nexora-border/50 text-[11px] text-white"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lesson Syllabus List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-nexora-primary" />
            Module Syllabus &amp; Lessons
          </h2>
          <span className="text-xs text-nexora-muted">
            {lessons.length} {lessons.length === 1 ? 'Lesson' : 'Lessons'}
          </span>
        </div>

        {lessons.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8 text-nexora-muted" />}
            title="No Lessons Published"
            description="Lessons for this module are currently in authoring."
          />
        ) : (
          <div className="space-y-3">
            {lessons.map((les, index) => (
              <div
                key={les.id}
                onClick={() => navigate(`/lessons/${les.slug}`)}
                className="p-4 sm:p-5 rounded-2xl bg-nexora-surface/70 border border-nexora-border/60 hover:border-nexora-primary/60 hover:bg-nexora-elevated/40 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-xl bg-nexora-elevated border border-nexora-border flex items-center justify-center text-xs font-mono font-bold text-white group-hover:bg-nexora-primary group-hover:text-white transition-colors">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-nexora-accent transition-colors">
                        {les.title}
                      </h3>
                      {getContentTypeBadge(les.content_type)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-nexora-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {les.estimated_minutes || 5} mins reading
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    Open Lesson
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
