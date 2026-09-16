import React, { useState } from 'react';
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
  Network
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Callout } from '../components/ui/Callout';
import { Link } from 'react-router-dom';

interface ConceptNode {
  id: string;
  title: string;
  level: 'subject' | 'module' | 'topic' | 'concept';
  mastery: number; // 0 to 100
  prerequisites: string[];
  downstream: string[];
  summary: string;
  realWorld: string;
  learnSlug: string;
  hasLab: boolean;
}

const KNOWLEDGE_GRAPH: Record<string, ConceptNode> = {
  'doppler-effect': {
    id: 'doppler-effect',
    title: 'Doppler Effect',
    level: 'concept',
    mastery: 85,
    prerequisites: ['wave-frequency', 'relative-motion'],
    downstream: ['sonic-boom', 'radar-speed-detection', 'astronomical-redshift'],
    summary: 'The perceived change in frequency of a wave when the source and observer are in relative motion.',
    realWorld: 'Emergency siren pitch drop, police LIDAR/radar guns, echography.',
    learnSlug: 'Doppler Effect',
    hasLab: true,
  },
  'wave-frequency': {
    id: 'wave-frequency',
    title: 'Wave Frequency & Wavelength',
    level: 'topic',
    mastery: 100,
    prerequisites: ['periodic-motion'],
    downstream: ['doppler-effect', 'wave-interference'],
    summary: 'The number of complete wave cycles passing a stationary point per unit time (v = f * λ).',
    realWorld: 'Radio station tuning, audio pitch, optical color spectrum.',
    learnSlug: 'Wave Mechanics',
    hasLab: false,
  },
  'relative-motion': {
    id: 'relative-motion',
    title: 'Relative Velocity & Reference Frames',
    level: 'topic',
    mastery: 90,
    prerequisites: ['kinematics-1d'],
    downstream: ['doppler-effect', 'special-relativity'],
    summary: 'Calculating the velocity of an entity relative to a specified inertial or moving frame of reference.',
    realWorld: 'GPS satellite clock synchronization, air traffic trajectory management.',
    learnSlug: 'Relative Motion',
    hasLab: false,
  },
  'binary-search': {
    id: 'binary-search',
    title: 'Binary Search Algorithm',
    level: 'concept',
    mastery: 95,
    prerequisites: ['sorted-arrays', 'logarithmic-complexity'],
    downstream: ['binary-search-trees', 'b-trees', 'git-bisect'],
    summary: 'An efficient algorithm for finding an item from a sorted list of items by repeatedly halving the search space.',
    realWorld: 'SQL database indices, dictionary lookup, debugging regression hunting.',
    learnSlug: 'Binary Search',
    hasLab: true,
  },
  'sorted-arrays': {
    id: 'sorted-arrays',
    title: 'Ordered Arrays & Direct Indexing',
    level: 'topic',
    mastery: 100,
    prerequisites: ['memory-allocation'],
    downstream: ['binary-search', 'two-pointer-technique'],
    summary: 'Contiguous memory buffers with elements arranged in monotonic ascending or descending order.',
    realWorld: 'Cache prefetching, database index scans, telemetry arrays.',
    learnSlug: 'Sorted Arrays',
    hasLab: false,
  },
  'logarithmic-complexity': {
    id: 'logarithmic-complexity',
    title: 'Logarithmic Time Complexity O(log N)',
    level: 'topic',
    mastery: 80,
    prerequisites: ['big-o-notation'],
    downstream: ['binary-search', 'divide-and-conquer'],
    summary: 'Algorithms where the execution time increases proportionally to the logarithm of the input size.',
    realWorld: 'Scalable cloud architectures, cryptographic key sizing, search engines.',
    learnSlug: 'Complexity Analysis',
    hasLab: false,
  },
  'sonic-boom': {
    id: 'sonic-boom',
    title: 'Mach Cone & Shock Wave Discontinuity',
    level: 'concept',
    mastery: 30,
    prerequisites: ['doppler-effect'],
    downstream: ['hypersonic-aerodynamics'],
    summary: 'When a source velocity exceeds wave speed (v_s > v), wavefronts constructively overlap into a conical pressure shock wave.',
    realWorld: 'Supersonic aircraft, bullwhip cracks, explosive detonics.',
    learnSlug: 'Sonic Boom',
    hasLab: true,
  }
};

