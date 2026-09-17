import React from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  Clock,
  BookOpen,
  ArrowRight,
  Zap,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const LabsPage: React.FC = () => {
  const plannedLabTracks = [
    {
      id: 'track-physics',
      title: 'Physics & Wave Mechanics Lab',
      description:
        'Parameter tuning for acoustic wavefront compression, supersonic Mach shock cones, and optical frequency shifts.',
      icon: Zap,
      status: 'Being Prepared',
      activeLessonLink: '/learn?q=Doppler%20Effect',
      activeLessonTitle: 'Doppler Effect Visual Model',
    },
    {
      id: 'track-algorithms',
      title: 'Algorithmic Convergence Lab',
      description:
        'Step-by-step space partition verification, logarithmic pointer convergence, and sorting complexity analysis.',
      icon: Cpu,
      status: 'Being Prepared',
      activeLessonLink: '/learn?q=Binary%20Search',
      activeLessonTitle: 'Binary Search Visual Model',
    },
    {
      id: 'track-systems',
      title: 'Computer Systems & Memory Lab',
      description:
        'Virtual cache hierarchy exploration, page tables, and process deadlock condition simulation.',
      icon: Layers,
      status: 'Being Prepared',
      activeLessonLink: '/learn?q=Operating%20Systems%20Deadlock',
      activeLessonTitle: 'Deadlock Condition Model',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-nexora-accent uppercase tracking-wider">
              Practical Learning
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Labs &amp; Experiments
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Explore interactive practical learning.
          </p>
        </div>
      </div>

      {/* Preparation Notice Card */}
      <div className="p-6 rounded-2xl bg-nexora-surface border border-nexora-border/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-nexora-elevated border border-nexora-border flex items-center justify-center text-cyan-400 shrink-0">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Interactive labs are being prepared
            </h3>
            <p className="text-xs text-nexora-subtext leading-relaxed max-w-2xl">
              Virtual laboratory simulation environments are scheduled for future curriculum updates.
              You can currently interact with active visual models directly inside each topic lesson.
            </p>
          </div>
        </div>
        <Link to="/learn" className="shrink-0">
          <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Browse Active Lessons
          </Button>
        </Link>
      </div>

      {/* Planned Lab Tracks */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Curriculum Lab Tracks</h2>
          <p className="text-xs text-nexora-muted">
            Planned practical laboratories aligned with university course syllabi
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plannedLabTracks.map((track) => {
            const Icon = track.icon;
            return (
              <Card key={track.id} className="border-nexora-border/80 flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-nexora-elevated flex items-center justify-center text-indigo-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="neutral" size="sm">
                      <Clock className="w-3 h-3 mr-1" />
                      {track.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base text-white">{track.title}</CardTitle>
                  <CardDescription className="text-xs line-clamp-3">
                    {track.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="p-3 rounded-xl bg-nexora-bg border border-nexora-border/60 text-xs text-nexora-subtext space-y-1">
                    <span className="text-[10px] text-nexora-muted uppercase font-bold tracking-wider block">
                      Active Lesson Demo:
                    </span>
                    <span className="text-white font-medium block">
                      {track.activeLessonTitle}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-nexora-border/40">
                  <Link to={track.activeLessonLink} className="w-full">
                    <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Open Lesson Visualizer
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
