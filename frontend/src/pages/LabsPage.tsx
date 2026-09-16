import React, { useState, useRef, useEffect } from 'react';
import { 
  FlaskConical, 
  Play, 
  RotateCcw, 
  Pause, 
  Sliders, 
  Activity, 
  Zap, 
  Cpu, 
  Compass, 
  ChevronRight, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Callout } from '../components/ui/Callout';
import { Link } from 'react-router-dom';

type LabCategory = 'all' | 'physics' | 'algorithms' | 'aiml' | 'systems';

interface LabMeta {
  id: string;
  title: string;
  category: 'physics' | 'algorithms' | 'aiml' | 'systems';
  status: 'active' | 'preview';
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced';
  duration: string;
  description: string;
  realWorldApp: string;
  formula?: string;
  tags: string[];
}

const LABS_LIST: LabMeta[] = [
  {
    id: 'doppler',
    title: 'Doppler Effect & Acoustic Wave Compression',
    category: 'physics',
    status: 'active',
    difficulty: 'Foundational',
    duration: '10 mins',
    description: 'Manipulate a moving wave source to witness wave crest bunching, supersonic Mach shock cones, and frequency shifting in real time.',
    realWorldApp: 'Police Radar, Ultrasound Imaging, Astronomical Redshift',
    formula: "f' = f * (v + v_o) / (v - v_s)",
    tags: ['Acoustics', 'Wave Mechanics', 'Radar']
  },
  {
    id: 'binary-search',
    title: 'Binary Search & Logarithmic Partitioning',
    category: 'algorithms',
    status: 'active',
    difficulty: 'Foundational',
    duration: '8 mins',
    description: 'Step through O(log N) search space reduction. Track Low, Mid, and High pointer convergence on ordered arrays.',
    realWorldApp: 'Database B-Tree Indices, Git Bisect, Memory Allocation',
    formula: 'T(N) = O(log₂ N)',
    tags: ['Algorithms', 'Divide & Conquer', 'Complexity']
  },
  {
    id: 'cnn-explorer',
    title: 'CNN 2D Convolution & Feature Map Inspector',
    category: 'aiml',
    status: 'preview',
    difficulty: 'Intermediate',
    duration: '15 mins',
    description: 'Slide 3x3 kernels across pixel matrices to observe edge detection, Sobel gradients, and activation pooling layers.',
    realWorldApp: 'Autonomous Vehicle Vision, Medical Radiology MRI Diagnosis',
    formula: 'S(i, j) = (I * K)(i, j)',
    tags: ['Deep Learning', 'Computer Vision', 'Tensors']
  },
  {
    id: 'autoencoder',
    title: 'Autoencoder Latent Space Manifold',
    category: 'aiml',
    status: 'preview',
    difficulty: 'Advanced',
    duration: '20 mins',
    description: 'Compress high-dimensional vectors into a 2D latent bottleneck and navigate smooth reconstructed coordinate transitions.',
    realWorldApp: 'Anomaly Detection, Audio Denoising, Generative AI',
    formula: 'Loss = ||x - g(f(x))||²',
    tags: ['Dimensionality Reduction', 'Unsupervised', 'Neural Nets']
  },
  {
    id: 'pid-controller',
    title: 'PID Closed-Loop Quadcopter Attitude Controller',
    category: 'systems',
    status: 'preview',
    difficulty: 'Intermediate',
    duration: '12 mins',
    description: 'Tune Proportional, Integral, and Derivative gain constants to stabilize a simulated drone against sudden wind gusts.',
    realWorldApp: 'Flight Avionics, Rocket Thrust Vectoring, Industrial Robotics',
    formula: 'u(t) = K_p*e(t) + K_i*∫e(τ)dτ + K_d*(de/dt)',
    tags: ['Control Systems', 'Robotics', 'Feedback Loops']
  },
  {
    id: 'sorting-race',
    title: 'Sorting Algorithm Benchmark & Cache Locality',
    category: 'algorithms',
    status: 'preview',
    difficulty: 'Intermediate',
    duration: '10 mins',
    description: 'Race Quicksort, Mergesort, and Heapsort side-by-side with telemetry on comparisons, swaps, and memory overhead.',
    realWorldApp: 'V8 JS Array.sort, High-Frequency Trading Engines',
    formula: 'Comparisons: N log N vs N²',
    tags: ['Data Structures', 'Performance', 'Benchmarking']
  }
];