interface SubjectBranch {
  subject: string;
  modules: {
    name: string;
    conceptIds: string[];
  }[];
}

const CURRICULUM_TREE: SubjectBranch[] = [
  {
    subject: 'Physics & Acoustic Engineering',
    modules: [
      {
        name: 'Classical Wave Mechanics',
        conceptIds: ['wave-frequency', 'relative-motion', 'doppler-effect', 'sonic-boom']
      }
    ]
  },
  {
    subject: 'Computer Science & Algorithms',
    modules: [
      {
        name: 'Divide and Conquer Patterns',
        conceptIds: ['sorted-arrays', 'logarithmic-complexity', 'binary-search']
      }
    ]
  }
];

export const MindMapPage: React.FC = () => {
  const [selectedConceptId, setSelectedConceptId] = useState<string>('doppler-effect');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedNode = KNOWLEDGE_GRAPH[selectedConceptId] || KNOWLEDGE_GRAPH['doppler-effect'];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20">
              Knowledge Graph
            </span>
            <span className="text-xs text-nexora-text-muted">Prerequisite & Semantic Hierarchy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-nexora-text">
            Concept Mind Map
          </h1>
          <p className="text-sm text-nexora-text-muted mt-1">
            Explore how concepts connect. Uncover prerequisite gaps that cause confusion and discover advanced concepts unlocked by your mastery.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Input 
            placeholder="Search concepts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Graph Value Proposition Callout */}
      <Callout
        variant="info"
        title="Prerequisite-First Diagnosis: Never Get Stuck Again"
      >
        <p className="text-sm leading-relaxed">
          Traditional curricula force students linearly through textbooks. NEXORA's <strong>Knowledge Graph</strong> tracks 
          the exact conceptual lineage. If you struggle with <em>Doppler Effect</em>, NEXORA automatically isolates whether the gap 
          is in <em>Relative Motion</em> or <em>Wave Frequency</em>, giving you the exact prerequisite fix immediately.
        </p>
      </Callout>

      {/* Mind Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Graph Hierarchy Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-nexora-border/80">
            <CardHeader className="pb-3 border-b border-nexora-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Network className="w-4 h-4 text-nexora-primary" />
                  Hierarchical Curriculum Knowledge Map
                </CardTitle>
                <Badge variant="neutral" size="sm">
                  {Object.keys(KNOWLEDGE_GRAPH).length} Linked Nodes
                </Badge>
              </div>
              <CardDescription>
                Click any node to inspect prerequisite chains, downstream topics, and interactive lab access.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
              {CURRICULUM_TREE.map((branch, branchIdx) => (
                <div key={branchIdx} className="space-y-4">
                  {/* Subject Header */}
                  <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-nexora-text-subtle">
                    <span className="w-2 h-2 rounded-full bg-nexora-primary"></span>
                    <span>{branch.subject}</span>
                    <div className="flex-1 border-t border-nexora-border/40 ml-2"></div>
                  </div>

                  {/* Modules */}
                  {branch.modules.map((mod, modIdx) => (
                    <div key={modIdx} className="ml-3 pl-4 border-l-2 border-nexora-border/60 space-y-3">
                      <div className="text-xs font-medium text-nexora-text-muted flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-nexora-accent" />
                        <span>Module: {mod.name}</span>
                      </div>

                      {/* Concepts Node Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {mod.conceptIds.map((cid) => {
                          const node = KNOWLEDGE_GRAPH[cid];
                          if (!node) return null;
                          const isSelected = selectedConceptId === cid;

                          return (
                            <div
                              key={cid}
                              onClick={() => setSelectedConceptId(cid)}
                              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? 'bg-nexora-primary/10 border-nexora-primary shadow-glow-sm scale-[1.02]'
                                  : 'bg-nexora-surface/50 border-nexora-border/60 hover:bg-nexora-surface-hover/60 hover:border-nexora-border'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold text-nexora-text">
                                  {node.title}
                                </h4>
                                {node.mastery >= 80 ? (
                                  <Badge variant="success" size="sm">
                                    {node.mastery}%
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" size="sm">
                                    {node.mastery}%
                                  </Badge>
                                )}
                              </div>

                              <p className="text-xs text-nexora-text-muted mt-1.5 line-clamp-2">
                                {node.summary}
                              </p>

                              <div className="mt-3 pt-2 border-t border-nexora-border/40 flex items-center justify-between text-[11px]">
                                <span className="text-nexora-text-subtle capitalize">
                                  {node.level}
                                </span>
                                {node.hasLab && (
                                  <span className="text-nexora-accent font-medium flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> Lab Ready
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Selected Concept Telemetry (1 Col) */}
        <div className="space-y-4">
          <Card className="sticky top-20 border-nexora-border/80 shadow-glow-sm">
            <CardHeader className="pb-3 border-b border-nexora-border/40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-nexora-primary bg-nexora-primary/10 px-2 py-0.5 rounded border border-nexora-primary/20">
                  Concept Telemetry
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  Mastery: {selectedNode.mastery}%
                </span>
              </div>
              <CardTitle className="text-lg mt-2">
                {selectedNode.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-nexora-text-muted font-medium uppercase text-[10px] tracking-wider block mb-1">
                  Core Understanding
                </span>
                <p className="text-nexora-text leading-relaxed">
                  {selectedNode.summary}
                </p>
              </div>

              <div>
                <span className="text-nexora-text-muted font-medium uppercase text-[10px] tracking-wider block mb-1">
                  Real-World Engineering Application
                </span>
                <p className="text-nexora-text font-medium bg-nexora-surface-hover/40 p-2.5 rounded-lg border border-nexora-border/40">
                  {selectedNode.realWorld}
                </p>
              </div>

              {/* Prerequisites Chain */}
              <div className="pt-2 border-t border-nexora-border/40">
                <span className="text-nexora-text-muted font-medium uppercase text-[10px] tracking-wider block mb-2 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-blue-400" />
                  Required Prerequisites (Step Back)
                </span>
                <div className="space-y-1.5">
                  {selectedNode.prerequisites.length === 0 ? (
                    <span className="text-nexora-text-subtle italic">Foundational concept (No prerequisites)</span>
                  ) : (
                    selectedNode.prerequisites.map((pid) => (
                      <button
                        key={pid}
                        onClick={() => setSelectedConceptId(pid)}
                        className="w-full text-left p-2 rounded-lg bg-nexora-surface/60 border border-nexora-border/40 hover:border-nexora-primary/40 text-nexora-text transition-colors flex items-center justify-between"
                      >
                        <span className="font-mono text-xs">{KNOWLEDGE_GRAPH[pid]?.title || pid}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-nexora-text-muted" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Downstream Concepts */}
              <div className="pt-2 border-t border-nexora-border/40">
                <span className="text-nexora-text-muted font-medium uppercase text-[10px] tracking-wider block mb-2 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Unlocked Downstream (Next Steps)
                </span>
                <div className="space-y-1.5">
                  {selectedNode.downstream.length === 0 ? (
                    <span className="text-nexora-text-subtle italic">Frontier topic</span>
                  ) : (
                    selectedNode.downstream.map((did) => (
                      <button
                        key={did}
                        onClick={() => setSelectedConceptId(did)}
                        className="w-full text-left p-2 rounded-lg bg-nexora-surface/60 border border-nexora-border/40 hover:border-nexora-accent/40 text-nexora-text transition-colors flex items-center justify-between"
                      >
                        <span className="font-mono text-xs">{KNOWLEDGE_GRAPH[did]?.title || did}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-nexora-text-muted" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-4 bg-nexora-surface-hover/30 border-t border-nexora-border/40 flex flex-col gap-2">
              <Link to={`/learn?q=${encodeURIComponent(selectedNode.learnSlug)}`} className="w-full">
                <Button variant="primary" size="sm" className="w-full" icon={<BookOpen className="w-3.5 h-3.5" />}>
                  Study "{selectedNode.title}"
                </Button>
              </Link>
              {selectedNode.hasLab && (
                <Link to="/labs" className="w-full">
                  <Button variant="secondary" size="sm" className="w-full" icon={<Zap className="w-3.5 h-3.5" />}>
                    Open in Virtual Lab
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
