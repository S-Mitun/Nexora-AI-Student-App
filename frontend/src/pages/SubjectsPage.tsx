import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  BookOpen,
  Cpu,
  Zap,
  Binary,
  Dna,
  Sparkles,
  Search,
  ChevronRight,
  Layers,
  CheckCircle2,
  PlusCircle,
  Check,
  GraduationCap,
  FlaskConical,
  Globe,
  Leaf,
  Loader2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Subject } from '../types/learning';
import { useAcademicContext } from '../context/AcademicContext';
import { useSyllabus } from '../context/SyllabusContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export const SubjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { academicContext, refreshAcademicContext, isReady } = useAcademicContext();
  const { hasSyllabus, isCurriculumActive } = useSyllabus();
  const currentTier = academicContext?.academic_level;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [enrolledSubjectIds, setEnrolledSubjectIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const fetchSubjectsAndEnrollments = useCallback(async () => {
    if (!currentTier || !isCurriculumActive) {
      setSubjects([]);
      setEnrolledSubjectIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [subjectsData, workspaceData] = await Promise.all([
        apiService.getSubjects({ education_level: currentTier }),
        apiService.getWorkspace().catch(() => null),
      ]);

      setSubjects(subjectsData);
      if (workspaceData?.enrolled_subjects) {
        const ids = new Set(workspaceData.enrolled_subjects.map((es) => es.id));
        setEnrolledSubjectIds(ids);
      }
    } catch (err) {
      console.error('Failed to load subjects or workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [currentTier, isCurriculumActive]);

  useEffect(() => {
    fetchSubjectsAndEnrollments();
  }, [fetchSubjectsAndEnrollments]);

  const handleToggleEnroll = async (subjectId: string, isEnrolled: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionInProgressId(subjectId);
      if (isEnrolled) {
        await apiService.unenrollSubject(subjectId);
        setEnrolledSubjectIds((prev) => {
          const updated = new Set(prev);
          updated.delete(subjectId);
          return updated;
        });
      } else {
        await apiService.enrollSubject(subjectId);
        setEnrolledSubjectIds((prev) => {
          const updated = new Set(prev);
          updated.add(subjectId);
          return updated;
        });
      }
      // Refresh academic context so all components have synchronized enrollment state
      await refreshAcademicContext();
    } catch (err) {
      console.error('Failed to update subject enrollment:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-indigo-400" />;
      case 'Binary':
        return <Binary className="w-5 h-5 text-cyan-400" />;
      case 'Dna':
        return <Dna className="w-5 h-5 text-emerald-400" />;
      case 'FlaskConical':
        return <FlaskConical className="w-5 h-5 text-teal-400" />;
      case 'Globe':
        return <Globe className="w-5 h-5 text-amber-500" />;
      case 'Leaf':
        return <Leaf className="w-5 h-5 text-emerald-500" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'FolderKanban':
        return <FolderKanban className="w-5 h-5 text-blue-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-indigo-400" />;
    }
  };

  // Distinct categories available in current tier's subjects
  const availableCategories = Array.from(new Set(subjects.map((s) => s.category || 'General'))).filter(Boolean);

  const filteredSubjects = subjects.filter((sub) => {
    const isEnrolled = enrolledSubjectIds.has(sub.id);

    if (activeCategoryFilter === 'enrolled' && !isEnrolled) return false;
    if (
      activeCategoryFilter !== 'all' &&
      activeCategoryFilter !== 'enrolled' &&
      (sub.category || 'General') !== activeCategoryFilter
    ) {
      return false;
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = sub.name.toLowerCase().includes(q);
      const matchDesc = sub.description?.toLowerCase().includes(q);
      const matchCat = sub.category?.toLowerCase().includes(q);
      return matchName || matchDesc || matchCat;
    }

    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              Academic Curricula &amp; Syllabi
            </span>
            <span className="text-xs text-nexora-muted">
              &bull; Tier: {academicContext?.education_category || currentTier}
            </span>
            {academicContext?.curriculum_name && (
              <span className="text-xs text-nexora-accent">
                &bull; {academicContext.curriculum_name}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Curriculum Courses &amp; Syllabi
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Enroll in subjects strictly aligned to your current academic curriculum ({academicContext?.education_category || currentTier}) to organize your study plan.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-nexora-surface rounded-xl border border-nexora-border/70 overflow-x-auto">
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeCategoryFilter === 'all' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
            }`}
          >
            All Subjects ({subjects.length})
          </button>
          <button
            onClick={() => setActiveCategoryFilter('enrolled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeCategoryFilter === 'enrolled' ? 'bg-nexora-accent text-black' : 'text-nexora-muted hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Enrolled ({enrolledSubjectIds.size})
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeCategoryFilter === cat ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-nexora-muted absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search active subjects..."
            className="w-full bg-nexora-surface border border-nexora-border text-white text-xs rounded-xl pl-9 pr-3 py-2 placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
          />
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-nexora-muted" />}
          title={
            activeCategoryFilter === 'enrolled'
              ? 'No subjects enrolled yet'
              : hasSyllabus && !isCurriculumActive
              ? 'Syllabus uploaded. Curriculum not activated yet.'
              : 'No syllabus uploaded'
          }
          description={
            activeCategoryFilter === 'enrolled'
              ? 'Enroll in subjects from your active syllabus to build your learning workspace.'
              : hasSyllabus && !isCurriculumActive
              ? 'Your primary syllabus is uploaded and verified. Curriculum subjects will become available once curriculum activation is completed.'
              : 'Upload your primary syllabus to generate and activate your curriculum subjects.'
          }
          action={
            activeCategoryFilter === 'enrolled' ? (
              <Button variant="primary" size="sm" onClick={() => setActiveCategoryFilter('all')}>
                Browse Available Subjects
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/syllabus')}
              >
                {hasSyllabus ? 'View Syllabus Hub' : 'Upload Syllabus'}
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((sub) => {
            const isEnrolled = enrolledSubjectIds.has(sub.id);
            const isProcessing = actionInProgressId === sub.id;
            const conceptCount = sub.concept_count || 0;

            return (
              <Card
                key={sub.id}
                onClick={() => navigate(`/subjects/${sub.slug}`)}
                className="group flex flex-col justify-between hover:border-nexora-primary/50 transition-all cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-nexora-elevated flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      {getSubjectIcon(sub.icon)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isEnrolled && (
                        <Badge variant="accent" size="sm" hasDot>
                          Enrolled
                        </Badge>
                      )}
                      <Badge variant="neutral" size="sm">
                        {sub.difficulty_level || 'Standard'}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg group-hover:text-nexora-accent transition-colors">
                    {sub.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {sub.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-2">
                  <div className="p-3 rounded-xl bg-nexora-bg/60 border border-nexora-border/50 space-y-2">
                    <div className="flex justify-between text-xs text-nexora-subtext">
                      <span className="flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5 text-nexora-muted" />
                        Curriculum Track
                      </span>
                      <span className="font-semibold text-white">Active Syllabus</span>
                    </div>
                    <div className="flex justify-between text-xs text-nexora-subtext">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-nexora-muted" />
                        Core Concepts
                      </span>
                      <span className="font-semibold text-white">{conceptCount} Concepts</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-nexora-muted pt-1 border-t border-nexora-border/40">
                      <span>Category</span>
                      <span className="text-nexora-accent font-medium truncate max-w-[170px]">
                        {sub.category || 'Curriculum Subject'}
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-nexora-border/50 flex justify-between items-center gap-2">
                  <button
                    onClick={(e) => handleToggleEnroll(sub.id, isEnrolled, e)}
                    disabled={isProcessing}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isEnrolled
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30'
                        : 'bg-nexora-elevated text-nexora-subtext border border-nexora-border hover:text-white hover:border-nexora-primary'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                      </>
                    ) : isEnrolled ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Enrolled
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5" /> Enroll
                      </>
                    )}
                  </button>

                  <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    Open Syllabus
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
