import React from 'react';
import { Check } from 'lucide-react';

export type LearningStepId =
  | 'discover'
  | 'why'
  | 'understand'
  | 'visualize'
  | 'experiment'
  | 'apply'
  | 'ask'
  | 'practice'
  | 'reflect'
  | 'master';

export interface ProgressiveJourneyProps {
  currentStep: LearningStepId;
  completedSteps?: LearningStepId[];
  onSelectStep?: (step: LearningStepId) => void;
}

const STEPS: Array<{ id: LearningStepId; label: string; num: number }> = [
  { id: 'discover', label: 'Discover', num: 1 },
  { id: 'why', label: 'Why?', num: 2 },
  { id: 'understand', label: 'Understand', num: 3 },
  { id: 'visualize', label: 'Visualize', num: 4 },
  { id: 'experiment', label: 'Experiment', num: 5 },
  { id: 'apply', label: 'Apply', num: 6 },
  { id: 'ask', label: 'Ask AI', num: 7 },
  { id: 'practice', label: 'Practice', num: 8 },
  { id: 'reflect', label: 'Reflect', num: 9 },
  { id: 'master', label: 'Master', num: 10 },
];

export const ProgressiveJourney: React.FC<ProgressiveJourneyProps> = ({
  currentStep,
  completedSteps = [],
  onSelectStep,
}) => {
  return (
    <div className="w-full bg-nexora-surface/70 border border-nexora-border/60 rounded-2xl p-3 sm:p-4 mb-6 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[720px] gap-1">
        {STEPS.map((step, idx) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => onSelectStep && onSelectStep(step.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? 'bg-nexora-primary text-white shadow-glow/40'
                    : isCompleted
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                    : 'text-nexora-muted hover:text-white hover:bg-nexora-elevated'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                    isCurrent
                      ? 'bg-white text-nexora-primary font-bold'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-nexora-elevated text-nexora-muted'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.num}
                </span>
                <span>{step.label}</span>
              </button>

              {idx < STEPS.length - 1 && (
                <div
                  className={`h-[1px] flex-1 min-w-[12px] transition-colors ${
                    isCompleted ? 'bg-emerald-500/40' : 'bg-nexora-border/60'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
