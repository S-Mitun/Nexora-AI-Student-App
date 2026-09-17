import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Circle,
  Play,
  FileText,
  HelpCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { studentActivityService } from '../services/studentActivity';

interface TopicItem {
  id: string;
  title: string;
  duration: string;
  status: 'completed' | 'in-progress' | 'not-started';
  lessonSlug: string;
}

interface ModuleItem {
  moduleNumber: number;
  title: string;
  description: string;
  topics: TopicItem[];
}

interface SubjectCourseData {
  title: string;
  code: string;
  department: string;
  description: string;
  progressPercent: number;
  modules: ModuleItem[];
}

const COURSES_DATA: Record<string, SubjectCourseData> = {
  'computer-science': {
    title: 'Data Structures & Algorithms',
    code: 'CS-201',
    department: 'Computer Science & Engineering',
    description:
      'Master essential computer science foundations including contiguous memory, pointer structures, asymptotic complexity, and logarithmic search patterns.',
    progressPercent: 38,
    modules: [
      {
        moduleNumber: 1,
        title: 'Introduction to Data Structures & Complexity',
        description: 'Big-O notation, space-time tradeoffs, and memory layout.',
        topics: [
          {
            id: 'cs-m1-1',
            title: 'Asymptotic Analysis & Big-O Notation',
            duration: '20 mins',
            status: 'not-started',
            lessonSlug: 'Asymptotic Analysis',
          },
          {
            id: 'cs-m1-2',
            title: 'Memory Contiguity & Cache Locality',
            duration: '25 mins',
            status: 'not-started',
            lessonSlug: 'Memory Allocation',
          },
        ],
      },
      {
        moduleNumber: 2,
        title: 'Arrays & Logarithmic Search',
        description: 'Direct indexing, binary search mechanics, and midpoint overflow.',
        topics: [
          {
            id: 'cs-m2-1',
            title: 'Binary Search Algorithm',
            duration: '35 mins',
            status: 'not-started',
            lessonSlug: 'Binary Search',
          },
          {
            id: 'cs-m2-2',
            title: 'Logarithmic Space Reduction',
            duration: '30 mins',
            status: 'not-started',
            lessonSlug: 'Logarithmic Complexity',
          },
        ],
      },
      {
        moduleNumber: 3,
        title: 'Linked Lists & Pointer Traversal',
        description: 'Singly, doubly, and circular linked nodes with memory manipulation.',
        topics: [
          {
            id: 'cs-m3-1',
            title: 'Singly Linked Lists',
            duration: '30 mins',
            status: 'not-started',
            lessonSlug: 'Linked Lists',
          },
          {
            id: 'cs-m3-2',
            title: 'Two-Pointer Technique & Cycle Detection',
            duration: '40 mins',
            status: 'not-started',
            lessonSlug: 'Two Pointer Technique',
          },
        ],
      },
      {
        moduleNumber: 4,
        title: 'Stacks & Queues',
        description: 'LIFO and FIFO data buffering, call stacks, and BFS search frontiers.',
        topics: [
          {
            id: 'cs-m4-1',
            title: 'Stack Mechanics & Expression Evaluation',
            duration: '25 mins',
            status: 'not-started',
            lessonSlug: 'Stacks',
          },
          {
            id: 'cs-m4-2',
            title: 'Queue Buffers & Deques',
            duration: '25 mins',
            status: 'not-started',
            lessonSlug: 'Queues',
          },
        ],
      },
      {
        moduleNumber: 5,
        title: 'Trees & Hierarchical Structures',
        description: 'Binary trees, binary search trees, and heap ordering properties.',
        topics: [
          {
            id: 'cs-m5-1',
            title: 'Binary Search Trees (BST)',
            duration: '45 mins',
            status: 'not-started',
            lessonSlug: 'Binary Search Trees',
          },
        ],
      },
    ],
  },
  physics: {
    title: 'Wave Mechanics & Acoustics',
    code: 'PHYS-101',
    department: 'Department of Physics',
    description:
      'Rigorous study of mechanical waves, wavefront propagation, frequency modulation, and the Doppler effect across acoustic and electromagnetic media.',
    progressPercent: 75,
    modules: [
      {
        moduleNumber: 1,
        title: 'Foundations of Periodic Motion',
        description: 'Simple harmonic motion, wave period, frequency, and wavelength.',
        topics: [
          {
            id: 'ph-m1-1',
            title: 'Periodic Motion & Oscillations',
            duration: '20 mins',
            status: 'completed',
            lessonSlug: 'Periodic Motion',
          },
          {
            id: 'ph-m1-2',
            title: 'Wave Speed, Frequency, and Wavelength',
            duration: '25 mins',
            status: 'completed',
            lessonSlug: 'Wave Frequency',
          },
        ],
      },
      {
        moduleNumber: 2,
        title: 'Wavefront Propagation & Doppler Shift',
        description: 'Moving wave sources, acoustic frequency shifts, and Mach cone mechanics.',
        topics: [
          {
            id: 'ph-m2-1',
            title: 'Doppler Effect',
            duration: '35 mins',
            status: 'completed',
            lessonSlug: 'Doppler Effect',
          },
          {
            id: 'ph-m2-2',
            title: 'Supersonic Shock Waves & Mach Angle',
            duration: '30 mins',
            status: 'in-progress',
            lessonSlug: 'Supersonic Waves',
          },
        ],
      },
      {
        moduleNumber: 3,
        title: 'Interference & Superposition',
        description: 'Constructive and destructive wave superposition in two dimensions.',
        topics: [
          {
            id: 'ph-m3-1',
            title: 'Wave Superposition Principle',
            duration: '30 mins',
            status: 'not-started',
            lessonSlug: 'Wave Interference',
          },
        ],
      },
      {
        moduleNumber: 4,
        title: 'Standing Waves & Resonant Cavities',
        description: 'Nodes, antinodes, and harmonic frequency overtones.',
        topics: [
          {
            id: 'ph-m4-1',
            title: 'Standing Waves in Acoustic Pipes',
            duration: '25 mins',
            status: 'not-started',
            lessonSlug: 'Standing Waves',
          },
        ],
      },
    ],
  },
  mathematics: {
    title: 'Linear Algebra & Multivariable Calculus',
    code: 'MATH-210',
    department: 'Mathematics Department',
    description:
      'Vector spaces, matrix transformations, eigenvalues, partial differentiation, and gradient vector fields.',
    progressPercent: 30,
    modules: [
      {
        moduleNumber: 1,
        title: 'Vectors & Matrix Foundations',
        description: 'Vector spaces, dot products, cross products, and linear combinations.',
        topics: [
          {
            id: 'ma-m1-1',
            title: 'Vector Spaces & Span',
            duration: '30 mins',
            status: 'completed',
            lessonSlug: 'Vector Spaces',
          },
          {
            id: 'ma-m1-2',
            title: 'Matrix Transformations',
            duration: '35 mins',
            status: 'in-progress',
            lessonSlug: 'Matrix Transformations',
          },
        ],
      },
      {
        moduleNumber: 2,
        title: 'Eigenvalues & Diagonalization',
        description: 'Characteristic equations, eigenspaces, and coordinate transformation.',
        topics: [
          {
            id: 'ma-m2-1',
            title: 'Eigenvalues & Eigenvectors',
            duration: '40 mins',
            status: 'not-started',
            lessonSlug: 'Eigenvalues',
          },
        ],
      },
    ],
  },
  biology: {
    title: 'Cellular Biology & Molecular Genetics',
    code: 'BIO-105',
    department: 'Biological Sciences',
    description:
      'Cellular membranes, ATP synthesis, enzyme kinetics, and DNA transcription and translation mechanisms.',
    progressPercent: 15,
    modules: [
      {
        moduleNumber: 1,
        title: 'Cellular Energy Transfer',
        description: 'Mitochondrial respiration, electron transport chain, and glycolysis.',
        topics: [
          {
            id: 'bio-m1-1',
            title: 'Cellular Respiration & ATP Cycle',
            duration: '30 mins',
            status: 'in-progress',
            lessonSlug: 'Cellular Respiration',
          },
        ],
      },
    ],
  },
};

