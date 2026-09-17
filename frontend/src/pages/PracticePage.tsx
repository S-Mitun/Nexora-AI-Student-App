import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { studentActivityService } from '../services/studentActivity';

interface PracticeQuestion {
  id: string;
  subject: string;
  topic: string;
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const PRACTICE_BANK: PracticeQuestion[] = [
  {
    id: 'pq-1',
    subject: 'Computer Science',
    topic: 'Binary Search',
    difficulty: 'Foundational',
    question: 'What is the minimum requirement for an array before performing binary search?',
    options: [
      'The array must contain only positive integers',
      'The array elements must be sorted in monotonic order',
      'The array size must be an exact power of two',
      'The array must be dynamically allocated on the heap',
    ],
    correctIndex: 1,
    explanation: 'Binary search requires sorted elements so the search space can be unambiguously halved at each step.',
  },
  {
    id: 'pq-2',
    subject: 'Computer Science',
    topic: 'Binary Search',
    difficulty: 'Intermediate',
    question: 'What is the time complexity of searching an array of N elements using binary search in the worst case?',
    options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'],
    correctIndex: 1,
    explanation: 'Each comparison halves the remaining elements: N, N/2, N/4, ... 1, requiring at most log2(N) steps.',
  },
  {
    id: 'pq-3',
    subject: 'Physics',
    topic: 'Doppler Effect',
    difficulty: 'Foundational',
    question: 'What happens to the observed wave frequency when an acoustic source moves towards a stationary observer?',
    options: [
      'Frequency increases because wavefronts are compressed in front of the source',
      'Frequency decreases because sound waves lose kinetic energy in air',
      'Frequency remains constant because wave speed in the medium does not change',
      'Frequency drops to zero as wave crests cancel destructively',
    ],
    correctIndex: 0,
    explanation: 'Because the source moves in the direction of emitted waves, consecutive crests are bunched closer together (smaller wavelength, higher frequency).',
  },
  {
    id: 'pq-4',
    subject: 'Physics',
    topic: 'Doppler Effect',
    difficulty: 'Advanced',
    question: 'When a wave source moves through air at a velocity v_s strictly equal to sound speed v, what physical phenomenon occurs?',
    options: [
      'Wave amplitude decays exponentially',
      'Wavefronts pile up directly at the source location, producing a Mach 1 shock front',
      'Frequency becomes negative according to classical relativity',
      'The Doppler frequency shift disappears completely',
    ],
    correctIndex: 1,
    explanation: 'When v_s = v, consecutive wavefronts cannot escape ahead of the source and accumulate into a concentrated high-pressure acoustic shock barrier.',
  },
  {
    id: 'pq-5',
    subject: 'Mathematics',
    topic: 'Linear Algebra',
    difficulty: 'Foundational',
    question: 'What does a matrix determinant equal to zero signify geometrically for a 2D transformation?',
    options: [
      'The transformation preserves 2D area perfectly',
      'The 2D space collapses onto a 1D line or 0D point (loss of dimension)',
      'The coordinate axes are rotated by exactly 90 degrees',
      'The transformation has an infinite number of unique inverses',
    ],
    correctIndex: 1,
    explanation: 'A zero determinant means the output area is zero, which means the 2D plane has been squashed into a lower dimensional subspace.',
  },
];

export const PracticePage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState('Computer Science');
  const [selectedTopic, setSelectedTopic] = useState('Binary Search');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Foundational' | 'Intermediate' | 'Advanced'>('Foundational');

  // Practice Session State
  const [sessionActive, setSessionActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Active Questions for current setup
  const sessionQuestions = PRACTICE_BANK.filter(
    (q) => q.subject === selectedSubject
  );

  const activeQuestion = sessionQuestions[currentQuestionIndex] || PRACTICE_BANK[0];

  const handleStartPractice = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setSessionCompleted(false);
    setSessionActive(true);
  };

  const handleSelectAnswer = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    setIsAnswerSubmitted(true);
    if (selectedAnswer === activeQuestion.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < sessionQuestions.length) {
      setCurrentQuestionIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      setSessionCompleted(true);
      // Record genuine practice attempt
      studentActivityService.recordQuizAttempt(
        selectedTopic,
        selectedSubject,
        score,
        sessionQuestions.length
      );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Practice &amp; Concept Checks
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Test your conceptual understanding and retention with targeted practice sets.
          </p>
        </div>
      </div>

      {!sessionActive ? (
        /* Configuration Form */
        <Card className="border-nexora-border/80 p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white mb-1">Select Practice Parameters</h2>
            <p className="text-xs text-nexora-muted">Choose your subject, topic, and challenge level.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Subject Select */}
            <div>
              <label className="text-xs font-medium text-nexora-subtext block mb-1.5">
                Choose a Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  if (e.target.value === 'Physics') setSelectedTopic('Doppler Effect');
                  else if (e.target.value === 'Mathematics') setSelectedTopic('Linear Algebra');
                  else setSelectedTopic('Binary Search');
                }}
                className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-nexora-primary"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Physics">Physics</option>
                <option value="Mathematics">Mathematics</option>
              </select>
            </div>

