import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Sparkles,
  ArrowRight,
  Zap,
  Cpu,
  Binary,
  Dna,
  BookOpen,
  Play,
  RotateCcw,
  FlaskConical,
  MessageSquare,
  Award,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Subject } from '../types/learning';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';

const EXAMPLE_QUERIES = [
  { label: 'Doppler Effect', domain: 'Physics' },
  { label: 'Binary Search', domain: 'Algorithms' },
  { label: 'Convolutional Neural Network', domain: 'Deep Learning' },
  { label: 'Explain deadlock', domain: 'Operating Systems' },
  { label: 'Why is normalization important?', domain: 'Databases' },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Active student context (real educational progress state)
  const [lastStudiedConcept] = useState({
    title: 'Doppler Effect',
    subject: 'Physics',
    topic: 'Wave Mechanics',
    lastStep: 'Visualizing Wave Compression',
    completedStages: 4,
    totalStages: 10,
    slug: 'doppler-effect',
  });

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
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/learn?q=${encodeURIComponent(query.trim())}`);
  };

  const selectExample = (example: string) => {
    setQuery(example);
    navigate(`/learn?q=${encodeURIComponent(example)}`);
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
    <div className="space-y-10">
      {/* 1. Greeting & Daily Intent */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-nexora-border/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-nexora-accent uppercase tracking-wider">
              Student Workspace
            </span>
            <span className="text-xs text-nexora-muted">&bull;</span>
            <span className="text-xs text-nexora-muted">Daily Learning Session</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Welcome back. What are you trying to understand today?
          </h1>
        </div>

        <Link to="/learn?q=Doppler%20Effect">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Play className="w-3.5 h-3.5" />}
          >
            Resume Active Session
          </Button>
        </Link>
      </div>

      {/* 2. Primary Action Hero: What are you trying to understand? */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-nexora-surface via-nexora-elevated to-nexora-surface border border-nexora-border/80 shadow-glow/30 overflow-hidden">
        {/* Ambient background blur */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-nexora-primary/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nexora-primary/15 border border-nexora-primary/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-nexora-accent" />
            SHOW ME, DON'T JUST TELL ME
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug mb-3">
            You're already learning. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              NEXORA helps you understand difficult concepts.
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-nexora-subtext max-w-2xl leading-relaxed mb-6">
            Keep your lectures, textbooks, and syllabus. When you hit a theoretical wall, NEXORA transforms it into an intuitive, observable experience.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-2xl mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-nexora-muted absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What concept do you find difficult? (e.g. Doppler Effect, Binary Search, CNN)"
                className="w-full bg-nexora-bg/90 border border-nexora-border text-white text-sm rounded-xl pl-10 pr-4 py-3 placeholder-nexora-muted focus:outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
              />
            </div>
            <Button type="submit" variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Explore Concept
            </Button>
          </form>

          {/* Quick Concept Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-nexora-muted font-medium">Quick explore:</span>
            {EXAMPLE_QUERIES.map((item, idx) => (
              <button
                key={idx}
                onClick={() => selectExample(item.label)}
                className="px-2.5 py-1 rounded-lg bg-nexora-bg/70 border border-nexora-border/70 text-nexora-subtext hover:text-white hover:border-nexora-primary/50 transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Continue Learning & Recommended Next Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue Learning Card */}
        <Card variant="interactive" className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="accent" size="sm" hasDot>
                Active Learning Journey
              </Badge>
              <span className="text-xs text-nexora-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Recent
              </span>
            </div>
            <CardTitle className="mt-2 text-xl">{lastStudiedConcept.title}</CardTitle>
            <CardDescription>
              {lastStudiedConcept.subject} &bull; {lastStudiedConcept.topic}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-xl bg-nexora-bg/70 border border-nexora-border/60 mb-4">
              <div className="flex justify-between text-xs font-semibold text-white mb-2">
                <span>Current Step: {lastStudiedConcept.lastStep}</span>
                <span className="text-nexora-accent">
                  Step {lastStudiedConcept.completedStages} of {lastStudiedConcept.totalStages}
                </span>
              </div>
              <div className="w-full h-2 bg-nexora-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                  style={{
                    width: `${(lastStudiedConcept.completedStages / lastStudiedConcept.totalStages) * 100}%`,
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-nexora-subtext leading-relaxed">
              You tested wave propagation at 40 m/s. Next, observe frequency compression when the source approaches the speed of sound.
            </p>
          </CardContent>
          <CardFooter>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Simulation active
            </span>
            <Link to={`/learn?q=${encodeURIComponent(lastStudiedConcept.title)}`}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Continue Concept
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Quick Launch Shortcuts: AI Chat & Labs */}
        <div className="space-y-4">
          <Card variant="interactive">
            <Link to="/chat" className="block p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Ask AI Companion</h4>
                  <p className="text-[11px] text-nexora-muted">Socratic & textbook grounded</p>
                </div>
              </div>
              <p className="text-xs text-nexora-subtext leading-relaxed">
                Stuck on a homework problem or formula? Ask for intuitive analogies and step-by-step breakdowns.
              </p>
            </Link>
          </Card>

          <Card variant="interactive">
            <Link to="/labs" className="block p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Virtual Laboratories</h4>
                  <p className="text-[11px] text-nexora-muted">Simulate & experiment</p>
                </div>
              </div>
              <p className="text-xs text-nexora-subtext leading-relaxed">
                Tune physics parameters, explore algorithm step trees, and observe mechanics live.
              </p>
            </Link>
          </Card>
        </div>
      </div>

      {/* 4. Curriculum Domains (Connected to live API) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Curriculum Domains</h3>
            <p className="text-xs text-nexora-muted">Foundational STEM subjects configured for conceptual mastery</p>
          </div>
          <Badge variant="neutral" size="sm">
            Live Database Feed
          </Badge>
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
                onClick={() => navigate(`/learn?subject=${sub.slug}`)}
                className="group"
              >
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-xl bg-nexora-elevated flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    {getSubjectIcon(sub.icon)}
                  </div>
                  <CardTitle className="text-base group-hover:text-nexora-accent transition-colors">
                    {sub.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {sub.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-3">
                  <span className="text-[11px] text-nexora-muted">
                    {sub.concept_count} foundational concepts
                  </span>
                  <ChevronRight className="w-4 h-4 text-nexora-muted group-hover:text-white transition-colors" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 5. The NEXORA 10-Stage Learning Loop Overview */}
      <div className="glass-panel rounded-2xl p-6 border border-nexora-border/60">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            NEXORA Experiential Pathway
          </h4>
        </div>
        <p className="text-xs text-nexora-muted mb-4 max-w-xl">
          Students do not learn through summaries alone. NEXORA structures each concept into ten active comprehension stages:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
          {[
            { num: '01', title: 'DISCOVER', desc: 'Identify core problem' },
            { num: '02', title: 'WHY?', desc: 'Real-world anchor' },
            { num: '03', title: 'UNDERSTAND', desc: 'Intuitive mental model' },
            { num: '04', title: 'VISUALIZE', desc: 'Observable motion' },
            { num: '05', title: 'EXPERIMENT', desc: 'Tune live variables' },
            { num: '06', title: 'APPLY', desc: 'Practical engineering' },
            { num: '07', title: 'ASK', desc: 'Socratic dialogue' },
            { num: '08', title: 'PRACTICE', desc: 'Concept checks' },
            { num: '09', title: 'REFLECT', desc: 'Personal notes' },
            { num: '10', title: 'MASTER', desc: 'Retention & transfer' },
          ].map((step) => (
            <div
              key={step.num}
              className="p-2.5 rounded-xl bg-nexora-elevated/50 border border-nexora-border/40 text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-nexora-accent">{step.num}</span>
                <span className="font-bold text-[11px] text-white">{step.title}</span>
              </div>
              <span className="text-[10px] text-nexora-muted line-clamp-1">{step.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
