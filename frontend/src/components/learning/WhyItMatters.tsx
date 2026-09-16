import React from 'react';
import { Lightbulb, History, Compass, AlertOctagon } from 'lucide-react';

export interface WhyItMattersProps {
  whyAmILearningThis: string;
  problemItSolved?: string;
  whatChangedBecauseOfIt?: string;
  whereItIsUsed?: string;
  whatWouldHappenWithoutIt?: string;
}

export const WhyItMatters: React.FC<WhyItMattersProps> = ({
  whyAmILearningThis,
  problemItSolved,
  whatChangedBecauseOfIt,
  whereItIsUsed,
  whatWouldHappenWithoutIt,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-amber-500/25 bg-amber-950/10 shadow-sm relative overflow-hidden">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-amber-400 tracking-wider uppercase block">
            First-Class Conceptual Anchor
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Why Does This Exist & Why Am I Learning It?
          </h3>
        </div>
      </div>

      {/* Primary Narrative */}
      <p className="text-sm sm:text-base text-nexora-text leading-relaxed mb-6">
        {whyAmILearningThis}
      </p>

      {/* Secondary Inquiry Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-amber-500/20">
        {problemItSolved && (
          <div className="p-3 rounded-xl bg-nexora-elevated/40 border border-amber-500/15">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-1">
              <History className="w-3.5 h-3.5" />
              <span>Problem It Solved</span>
            </div>
            <p className="text-xs text-nexora-subtext leading-relaxed">{problemItSolved}</p>
          </div>
        )}

        {whereItIsUsed && (
          <div className="p-3 rounded-xl bg-nexora-elevated/40 border border-amber-500/15">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 mb-1">
              <Compass className="w-3.5 h-3.5" />
              <span>Real-World Engineering</span>
            </div>
            <p className="text-xs text-nexora-subtext leading-relaxed">{whereItIsUsed}</p>
          </div>
        )}

        {whatWouldHappenWithoutIt && (
          <div className="p-3 rounded-xl bg-nexora-elevated/40 border border-amber-500/15">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 mb-1">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Without This</span>
            </div>
            <p className="text-xs text-nexora-subtext leading-relaxed">{whatWouldHappenWithoutIt}</p>
          </div>
        )}
      </div>
    </div>
  );
};
