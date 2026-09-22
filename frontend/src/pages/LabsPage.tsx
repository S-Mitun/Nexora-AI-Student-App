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
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAcademicContext } from '../context/AcademicContext';
import { useSyllabus } from '../context/SyllabusContext';

interface LabTrack {
  id: string;
  title: string;
  description: string;
  applicableTiers: string[];
  icon: React.ElementType;
  status: string;
  activeLessonLink: string;
  activeLessonTitle: string;
}

const ALL_LAB_TRACKS: LabTrack[] = [
  {
    id: 'track-secondary-science',
    title: 'Force & Pressure Dynamics Lab',
    description:
      'Interactive force vectors, contact dynamics, Pascal pressure distributions, and fluid displacement models.',
    applicableTiers: ['class_6_10', 'secondary', 'middle'],
    icon: FlaskConical,
    status: 'In Development',
    activeLessonLink: '/learn?q=Force%20and%20Pressure%20Dynamics',
    activeLessonTitle: 'Force & Pressure Dynamics Visualizer',
  },
  {
    id: 'track-physics',
    title: 'Wave Mechanics & Kinematics Lab',
    description:
      'Acoustic wavefront compression, Doppler frequency shifts, and supersonic Mach shock cone geometries.',
    applicableTiers: ['class_11_12', 'higher_secondary'],
    icon: Zap,
    status: 'In Development',
    activeLessonLink: '/learn?q=Doppler%20Effect',
    activeLessonTitle: 'Wave Mechanics Visual Model',
  },
  {
    id: 'track-systems',
    title: 'Computer Systems & Concurrency Lab',
    description:
      'Virtual cache hierarchy exploration, page tables, and process deadlock condition simulation.',
    applicableTiers: ['undergraduate', 'postgraduate'],
    icon: Layers,
    status: 'In Development',
    activeLessonLink: '/learn?q=Operating%20Systems%20Deadlock',
    activeLessonTitle: 'Deadlock Condition Model',
  },
];

export const LabsPage: React.FC = () => {
  const { academicContext, enrolledSubjects } = useAcademicContext();
  const { hasSyllabus, isCurriculumActive } = useSyllabus();
  const currentTier = academicContext?.academic_level;
  const displayCategory = academicContext?.education_category || currentTier;

  // Filter lab tracks that genuinely match the student's active academic tier and enrolled syllabus
  const applicableTracks = currentTier && enrolledSubjects && enrolledSubjects.length > 0 && isCurriculumActive
    ? ALL_LAB_TRACKS.filter((track) =>
        track.applicableTiers.some((tier) => tier === currentTier || tier === displayCategory)
      )
    : [];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-nexora-accent uppercase tracking-wider">
              Practical Learning
            </span>
            <span className="text-xs text-nexora-muted">&bull;</span>
            <span className="text-xs text-nexora-subtext capitalize">
              {academicContext?.grade_level || 'Academic Workspace'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Concept Simulations &amp; Labs
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Virtual experiments and parameter-tuning models strictly scoped to your academic curriculum.
          </p>
        </div>
      </div>

      {/* Blueprint Info Banner */}
      <div className="p-6 rounded-2xl bg-nexora-surface border border-nexora-border/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-nexora-elevated border border-nexora-border flex items-center justify-center text-cyan-400 shrink-0">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Interactive Lab Blueprint
            </h3>
            <p className="text-xs text-nexora-subtext leading-relaxed max-w-2xl">
              Virtual laboratory simulation environments are scheduled for curriculum activation in Prompt 20.
              Active visual models are accessible directly within individual concept lessons.
            </p>
          </div>
        </div>
        <Link to="/learn" className="shrink-0">
          <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Browse Active Lessons
          </Button>
        </Link>
      </div>

      {/* Context-Aware Content or Honest Empty State */}
      {applicableTracks.length === 0 ? (
        <Card className="border-nexora-border/80 p-8 text-center">
          <EmptyState
            icon={<FlaskConical className="w-10 h-10 text-nexora-muted mx-auto" />}
            title={
              hasSyllabus && !isCurriculumActive
                ? 'Syllabus uploaded. Labs not ready yet.'
                : 'No curriculum-linked labs available'
            }
            description={
              hasSyllabus && !isCurriculumActive
                ? 'Your primary syllabus is uploaded and verified. Concept simulations and virtual laboratory tracks will become available once curriculum activation is completed.'
                : 'Interactive simulations and virtual experiments are calibrated to active syllabus concepts. Upload your syllabus to view calibrated simulations and labs.'
            }
            action={
              <Link to="/syllabus">
                <Button variant="primary" size="md">
                  {hasSyllabus ? 'View Syllabus Hub' : 'Upload Syllabus'}
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Curriculum Lab Tracks</h2>
            <p className="text-xs text-nexora-muted">
              Practical laboratories aligned with your active academic curriculum ({academicContext?.grade_level})
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applicableTracks.map((track) => {
              const Icon = track.icon;
              return (
                <Card key={track.id} className="border-nexora-border/80 flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-nexora-elevated flex items-center justify-center text-cyan-400">
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
                        Linked Lesson Model:
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
      )}
    </div>
  );
};
