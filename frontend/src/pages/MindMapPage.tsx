import React, { useState, useEffect } from 'react';
import { 
  GitFork, 
  Layers, 
  BookOpen, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Search, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Target,
  Zap,
  Network,
  FlaskConical,
  Binary
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { useAcademicContext } from '../context/AcademicContext';
import { apiService } from '../services/api';
import { SubjectDetail, Subject } from '../types/learning';
import { AcademicContentRenderer } from '../components/common/AcademicContentRenderer';

export const MindMapPage: React.FC = () => {
  const { academicContext, enrolledSubjects } = useAcademicContext();
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState<string>('');
  const [subjectDetail, setSubjectDetail] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeConceptSlug, setActiveConceptSlug] = useState<string | null>(null);

  // 1. Fetch available subjects for student's tier if enrolledSubjects is empty
  useEffect(() => {
    let isMounted = true;
    const loadSubjects = async () => {
      setLoading(true);
      try {
        if (enrolledSubjects.length > 0) {
          if (isMounted) {
            setAvailableSubjects(enrolledSubjects);
            setSelectedSubjectSlug(enrolledSubjects[0].slug);
          }
        } else {
          const tier = academicContext?.academic_level;
          if (!tier) {
            if (isMounted) {
              setAvailableSubjects([]);
              setSelectedSubjectSlug('');
            }
          } else {
            const tierSubs = await apiService.getSubjects({ education_level: tier });
            if (isMounted) {
              setAvailableSubjects(tierSubs);
              if (tierSubs.length > 0) {
                setSelectedSubjectSlug(tierSubs[0].slug);
              } else {
                setSelectedSubjectSlug('');
              }
            }
          }
        }
      } catch (err) {
        console.error('[MindMapPage] Failed to load subjects:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSubjects();
    return () => { isMounted = false; };
  }, [enrolledSubjects, academicContext?.academic_level]);

  // 2. Fetch selected subject's full topic and concept tree
  useEffect(() => {
    if (!selectedSubjectSlug) {
      setSubjectDetail(null);
      return;
    }

    let isMounted = true;
    const loadDetail = async () => {
      try {
        const detail = await apiService.getSubject(selectedSubjectSlug);
        if (isMounted) {
          setSubjectDetail(detail);
          if (detail.topics && detail.topics.length > 0 && detail.topics[0].concepts && detail.topics[0].concepts.length > 0) {
            setActiveConceptSlug(detail.topics[0].concepts[0].slug);
          } else {
            setActiveConceptSlug(null);
          }
        }
      } catch (err) {
        console.error('[MindMapPage] Failed to load subject detail:', err);
      }
    };

    loadDetail();
    return () => { isMounted = false; };
  }, [selectedSubjectSlug]);

  const activeConcept = subjectDetail?.topics
    ?.flatMap((t) => t.concepts || [])
    ?.find((c) => c.slug === activeConceptSlug);

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-nexora-accent uppercase tracking-wider">
              Curriculum Knowledge Graph
            </span>
            <span className="text-xs text-nexora-muted">&bull;</span>
            <span className="text-xs text-nexora-subtext capitalize">
              {academicContext?.grade_level || 'Academic Workspace'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Concept Knowledge Map
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Explore topic hierarchies, concept dependencies, and pedagogical relationships.
          </p>
        </div>

        {availableSubjects.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-nexora-muted">Subject:</span>
            <select
              value={selectedSubjectSlug}
              onChange={(e) => setSelectedSubjectSlug(e.target.value)}
              className="bg-nexora-surface border border-nexora-border text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-nexora-primary"
            >
              {availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.slug}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-nexora-muted animate-pulse">
          Loading curriculum concept graph...
        </div>
      ) : availableSubjects.length === 0 || !subjectDetail ? (
        <Card className="border-nexora-border/80 p-8 text-center">
          <EmptyState
            icon={<Network className="w-10 h-10 text-nexora-muted mx-auto" />}
            title="No concept map available for this context yet"
            description={`No subjects with active topic structures are available for ${academicContext?.grade_level || 'your academic tier'}.`}
            action={
              <Link to="/subjects">
                <Button variant="primary" size="md">
                  Explore Subjects
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Topics and Concepts Hierarchy */}
          <div className="lg:col-span-2 space-y-5">
            <div className="p-4 rounded-xl bg-nexora-surface border border-nexora-border/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-nexora-muted uppercase font-bold tracking-wider block">
                  Active Subject Root
                </span>
                <h2 className="text-base font-bold text-white">{subjectDetail.name}</h2>
              </div>
              <Badge variant="neutral" size="sm">
                {subjectDetail.topics?.length || 0} Topic Areas
              </Badge>
            </div>

            {subjectDetail.topics && subjectDetail.topics.length > 0 ? (
              <div className="space-y-4">
                {subjectDetail.topics.map((topic, tIdx) => (
                  <Card key={topic.id} className="border-nexora-border/80 overflow-hidden">
                    <CardHeader className="bg-nexora-elevated/40 py-3 border-b border-nexora-border/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-nexora-elevated flex items-center justify-center text-xs font-bold text-nexora-accent">
                            {tIdx + 1}
                          </span>
                          <CardTitle className="text-sm text-white">{topic.name}</CardTitle>
                        </div>
                        <span className="text-[11px] text-nexora-muted">
                          {topic.concepts?.length || 0} Concepts
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4">
                      {topic.concepts && topic.concepts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {topic.concepts.map((concept) => {
                            const isSelected = concept.slug === activeConceptSlug;
                            return (
                              <button
                                key={concept.id}
                                onClick={() => setActiveConceptSlug(concept.slug)}
                                className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-nexora-primary/15 border-nexora-primary text-white shadow-sm'
                                    : 'bg-nexora-bg/80 border-nexora-border/60 text-nexora-subtext hover:border-nexora-border hover:text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-semibold line-clamp-1">
                                    {concept.name}
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5 text-nexora-muted shrink-0" />
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {concept.has_simulation && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-medium">
                                      Sim
                                    </span>
                                  )}
                                  {concept.has_practice && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium">
                                      Practice
                                    </span>
                                  )}
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-nexora-elevated text-nexora-muted capitalize">
                                    {concept.difficulty || 'Foundational'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-nexora-muted">No concepts mapped to this topic yet.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-xs text-nexora-muted">No topics registered for this subject.</p>
            )}
          </div>

          {/* Right Column: Selected Concept Detail View */}
          <div className="space-y-4">
            {activeConcept ? (
              <Card className="border-nexora-border/80 sticky top-20">
                <CardHeader className="pb-3 border-b border-nexora-border/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-nexora-accent tracking-wider">
                      Selected Concept Node
                    </span>
                    <Badge variant="neutral" size="sm">
                      Level: {activeConcept.difficulty || 'Foundational'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base text-white">{activeConcept.name}</CardTitle>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-white mb-1.5">Concept Core Summary</h4>
                    <div className="p-3 rounded-xl bg-nexora-bg border border-nexora-border/60 text-xs">
                      <AcademicContentRenderer content={activeConcept.summary} compact />
                    </div>
                  </div>

                  {activeConcept.short_description && (
                    <div>
                      <h4 className="text-xs font-semibold text-white mb-1">Scope &amp; Prerequisites</h4>
                      <p className="text-xs text-nexora-subtext leading-relaxed">
                        {activeConcept.short_description}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-nexora-border/40 space-y-2">
                    <Link to={`/concepts/${activeConcept.slug}`} className="w-full block">
                      <Button variant="primary" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Open Concept Study Space
                      </Button>
                    </Link>
                    <Link to={`/learn?q=${encodeURIComponent(activeConcept.name)}`} className="w-full block">
                      <Button variant="outline" size="sm" className="w-full" rightIcon={<BookOpen className="w-3.5 h-3.5" />}>
                        Explore Lessons
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-nexora-border/80 p-6 text-center text-xs text-nexora-muted">
                Select a concept from the graph to inspect prerequisites and learning objectives.
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
