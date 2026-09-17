import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sliders,
  PenTool,
  Award,
  ChevronRight,
  FolderKanban,
  FileText,
  HelpCircle,
  Compass,
  Sparkles,
} from 'lucide-react';
import { apiService } from '../services/api';
import { ConceptExploreResult, PersonalizedContext } from '../types/learning';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { VisualContainer } from '../components/learning/VisualContainer';
import { EmptyState } from '../components/ui/EmptyState';
import { studentActivityService, ActiveCourseProgress } from '../services/studentActivity';

export const LearnPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryParam = searchParams.get('q');

  // --- STATE FOR "MY LEARNING" VIEW ---
  const [learningFilter, setLearningFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  // Genuine started courses derived from real student activity
  const activeCourse = studentActivityService.getActiveCourse();
  const registeredCourses = activeCourse
    ? [
        {
          id: `course-${activeCourse.slug}`,
          subject: activeCourse.courseTitle,
          slug: activeCourse.slug,
          totalTopics: activeCourse.totalTopics,
          completedTopics: activeCourse.completedTopics,
          progress: activeCourse.progressPercent,
          currentTopic: activeCourse.currentTopic,
          lastLessonSlug: activeCourse.lastLesson,
        },
      ]
    : [];

  // --- STATE FOR "TOPIC / LESSON" VIEW ---
  const [loading, setLoading] = useState(false);
  const [conceptData, setConceptData] = useState<ConceptExploreResult | null>(null);
  const [perspectives, setPerspectives] = useState<PersonalizedContext[]>([]);
  const [activePerspective, setActivePerspective] = useState<PersonalizedContext | null>(null);

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

  // Load concept decomposition when queryParam exists
  useEffect(() => {
    if (!queryParam) {
      setConceptData(null);
      setActivePerspective(null);
      setPerspectives([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    const interestHint = searchParams.get('interest') || undefined;

    apiService
      .exploreConcept(queryParam, undefined, interestHint)
      .then((data) => {
        if (isMounted) {
          setConceptData(data);
          if (data.personalized_context) {
            setActivePerspective(data.personalized_context);
          }
          if (data.available_perspectives && data.available_perspectives.length > 0) {
            setPerspectives(data.available_perspectives);
          }
          setLoading(false);
          setSelectedAnswer(null);
          setQuizSubmitted(false);

          // Record genuine lesson view event
          studentActivityService.recordLessonView(data.concept, data.concept, data.domain);

          // Restore student note for this topic
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
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [queryParam, searchParams]);

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

      const intervalMs = 1000 / sourceFreq;
      if (time - lastWaveTime > intervalMs) {
        waves.push({ x: sourceX, y: canvas.height / 2, r: 0 });
        lastWaveTime = time;
      }

      sourceX += sourceSpeed / 60;
      if (sourceX > canvas.width - 60) {
        sourceX = 100;
        waves.length = 0;
      }

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

      // Draw stationary observer
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
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('Source', sourceX - 16, canvas.height / 2 - 16);

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [conceptData, sourceSpeed, sourceFreq, isSimRunning]);

  // Binary search stepper reset
  useEffect(() => {
    if (conceptData?.simulation?.simulation_type === 'binary_search_stepper') {
      const history: Array<{ low: number; mid: number; high: number }> = [];
      let low = 0;
      let high = bsArray.length - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        history.push({ low, mid, high });
        if (bsArray[mid] === bsTarget) break;
        if (bsArray[mid] < bsTarget) low = mid + 1;
        else high = mid - 1;
      }
      setBsHistory(history);
      setBsStep(0);
    }
  }, [conceptData, bsTarget]);

  const handleQuizSubmit = () => {
    if (selectedAnswer === null || !conceptData) return;
    setQuizSubmitted(true);
    const isCorrect = selectedAnswer === conceptData.quick_check_answer_index;
    studentActivityService.recordQuizAttempt(
      conceptData.concept,
      conceptData.domain,
      isCorrect ? 1 : 0,
      1
    );
  };

  const handleSaveNote = () => {
    if (!conceptData || !studentNote.trim()) return;
    localStorage.setItem(`nexora_note_${conceptData.concept}`, studentNote);
    
    // Also append to global student notes if not present
    const rawNotes = localStorage.getItem('nexora_student_notes');
    let notes = [];
    try {
      notes = rawNotes ? JSON.parse(rawNotes) : [];
    } catch (e) {
      notes = [];
    }
    const existingIndex = notes.findIndex((n: any) => n.title === conceptData.concept);
    const newNoteObj = {
      id: `note-${Date.now()}`,
      title: conceptData.concept,
      content: studentNote,
      subject: conceptData.domain,
      updatedAt: 'Just now',
    };
    if (existingIndex >= 0) {
      notes[existingIndex] = { ...notes[existingIndex], content: studentNote, updatedAt: 'Just now' };
    } else {
      notes.unshift(newNoteObj);
    }
    localStorage.setItem('nexora_student_notes', JSON.stringify(notes));

    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
  };

  // -------------------------------------------------------------
  // VIEW 1: MY LEARNING (Course Cards & Filter Tabs)
  // -------------------------------------------------------------
  if (!queryParam) {
    const filteredCourses = registeredCourses.filter((course) => {
      if (learningFilter === 'in-progress') return course.progress > 0 && course.progress < 100;
      if (learningFilter === 'completed') return course.progress === 100;
      return true;
    });

    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              My Learning
            </h1>
            <p className="text-sm text-nexora-subtext mt-1">
              Your active subjects, curriculum modules, and progress tracks.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-nexora-surface rounded-xl border border-nexora-border/70">
            <button
              onClick={() => setLearningFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                learningFilter === 'all' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
              }`}
            >
              All Courses
            </button>
            <button
              onClick={() => setLearningFilter('in-progress')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                learningFilter === 'in-progress' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setLearningFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                learningFilter === 'completed' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-nexora-muted" />}
            title="You haven't started learning yet"
            description="Select a subject from the curriculum to begin your personalized learning path."
            action={
              <Link to="/subjects">
                <Button variant="primary" size="md">
                  Explore Subjects
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="border-nexora-border/80 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-nexora-muted uppercase tracking-wider">
                      {course.totalTopics} Topics &bull; {course.completedTopics} Completed
                    </span>
                    <Badge variant={course.progress > 50 ? 'accent' : 'neutral'} size="sm">
                      {course.progress}%
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-white">{course.subject}</CardTitle>
                  <CardDescription className="text-xs">
                    Current Lesson: <strong className="text-white">{course.currentTopic}</strong>
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-2">
                  <div className="w-full h-2 bg-nexora-elevated rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-nexora-primary rounded-full"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-nexora-border/40 flex justify-between items-center">
                  <Link to={`/subjects/${course.slug}`}>
                    <Button variant="outline" size="sm">
                      View Modules
                    </Button>
                  </Link>
                  <Link to={`/learn?q=${encodeURIComponent(course.lastLessonSlug)}`}>
                    <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                      Continue Lesson
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: TOPIC / LESSON PAGE (Reading, Visual Model, Practice)
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-10 h-10 border-2 border-nexora-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-nexora-subtext">Loading structured lesson content...</p>
      </div>
    );
  }

  if (!conceptData) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <BookOpen className="w-12 h-12 text-nexora-muted mx-auto" />
        <h2 className="text-lg font-bold text-white">Lesson Not Found</h2>
        <p className="text-xs text-nexora-subtext">
          Could not find a structured lesson for "{queryParam}". Check your syllabus or search another topic.
        </p>
        <Button variant="primary" size="sm" onClick={() => navigate('/learn')}>
          Back to My Learning
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* 1. Header & Navigation */}
      <div>
        <Link
          to="/learn"
          className="inline-flex items-center gap-1.5 text-xs text-nexora-muted hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Learning
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-nexora-accent">
                {conceptData.domain}
              </span>
              <span className="text-xs text-nexora-muted">&bull;</span>
              <span className="text-xs text-nexora-muted">Structured Lesson</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              {conceptData.concept}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="accent" size="sm">
              Curriculum Standard
            </Badge>
          </div>
        </div>
      </div>

      {/* 2. Short Introduction & Key Points */}
      <div className="p-5 rounded-2xl bg-nexora-surface border border-nexora-border/80 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-nexora-muted">
          Core Concept Summary
        </h2>
        <p className="text-sm text-nexora-text leading-relaxed font-medium">
          {conceptData.simple_explanation}
        </p>
        <div className="pt-2 border-t border-nexora-border/40">
          <p className="text-xs text-nexora-subtext">
            <strong className="text-white">Why it matters: </strong>
            {conceptData.why_it_matters}
          </p>
        </div>
      </div>

      {/* 3. Interactive Lesson Model / Visual Container */}
      <VisualContainer
        title={`Visual Model: ${conceptData.concept}`}
        subtitle="Observe the core mechanics and adjust parameters to observe behavior directly."
        modelType="Interactive Model"
        controls={
          conceptData.simulation.simulation_type === 'wave_compression' ? (
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-nexora-muted">Source Speed:</span>
                <input
                  type="range"
                  min="0"
                  max="95"
                  value={sourceSpeed}
                  onChange={(e) => setSourceSpeed(Number(e.target.value))}
                  className="w-24 accent-indigo-500 cursor-pointer"
                />
                <span className="font-mono text-white w-12">{sourceSpeed} m/s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-nexora-muted">Frequency:</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={sourceFreq}
                  onChange={(e) => setSourceFreq(Number(e.target.value))}
                  className="w-20 accent-indigo-500 cursor-pointer"
                />
                <span className="font-mono text-white">{sourceFreq} Hz</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSimRunning(!isSimRunning)}
              >
                {isSimRunning ? 'Pause' : 'Resume'}
              </Button>
            </div>
          ) : conceptData.simulation.simulation_type === 'binary_search_stepper' ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-nexora-muted">
                Step {bsStep + 1} of {Math.max(1, bsHistory.length)}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={bsStep <= 0}
                onClick={() => setBsStep((s) => Math.max(0, s - 1))}
              >
                Previous Step
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={bsStep >= bsHistory.length - 1}
                onClick={() => setBsStep((s) => Math.min(bsHistory.length - 1, s + 1))}
              >
                Next Step
              </Button>
            </div>
          ) : null
        }
      >
        {conceptData.simulation.simulation_type === 'wave_compression' && (
          <div className="w-full flex justify-center py-2">
            <canvas
              ref={canvasRef}
              width={650}
              height={260}
              className="w-full max-w-[650px] h-[260px] rounded-xl bg-[#090d16] border border-nexora-border"
            />
          </div>
        )}

        {conceptData.simulation.simulation_type === 'binary_search_stepper' && (
          <div className="py-6 flex flex-wrap justify-center gap-1.5 max-w-2xl mx-auto">
            {bsArray.map((val, idx) => {
              const currentH = bsHistory[bsStep] || { low: 0, mid: 0, high: bsArray.length - 1 };
              const inRange = idx >= currentH.low && idx <= currentH.high;
              const isMid = idx === currentH.mid;

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

      {/* 4. Technical Explanation & Practical Applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-nexora-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-nexora-primary" />
              Technical &amp; Mathematical Formulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3.5 rounded-xl bg-nexora-bg border border-nexora-border font-mono text-xs text-indigo-300 leading-relaxed">
              {conceptData.technical_explanation}
            </div>
            <p className="text-[11px] text-nexora-muted mt-2.5 italic">
              Invariant curriculum standard: Mathematical equations and complexity bounds remain identical across all learning modes.
            </p>
          </CardContent>
        </Card>

        <Card className="border-nexora-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Standard Curriculum Application
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm text-nexora-subtext leading-relaxed">
              {conceptData.practical_application}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4b. Contextual Perspective By Interest (Master Prompt 04) */}
      {activePerspective && (
        <Card className="border-indigo-500/30 bg-gradient-to-br from-nexora-surface to-indigo-950/20 shadow-glow-sm">
          <CardHeader className="pb-3 border-b border-nexora-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-nexora-accent bg-nexora-accent/10 px-2.5 py-0.5 rounded-full border border-nexora-accent/20 flex items-center gap-1.5">
                    <Compass className="w-3 h-3" />
                    Personalized Perspective: {activePerspective.interest}
                  </span>
                </div>
                <CardTitle className="text-base text-white font-bold">
                  {activePerspective.headline}
                </CardTitle>
                <CardDescription className="text-xs text-nexora-muted mt-0.5">
                  {activePerspective.domain}
                </CardDescription>
              </div>

              {/* Dynamic Perspective Switcher */}
              {perspectives.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Perspective switch">
                  {perspectives.map((p) => {
                    const isCurrent = activePerspective.interest === p.interest;
                    return (
                      <button
                        key={p.interest}
                        type="button"
                        onClick={() => setActivePerspective(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-nexora-primary border-nexora-primary text-white shadow-glow-sm'
                            : 'bg-nexora-surface/70 border-nexora-border/60 text-nexora-muted hover:text-white hover:border-nexora-border'
                        }`}
                      >
                        {p.interest}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-nexora-muted uppercase tracking-wider mb-1.5">
                Relatable Intuition & Analogy
              </h4>
              <p className="text-xs sm:text-sm text-nexora-text leading-relaxed">
                {activePerspective.analogy_explanation}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-nexora-elevated/60 border border-nexora-border/60">
              <h4 className="text-xs font-semibold text-emerald-400 mb-1">
                Field Application: {activePerspective.domain}
              </h4>
              <p className="text-xs sm:text-sm text-nexora-subtext leading-relaxed">
                {activePerspective.real_world_application}
              </p>
            </div>

            {activePerspective.related_domains && activePerspective.related_domains.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-nexora-muted mr-1">Related Fields:</span>
                {activePerspective.related_domains.map((dom) => (
                  <span
                    key={dom}
                    className="px-2 py-0.5 rounded-md text-[11px] bg-nexora-surface border border-nexora-border/60 text-nexora-subtext font-mono"
                  >
                    #{dom}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Concept Check Question */}
      <Card className="border-nexora-border/80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-nexora-accent uppercase tracking-wider mb-1">
            <HelpCircle className="w-4 h-4" />
            <span>Concept Verification</span>
          </div>
          <CardTitle className="text-base text-white">
            {conceptData.quick_check_question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {conceptData.quick_check_options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === conceptData.quick_check_answer_index;

              let style = 'bg-nexora-elevated/70 border-nexora-border/70 text-nexora-subtext hover:border-nexora-primary/50';
              if (quizSubmitted) {
                if (isCorrect) style = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium';
                else if (isSelected) style = 'bg-rose-500/20 border-rose-500 text-rose-300';
              } else if (isSelected) {
                style = 'bg-nexora-primary/20 border-nexora-primary text-white font-medium';
              }

              return (
                <button
                  key={idx}
                  disabled={quizSubmitted}
                  onClick={() => setSelectedAnswer(idx)}
                  className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${style}`}
                >
                  <span>{opt}</span>
                  {quizSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {quizSubmitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
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
                Submit Answer
              </Button>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-emerald-400">
                  {selectedAnswer === conceptData.quick_check_answer_index
                    ? 'Correct! You understood the key principle.'
                    : 'Review the technical formulation above to verify the correct answer.'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedAnswer(null);
                    setQuizSubmitted(false);
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 6. Student Study Notes */}
      <Card className="border-nexora-border/80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <PenTool className="w-4 h-4 text-nexora-accent" />
              Lesson Study Notes
            </CardTitle>
            {noteSaved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            rows={3}
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            placeholder={`Write your personal notes or takeaways for ${conceptData.concept}...`}
            className="w-full bg-nexora-bg rounded-xl border border-nexora-border p-3 text-xs sm:text-sm text-white placeholder-nexora-muted focus:ring-1 focus:ring-nexora-primary focus:outline-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-nexora-muted">
              Notes are saved to your account and accessible in your Notes library.
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

      {/* 7. Lesson Navigation: Previous & Next */}
      <div className="flex items-center justify-between pt-4 border-t border-nexora-border/60">
        <Link to="/learn">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Previous Topic
          </Button>
        </Link>
        <Link to="/subjects">
          <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Next Topic
          </Button>
        </Link>
      </div>
    </div>
  );
};
