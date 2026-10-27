import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FolderKanban,
  Layers,
  Sparkles,
  Info,
  Clock,
  FlaskConical,
  GraduationCap,
  FileText,
  Target,
  ExternalLink,
} from 'lucide-react';
import { apiService } from '../services/api';
import { TopicDetail, Concept } from '../types/learning';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { AcademicContentRenderer } from '../components/common/AcademicContentRenderer';

export const TopicPage: React.FC = () => {
  const { topicSlug, subjectSlug } = useParams<{ topicSlug: string; subjectSlug?: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicSlug) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    apiService
      .getTopic(topicSlug)
      .then((data) => {
        if (isMounted) {
          setTopic(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || `Topic '${topicSlug}' not found in active curriculum.`);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [topicSlug]);

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
      <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
        <div className="h-6 w-48 bg-nexora-surface rounded-lg animate-pulse" />
        <div className="h-36 bg-nexora-surface rounded-2xl animate-pulse" />
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (subjectSlug ? navigate(`/subjects/${subjectSlug}`) : navigate('/subjects'))}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Subjects
        </Button>
        <EmptyState
          icon={<FolderKanban className="w-8 h-8 text-nexora-muted" />}
          title="Topic Not Found"
          description={error || 'The requested curriculum topic does not exist in your active syllabus.'}
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/subjects')}>
              Browse Active Subjects
            </Button>
          }
        />
      </div>
    );
  }

  const concepts = topic.concepts || [];
  const parentSubjectSlug = topic.subject_slug || subjectSlug;

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn pb-12">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-nexora-subtext flex-wrap">
        <Link to="/subjects" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Subjects
        </Link>
        {parentSubjectSlug && (
          <>
            <span>/</span>
            <Link to={`/subjects/${parentSubjectSlug}`} className="hover:text-white transition-colors">
              {topic.subject_name || 'Subject'}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-white font-medium truncate max-w-[280px]">{topic.name}</span>
      </div>

      {/* Topic Hero Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-nexora-surface to-nexora-elevated/40 border border-nexora-border/70 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" size="sm">
                {topic.unit_label || 'Unit'} {topic.order_index + 1}
              </Badge>
              {topic.is_lab && (
                <Badge variant="accent" size="sm" className="flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" />
                  Practical Experiment
                </Badge>
              )}
              <Badge variant="neutral" size="sm">
                {concepts.length} {concepts.length === 1 ? 'Concept' : 'Concepts'}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {topic.name}
            </h1>

            {topic.subject_name && (
              <p className="text-xs text-nexora-muted flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-nexora-primary" />
                Prescribed Course: <span className="text-white font-medium">{topic.subject_name}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {parentSubjectSlug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/subjects/${parentSubjectSlug}`)}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Subject Overview
              </Button>
            )}
          </div>
        </div>

        {/* Source Citation & Evidence Section */}
        {(topic.evidence_text || topic.source_page) && (
          <div className="p-4 rounded-xl bg-nexora-bg/60 border border-nexora-border/50 space-y-2">
            <div className="flex items-center justify-between text-xs text-nexora-accent font-semibold">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Official Syllabus Citation &amp; Evidence
              </span>
              {topic.source_page && (
                <span className="text-[11px] text-nexora-muted font-mono">
                  Source Page: {topic.source_page}
                </span>
              )}
            </div>
            {topic.evidence_text && (
              <p className="text-xs text-nexora-subtext italic leading-relaxed border-l-2 border-nexora-accent/40 pl-3">
                &ldquo;{topic.evidence_text}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>

      {/* Honest Lesson Content Availability State Banner (Section 3.3 Contract) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-nexora-surface to-nexora-surface border border-indigo-500/30 flex flex-col sm:flex-row items-start gap-4">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              Curriculum Blueprint Active — Grounded Content Generation In Progress
            </h3>
            <Badge variant="primary" size="sm" className="text-[10px]">
              Master Prompt 06R
            </Badge>
          </div>
          <p className="text-xs text-nexora-subtext leading-relaxed">
            This topic candidate, ordering, and structural evidence are verified from your active prescribed curriculum. In accordance with the syllabus-first contract, step-by-step explanatory lessons, mathematical breakdowns, worked examples, and interactive code implementations are populated through evidence-grounded RAG during upcoming active study sessions (Prompts 07R+). Zero fake or ungrounded explanations have been fabricated.
          </p>
        </div>
      </div>

      {/* Learning Outcomes Checklist if available */}
      {topic.learning_outcomes && topic.learning_outcomes.length > 0 && (
        <div className="p-5 rounded-2xl bg-nexora-surface/70 border border-nexora-border/60 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-nexora-primary" />
            Unit Learning Outcomes &amp; Core Objectives
          </h3>
          <ul className="space-y-2">
            {topic.learning_outcomes.map((outcome, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-nexora-subtext">
                <span className="w-4 h-4 rounded-full bg-nexora-primary/10 border border-nexora-primary/30 flex items-center justify-center text-[10px] text-nexora-primary shrink-0 mt-0.5 font-bold">
                  {idx + 1}
                </span>
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Child Concepts Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-nexora-primary" />
            Core Concepts &amp; Lessons in this Unit
          </h2>
          <span className="text-xs text-nexora-muted">
            {concepts.length} {concepts.length === 1 ? 'Concept Candidate' : 'Concept Candidates'}
          </span>
        </div>

        {concepts.length === 0 ? (
          <EmptyState
            icon={<Layers className="w-8 h-8 text-nexora-muted" />}
            title="No Nested Concepts"
            description="Concept extraction for this unit is being finalized."
          />
        ) : (
          <div className="space-y-3">
            {concepts.map((concept, index) => (
              <div
                key={concept.id}
                className="p-4 sm:p-5 rounded-2xl bg-nexora-surface/70 border border-nexora-border/60 hover:border-nexora-primary/60 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-nexora-elevated border border-nexora-border flex items-center justify-center text-xs font-mono font-bold text-nexora-accent shrink-0">
                      {index + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-nexora-accent transition-colors">
                      {concept.name}
                    </h3>
                    {getDifficultyBadge(concept.difficulty_level || concept.difficulty)}
                    {concept.has_lab && (
                      <Badge variant="accent" size="sm">
                        Lab
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-nexora-subtext pl-8">
                    <AcademicContentRenderer content={concept.short_description || concept.summary} compact />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-8 sm:pl-0">
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
                    title="Launch Experiential Simulation"
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-nexora-accent" />}
                  >
                    Simulate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="p-4 sm:p-5 rounded-2xl bg-nexora-surface/60 border border-nexora-border/60 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (parentSubjectSlug ? navigate(`/subjects/${parentSubjectSlug}`) : navigate('/subjects'))}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          {parentSubjectSlug ? 'Back to Subject' : 'Back to Subjects'}
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (concepts.length > 0) {
              navigate(`/concepts/${concepts[0].slug}`);
            } else if (parentSubjectSlug) {
              navigate(`/subjects/${parentSubjectSlug}`);
            }
          }}
          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
        >
          {concepts.length > 0 ? 'Start First Concept' : 'Return to Overview'}
        </Button>
      </div>
    </div>
  );
};

export default TopicPage;
