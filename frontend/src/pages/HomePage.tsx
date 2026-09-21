import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Zap,
  Cpu,
  Binary,
  Dna,
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  ChevronRight,
  FolderKanban,
  FileText,
  TrendingUp,
  Compass,
  GraduationCap,
  UploadCloud,
  Sparkles,
  Layers,
  AlertCircle,
  Building2,
  MapPin,
  School,
  ExternalLink,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Subject, RecommendedTopic, WorkspaceOverview } from '../types/learning';
import { useAuth } from '../context/AuthContext';
import { useAcademicContext } from '../context/AcademicContext';
import {
  studentActivityService,
  ActiveCourseProgress,
  OverallStudentProgress,
  StudentActivityItem,
} from '../services/studentActivity';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

const getExampleQueries = (category?: string, level?: string) => {
  const norm = (category || level || '').toLowerCase();
  if (norm.includes('primary') || norm.includes('class-1-5') || norm.includes('1-5')) {
    return [
      { label: 'Living and Non-Living Things', domain: 'Environmental Studies' },
      { label: 'Addition & Basic Shapes', domain: 'Mathematics' },
      { label: 'Parts of a Plant', domain: 'Science' },
      { label: 'Alphabet & Story Reading', domain: 'Languages' },
    ];
  }
  if (norm.includes('secondary') || norm.includes('class-6-10') || norm.includes('6-10')) {
    return [
      { label: "Force & Pressure Dynamics (F = ma)", domain: 'General Science' },
      { label: 'Linear Equations (y = mx + c)', domain: 'Mathematics' },
      { label: 'The Constitution & Rights', domain: 'Social Science' },
      { label: 'Active and Passive Voice', domain: 'Languages' },
    ];
  }
  if (norm.includes('higher') || norm.includes('11-12')) {
    return [
      { label: 'Wave Mechanics & Doppler Effect', domain: 'Physics' },
      { label: 'Chemical Bonding & Kinetics', domain: 'Chemistry' },
      { label: 'Cell Biology & Genetics', domain: 'Biology' },
      { label: 'Calculus & Derivatives', domain: 'Mathematics' },
    ];
  }
  return [
    { label: 'Doppler Effect', domain: 'Physics' },
    { label: 'Wave Mechanics', domain: 'Physics' },
    { label: 'Operating Systems Deadlock', domain: 'Computer Science' },
    { label: 'Database Normalization', domain: 'Computer Science' },
  ];
};

