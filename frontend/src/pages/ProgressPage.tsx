import React from 'react';
import { 
  TrendingUp, 
  Award, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Zap, 
  BookOpen, 
  ArrowRight, 
  Target,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Callout } from '../components/ui/Callout';
import { Link } from 'react-router-dom';

interface SubjectProgress {
  subject: string;
  masteryPercent: number;
  conceptsMastered: number;
  totalConcepts: number;
  color: string;
}

const SUBJECT_PROGRESS: SubjectProgress[] = [
  {
    subject: 'Physics & Acoustics',
    masteryPercent: 88,
    conceptsMastered: 14,
    totalConcepts: 16,
    color: 'bg-nexora-primary'
  },
  {
    subject: 'Computer Science & Algorithms',
    masteryPercent: 92,
    conceptsMastered: 18,
    totalConcepts: 20,
    color: 'bg-nexora-accent'
  },
  {
    subject: 'AI & Machine Learning',
    masteryPercent: 64,
    conceptsMastered: 9,
    totalConcepts: 14,
    color: 'bg-purple-500'
  },
  {
    subject: 'Control Systems & Robotics',
    masteryPercent: 45,
    conceptsMastered: 4,
    totalConcepts: 10,
    color: 'bg-emerald-500'
  }
];

const RECENT_ACTIVITIES = [
  {
    id: 'act-1',
    concept: 'Doppler Effect Wavefronts',
    action: 'Simulated acoustic compression at 45 m/s',
    time: '25 mins ago',
    type: 'lab',
    score: '100% Lab Telemetry'
  },
  {
    id: 'act-2',
    concept: 'Binary Search Algorithm',
    action: 'Completed step-through logarithmic convergence',
    time: '2 hours ago',
    type: 'quiz',
    score: '3/3 Correct'
  },
  {
    id: 'act-3',
    concept: 'Relative Velocity Reference Frames',
    action: 'Mastered prerequisite concept breakdown',
    time: 'Yesterday',
    type: 'learn',
    score: 'Mastered'
  }
];

export const ProgressPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20">
              Mastery Telemetry
            </span>
            <span className="text-xs text-nexora-text-muted">Concept Retention Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-nexora-text">
            Progress & Mastery Matrix
          </h1>
          <p className="text-sm text-nexora-text-muted mt-1">
            NEXORA measures true conceptual understanding—not just memorization—through interactive simulations, applied questions, and recall intervals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" dot pulse>
            Active Streak: 7 Days 🔥
          </Badge>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 border-nexora-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-nexora-primary/10 border border-nexora-primary/20 flex items-center justify-center text-nexora-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-nexora-text-muted">Total Mastery</span>
              <h3 className="text-2xl font-bold font-mono text-nexora-text">79%</h3>
            </div>
          </div>
          <div className="mt-3 w-full bg-nexora-border/40 h-1.5 rounded-full overflow-hidden">
            <div className="bg-nexora-primary h-full rounded-full" style={{ width: '79%' }}></div>
          </div>
        </Card>

        <Card className="p-5 border-nexora-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-nexora-text-muted">Study Streak</span>
              <h3 className="text-2xl font-bold font-mono text-nexora-text">7 Days</h3>
            </div>
          </div>
          <p className="text-[11px] text-nexora-text-subtle mt-3">Personal record: 14 days</p>
        </Card>

        <Card className="p-5 border-nexora-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-nexora-accent/10 border border-nexora-accent/20 flex items-center justify-center text-nexora-accent">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-nexora-text-muted">Simulations Run</span>
              <h3 className="text-2xl font-bold font-mono text-nexora-text">23 Labs</h3>
            </div>
          </div>
          <p className="text-[11px] text-nexora-text-subtle mt-3">Hands-on parameter experiments</p>
        </Card>

        <Card className="p-5 border-nexora-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-nexora-text-muted">Concepts Mastered</span>
              <h3 className="text-2xl font-bold font-mono text-nexora-text">45</h3>
            </div>
          </div>
          <p className="text-[11px] text-nexora-text-subtle mt-3">Out of 60 in active syllabus</p>
        </Card>
      </div>

      {/* Weak Area Diagnosis Callout */}
      <Callout
        variant="warning"
        title="Spaced Repetition Alert: 2 Concepts Need Attention"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm mt-1">
          <p>
            Your retention for <strong>Sonic Boom Shock Waves</strong> (32%) and <strong>Autoencoder Bottlenecks</strong> (48%) has dropped below optimal threshold.
          </p>
          <Link to="/learn?q=Sonic+Boom">
            <Button size="sm" variant="primary" icon={<ArrowRight className="w-3.5 h-3.5" />}>
              Review Now
            </Button>
          </Link>
        </div>
      </Callout>

      {/* Subject Breakdown & Activity History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Mastery Progress */}
        <Card className="border-nexora-border/80">
          <CardHeader className="pb-3 border-b border-nexora-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-nexora-primary" />
              Domain Mastery Breakdown
            </CardTitle>
            <CardDescription>
              Progression calculated across interactive labs, conceptual validations, and active notes.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {SUBJECT_PROGRESS.map((subj, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-nexora-text">{subj.subject}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-nexora-text-muted font-mono">
                      {subj.conceptsMastered}/{subj.totalConcepts} concepts
                    </span>
                    <span className="font-mono font-semibold text-nexora-primary">
                      {subj.masteryPercent}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-nexora-surface-hover/60 h-2 rounded-full overflow-hidden border border-nexora-border/40">
                  <div 
                    className={`${subj.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${subj.masteryPercent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>

          <CardFooter className="p-4 bg-nexora-surface-hover/20 border-t border-nexora-border/40">
            <Link to="/mindmap" className="text-xs text-nexora-accent hover:underline flex items-center gap-1">
              <span>View full concept dependency graph</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardFooter>
        </Card>

        {/* Recent Activity Timeline */}
        <Card className="border-nexora-border/80">
          <CardHeader className="pb-3 border-b border-nexora-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-nexora-accent" />
              Recent Learning Milestones
            </CardTitle>
            <CardDescription>
              Chronological log of simulations executed, concept checks passed, and notes written.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-nexora-border">
              {RECENT_ACTIVITIES.map((act) => (
                <div key={act.id} className="relative">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-nexora-primary ring-4 ring-nexora-bg"></div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-nexora-text">
                        {act.concept}
                      </h4>
                      <p className="text-xs text-nexora-text-muted mt-0.5">
                        {act.action}
                      </p>
                      <span className="text-[10px] text-nexora-text-subtle mt-1 block">
                        {act.time}
                      </span>
                    </div>
                    <Badge variant="success" size="sm">
                      {act.score}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>

          <CardFooter className="p-4 bg-nexora-surface-hover/20 border-t border-nexora-border/40">
            <Link to="/learn?q=Doppler+Effect" className="text-xs text-nexora-primary hover:underline flex items-center gap-1">
              <span>Resume active learning session</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