export const SubjectDetailPage: React.FC = () => {
  const { subjectSlug } = useParams<{ subjectSlug: string }>();
  const navigate = useNavigate();

  const course = COURSES_DATA[subjectSlug || 'computer-science'] || COURSES_DATA['computer-science'];

  const getTopicStatus = (topic: TopicItem): TopicItem['status'] => {
    if (studentActivityService.isTopicCompleted(topic.title)) return 'completed';
    const active = studentActivityService.getActiveCourse();
    if (active && active.currentTopic.toLowerCase() === topic.title.toLowerCase()) return 'in-progress';
    return 'not-started';
  };

  const allTopics = course.modules.flatMap((m) => m.topics);
  const totalTopicsCount = allTopics.length;
  const completedTopicsCount = allTopics.filter((t) => getTopicStatus(t) === 'completed').length;
  const progressPercent = totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;

  const getStatusIcon = (status: TopicItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <Circle className="w-4 h-4 text-nexora-muted shrink-0" />;
    }
  };

  const getStatusBadge = (status: TopicItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="accent" size="sm">In Progress</Badge>;
      default:
        return <span className="text-[11px] text-nexora-muted">Not Started</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/subjects"
          className="inline-flex items-center gap-1.5 text-xs text-nexora-muted hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Subjects
        </Link>

        {/* Course Header Banner */}
        <div className="p-6 rounded-2xl bg-nexora-surface border border-nexora-border/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-nexora-accent bg-nexora-elevated px-2 py-0.5 rounded-md">
                {course.code}
              </span>
              <span className="text-xs text-nexora-muted">&bull;</span>
              <span className="text-xs text-nexora-muted">{course.department}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-nexora-subtext leading-relaxed">
              {course.description}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-nexora-bg border border-nexora-border/70 shrink-0 md:w-56 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-nexora-muted">Course Progress</span>
              <span className="font-bold text-white">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-nexora-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-nexora-primary rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-nexora-muted">
              {completedTopicsCount} of {totalTopicsCount} Lessons Completed
            </p>
          </div>
        </div>
      </div>

      {/* Modules & Topics Outline */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Curriculum Modules</h2>
            <p className="text-xs text-nexora-muted">Follow topics in sequential pedagogical order</p>
          </div>
        </div>

        <div className="space-y-4">
          {course.modules.map((mod) => (
            <Card key={mod.moduleNumber} className="overflow-hidden border-nexora-border/80">
              <CardHeader className="bg-nexora-elevated/40 pb-3 border-b border-nexora-border/40">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-nexora-accent uppercase tracking-wider">
                    Module {mod.moduleNumber}
                  </span>
                  <span className="text-xs text-nexora-muted">
                    {mod.topics.length} {mod.topics.length === 1 ? 'Topic' : 'Topics'}
                  </span>
                </div>
                <CardTitle className="text-base text-white">{mod.title}</CardTitle>
                <CardDescription className="text-xs">{mod.description}</CardDescription>
              </CardHeader>

              <CardContent className="p-0 divide-y divide-nexora-border/40">
                {mod.topics.map((topic) => {
                  const status = getTopicStatus(topic);
                  return (
                    <div
                      key={topic.id}
                      onClick={() => navigate(`/learn?q=${encodeURIComponent(topic.title)}`)}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-nexora-elevated/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getStatusIcon(status)}
                        <div>
                          <h4 className="text-xs sm:text-sm font-medium text-white group-hover:text-nexora-accent transition-colors truncate">
                            {topic.title}
                          </h4>
                          <span className="text-[11px] text-nexora-muted">{topic.duration}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {getStatusBadge(status)}
                        <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                          Open Lesson <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
