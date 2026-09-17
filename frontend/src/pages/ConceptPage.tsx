import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock,
  Layers,
  Sparkles,
  Target,
  ListOrdered,
  CheckCircle2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { ConceptDetail, LearningModule } from '../types/learning';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export const ConceptPage: React.FC = () => {
  const { conceptSlug } = useParams<{ conceptSlug: string }>();
  const navigate = useNavigate();
  const [concept, setConcept] = useState<ConceptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conceptSlug) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiService
      .getConcept(conceptSlug)
      .then((data) => {
        if (isMounted) {
          setConcept(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || `Concept '${conceptSlug}' not found.`);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [conceptSlug]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="h-6 w-48 bg-nexora-surface rounded-lg animate-pulse" />
        <div className="h-32 bg-nexora-surface rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !concept) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Subjects
        </Button>
        <EmptyState
          icon={<Layers className="w-8 h-8 text-nexora-muted" />}
          title="Concept Not Found"
          description={error || "The requested academic concept does not exist in the curriculum."}
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/subjects')}>
              Browse Subjects
            </Button>
          }
        />
      </div>
    );
  }

  const modules = concept.modules || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs text-nexora-subtext flex-wrap">
        <Link to="/subjects" className="hover:text-white transition-colors">
          Subjects
        </Link>
        {concept.subject_slug && (
          <>
            <span>/</span>
            <Link to={`/subjects/${concept.subject_slug}`} className="hover:text-white transition-colors">
              {concept.subject_name || 'Subject'}
            </Link>
          </>
        )}
        {concept.topic_name && (
          <>
            <span>/</span>
            <span className="text-nexora-muted">{concept.topic_name}</span>
          </>
        )}
        <span>/</span>
        <span className="text-white font-medium">{concept.name}</span>
      </div>

      {/* Concept Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-nexora-surface to-nexora-elevated/50 border border-nexora-border/70 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="sm">
              Concept
            </Badge>
            <Badge variant="neutral" size="sm">
              {concept.difficulty_level || concept.difficulty}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/learn?q=${encodeURIComponent(concept.name)}`)}
            leftIcon={<Sparkles className="w-4 h-4 text-nexora-accent" />}
            className="border border-nexora-border/60"
          >
            Experiential Simulation
          </Button>
        </div>

        <div className="space-y-2 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {concept.name}
          </h1>
          <p className="text-sm sm:text-base text-nexora-subtext leading-relaxed">
            {concept.summary}
          </p>
        </div>
      </div>

      {/* Structured Learning Modules Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-nexora-primary" />
            Learning Modules
          </h2>
          <span className="text-xs text-nexora-muted">
            {modules.length} {modules.length === 1 ? 'Module' : 'Modules'}
          </span>
        </div>

        {modules.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-nexora-muted" />}
            title="No Modules Published Yet"
            description="Learning modules are being authored for this concept. You can explore the concept simulation right now."
            action={
              <Button variant="primary" size="md" onClick={() => navigate(`/learn?q=${encodeURIComponent(concept.name)}`)}>
                Open Concept Simulation
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((mod, idx) => (
              <Card
                key={mod.id}
                variant="interactive"
                onClick={() => navigate(`/modules/${mod.id}`)}
                className="group flex flex-col justify-between"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-nexora-accent font-semibold">
                      MODULE {idx + 1}
                    </span>
                    <Badge variant="neutral" size="sm" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {mod.estimated_minutes || 15} mins
                    </Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-nexora-accent transition-colors">
                    {mod.title}
                  </CardTitle>
                  {mod.learning_objective && (
                    <div className="flex items-start gap-2 pt-2 text-xs text-nexora-subtext">
                      <Target className="w-3.5 h-3.5 text-nexora-primary shrink-0 mt-0.5" />
                      <span>{mod.learning_objective}</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="py-2">
                  <div className="flex items-center justify-between text-xs text-nexora-muted p-2.5 rounded-xl bg-nexora-bg/60 border border-nexora-border/40">
                    <span>Lessons Included</span>
                    <span className="font-semibold text-white">{mod.lesson_count} Lessons</span>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-nexora-border/50 flex justify-between items-center">
                  <span className="text-xs text-nexora-muted">
                    {mod.difficulty_level || 'Intermediate'}
                  </span>
                  <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    Open Module
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