export const HomePage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendedTopic[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  // Workspace Overview (Master Prompt 06 & 01R)
  const [workspace, setWorkspace] = useState<WorkspaceOverview | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  const { academicContext, isReady } = useAcademicContext();
  const activeLevel = academicContext?.academic_level || profile?.education_category || profile?.education_level;

  // Genuine student learning activity & active course strictly from database
  const [activeCourse, setActiveCourse] = useState<ActiveCourseProgress | null>(null);
  const [recentActivities, setRecentActivities] = useState<StudentActivityItem[]>([]);
  const [overallProgress, setOverallProgress] = useState<OverallStudentProgress>({
    completedLessons: 0,
    completedQuizzes: 0,
    activeSubjects: 0,
    overallProgressPercent: 0,
    studyMinutes: 0,
  });

  const fetchWorkspaceData = () => {
    apiService
      .getWorkspace()
      .then((data) => {
        setWorkspace(data);
        setLoadingWorkspace(false);
        // Syllabus-First: only establish an active course if user has an active syllabus and enrolled subjects
        if (data?.active_syllabus && data?.enrolled_subjects && data.enrolled_subjects.length > 0) {
          const firstSub = data.enrolled_subjects[0];
          setActiveCourse({
            subject: firstSub.name,
            slug: firstSub.slug,
            courseTitle: firstSub.name,
            currentTopic: `${firstSub.topic_count || 0} Topics available`,
            lastLesson: firstSub.name,
            completedTopics: 0,
            totalTopics: firstSub.topic_count || 1,
            progressPercent: 0,
            targetUrl: `/subjects/${firstSub.slug}`,
          });
        } else {
          setActiveCourse(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load workspace overview:', err);
        setLoadingWorkspace(false);
      });
  };

  useEffect(() => {
    let isMounted = true;
    setLoadingSubjects(true);

    fetchWorkspaceData();

    if (activeLevel) {
      apiService
        .getSubjects({ education_level: activeLevel })
        .then((data) => {
          if (isMounted) {
            setSubjects(data);
            setLoadingSubjects(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setLoadingSubjects(false);
          }
        });
    }

    apiService
      .getRecommendations()
      .then((recs) => {
        if (isMounted) {
          setRecommendations(recs);
          setLoadingRecommendations(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadingRecommendations(false);
        }
      });

    // Level-scoped workspace progress strictly from database
    apiService
      .getWorkspaceProgress()
      .then((prog) => {
        if (isMounted && prog) {
          setOverallProgress({
            completedLessons: prog.completed_lessons_count,
            completedQuizzes: prog.completed_quizzes_count,
            activeSubjects: prog.enrolled_subjects_count,
            overallProgressPercent: prog.overall_progress_percent || 0,
            studyMinutes: prog.study_minutes || 0,
          });
        }
      })
      .catch(() => {});

    // Genuine level-scoped recent activity feed
    apiService
      .getWorkspaceActivity(3)
      .then((acts) => {
        if (isMounted) {
          setRecentActivities(
            (acts || []).map((a) => ({
              id: a.id,
              title: a.title,
              subject: a.description || 'Academic Workspace',
              timeAgo: new Date(a.created_at).toLocaleDateString(),
              timestamp: a.created_at,
              type: a.activity_type as any,
            }))
          );
        }
      })
      .catch(() => {
        if (isMounted) setRecentActivities([]);
      });

    return () => {
      isMounted = false;
    };
  }, [activeLevel, isReady]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/learn?q=${encodeURIComponent(query.trim())}`);
  };

  const handleUnenroll = async (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to unenroll from this subject?')) {
      try {
        setEnrollingId(subjectId);
        await apiService.unenrollSubject(subjectId);
        fetchWorkspaceData();
      } catch (err) {
        console.error('Failed to unenroll subject:', err);
      } finally {
        setEnrollingId(null);
      }
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
      default:
        return <BookOpen className="w-5 h-5 text-indigo-400" />;
    }
  };

  const completeness = workspace?.profile_completeness || {
    score: (profile as any)?.profile_completeness?.score ?? profile?.completeness_score ?? 0,
    missing_fields: (profile as any)?.profile_completeness?.missing_fields ?? profile?.missing_fields ?? [],
    is_complete: (profile as any)?.profile_completeness?.is_complete ?? (profile?.completeness_score === 100),
  };

  const academic = workspace?.academic_identity;
  const boardOrUniv = academic?.board_authority || academic?.curriculum_name || academic?.institution;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Academic Workspace Header & Student Identity Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-nexora-surface via-nexora-surface/90 to-nexora-elevated/40 border border-nexora-border/80 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-nexora-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-nexora-primary/15 text-nexora-primary border border-nexora-primary/30 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Personal Academic Workspace
              </span>
              {academic?.education_category && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-nexora-elevated text-nexora-subtext border border-nexora-border/60">
                  {academic.education_category}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {getGreeting()}, {studentName}
            </h1>

            {/* Academic Context Pills */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-nexora-subtext">
              {academic?.grade_level && (
                <div className="flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-nexora-accent" />
                  <span className="text-white font-medium">{academic.grade_level}</span>
                </div>
              )}
              {boardOrUniv && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-nexora-primary" />
                  <span className="text-white font-medium">{boardOrUniv}</span>
                </div>
              )}
              {academic?.state_region && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{academic.state_region}</span>
                </div>
              )}
              {academic?.degree && (
                <div className="flex items-center gap-1.5">
                  <span className="text-nexora-muted">&bull;</span>
                  <span>{academic.degree}</span>
                </div>
              )}
              {academic?.department && (
                <div className="flex items-center gap-1.5">
                  <span className="text-nexora-muted">&bull;</span>
                  <span>{academic.department}</span>
                </div>
              )}
              {academic?.academic_domain && academic.academic_domain !== 'General Studies' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-nexora-muted">&bull;</span>
                  <span className="text-nexora-accent font-medium">{academic.academic_domain}</span>
                </div>
              )}
            </div>
          </div>

          {/* Profile Completeness Score Card */}
          <div className="shrink-0 flex items-center gap-4 bg-nexora-bg/80 border border-nexora-border/70 p-4 rounded-xl">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-nexora-elevated"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={completeness.score === 100 ? 'text-emerald-400' : 'text-nexora-primary'}
                  strokeDasharray={`${completeness.score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold text-white">
                {completeness.score}%
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                Academic Profile
              </div>
              <div className="text-[11px] text-nexora-subtext">
                {completeness.is_complete ? 'Complete & Calibrated' : 'Profile in progress'}
              </div>
              <Link
                to="/profile"
                className="text-[11px] text-nexora-primary hover:underline font-medium mt-0.5 inline-block"
              >
                {completeness.is_complete ? 'Update Details' : 'Complete Profile &rarr;'}
              </Link>
            </div>
          </div>
        </div>

        {/* Incomplete Profile Alert Banner */}
        {!completeness.is_complete && completeness.missing_fields && completeness.missing_fields.length > 0 && (
          <div className="mt-5 pt-4 border-t border-nexora-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/10 border-amber-500/20 p-3.5 rounded-xl">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="text-white font-medium">Complete your academic identity:</span>{' '}
                <span className="text-nexora-subtext">
                  Add missing fields ({completeness.missing_fields.join(', ')}) so NEXORA can precisely calibrate curriculum, practice problems, and concept explanations to your specific board.
                </span>
              </div>
            </div>
            <Link to="/profile" className="shrink-0">
              <Button variant="primary" size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs py-1 px-3">
                Complete Now
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 1b. Syllabus-First Mandatory Academic Workspace State (Master Prompt 01R) */}
      {!loadingWorkspace && !workspace?.active_syllabus && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-nexora-surface to-indigo-950/30 border border-nexora-primary/30 shadow-glow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20">
                  Your Academic Workspace
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                No active syllabus has been added yet.
              </h2>
              <p className="text-xs sm:text-sm text-nexora-subtext mt-1 max-w-xl">
                Upload your syllabus to build your learning workspace. NEXORA extracts your subjects, units, and lessons directly from your prescribed curriculum.
              </p>
            </div>
            <Link to="/materials?role=primary_syllabus" className="shrink-0">
              <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Upload Syllabus
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. Educational Search & Concept Exploration */}
      <div className="p-6 rounded-2xl bg-nexora-surface/80 border border-nexora-border/80">
        <h2 className="text-base font-semibold text-white mb-1">
          Explore a Topic or Subject
        </h2>
        <p className="text-xs text-nexora-muted mb-4">
          Search for core concepts in your syllabus to view structured lesson breakdowns and examples.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-3xl mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-nexora-muted absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search concepts or topics in your syllabus..."
              className="w-full bg-nexora-bg border border-nexora-border text-white text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder-nexora-muted focus:outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
            />
          </div>
          <Button type="submit" variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Open Lesson
          </Button>
        </form>

        {workspace?.active_syllabus ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-nexora-muted font-medium">Suggested topics:</span>
            {getExampleQueries(profile?.education_category, profile?.education_level).map((item, idx) => (
              <button
                key={idx}
                onClick={() => navigate(`/learn?q=${encodeURIComponent(item.label)}`)}
                className="px-2.5 py-1 rounded-lg bg-nexora-bg/90 border border-nexora-border text-nexora-subtext hover:text-white hover:border-nexora-primary/50 transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-nexora-muted flex items-center gap-2 py-1">
            <Sparkles className="w-3.5 h-3.5 text-nexora-primary" />
            <span>Upload and activate your syllabus to populate curriculum topics and lessons for exploration.</span>
          </div>
        )}
      </div>

      {/* 3. My Enrolled Subjects (Master Prompt 06) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">My Enrolled Subjects</h2>
              {workspace?.enrolled_subjects && workspace.enrolled_subjects.length > 0 && (
                <Badge variant="primary" size="sm">
                  {workspace.enrolled_subjects.length} Enrolled
                </Badge>
              )}
            </div>
            <p className="text-xs text-nexora-muted mt-0.5">
              Curriculum tracks you are actively studying in this academic session
            </p>
          </div>
          <Link to="/subjects">
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
              Manage &amp; Enroll Subjects
            </Button>
          </Link>
        </div>

        {loadingWorkspace ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : !workspace?.active_syllabus || !workspace?.enrolled_subjects || workspace.enrolled_subjects.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-nexora-muted" />}
            title="No curriculum available"
            description={
              !workspace?.active_syllabus
                ? "No active syllabus has been added yet. Upload your syllabus to build your learning workspace and populate subjects."
                : "You have not enrolled in any subjects from your active syllabus yet."
            }
            action={
              <Link to={!workspace?.active_syllabus ? "/materials?role=primary_syllabus" : "/subjects"}>
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  {!workspace?.active_syllabus ? "Upload Syllabus" : "Browse Available Subjects"}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspace.enrolled_subjects.map((sub) => (
              <Card
                key={sub.id}
                variant="interactive"
                onClick={() => navigate(`/subjects/${sub.slug}`)}
                className="group flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-nexora-elevated flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      {getSubjectIcon(sub.icon)}
                    </div>
                    <Badge variant="accent" size="sm" hasDot>
                      Enrolled
                    </Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-nexora-accent transition-colors">
                    {sub.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {sub.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="p-3 rounded-xl bg-nexora-bg/60 border border-nexora-border/50 space-y-1.5">
                    <div className="flex justify-between text-[11px] text-nexora-subtext">
                      <span>Topics &bull; Concepts</span>
                      <span className="font-semibold text-white">
                        {sub.topic_count ?? 0} Topics &bull; {sub.concept_count ?? 0} Concepts
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-nexora-muted">
                      <span>Category</span>
                      <span className="text-nexora-accent font-medium truncate max-w-[150px]">
                        {sub.category}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-nexora-border/40 flex items-center justify-between">
                  <button
                    onClick={(e) => handleUnenroll(sub.id, e)}
                    disabled={enrollingId === sub.id}
                    className="text-[11px] text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    title="Unenroll from subject"
                  >
                    <Trash2 className="w-3 h-3" /> Unenroll
                  </button>
                  <span className="text-xs font-semibold text-nexora-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Open Subject <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 4. Study Materials Hub Preview (Master Prompt 06) */}
      <div className="p-6 rounded-2xl bg-nexora-surface/80 border border-nexora-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-nexora-accent bg-nexora-accent/10 px-2 py-0.5 rounded-full border border-nexora-accent/20 flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Material-Driven Learning Hub
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Study Materials &amp; Syllabus Ingestion
            </h2>
            <p className="text-xs text-nexora-muted">
              Upload your textbooks, syllabi, notes, or lecture PDFs to power knowledge extraction and concept mapping.
            </p>
          </div>
          <Link to="/materials">
            <Button variant="primary" size="sm" leftIcon={<UploadCloud className="w-3.5 h-3.5" />}>
              Upload Materials
            </Button>
          </Link>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3.5 rounded-xl bg-nexora-bg/70 border border-nexora-border/60">
            <div className="text-xl font-bold text-white">
              {workspace?.materials_summary?.total_count ?? 0}
            </div>
            <div className="text-[11px] text-nexora-subtext mt-0.5">Total Uploaded</div>
          </div>
          <div className="p-3.5 rounded-xl bg-nexora-bg/70 border border-nexora-border/60">
            <div className="text-xl font-bold text-emerald-400">
              {workspace?.materials_summary?.ready_count ?? 0}
            </div>
            <div className="text-[11px] text-nexora-subtext mt-0.5">Processed &amp; Indexed</div>
          </div>
          <div className="p-3.5 rounded-xl bg-nexora-bg/70 border border-nexora-border/60">
            <div className="text-xl font-bold text-nexora-primary">
              {workspace?.materials_summary?.processing_count ?? 0}
            </div>
            <div className="text-[11px] text-nexora-subtext mt-0.5">Currently Processing</div>
          </div>
          <div className="p-3.5 rounded-xl bg-nexora-bg/70 border border-nexora-border/60">
            <div className="text-xl font-bold text-amber-400">
              {workspace?.materials_summary?.failed_count ?? 0}
            </div>
            <div className="text-[11px] text-nexora-subtext mt-0.5">Needs Attention</div>
          </div>
        </div>

        {/* Empty state or quick links */}
        {(!workspace?.materials_summary?.recent_materials ||
          workspace.materials_summary.recent_materials.length === 0) ? (
          <div className="p-4 rounded-xl bg-nexora-bg/50 border border-dashed border-nexora-border/80 text-center">
            <p className="text-xs text-nexora-subtext mb-2">
              No study documents uploaded yet. Upload your PDF syllabus, lecture slides, or textbook chapters to enable asynchronous document ingestion and concept alignment.
            </p>
            <Link to="/materials">
              <Button variant="outline" size="sm" leftIcon={<UploadCloud className="w-3.5 h-3.5" />}>
                Go to Materials Page
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-white mb-1">Recent Study Documents</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {workspace.materials_summary.recent_materials.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigate('/materials')}
                  className="p-3 rounded-xl bg-nexora-bg/70 border border-nexora-border/60 hover:border-nexora-primary/50 transition-colors cursor-pointer flex items-start gap-2.5"
                >
                  <FileText className="w-4 h-4 text-nexora-primary shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-white truncate">{doc.title}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge
                        variant={doc.status === 'completed' ? 'accent' : 'neutral'}
                        size="sm"
                      >
                        {doc.status.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] text-nexora-muted">{doc.source_type || 'Upload'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Concept-Aware Academic Learning Tools (Master Prompt 06) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Academic Learning Tools</h2>
            <p className="text-xs text-nexora-muted">
              10 multi-modal learning modalities aligned to your curriculum concepts
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(workspace?.learning_tools || []).map((tool) => {
            const isLive = tool.status === 'active';
            return (
              <div
                key={tool.id}
                onClick={() => {
                  if (isLive && tool.route) {
                    navigate(tool.route);
                  }
                }}
                className={`p-4 rounded-xl border transition-all ${
                  isLive
                    ? 'bg-nexora-surface/90 border-nexora-border/80 hover:border-nexora-primary/60 cursor-pointer group hover:-translate-y-0.5'
                    : 'bg-nexora-surface/40 border-nexora-border/40 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white group-hover:text-nexora-accent transition-colors">
                    {tool.name}
                  </span>
                  <Badge variant={isLive ? 'accent' : 'neutral'} size="sm">
                    {isLive ? 'Live' : tool.phase_label}
                  </Badge>
                </div>
                <p className="text-[11px] text-nexora-subtext line-clamp-2 leading-snug">
                  {tool.description}
                </p>
                {isLive && (
                  <div className="mt-3 text-[11px] font-semibold text-nexora-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Launch <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Continue Learning & Overall Progress Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue Learning Card */}
        {activeCourse ? (
          <Card variant="interactive" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="accent" size="sm" hasDot>
                  Continue Learning
                </Badge>
                <span className="text-xs text-nexora-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Recent
                </span>
              </div>
              <CardTitle className="mt-2 text-xl">{activeCourse.courseTitle}</CardTitle>
              <CardDescription>
                {activeCourse.subject} &bull; {activeCourse.currentTopic}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-nexora-bg/70 border border-nexora-border/60 mb-4">
                <div className="flex justify-between text-xs font-semibold text-white mb-2">
                  <span>Current Lesson: {activeCourse.lastLesson}</span>
                  <span className="text-nexora-accent">
                    {activeCourse.completedTopics} of {activeCourse.totalTopics} Topics Completed
                  </span>
                </div>
                <div className="w-full h-2.5 bg-nexora-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-nexora-primary rounded-full"
                    style={{ width: `${activeCourse.progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-[11px] text-nexora-muted">
                  <span>Progress: {activeCourse.progressPercent}%</span>
                  <span>Target: Next Concept</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center pt-0">
              <span className="text-xs text-nexora-subtext">
                Your active study track
              </span>
              <Link to={activeCourse.targetUrl}>
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Continue Lesson
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <Card variant="interactive" className="lg:col-span-2 flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="neutral" size="sm">
                  Curriculum Core
                </Badge>
                <span className="text-xs text-nexora-muted flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Structured Syllabus
                </span>
              </div>
              <CardTitle className="mt-2 text-xl">Start Your First Lesson</CardTitle>
              <CardDescription>
                You haven't started learning yet. Choose any concept from the curriculum below or search above to begin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-nexora-bg/70 border border-nexora-border/60">
                <p className="text-xs text-nexora-subtext leading-relaxed">
                  NEXORA breaks down concepts through foundational intuition, practical motivation, interactive visual models, and verified concept checks.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center pt-0">
              <span className="text-xs text-nexora-subtext">
                Structured curriculum tracks
              </span>
              <Link to="/subjects">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Explore Subjects
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        {/* Overall Progress Widget */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-nexora-accent" />
              Overall Progress
            </CardTitle>
            <CardDescription>Cumulative course completion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-3">
              <div className="text-4xl font-extrabold text-white mb-1">
                {overallProgress.overallProgressPercent}%
              </div>
              <p className="text-xs text-nexora-subtext">
                {overallProgress.completedLessons > 0
                  ? `${overallProgress.completedLessons} lessons verified`
                  : 'No progress recorded yet'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-nexora-subtext">
                <span>Completed Lessons</span>
                <span className="font-semibold text-white">
                  {overallProgress.completedLessons} Lessons
                </span>
              </div>
              <div className="flex justify-between text-xs text-nexora-subtext">
                <span>Practice Checks Passed</span>
                <span className="font-semibold text-white">
                  {overallProgress.completedQuizzes} Quizzes
                </span>
              </div>
              <div className="flex justify-between text-xs text-nexora-subtext">
                <span>Active Subjects</span>
                <span className="font-semibold text-white">
                  {overallProgress.activeSubjects} Courses
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2 border-t border-nexora-border/40">
            <Link to="/progress" className="w-full">
              <Button variant="outline" size="sm" className="w-full">
                View Full Progress
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* 7. Exploration Through Your Interests (Master Prompt 04) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-2 py-0.5 rounded-full border border-nexora-primary/20 flex items-center gap-1.5">
                <Compass className="w-3 h-3" />
                {profile?.interests && profile.interests.length > 0
                  ? 'Connected to Your Interests'
                  : 'Curriculum Exploration'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {profile?.interests && profile.interests.length > 0
                ? 'Learn Through Examples You Care About'
                : 'Recommended Core Topics'}
            </h2>
            <p className="text-xs text-nexora-muted">
              {profile?.interests && profile.interests.length > 0
                ? 'Concepts connected with your selected hobbies and technical passions.'
                : 'Foundational concepts. You can connect explanations to your hobbies anytime in Profile.'}
            </p>
          </div>
          <Link to="/profile">
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
              {profile?.interests && profile.interests.length > 0 ? 'Edit Interests' : 'Personalize Interests'}
            </Button>
          </Link>
        </div>

        {loadingRecommendations ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <EmptyState
            icon={<Compass className="w-8 h-8 text-nexora-muted" />}
            title="No concepts available yet"
            description={
              !workspace?.active_syllabus
                ? "Upload your syllabus to activate and explore personalized concepts."
                : "No concepts currently matched. Complete your interests in Profile to personalize learning examples."
            }
            action={
              !workspace?.active_syllabus ? (
                <Link to="/materials?role=primary_syllabus">
                  <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Upload Syllabus
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <Card
                key={rec.concept}
                variant="interactive"
                onClick={() => navigate(rec.target_url)}
                className="group flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant={rec.matched_interest === 'Curriculum Core' ? 'neutral' : 'primary'} size="sm">
                      {rec.matched_interest}
                    </Badge>
                    <span className="text-[11px] font-medium text-nexora-muted">
                      {rec.subject}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-white group-hover:text-nexora-accent transition-colors line-clamp-1">
                    {rec.headline}
                  </CardTitle>
                  <CardDescription className="text-xs text-nexora-subtext line-clamp-2 mt-1">
                    {rec.summary}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-2 border-t border-nexora-border/40 flex items-center justify-between text-xs text-nexora-primary font-medium group-hover:translate-x-0.5 transition-transform">
                  <span>Explore Lesson ({rec.concept})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 8. Reference Curriculum Library (Universal & Starter Subjects) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Active Curriculum Subjects</h2>
              <Badge variant="neutral" size="sm">
                Syllabus Grounded
              </Badge>
            </div>
            <p className="text-xs text-nexora-muted mt-0.5">
              Subjects extracted from your active syllabus curriculum
            </p>
          </div>
          <Link to="/subjects">
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
              Manage Subjects
            </Button>
          </Link>
        </div>

        {loadingSubjects ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : !workspace?.active_syllabus || subjects.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-nexora-muted" />}
            title="No curriculum available"
            description="No active syllabus has been added yet. Upload your syllabus to build your learning workspace."
            action={
              <Link to="/materials?role=primary_syllabus">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Upload Syllabus
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjects.map((sub) => (
              <Card
                key={sub.id}
                variant="interactive"
                onClick={() => navigate(`/subjects/${sub.slug}`)}
                className="group flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-nexora-elevated flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      {getSubjectIcon(sub.icon)}
                    </div>
                    {sub.education_level && (
                      <span className="text-[10px] text-nexora-muted font-medium px-2 py-0.5 rounded bg-nexora-bg border border-nexora-border/60">
                        {sub.education_level}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base group-hover:text-nexora-accent transition-colors">
                    {sub.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {sub.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="p-3 rounded-xl bg-nexora-bg/60 border border-nexora-border/50 space-y-1.5">
                    <div className="flex justify-between text-[11px] text-nexora-subtext">
                      <span>Curriculum Core</span>
                      <span className="font-semibold text-white">{sub.concept_count} Lessons</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-nexora-muted">
                      <span>Category</span>
                      <span className="text-nexora-accent font-medium truncate max-w-[140px]">{sub.category}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-nexora-border/40">
                  <span className="text-[11px] text-nexora-muted">
                    Full syllabus
                  </span>
                  <span className="text-xs font-semibold text-nexora-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Explore <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 9. Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Recent Activity</h2>
            <p className="text-xs text-nexora-muted">Your latest completed lessons, practice runs, and notes</p>
          </div>
        </div>

        {recentActivities.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-6 h-6 text-nexora-muted" />}
            title="No activity yet"
            description="Your recent lesson completions, practice tests, and study notes will appear here as you learn."
            action={
              <Link to="/subjects">
                <Button variant="primary" size="sm">Explore Subjects</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="p-4 rounded-xl bg-nexora-surface/80 border border-nexora-border/70 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-nexora-elevated flex items-center justify-center text-nexora-accent shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold text-white truncate">{act.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-nexora-primary font-medium">{act.subject}</span>
                    <span className="text-xs text-nexora-border">&bull;</span>
                    <span className="text-[10px] text-nexora-muted">{act.timeAgo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