            {/* Topic Select */}
            <div>
              <label className="text-xs font-medium text-nexora-subtext block mb-1.5">
                Choose a Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-nexora-primary"
              >
                {selectedSubject === 'Computer Science' && (
                  <>
                    <option value="Binary Search">Binary Search</option>
                    <option value="Arrays & Complexity">Arrays &amp; Complexity</option>
                  </>
                )}
                {selectedSubject === 'Physics' && (
                  <>
                    <option value="Doppler Effect">Doppler Effect</option>
                    <option value="Wave Speed">Wave Speed</option>
                  </>
                )}
                {selectedSubject === 'Mathematics' && (
                  <>
                    <option value="Linear Algebra">Linear Algebra</option>
                    <option value="Matrix Transformations">Matrix Transformations</option>
                  </>
                )}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs font-medium text-nexora-subtext block mb-1.5">
                Choose Difficulty
              </label>
              <div className="flex rounded-xl bg-nexora-bg border border-nexora-border p-1">
                {(['Foundational', 'Intermediate', 'Advanced'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      selectedDifficulty === diff
                        ? 'bg-nexora-primary text-white'
                        : 'text-nexora-muted hover:text-white'
                    }`}
                  >
                    {diff.slice(0, 5)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-nexora-border/50 flex items-center justify-between">
            <div className="text-xs text-nexora-muted">
              {sessionQuestions.length} Questions prepared for this topic
            </div>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Play className="w-4 h-4" />}
              onClick={handleStartPractice}
            >
              Start Practice
            </Button>
          </div>
        </Card>
      ) : !sessionCompleted ? (
        /* Active Practice Session */
        <Card className="border-nexora-border/80 overflow-hidden">
          <CardHeader className="bg-nexora-elevated/40 pb-3 border-b border-nexora-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-nexora-accent uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {sessionQuestions.length}
                </span>
                <span className="text-xs text-nexora-muted">&bull;</span>
                <span className="text-xs text-nexora-muted">{activeQuestion.subject}</span>
              </div>
              <Badge variant="neutral" size="sm">
                Score: {score} / {currentQuestionIndex}
              </Badge>
            </div>
            <CardTitle className="text-base sm:text-lg text-white mt-2">
              {activeQuestion.question}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="space-y-2.5">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === activeQuestion.correctIndex;

                let style =
                  'bg-nexora-surface border-nexora-border/80 text-nexora-subtext hover:border-nexora-primary/50';
                if (isAnswerSubmitted) {
                  if (isCorrect) style = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium';
                  else if (isSelected) style = 'bg-rose-500/20 border-rose-500 text-rose-300';
                } else if (isSelected) {
                  style = 'bg-nexora-primary/20 border-nexora-primary text-white font-medium';
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswerSubmitted}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${style}`}
                  >
                    <span>{opt}</span>
                    {isAnswerSubmitted && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isAnswerSubmitted && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {isAnswerSubmitted && (
              <div className="p-4 rounded-xl bg-nexora-bg border border-nexora-border text-xs text-nexora-subtext leading-relaxed">
                <strong className="text-white block mb-1">Explanation:</strong>
                {activeQuestion.explanation}
              </div>
            )}
          </CardContent>

          <CardFooter className="pt-3 border-t border-nexora-border/40 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSessionActive(false)}
            >
              Exit Practice
            </Button>

            {!isAnswerSubmitted ? (
              <Button
                variant="primary"
                size="sm"
                disabled={selectedAnswer === null}
                onClick={handleSubmitAnswer}
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ChevronRight className="w-4 h-4" />}
                onClick={handleNextQuestion}
              >
                {currentQuestionIndex + 1 < sessionQuestions.length ? 'Next Question' : 'View Results'}
              </Button>
            )}
          </CardFooter>
        </Card>
      ) : (
        /* Results View */
        <Card className="border-nexora-border/80 p-8 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Practice Set Completed</h2>
          <p className="text-xs text-nexora-subtext">
            You completed the practice questions for <strong>{selectedTopic}</strong>.
          </p>

          <div className="p-4 rounded-xl bg-nexora-bg border border-nexora-border text-center">
            <div className="text-3xl font-extrabold text-white mb-1">
              {score} / {sessionQuestions.length}
            </div>
            <span className="text-xs text-nexora-muted">
              {Math.round((score / sessionQuestions.length) * 100)}% Accuracy
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
              onClick={() => setSessionActive(false)}
            >
              Configure Another Set
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