export const LabsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<LabCategory>('all');
  const [selectedLabId, setSelectedLabId] = useState<string>('doppler');

  // Doppler Simulation State
  const [sourceSpeed, setSourceSpeed] = useState<number>(45);
  const [sourceFreq, setSourceFreq] = useState<number>(2.5);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Binary Search State
  const bsArray = [4, 9, 15, 22, 28, 35, 42, 51, 58, 67, 74, 83, 91, 99];
  const [bsTarget, setBsTarget] = useState<number>(42);
  const [bsStep, setBsStep] = useState<number>(0);
  const [bsHistory, setBsHistory] = useState<Array<{ low: number; mid: number; high: number }>>([]);

  const categoryTabs = [
    { id: 'all', label: `All Labs (${LABS_LIST.length})` },
    { id: 'physics', label: 'Physics & Acoustics' },
    { id: 'algorithms', label: 'Algorithms & CS' },
    { id: 'aiml', label: 'AI / Machine Learning' },
    { id: 'systems', label: 'Control & Systems' },
  ];

  const filteredLabs = LABS_LIST.filter(lab => 
    activeCategory === 'all' || lab.category === activeCategory
  );

  const selectedLab = LABS_LIST.find(l => l.id === selectedLabId) || LABS_LIST[0];

  // Doppler Canvas Engine
  useEffect(() => {
    if (selectedLabId !== 'doppler' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let sourceX = 80;
    const waveSpeed = 90;
    const waves: Array<{ x: number; y: number; r: number }> = [];
    let lastWaveTime = 0;

    const render = (time: number) => {
      if (!isSimRunning) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center guideline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const intervalMs = 1000 / sourceFreq;
      if (time - lastWaveTime > intervalMs) {
        waves.push({ x: sourceX, y: canvas.height / 2, r: 0 });
        lastWaveTime = time;
      }

      sourceX += sourceSpeed / 60;
      if (sourceX > canvas.width - 60) {
        sourceX = 80;
        waves.length = 0;
      }

      // Draw wavefronts
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.r += waveSpeed / 60;

        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        const opacity = Math.max(0.1, 0.7 - (w.r / canvas.width));
        ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (w.r > canvas.width) {
          waves.splice(i, 1);
        }
      }

      // Draw Observer ahead
      const obsX = canvas.width - 90;
      const obsY = canvas.height / 2;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(obsX, obsY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Observer', obsX - 18, obsY + 22);

      // Draw Moving Source
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(sourceX, canvas.height / 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fda4af';
      ctx.fillText('Source (v_s)', sourceX - 24, canvas.height / 2 - 16);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [selectedLabId, isSimRunning, sourceSpeed, sourceFreq]);

  // Binary Search Step Engine
  const runBinarySearchStep = () => {
    let low = 0;
    let high = bsArray.length - 1;

    if (bsHistory.length > 0) {
      const last = bsHistory[bsHistory.length - 1];
      const mid = last.mid;
      if (bsArray[mid] === bsTarget) return;

      if (bsArray[mid] < bsTarget) {
        low = mid + 1;
        high = last.high;
      } else {
        low = last.low;
        high = mid - 1;
      }
    }

    if (low <= high) {
      const mid = Math.floor((low + high) / 2);
      setBsHistory(prev => [...prev, { low, mid, high }]);
      setBsStep(prev => prev + 1);
    }
  };

  const resetBinarySearch = () => {
    setBsStep(0);
    setBsHistory([]);
  };

  const currentBs = bsHistory.length > 0 
    ? bsHistory[bsHistory.length - 1] 
    : { low: 0, mid: Math.floor((bsArray.length - 1) / 2), high: bsArray.length - 1 };

  const isBsFound = bsHistory.length > 0 && bsArray[currentBs.mid] === bsTarget;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20">
              Interactive Lab Suite
            </span>
            <span className="text-xs text-nexora-text-muted">Master Prompt 08 Simulation Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-nexora-text">
            Virtual Labs & Simulations
          </h1>
          <p className="text-sm text-nexora-text-muted mt-1">
            "Show me, don't just tell me." Manipulate live mathematical variables, observe algorithmic state, and verify engineering concepts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">
            2 Active Labs Ready
          </Badge>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs 
        tabs={categoryTabs} 
        activeTab={activeCategory} 
        onChange={(id) => setActiveCategory(id as LabCategory)} 
        variant="pills"
      />

      {/* Main Lab Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Canvas / Simulator (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-nexora-border/80 shadow-glow-sm">
            {/* Lab Topbar */}
            <div className="px-6 py-4 bg-nexora-surface-hover/30 border-b border-nexora-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-nexora-primary/10 border border-nexora-primary/20 flex items-center justify-center text-nexora-primary">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-nexora-text">
                    {selectedLab.title}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-nexora-text-muted">
                    <span>{selectedLab.difficulty}</span>
                    <span>•</span>
                    <span>{selectedLab.duration}</span>
                    <span>•</span>
                    <span className="font-mono text-nexora-accent">{selectedLab.formula}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedLab.status === 'active' ? (
                  <Badge variant="success" dot pulse>Live Interactive</Badge>
                ) : (
                  <Badge variant="warning">Simulation Blueprint</Badge>
                )}
              </div>
            </div>

            {/* Simulation Canvas Area */}
            <CardContent className="p-6">
              {selectedLab.id === 'doppler' && (
                <div className="space-y-5">
                  <div className="relative rounded-xl overflow-hidden border border-nexora-border/70 bg-[#090d16]">
                    <canvas 
                      ref={canvasRef} 
                      width={680} 
                      height={280} 
                      className="w-full h-[280px] block"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => setIsSimRunning(!isSimRunning)}
                        icon={isSimRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      >
                        {isSimRunning ? 'Pause' : 'Resume'}
                      </Button>
                    </div>
                  </div>

                  {/* Telemetry & Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-nexora-surface/60 p-4 rounded-xl border border-nexora-border/40">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-nexora-text-muted font-medium">Source Velocity (v_s)</span>
                        <span className="font-mono text-nexora-primary">{sourceSpeed} m/s</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="85" 
                        value={sourceSpeed} 
                        onChange={(e) => setSourceSpeed(Number(e.target.value))}
                        className="w-full accent-nexora-primary cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-nexora-text-muted font-medium">Emitted Wave Frequency (f)</span>
                        <span className="font-mono text-nexora-accent">{sourceFreq} Hz</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        step="0.5"
                        value={sourceFreq} 
                        onChange={(e) => setSourceFreq(Number(e.target.value))}
                        className="w-full accent-nexora-accent cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Live Measurement Readout */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-nexora-surface/40 border border-nexora-border/30">
                      <span className="text-[10px] text-nexora-text-muted uppercase">Mach Ratio</span>
                      <p className="text-base font-mono font-semibold text-nexora-primary mt-0.5">
                        {(sourceSpeed / 90).toFixed(2)} M
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-nexora-surface/40 border border-nexora-border/30">
                      <span className="text-[10px] text-nexora-text-muted uppercase">Observed Shift</span>
                      <p className="text-base font-mono font-semibold text-emerald-400 mt-0.5">
                        +{((sourceSpeed / (90 - sourceSpeed)) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-nexora-surface/40 border border-nexora-border/30">
                      <span className="text-[10px] text-nexora-text-muted uppercase">Compression State</span>
                      <p className="text-base font-mono font-semibold text-nexora-accent mt-0.5">
                        {sourceSpeed > 75 ? 'Near-Sonic' : 'Subsonic'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedLab.id === 'binary-search' && (
                <div className="space-y-5">
                  <div className="p-6 rounded-xl border border-nexora-border/70 bg-[#090d16] space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-xs text-nexora-text-muted">Target Element:</span>
                        <div className="flex items-center gap-2 mt-1">
                          {[15, 42, 74, 99].map(target => (
                            <button
                              key={target}
                              onClick={() => { setBsTarget(target); resetBinarySearch(); }}
                              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                                bsTarget === target 
                                  ? 'bg-nexora-primary/20 border-nexora-primary text-nexora-primary font-semibold' 
                                  : 'bg-nexora-surface/60 border-nexora-border/60 text-nexora-text-muted hover:border-nexora-primary/40'
                              }`}
                            >
                              {target}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={resetBinarySearch}
                          icon={<RotateCcw className="w-3.5 h-3.5" />}
                        >
                          Reset
                        </Button>
                        <Button 
                          size="sm" 
                          variant="primary" 
                          onClick={runBinarySearchStep}
                          disabled={isBsFound || currentBs.low > currentBs.high}
                          icon={<Play className="w-3.5 h-3.5" />}
                        >
                          {isBsFound ? 'Target Found' : 'Step Next'}
                        </Button>
                      </div>
                    </div>

                    {/* Array visualization */}
                    <div className="overflow-x-auto py-4">
                      <div className="flex items-center gap-2 min-w-[560px]">
                        {bsArray.map((val, idx) => {
                          const isLow = idx === currentBs.low;
                          const isHigh = idx === currentBs.high;
                          const isMid = idx === currentBs.mid;
                          const isTarget = val === bsTarget && isBsFound;
                          const isInRange = idx >= currentBs.low && idx <= currentBs.high;

                          let bgStyle = 'bg-nexora-surface/40 border-nexora-border/40 text-nexora-text-muted opacity-40';
                          if (isInRange) {
                            bgStyle = 'bg-nexora-surface border-nexora-border text-nexora-text opacity-100';
                          }
                          if (isMid) {
                            bgStyle = 'bg-nexora-accent/20 border-nexora-accent text-nexora-accent font-bold scale-105 shadow-glow-sm';
                          }
                          if (isTarget) {
                            bgStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold scale-110 shadow-glow-sm';
                          }

                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center">
                              <span className="text-[9px] font-mono text-nexora-text-subtle mb-1">[{idx}]</span>
                              <div className={`w-10 h-12 rounded-lg flex items-center justify-center border font-mono text-sm transition-all duration-300 ${bgStyle}`}>
                                {val}
                              </div>
                              <div className="h-5 mt-1 flex items-center text-[10px] font-mono font-semibold">
                                {isLow && <span className="text-blue-400">L</span>}
                                {isMid && <span className="text-nexora-accent mx-0.5">M</span>}
                                {isHigh && <span className="text-amber-400">H</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {isBsFound && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Target <strong>{bsTarget}</strong> located at index [{currentBs.mid}] in {bsStep} comparison steps! Maximum bound: ⌈log₂(14)⌉ = 4 steps.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedLab.status === 'preview' && (
                <div className="p-8 text-center bg-nexora-surface/30 rounded-xl border border-dashed border-nexora-border/70 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-nexora-primary/10 border border-nexora-primary/20 flex items-center justify-center text-nexora-primary mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-nexora-text">
                    Master Prompt 08 Simulation Engine Integration
                  </h3>
                  <p className="text-xs text-nexora-text-muted max-w-md mx-auto leading-relaxed">
                    This interactive simulator is architected in the Stage 08 Lab Engine blueprint.
                    It will render complete WebGL shaders and real-time tensor calculation graphs.
                  </p>
                  <Link to="/learn?q=Doppler+Effect">
                    <Button variant="secondary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Explore Live Doppler Lab Instead
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>

            {/* Educational Engineering Connection */}
            <CardFooter className="p-5 bg-nexora-surface-hover/20 border-t border-nexora-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs">
                <span className="text-nexora-text-muted">Real-World Engineering: </span>
                <span className="font-semibold text-nexora-text">{selectedLab.realWorldApp}</span>
              </div>
              <Link to={`/learn?q=${encodeURIComponent(selectedLab.title)}`}>
                <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />}>
                  Learn Theory & Walkthrough
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Right: Lab Directory & Cards (1 Col) */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-nexora-text-muted flex items-center justify-between">
            <span>Available Labs</span>
            <span className="text-xs text-nexora-primary font-mono">{filteredLabs.length} Available</span>
          </h3>

          <div className="space-y-3">
            {filteredLabs.map((lab) => {
              const isSelected = lab.id === selectedLabId;
              return (
                <div
                  key={lab.id}
                  onClick={() => setSelectedLabId(lab.id)}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? 'bg-nexora-surface border-nexora-primary shadow-glow-sm scale-[1.01]' 
                      : 'bg-nexora-surface/40 border-nexora-border/50 hover:bg-nexora-surface-hover/50 hover:border-nexora-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-nexora-text line-clamp-1">
                      {lab.title}
                    </h4>
                    {lab.status === 'active' ? (
                      <Badge variant="success" size="sm">Active</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">Preview</Badge>
                    )}
                  </div>
                  <p className="text-xs text-nexora-text-muted mt-1.5 line-clamp-2">
                    {lab.description}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-nexora-border/40 text-[11px] text-nexora-text-subtle">
                    <span className="font-mono text-nexora-accent">{lab.difficulty}</span>
                    <span>{lab.duration}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
