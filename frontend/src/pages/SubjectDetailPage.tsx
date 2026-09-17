import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FolderKanban,
  Layers,
  Sparkles,
  Cpu,
  Zap,
  Binary,
  GraduationCap,
} from 'lucide-react';
import { apiService } from '../services/api';
import { SubjectDetail, TopicDetail, Concept } from '../types/learning';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export const SubjectDetailPage: React.FC = () => {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectSlug) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiService
      .getSubject(subjectSlug)
      .then((data) => {
        if (isMounted) {
          setSubject(data);
          if (data.topics && data.topics.length > 0) {
            setExpandedTopic(data.topics[0].id);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || `Unable to load syllabus for subject '${subjectSlug}'.`);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [subjectSlug]);

  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return <Badge variant="success" size="sm">Beginner</Badge>;
      case 'advanced':
        return <Badge variant="primary" size="sm">Advanced</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Intermediate</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="h-6 w-36 bg-nexora-surface rounded-lg animate-pulse" />
        <div className="h-28 bg-nexora-surface rounded-2xl animate-pulse" />
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to All Subjects
        </Button>
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-nexora-muted" />}
          title="Subject Not Found"
          description={error || "The requested academic subject does not exist in the curriculum."}
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/subjects')}>
              Browse Subjects
            </Button>
          }
        />
      </div>
    );
  }

  const topics = subject.topics || [];
  const totalConcepts = topics.reduce((acc, t) => acc + (t.concepts?.length || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Back & Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-nexora-subtext">
        <Link to="/subjects" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Subjects
        </Link>
        <span>/</span>
        <span className="text-white font-medium">{subject.name}</span>
      </div>

      {/* Subject Banner Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-nexora-surface via-nexora-surface/90 to-nexora-elevated/40 border border-nexora-border/70 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" size="sm">
                {subject.category || 'Computer Science & Engineering'}
              </Badge>
              <Badge variant="neutral" size="sm">
                {subject.difficulty_level || 'All Levels'}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {subject.name}
            </h1>
            <p className="text-sm text-nexora-subtext leading-relaxed">
              {subject.description}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-nexora-bg/60 border border-nexora-border/60 rounded-xl p-4 shrink-0">
            <div className="text-center px-3 border-r border-nexora-border/50">
              <div className="text-xl font-bold text-white">{topics.length}</div>
              <div className="text-[11px] text-nexora-muted">Topics</div>
            </div>
            <div className="text-center px-3">
              <div className="text-xl font-bold text-white">{totalConcepts}</div>
              <div className="text-[11px] text-nexora-muted">Concepts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus Topics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-nexora-accent" />
            Syllabus Topics &amp; Core Concepts
          </h2>
          <span className="text-xs text-nexora-muted">
            {topics.length} structured topics
          </span>
        </div>

        {topics.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="w-8 h-8 text-nexora-muted" />}
            title="No Topics Available"
            description="Topic syllabi are currently being authored for this subject."
          />
        ) : (
          <div className="space-y-4">
            {topics.map((topic, index) => {
              const isExpanded = expandedTopic === topic.id;
              const concepts = topic.concepts || [];

              return (
                <div
                  key={topic.id}
                  className="rounded-2xl border border-nexora-border/70 bg-nexora-surface/60 overflow-hidden transition-all duration-200"
                >
                  {/* Topic Header Toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-nexora-elevated/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-nexora-elevated border border-nexora-border flex items-center justify-center text-xs font-mono font-bold text-nexora-accent shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-white">
                          {topic.name}
                        </h3>
                        {topic.description && (
                          <p className="text-xs text-nexora-muted mt-0.5 line-clamp-1">
                            {topic.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-nexora-muted hidden sm:inline">
                        {concepts.length} {concepts.length === 1 ? 'Concept' : 'Concepts'}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-nexora-muted transition-transform duration-200 ${
                          isExpanded ? 'rotate-90 text-white' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Concepts List Under Topic */}
                  {isExpanded && (
                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 pt-1 border-t border-nexora-border/40 space-y-3">
                      {concepts.length === 0 ? (
                        <p className="text-xs text-nexora-muted py-2 italic">
                          No concepts listed under this topic yet.
                        </p>
                      ) : (
                        concepts.map((concept) => (
                          <div
                            key={concept.id}
                            className="p-4 rounded-xl bg-nexora-bg/50 border border-nexora-border/40 hover:border-nexora-primary/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                          >
                            <div className="space-y-1 max-w-xl">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-white group-hover:text-nexora-accent transition-colors">
                                  {concept.name}
                                </h4>
                                {getDifficultyBadge(concept.difficulty_level || concept.difficulty)}
                              </div>
                              <p className="text-xs text-nexora-subtext line-clamp-2">
                                {concept.short_description || concept.summary}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/concepts/${concept.slug}`)}
                                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                              >
                                View Modules
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/learn?q=${encodeURIComponent(concept.name)}`)}
                                title="Open Experiential Simulation"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-nexora-accent" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
