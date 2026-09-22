import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Award,
  ChevronRight,
  HelpCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAcademicContext } from '../context/AcademicContext';
import { useSyllabus } from '../context/SyllabusContext';
import { AcademicContentRenderer } from '../components/common/AcademicContentRenderer';
import { apiService } from '../services/api';
import { PracticeSet, PracticeQuestion, PracticeResult } from '../types/learning';

export const PracticePage: React.FC = () => {
  const navigate = useNavigate();
  const { academicContext } = useAcademicContext();
  const { hasSyllabus, isCurriculumActive } = useSyllabus();
  const currentTier = academicContext?.academic_level;

  // Practice Sets state
  const [practiceSets, setPracticeSets] = useState<PracticeSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Set for Session
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [activeSet, setActiveSet] = useState<PracticeSet | null>(null);
  const [isLoadingActiveSet, setIsLoadingActiveSet] = useState(false);

  // Active Session State
  const [sessionActive, setSessionActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [practiceResult, setPracticeResult] = useState<PracticeResult | null>(null);

  const loadPracticeSets = useCallback(async () => {
    if (!currentTier || !isCurriculumActive) {
      setPracticeSets([]);
      setIsLoadingSets(false);
      return;
    }
    setIsLoadingSets(true);
    setError(null);
    try {
      const sets = await apiService.getPracticeSets({ academic_level: currentTier });
      setPracticeSets(sets);
      if (sets.length > 0) {
        setSelectedSetId(sets[0].id);
      } else {
        setSelectedSetId('');
      }
    } catch (err: any) {
      console.error('Failed to load practice sets:', err);
      setError(err.response?.data?.detail || 'Failed to fetch practice sets.');
      setPracticeSets([]);
    } finally {
      setIsLoadingSets(false);
    }
  }, [currentTier, isCurriculumActive]);

  useEffect(() => {
    loadPracticeSets();
    setSessionActive(false);
    setActiveSet(null);
    setPracticeResult(null);
    setAnswersMap({});
  }, [loadPracticeSets]);

  const handleStartPractice = async () => {
    if (!selectedSetId) return;
    setIsLoadingActiveSet(true);
    setError(null);
    try {
      const fullSet = await apiService.getPracticeSet(selectedSetId);
      setActiveSet(fullSet);
      setCurrentQuestionIndex(0);
      setAnswersMap({});
      setPracticeResult(null);
      setSessionActive(true);
    } catch (err: any) {
      console.error('Failed to load practice set questions:', err);
      setError(err.response?.data?.detail || 'Could not load practice set questions.');
    } finally {
      setIsLoadingActiveSet(false);
    }
  };

  const handleSelectAnswer = (questionId: string, optionIdx: number) => {
    if (practiceResult) return; // session already evaluated
    setAnswersMap((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleSubmitEvaluation = async () => {
    if (!activeSet || !activeSet.questions || activeSet.questions.length === 0) return;

    // Check that at least the current question is selected
    const questions = activeSet.questions;
    const formattedAnswers = questions.map((q) => ({
      question_id: q.id,
      selected_index: answersMap[q.id] !== undefined ? answersMap[q.id] : -1,
    }));

    setIsSubmitting(true);
    try {
      const result = await apiService.submitPractice({
        set_id: activeSet.id,
        answers: formattedAnswers,
      });
      setPracticeResult(result);
    } catch (err: any) {
      console.error('Failed to submit practice set:', err);
      alert(err.response?.data?.detail || 'Could not submit evaluation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const questions: PracticeQuestion[] = activeSet?.questions || [];
  const currentQuestion: PracticeQuestion | undefined = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const currentSelectedOption = currentQuestion ? answersMap[currentQuestion.id] : undefined;

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-nexora-accent uppercase tracking-wider">
              Concept Evaluation &amp; Question Bank
            </span>
            <span className="text-xs text-nexora-muted">&bull;</span>
            <span className="text-xs text-nexora-subtext capitalize">
              {academicContext?.grade_level || currentTier}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Practice &amp; Mastery
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Curriculum-calibrated problem sets with mathematical equations ($LaTeX$), immediate grading, and explanations.
          </p>
        </div>

        {academicContext?.curriculum_name && (
          <Badge variant="neutral" size="sm" className="self-start sm:self-auto">
            {academicContext.curriculum_name}
          </Badge>
        )}
      </div>

      {isLoadingSets ? (
        <div className="flex flex-col items-center justify-center py-16 text-nexora-muted">
          <Loader2 className="w-8 h-8 animate-spin text-nexora-primary mb-3" />
          <p className="text-sm">Loading practice sets for {academicContext?.education_category || currentTier}...</p>
        </div>
      ) : practiceSets.length === 0 ? (
        <Card className="border-nexora-border/80 p-8 text-center">
          <EmptyState
            icon={<HelpCircle className="w-10 h-10 text-nexora-muted mx-auto" />}
            title={
              hasSyllabus && !isCurriculumActive
                ? 'Syllabus uploaded. Practice not ready yet.'
                : 'No practice available yet'
            }
            description={
              hasSyllabus && !isCurriculumActive
                ? 'Your primary syllabus is uploaded and verified. Practice questions and modules will become available once curriculum activation is completed.'
                : 'Practice questions are calibrated and generated when your syllabus and learning units are activated.'
            }
            action={
              <Button variant="primary" size="md" onClick={() => navigate('/syllabus')}>
                {hasSyllabus ? 'View Syllabus Hub' : 'Upload Syllabus'}
              </Button>
            }
          />
        </Card>
      ) : !sessionActive ? (
        /* Configuration & Selection Card */
        <Card className="border-nexora-border/80 p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Select Practice Set</h2>
            <p className="text-xs text-nexora-muted">
              Choose an active set strictly aligned with your academic context ({academicContext?.education_category || currentTier}).
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-nexora-subtext block mb-1.5">
                Available Practice Modules
              </label>
              <select
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-nexora-primary"
              >
                {practiceSets.map((ps) => (
                  <option key={ps.id} value={ps.id}>
                    {ps.title} ({ps.difficulty} &bull; {ps.questions_count} questions)
                  </option>
                ))}
              </select>
            </div>

            {selectedSetId && (
              <div className="p-4 rounded-xl bg-nexora-surface border border-nexora-border/70 text-xs text-nexora-text space-y-2">
                {(() => {
                  const setObj = practiceSets.find((ps) => ps.id === selectedSetId);
                  if (!setObj) return null;
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" size="sm" className="capitalize">
                          {setObj.difficulty}
                        </Badge>
                        <span className="text-nexora-muted">&bull;</span>
                        <span className="text-white font-semibold">{setObj.questions_count} Questions</span>
                      </div>
                      {setObj.description && (
                        <div className="mt-1 text-nexora-subtext">
                          <AcademicContentRenderer content={setObj.description} compact />
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-nexora-border/50 flex items-center justify-between">
            <span className="text-xs text-nexora-muted">Ready to test your comprehension</span>
            <Button
              variant="primary"
              size="md"
              leftIcon={isLoadingActiveSet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              disabled={isLoadingActiveSet || !selectedSetId}
              onClick={handleStartPractice}
            >
              {isLoadingActiveSet ? 'Loading Questions...' : 'Start Practice'}
            </Button>
          </div>
        </Card>
      ) : practiceResult ? (
        /* Results View */
        <div className="space-y-6 animate-fadeIn">
          <Card className="border-nexora-border/80 p-8 text-center max-w-md mx-auto space-y-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
                practiceResult.passed
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}
            >
              <Award className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {practiceResult.passed ? 'Practice Set Passed!' : 'Practice Set Completed'}
            </h2>
            <p className="text-xs text-nexora-subtext">
              Results for <strong>{activeSet?.title}</strong>
            </p>

            <div className="p-4 rounded-xl bg-nexora-bg border border-nexora-border text-center">
              <div className="text-3xl font-extrabold text-white mb-1">
                {practiceResult.correct_count} / {practiceResult.total_questions}
              </div>
              <span className="text-xs text-nexora-muted font-medium">
                {practiceResult.score_percentage}% Accuracy &bull; Level: {academicContext?.education_category || currentTier}
              </span>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleStartPractice}
              >
                Try Again
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSessionActive(false);
                  setPracticeResult(null);
                }}
              >
                Back to Sets
              </Button>
            </div>
          </Card>

          {/* Question Breakdown with Explanations */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Detailed Solutions &amp; Derivations</h3>
            {practiceResult.results.map((res, idx) => (
              <Card
                key={res.question_id}
                className={`border p-5 space-y-3 ${
                  res.is_correct
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-rose-500/40 bg-rose-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Question {idx + 1}
                    </span>
                    {res.is_correct ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Correct (+{res.points_earned} pts)
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Incorrect
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-white">
                  <AcademicContentRenderer content={res.question_text} />
                </div>

                <div className="p-3.5 rounded-xl bg-nexora-bg border border-nexora-border text-xs text-nexora-subtext leading-relaxed">
                  <strong className="text-white block mb-1">Concept Derivation / Explanation:</strong>
                  <AcademicContentRenderer content={res.explanation} compact />
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : currentQuestion ? (
        /* Active Question Card */
        <Card className="border-nexora-border/80 overflow-hidden">
          <CardHeader className="bg-nexora-elevated/40 pb-3 border-b border-nexora-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-nexora-accent uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-xs text-nexora-muted">&bull;</span>
                <span className="text-xs text-nexora-muted">{activeSet?.title}</span>
              </div>
              <Badge variant="neutral" size="sm">
                Difficulty: {currentQuestion.difficulty}
              </Badge>
            </div>
            <div className="mt-3 text-sm text-white font-medium">
              <AcademicContentRenderer content={currentQuestion.question_text} />
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-3">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = currentSelectedOption === idx;
              let style =
                'bg-nexora-surface border-nexora-border/80 text-nexora-subtext hover:border-nexora-primary/50';
              if (isSelected) {
                style = 'bg-nexora-primary/20 border-nexora-primary text-white font-semibold';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(currentQuestion.id, idx)}
                  className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${style}`}
                >
                  <div className="flex-1 pr-3">
                    <AcademicContentRenderer content={opt} compact />
                  </div>
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-nexora-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </CardContent>

          <CardFooter className="pt-3 border-t border-nexora-border/40 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm('Exit practice session? Your progress on this set will not be scored.')) {
                  setSessionActive(false);
                }
              }}
            >
              Exit
            </Button>

            <div className="flex items-center gap-2">
              {currentQuestionIndex > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                >
                  Previous
                </Button>
              )}

              {!isLastQuestion ? (
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  onClick={handleSubmitEvaluation}
                >
                  {isSubmitting ? 'Evaluating...' : 'Submit Practice Set'}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
};
