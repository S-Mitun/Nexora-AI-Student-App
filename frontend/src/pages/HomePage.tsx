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
  Heart,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Subject, RecommendedTopic } from '../types/learning';
import { useAuth } from '../context/AuthContext';
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

const EXAMPLE_QUERIES = [
  { label: 'Doppler Effect', domain: 'Physics' },
  { label: 'Binary Search', domain: 'Computer Science' },
  { label: 'Wave Mechanics', domain: 'Physics' },
  { label: 'Operating Systems Deadlock', domain: 'Computer Science' },
  { label: 'Database Normalization', domain: 'Computer Science' },
];

export const HomePage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendedTopic[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  // Genuine student learning activity & active course
  const [activeCourse, setActiveCourse] = useState<ActiveCourseProgress | null>(() =>
    studentActivityService.getActiveCourse()
  );
  const [recentActivities, setRecentActivities] = useState<StudentActivityItem[]>(() =>
    studentActivityService.getRecentActivities(3)
  );
  const [overallProgress, setOverallProgress] = useState<OverallStudentProgress>(() =>
    studentActivityService.getOverallProgress()
  );

  useEffect(() => {
    let isMounted = true;
    apiService
      .getSubjects()
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

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/learn?q=${encodeURIComponent(query.trim())}`);
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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Welcome Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {getGreeting()}, {studentName}
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Continue your structured learning journey across your registered courses.
          </p>
        </div>

        {activeCourse ? (
          <Link to={activeCourse.targetUrl}>
            <Button variant="primary" size="sm" leftIcon={<Play className="w-3.5 h-3.5" />}>
              Resume Learning
            </Button>
          </Link>
        ) : (
          <Link to="/subjects">
            <Button variant="primary" size="sm" leftIcon={<BookOpen className="w-3.5 h-3.5" />}>
              Start Learning
            </Button>
          </Link>
        )}
      </div>

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
              placeholder="Search concepts or topics (e.g. Doppler Effect, Binary Search, Deadlock)..."
              className="w-full bg-nexora-bg border border-nexora-border text-white text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder-nexora-muted focus:outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
            />
          </div>
          <Button type="submit" variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Open Lesson
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-nexora-muted font-medium">Suggested topics:</span>
          {EXAMPLE_QUERIES.map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(`/learn?q=${encodeURIComponent(item.label)}`)}
              className="px-2.5 py-1 rounded-lg bg-nexora-bg/90 border border-nexora-border text-nexora-subtext hover:text-white hover:border-nexora-primary/50 transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Continue Learning & Overall Progress Grid */}
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
                Free structured curriculum tracks
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

      {/* 4. Exploration Through Your Interests (Master Prompt 04) */}
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

      {/* 5. My Subjects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">My Subjects</h2>
            <p className="text-xs text-nexora-muted">Structured curriculum modules and course tracks</p>
          </div>
          <Link to="/subjects">
            <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
              View All Subjects
            </Button>
          </Link>
        </div>

        {loadingSubjects ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
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
                  <div className="w-10 h-10 rounded-xl bg-nexora-elevated flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    {getSubjectIcon(sub.icon)}
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
                      <span>Track Status</span>
                      <span className="text-nexora-accent font-medium">Available</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-nexora-border/40">
                  <span className="text-[11px] text-nexora-muted">
                    Full structured syllabus
                  </span>
                  <span className="text-xs font-semibold text-nexora-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Open <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 5. Recent Activity */}
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
