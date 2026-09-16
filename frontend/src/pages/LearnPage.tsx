import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Compass,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  BookOpen,
  HelpCircle,
  PenTool,
  Award,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { apiService } from '../services/api';
import { ConceptExploreResult } from '../types/learning';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { WhyItMatters } from '../components/learning/WhyItMatters';
import { VisualContainer } from '../components/learning/VisualContainer';
import { ProgressiveJourney, LearningStepId } from '../components/learning/ProgressiveJourney';

export const LearnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || 'Doppler Effect';

  const [loading, setLoading] = useState(true);
  const [conceptData, setConceptData] = useState<ConceptExploreResult | null>(null);
  const [activeTab, setActiveTab] = useState<'visualize' | 'technical' | 'ask'>('visualize');
  const [currentStep, setCurrentStep] = useState<LearningStepId>('visualize');
  const [completedSteps, setCompletedSteps] = useState<LearningStepId[]>(['discover', 'why', 'understand']);

  // Simulation state for Doppler Effect
  const [sourceSpeed, setSourceSpeed] = useState<number>(40);
  const [sourceFreq, setSourceFreq] = useState<number>(2);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation state for Binary Search
  const [bsTarget, setBsTarget] = useState<number>(42);
  const [bsStep, setBsStep] = useState<number>(0);
  const [bsHistory, setBsHistory] = useState<Array<{ low: number; mid: number; high: number }>>([]);
  const bsArray = [3, 7, 11, 14, 19, 23, 29, 34, 42, 49, 56, 63, 71, 85, 92];

  // Quiz State
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Student Notes
  const [studentNote, setStudentNote] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState<boolean>(false);

  // Load concept decomposition from backend
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    apiService
      .exploreConcept(queryParam)
      .then((data) => {
        if (isMounted) {
          setConceptData(data);
          setLoading(false);
          setSelectedAnswer(null);
          setQuizSubmitted(false);

          // Restore student note for this concept if saved
          const savedNote = localStorage.getItem(`nexora_note_${data.concept}`);
          if (savedNote) {
            setStudentNote(savedNote);
          } else {
            setStudentNote('');
          }
        }
      })
      .catch((err) => {
        console.error('Failed to explore concept:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [queryParam]);

  // Doppler Simulation Canvas Loop
  useEffect(() => {
    if (!canvasRef.current || conceptData?.simulation?.simulation_type !== 'wave_compression') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    let sourceX = 100;
    const waveSpeed = 100;
    const waves: Array<{ x: number; y: number; r: number }> = [];
    let lastWaveTime = 0;

    const render = (time: number) => {
      if (!isSimRunning) {
        animationFrame = requestAnimationFrame(render);
        return;
      }

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Emit new wavefront at interval = 1000 / sourceFreq
      const intervalMs = 1000 / sourceFreq;
      if (time - lastWaveTime > intervalMs) {
        waves.push({ x: sourceX, y: canvas.height / 2, r: 0 });
        lastWaveTime = time;
      }

      // Move source
      sourceX += sourceSpeed / 60;
      if (sourceX > canvas.width - 60) {
        sourceX = 100;
        waves.length = 0;
      }

      // Draw and expand waves
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.r += waveSpeed / 60;

        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (w.r > canvas.width) {
          waves.splice(i, 1);
        }
      }

      // Draw stationary observer on the right
      const obsX = canvas.width - 60;
      const obsY = canvas.height / 2;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(obsX, obsY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('Observer', obsX - 22, obsY + 22);

      // Draw moving source
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(sourceX, canvas.height / 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Source', sourceX - 16, canvas.height / 2 - 14);

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrame);
  }, [conceptData, sourceSpeed, sourceFreq, isSimRunning]);

  // Binary Search Traversal Logic
  useEffect(() => {
    const history: Array<{ low: number; mid: number; high: number }> = [];
    let low = 0;
    let high = bsArray.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      history.push({ low, mid, high });
      if (bsArray[mid] === bsTarget) break;
      if (bsArray[mid] < bsTarget) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    setBsHistory(history);
    setBsStep(0);
  }, [bsTarget]);

  const handleSaveNote = () => {
    if (!conceptData) return;
    localStorage.setItem(`nexora_note_${conceptData.concept}`, studentNote);
    setNoteSaved(true);
    if (!completedSteps.includes('reflect')) {
      setCompletedSteps((prev) => [...prev, 'reflect']);
    }
    setTimeout(() => setNoteSaved(false), 2500);
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
    if (
      selectedAnswer === conceptData?.quick_check_answer_index &&
      !completedSteps.includes('practice')
    ) {
      setCompletedSteps((prev) => [...prev, 'practice', 'master']);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 border-3 border-nexora-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Decomposing Concept into Experience...</h2>
        <p className="text-xs text-nexora-subtext mt-2 leading-relaxed">
          Generating intuitive mental models, parameter simulations, and real-world engineering contexts.
        </p>
      </div>
    );
  }

  if (!conceptData) {
    return (
      <div className="py-24 text-center max-w-md mx-auto">
        <p className="text-nexora-subtext text-sm">Could not find concept experience for "{queryParam}".</p>
        <Link to="/" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-nexora-primary hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Explorer
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 1. Header & Context Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-nexora-border/40">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-nexora-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Concepts</span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="sm">
            {conceptData.domain}
          </Badge>
          <Badge variant="primary" size="sm">
            Interactive Experience
          </Badge>
        </div>
      </div>

      {/* 2. Concept Title & Headline */}
      <div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2">
          {conceptData.concept}
        </h1>
        <p className="text-base sm:text-lg text-nexora-subtext italic">
          "{conceptData.tagline}"
        </p>
      </div>

      {/* 3. The 10-Stage Progressive Learning Loop */}
      <ProgressiveJourney
        currentStep={currentStep}
        completedSteps={completedSteps}
        onSelectStep={(step) => setCurrentStep(step)}
      />

      {/* 4. First-Class "WHY DOES THIS EXIST?" Section */}
      <WhyItMatters
        whyAmILearningThis={conceptData.why_it_matters}
        problemItSolved={
          conceptData.concept === 'Doppler Effect'
            ? 'Before Doppler, physics assumed wave emission was invariant to motion. It solved why distant galaxies shift spectrum and how moving wavefronts compress in space.'
            : 'Linear scanning over millions of records took millions of operations. It solved massive sequential search bottlenecks by halving the search space at each comparison.'
        }
        whereItIsUsed={conceptData.practical_application}
        whatWouldHappenWithoutIt={
          conceptData.concept === 'Doppler Effect'
            ? 'Without Doppler formulations, radar weather tracking, ultrasound echocardiograms, and Hubble redshift measurements would be physically impossible.'
            : 'Without logarithmic search, database query indexes, version control bisect, and operating system symbol tables would experience crippling lag.'
        }
      />

      {/* 5. Intuitive Mental Model ("SHOW ME, DON'T JUST TELL ME") */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>Intuitive Mental Model</span>
          </div>
          <CardTitle className="text-lg">Observable Conceptual Intuition</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm sm:text-base text-nexora-text leading-relaxed">
            {conceptData.simple_explanation}
          </p>
        </CardContent>
      </Card>

      {/* 6. Interactive Stage: Visualize & Experiment */}
      <VisualContainer
        title={
          conceptData.simulation.simulation_type === 'wave_compression'
            ? 'Wavefront Compression Simulator'
            : 'Divide-and-Conquer Search Step Trace'
        }
        subtitle={
          conceptData.simulation.simulation_type === 'wave_compression'
            ? 'Observe how wavefront density compresses ahead of the moving source and stretches behind it.'
            : 'Watch the boundaries [low, mid, high] narrow down to the target index in log2(N) steps.'
        }
        modelType={
          conceptData.simulation.simulation_type === 'wave_compression'
            ? 'Wave Mechanics Simulation'
            : 'Logarithmic Step Visualizer'
        }
        hasInteractiveModel={true}
        onReset={() => {
          setSourceSpeed(40);
          setSourceFreq(2);
          setBsStep(0);
        }}
        controls={
          conceptData.simulation.simulation_type === 'wave_compression' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-nexora-bg/60 p-4 rounded-xl border border-nexora-border/40">
                <div>
                  <div className="flex justify-between text-xs font-medium text-white mb-2">
                    <span>Source Velocity:</span>
                    <span className="font-mono text-nexora-accent">{sourceSpeed} m/s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={sourceSpeed}
                    onChange={(e) => setSourceSpeed(Number(e.target.value))}
                    className="w-full accent-nexora-accent cursor-pointer"
                  />
                  <span className="text-[10px] text-nexora-muted block mt-1">
                    Wave velocity in medium is fixed at 100 m/s.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-white mb-2">
                    <span>Base Siren Frequency:</span>
                    <span className="font-mono text-nexora-accent">{sourceFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.5}
                    value={sourceFreq}
                    onChange={(e) => setSourceFreq(Number(e.target.value))}
                    className="w-full accent-nexora-accent cursor-pointer"
                  />
                  <span className="text-[10px] text-nexora-muted block mt-1">
                    Number of pulses emitted per second.
                  </span>
                </div>
              </div>

              {/* Live Calculation Output */}
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-indigo-300 font-medium">
                  Observed Frequency at Stationary Observer:
                </span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {(sourceFreq * (100 / (100 - sourceSpeed))).toFixed(2)} Hz{' '}
                  <span className="text-xs font-normal text-nexora-muted">(Compressed Wavefronts)</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-nexora-bg/60 p-4 rounded-xl border border-nexora-border/40">
              <div className="text-xs">
                <span className="text-nexora-muted">Target Number: </span>
                <select
                  value={bsTarget}
                  onChange={(e) => setBsTarget(Number(e.target.value))}
                  className="bg-nexora-elevated border border-nexora-border text-white px-2 py-1 rounded text-xs ml-1"
                >
                  {bsArray.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={bsStep === 0}
                  onClick={() => setBsStep(Math.max(0, bsStep - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-nexora-subtext px-2">
                  Step {bsStep + 1} of {bsHistory.length}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={bsStep >= bsHistory.length - 1}
                  onClick={() => setBsStep(Math.min(bsHistory.length - 1, bsStep + 1))}
                >
                  Next Step
                </Button>
              </div>
            </div>
          )
        }
      >
        {conceptData.simulation.simulation_type === 'wave_compression' ? (
          <div>
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSimRunning(!isSimRunning)}
                leftIcon={<Play className="w-3.5 h-3.5" />}
              >
                {isSimRunning ? 'Pause Animation' : 'Resume Animation'}
              </Button>
            </div>
            <div className="w-full bg-[#090d16] rounded-xl border border-nexora-border/60 overflow-hidden flex justify-center">
              <canvas ref={canvasRef} width={680} height={260} className="w-full h-auto max-w-full" />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center py-6 bg-[#090d16] rounded-xl border border-nexora-border/60 p-4">
            {bsArray.map((val, idx) => {
              const currentStepData = bsHistory[bsStep] || {
                low: 0,
                mid: 0,
                high: bsArray.length - 1,
              };
              const isMid = idx === currentStepData.mid;
              const inRange = idx >= currentStepData.low && idx <= currentStepData.high;

              return (
                <div
                  key={idx}
                  className={`w-11 h-14 rounded-lg flex flex-col items-center justify-center font-mono text-xs font-bold transition-all ${
                    isMid
                      ? 'bg-nexora-accent text-black scale-110 shadow-glowCyan'
                      : inRange
                      ? 'bg-nexora-elevated text-white border border-nexora-primary/40'
                      : 'bg-nexora-surface/30 text-nexora-muted opacity-30'
                  }`}
                >
                  <span className="text-sm">{val}</span>
                  <span className="text-[9px] font-normal opacity-70">[{idx}]</span>
                </div>
              );
            })}
          </div>
        )}
      </VisualContainer>

      {/* 7. Deep Dive Tabs: Technical Math & Socratic Questioning */}
      <Card variant="glass">
        <Tabs
          items={[
            { id: 'technical', label: 'Technical Formulation', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'ask', label: 'Ask AI Companion', icon: <Sparkles className="w-4 h-4" />, badge: 'Stage 06' },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          variant="underline"
        />
        <CardContent className="pt-6">
          {activeTab === 'technical' ? (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">Mathematical & Physical Formulation</h4>
              <div className="p-4 rounded-xl bg-[#090d16] border border-nexora-border font-mono text-xs sm:text-sm text-indigo-300 leading-relaxed">
                {conceptData.technical_explanation}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <h4 className="text-base font-bold text-white">Socratic Inquiry Ready</h4>
              <p className="text-xs text-nexora-subtext max-w-md mx-auto mb-4">
                Ask targeted follow-ups about {conceptData.concept} grounded against your uploaded materials.
              </p>
              <Link to="/chat">
                <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                  Open AI Chat
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 8. Quick Concept Check / Practice */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <HelpCircle className="w-4 h-4" />
            <span>Interactive Concept Verification</span>
          </div>
          <CardTitle className="text-base sm:text-lg">
            {conceptData.quick_check_question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {conceptData.quick_check_options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === conceptData.quick_check_answer_index;

              let style =
                'bg-nexora-elevated/70 border-nexora-border/70 text-nexora-subtext hover:border-nexora-primary/50';
              if (quizSubmitted) {
                if (isCorrect) {
                  style = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium';
                } else if (isSelected) {
                  style = 'bg-rose-500/20 border-rose-500 text-rose-300';
                }
              } else if (isSelected) {
                style = 'bg-nexora-primary/20 border-nexora-primary text-white font-medium';
              }

              return (
                <button
                  key={idx}
                  disabled={quizSubmitted}
                  onClick={() => setSelectedAnswer(idx)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${style}`}
                >
                  <span>{opt}</span>
                  {quizSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {quizSubmitted && isSelected && !isCorrect && (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between">
            {!quizSubmitted ? (
              <Button
                variant="primary"
                size="sm"
                disabled={selectedAnswer === null}
                onClick={handleQuizSubmit}
              >
                Verify Answer
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-emerald-400">
                  {selectedAnswer === conceptData.quick_check_answer_index
                    ? 'Correct! You understood the key mechanic.'
                    : 'Review the intuitive mental model above to see why option A holds.'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedAnswer(null);
                    setQuizSubmitted(false);
                  }}
                >
                  Reset
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 9. Personal Notes & Student Journal */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <PenTool className="w-4 h-4 text-nexora-accent" />
              <span>Personal Learning Journal</span>
            </div>
            {noteSaved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved to Notes
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            rows={3}
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            placeholder={`Jot down your personal reflections or questions on ${conceptData.concept}...`}
            className="w-full bg-[#090d16] rounded-xl border border-nexora-border p-3 text-xs sm:text-sm text-white placeholder-nexora-muted focus:ring-1 focus:ring-nexora-primary focus:outline-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-nexora-muted">
              Notes are saved to your local journal and synchronized in Stage 09.
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!studentNote.trim()}
              onClick={handleSaveNote}
            >
              Save Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 10. Conceptual Mastery Status */}
      <div className="p-4 rounded-2xl bg-nexora-surface/80 border border-nexora-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Concept Status</h5>
            <p className="text-[11px] text-nexora-muted">
              {completedSteps.length} of 10 Learning Loop Milestones Completed
            </p>
          </div>
        </div>
        <Badge variant="success" size="md">
          {completedSteps.includes('master') ? 'Mastered' : 'In Progress'}
        </Badge>
      </div>
    </div>
  );
};
