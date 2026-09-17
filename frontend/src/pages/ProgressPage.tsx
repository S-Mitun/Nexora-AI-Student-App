import React from 'react';
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
import { Link } from 'react-router-dom';

interface SubjectProgressItem {
  subject: string;
  slug: string;
  progressPercent: number;
  completedTopics: number;
  totalTopics: number;
  lastStudied: string;
}

const SUBJECT_PROGRESS: SubjectProgressItem[] = [
  {
    subject: 'Physics: Wave Mechanics',
    slug: 'physics',
    progressPercent: 75,
    completedTopics: 6,
    totalTopics: 8,
    lastStudied: 'Today',
  },
  {
    subject: 'Computer Science: Data Structures',
    slug: 'computer-science',
    progressPercent: 42,
    completedTopics: 5,
    totalTopics: 12,
    lastStudied: 'Yesterday',
  },
  {
    subject: 'Mathematics: Linear Algebra',
    slug: 'mathematics',
    progressPercent: 30,
    completedTopics: 2,
    totalTopics: 8,
    lastStudied: '3 days ago',
  },
  {
    subject: 'Biology: Cellular Foundations',
    slug: 'biology',
    progressPercent: 16,
    completedTopics: 1,
    totalTopics: 6,
    lastStudied: 'Sep 12, 2026',
  },
];

const COMPLETED_TOPICS = [
  {
    id: 'ct-1',
    title: 'Doppler Effect Wavefront Mechanics',
    subject: 'Physics',
    completedOn: 'Sep 17, 2026',
    score: '100% Concept Verification',
  },
  {
    id: 'ct-2',
    title: 'Wave Speed, Frequency, and Wavelength',
    subject: 'Physics',
    completedOn: 'Sep 16, 2026',
    score: 'Verified Lesson',
  },
  {
    id: 'ct-3',
    title: 'Asymptotic Analysis & Big-O Notation',
    subject: 'Computer Science',
    completedOn: 'Sep 15, 2026',
    score: 'Verified Lesson',
  },
  {
    id: 'ct-4',
    title: 'Memory Contiguity & Cache Locality',
    subject: 'Computer Science',
    completedOn: 'Sep 14, 2026',
    score: 'Verified Lesson',
  },
  {
    id: 'ct-5',
    title: 'Vector Spaces & Linear Span',
    subject: 'Mathematics',
    completedOn: 'Sep 12, 2026',
    score: 'Verified Lesson',
  },
];

const RECENT_PRACTICE = [
  {
    id: 'rp-1',
    topic: 'Binary Search Algorithm',
    subject: 'Computer Science',
    accuracy: '100%',
    date: '2 hours ago',
  },
  {
    id: 'rp-2',
    topic: 'Doppler Effect Acoustic Pitch',
    subject: 'Physics',
    accuracy: '100%',
    date: 'Yesterday',
  },
  {
    id: 'rp-3',
    topic: 'Matrix Determinants',
    subject: 'Mathematics',
    accuracy: '80%',
    date: '3 days ago',
  },
];

export const ProgressPage: React.FC = () => {
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
          <div className="text-3xl font-extrabold text-white">48%</div>
          <span className="text-[11px] text-nexora-accent font-medium mt-1 block">
            Across 4 Subjects
          </span>
        </Card>

        <Card className="p-5 border-nexora-border/80">
          <span className="text-xs font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
            Completed Lessons
          </span>
          <div className="text-3xl font-extrabold text-white">14</div>
          <span className="text-[11px] text-emerald-400 font-medium mt-1 block">
            5 Lessons this week
          </span>
        </Card>

        <Card className="p-5 border-nexora-border/80">
          <span className="text-xs font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
            Practice Accuracy
          </span>
          <div className="text-3xl font-extrabold text-white">93%</div>
          <span className="text-[11px] text-nexora-subtext font-medium mt-1 block">
            28 Checks verified
          </span>
        </Card>

        <Card className="p-5 border-nexora-border/80">
          <span className="text-xs font-semibold text-nexora-muted uppercase tracking-wider block mb-1">
            Study Notes Added
          </span>
          <div className="text-3xl font-extrabold text-white">3</div>
          <span className="text-[11px] text-indigo-300 font-medium mt-1 block">
            Personal references
          </span>
        </Card>
      </div>

      {/* 2. Subject Breakdown */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Subject Progress Breakdown</h2>
          <p className="text-xs text-nexora-muted">Course syllabus progress for enrolled curricula</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SUBJECT_PROGRESS.map((item) => (
            <Card key={item.slug} className="border-nexora-border/80 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{item.subject}</h3>
                <span className="text-xs font-bold text-nexora-accent">{item.progressPercent}%</span>
              </div>

              <div className="w-full h-2 bg-nexora-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-nexora-primary rounded-full"
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-nexora-muted pt-1">
                <span>
                  {item.completedTopics} of {item.totalTopics} Topics Completed
                </span>
                <span>Last studied: {item.lastStudied}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Completed Topics & Practice Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completed Topics */}
        <Card className="border-nexora-border/80">
          <CardHeader className="pb-3 border-b border-nexora-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Recently Completed Topics
            </CardTitle>
            <CardDescription>Verified curriculum lessons</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-nexora-border/40">
            {COMPLETED_TOPICS.map((topic) => (
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
                  Completed
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Practice Activity */}
        <Card className="border-nexora-border/80">
          <CardHeader className="pb-3 border-b border-nexora-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-nexora-accent" />
                Recent Practice Checks
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
            {RECENT_PRACTICE.map((prac) => (
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
                  <span className="text-[10px] text-nexora-muted">Score</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
