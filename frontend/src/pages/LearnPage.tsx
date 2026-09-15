import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Compass,
  Lightbulb,
  Sliders,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  BookOpen,
  HelpCircle,
  PenTool,
  Award,
} from 'lucide-react';
import { apiService } from '../services/api';
import { ConceptExploreResult } from '../types/learning';

export const LearnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || 'Doppler Effect';

  const [loading, setLoading] = useState(true);
  const [conceptData, setConceptData] = useState<ConceptExploreResult | null>(null);
  const [activeTab, setActiveTab] = useState<'visualize' | 'technical' | 'ask'>('visualize');

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
          // Reset quiz
          setSelectedAnswer(null);
          setQuizSubmitted(false);
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
      sourceX += (sourceSpeed / 60);
      if (sourceX > canvas.width - 50) {
        sourceX = 100;
        waves.length = 0;
      }

      // Draw and expand waves
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.r += (waveSpeed / 60);

        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
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
      ctx.fillText('Observer', obsX - 20, obsY + 22);

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
    localStorage.setItem(`nexora_note_${conceptData?.concept}`, studentNote);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="w-12 h-12 border-4 border-nexora-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white">Decomposing Concept...</h2>
        <p className="text-xs text-nexora-muted mt-2">
          Generating experiential blueprint: Why it matters, visual mechanics, and simulations.
        </p>
      </div>
    );
  }

  if (!conceptData) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center">
        <p className="text-nexora-subtext">Could not load concept experience.</p>
        <Link to="/" className="inline-flex items-center gap-2 mt-4 text-nexora-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Top Breadcrumb & Return */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-nexora-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Explorer</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-nexora-elevated border border-nexora-border text-nexora-accent">
            {conceptData.domain}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            Experiential Module
          </span>
        </div>
      </div>

      {/* Concept Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-2">
          {conceptData.concept}
        </h1>
        <p className="text-base sm:text-lg text-nexora-subtext italic">
          "{conceptData.tagline}"
        </p>
      </div>

      {/* 1. WHY DOES THIS MATTER? */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-nexora-border/70 mb-6 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-1.5">
              Why Does This Matter?
            </h2>
            <p className="text-sm sm:text-base text-nexora-text leading-relaxed">
              {conceptData.why_it_matters}
            </p>
          </div>
        </div>
      </div>

      {/* 2. SIMPLE EXPLANATION (SHOW ME, DON'T JUST TELL ME) */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-nexora-border/70 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-1.5">
              Intuitive Mental Model
            </h2>
            <p className="text-sm sm:text-base text-nexora-text leading-relaxed">
              {conceptData.simple_explanation}
            </p>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE STAGE: [VISUALIZE] [TRY] [ASK AI] */}
      <div className="glass-panel rounded-2xl border border-nexora-border/80 overflow-hidden mb-8 shadow-glow">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-nexora-border bg-nexora-surface/70 px-4">
          <button
            onClick={() => setActiveTab('visualize')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'visualize'
                ? 'border-nexora-accent text-nexora-accent'
                : 'border-transparent text-nexora-muted hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Interactive Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'technical'
                ? 'border-nexora-accent text-nexora-accent'
                : 'border-transparent text-nexora-muted hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Technical Deep Dive</span>
          </button>
          <button
            onClick={() => setActiveTab('ask')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'ask'
                ? 'border-nexora-accent text-nexora-accent'
                : 'border-transparent text-nexora-muted hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Ask AI Companion</span>
          </button>
        </div>

        {/* Tab 1: Interactive Simulator Widget */}
        {activeTab === 'visualize' && (
          <div className="p-6 sm:p-8">
            {conceptData.simulation.simulation_type === 'wave_compression' ? (
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Wavefront Compression Simulation
                    </h3>
                    <p className="text-xs text-nexora-muted">
                      Watch how wavefronts compress ahead of the source and stretch behind it.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsSimRunning(!isSimRunning)}
                      className="px-3 py-1.5 rounded-lg bg-nexora-elevated border border-nexora-border text-xs font-medium text-white hover:bg-nexora-border flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isSimRunning ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => {
                        setSourceSpeed(40);
                        setSourceFreq(2);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-nexora-elevated border border-nexora-border text-xs font-medium text-white hover:bg-nexora-border flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>
                </div>

                {/* Canvas Container */}
                <div className="w-full bg-[#090d16] rounded-xl border border-nexora-border/60 overflow-hidden mb-6 flex justify-center">
                  <canvas ref={canvasRef} width={680} height={260} className="w-full h-auto max-w-full" />
                </div>

                {/* Interactive Parameter Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-nexora-surface/40 p-4 rounded-xl border border-nexora-border/40">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-white mb-2">
                      <span>Source Velocity:</span>
                      <span className="text-nexora-accent">{sourceSpeed} m/s</span>
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
                    <span className="text-[11px] text-nexora-muted block mt-1">
                      Wave propagation speed is fixed at 100 m/s.
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-white mb-2">
                      <span>Base Siren Frequency:</span>
                      <span className="text-nexora-accent">{sourceFreq} Hz</span>
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
                    <span className="text-[11px] text-nexora-muted block mt-1">
                      Emits wavefront pulses per second.
                    </span>
                  </div>
                </div>

                {/* Real Live Calculation */}
                <div className="mt-4 p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs flex flex-wrap items-center justify-between gap-2">
                  <span className="text-indigo-300 font-medium">
                    Calculated Observed Frequency:
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold text-sm">
                    {(sourceFreq * (100 / (100 - sourceSpeed))).toFixed(2)} Hz (Approaching)
                  </span>
                </div>
              </div>
            ) : (
              /* Binary Search Traversal Visualizer */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Logarithmic Divide-and-Conquer Trace
                    </h3>
                    <p className="text-xs text-nexora-muted">
                      Watch how binary search halves the search space at each iteration.
                    </p>
                  </div>
                </div>

                {/* Array Elements */}
                <div className="flex flex-wrap gap-2 justify-center py-6 bg-[#090d16] rounded-xl border border-nexora-border/60 mb-6 p-4">
                  {bsArray.map((val, idx) => {
                    const currentStepData = bsHistory[bsStep] || { low: 0, mid: 0, high: bsArray.length - 1 };
                    const isMid = idx === currentStepData.mid;
                    const inRange = idx >= currentStepData.low && idx <= currentStepData.high;

                    return (
                      <div
                        key={idx}
                        className={`w-12 h-14 rounded-lg flex flex-col items-center justify-center font-mono text-xs font-bold transition-all ${
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

                {/* Step Navigation Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-nexora-surface/40 p-4 rounded-xl border border-nexora-border/40">
                  <div className="text-xs">
                    <span className="text-nexora-muted">Target: </span>
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
                    <button
                      disabled={bsStep === 0}
                      onClick={() => setBsStep(Math.max(0, bsStep - 1))}
                      className="px-3 py-1.5 rounded-lg bg-nexora-elevated border border-nexora-border text-xs text-white disabled:opacity-40"
                    >
                      Previous Step
                    </button>
                    <span className="text-xs text-nexora-subtext">
                      Step {bsStep + 1} of {bsHistory.length}
                    </span>
                    <button
                      disabled={bsStep >= bsHistory.length - 1}
                      onClick={() => setBsStep(Math.min(bsHistory.length - 1, bsStep + 1))}
                      className="px-3 py-1.5 rounded-lg bg-nexora-primary text-xs text-white disabled:opacity-40"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Technical Explanation */}
        {activeTab === 'technical' && (
          <div className="p-6 sm:p-8">
            <h3 className="text-base font-bold text-white mb-3">Formal Technical Formulation</h3>
            <div className="p-4 rounded-xl bg-[#090d16] border border-nexora-border/60 font-mono text-sm text-indigo-300 mb-6">
              {conceptData.technical_explanation}
            </div>
            <div className="text-xs text-nexora-muted leading-relaxed">
              In later stages, NEXORA links this technical formulation directly to your institution's course syllabus, past exam questions, and lecture slides.
            </div>
          </div>
        )}

        {/* Tab 3: Ask AI Tutor (Stage 06 Preview) */}
        {activeTab === 'ask' && (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-nexora-primary/10 border border-nexora-primary/20 flex items-center justify-center text-nexora-primary mx-auto mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Contextual RAG AI Companion
            </h3>
            <p className="text-sm text-nexora-subtext max-w-lg mx-auto mb-6">
              Ask deep questions about <span className="text-white font-medium">{conceptData.concept}</span> grounded against your uploaded materials.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nexora-elevated border border-nexora-border text-xs text-nexora-accent">
              RAG + LLM Integration activates in Master Prompt 06
            </div>
          </div>
        )}
      </div>

      {/* 4. APPLY IT */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-nexora-border/70 mb-8">
        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">
          Apply It: Real-World Engineering Context
        </h2>
        <p className="text-sm sm:text-base text-nexora-text leading-relaxed">
          {conceptData.practical_application}
        </p>
      </div>

      {/* 5. QUICK CHECK / QUIZ */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-nexora-border/70 mb-8">
        <div className="flex items-center gap-2 text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">
          <HelpCircle className="w-4 h-4" />
          <span>Quick Concept Check</span>
        </div>

        <h3 className="text-base font-semibold text-white mb-4">
          {conceptData.quick_check_question}
        </h3>

        <div className="space-y-2.5 mb-6">
          {conceptData.quick_check_options.map((opt, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === conceptData.quick_check_answer_index;

            let buttonStyle = 'bg-nexora-elevated border-nexora-border text-nexora-subtext hover:border-nexora-primary/50';
            if (quizSubmitted) {
              if (isCorrect) {
                buttonStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
              } else if (isSelected) {
                buttonStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
              }
            } else if (isSelected) {
              buttonStyle = 'bg-nexora-primary/20 border-nexora-primary text-white';
            }

            return (
              <button
                key={idx}
                disabled={quizSubmitted}
                onClick={() => setSelectedAnswer(idx)}
                className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-center justify-between ${buttonStyle}`}
              >
                <span>{opt}</span>
                {quizSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {quizSubmitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
              </button>
            );
          })}
        </div>

        {!quizSubmitted ? (
          <button
            disabled={selectedAnswer === null}
            onClick={() => setQuizSubmitted(true)}
            className="px-5 py-2 rounded-xl bg-nexora-primary hover:bg-nexora-primaryHover text-white text-xs font-semibold disabled:opacity-40 transition-opacity"
          >
            Submit Answer
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-emerald-400">
              {selectedAnswer === conceptData.quick_check_answer_index
                ? 'Correct! You understood the key mechanic.'
                : 'Review the intuitive mental model above to see why option A holds.'}
            </span>
            <button
              onClick={() => {
                setSelectedAnswer(null);
                setQuizSubmitted(false);
              }}
              className="text-xs text-nexora-muted underline hover:text-white"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* 6. MY NOTES & REFLECTION */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-nexora-border/70 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <PenTool className="w-4 h-4 text-nexora-accent" />
            <span>My Personal Learning Notes</span>
          </div>
          {noteSaved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Note Saved Locally
            </span>
          )}
        </div>

        <textarea
          rows={3}
          value={studentNote}
          onChange={(e) => setStudentNote(e.target.value)}
          placeholder={`Write your own reflections or questions on ${conceptData.concept}...`}
          className="w-full bg-[#090d16] rounded-xl border border-nexora-border p-3 text-sm text-white placeholder-nexora-muted focus:ring-1 focus:ring-nexora-primary focus:outline-none mb-3"
        />

        <button
          onClick={handleSaveNote}
          disabled={!studentNote.trim()}
          className="px-4 py-2 rounded-xl bg-nexora-elevated border border-nexora-border text-white text-xs font-semibold hover:bg-nexora-border disabled:opacity-40"
        >
          Save to Journal
        </button>
      </div>

      {/* 7. MASTERY STATUS */}
      <div className="p-4 rounded-xl bg-nexora-surface/60 border border-nexora-border/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-emerald-400" />
          <div>
            <span className="text-xs font-bold text-white block">Learning Journey Stage</span>
            <span className="text-[11px] text-nexora-muted">Discovered &bull; Explored Simulation</span>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          In Progress
        </span>
      </div>
    </div>
  );
};
