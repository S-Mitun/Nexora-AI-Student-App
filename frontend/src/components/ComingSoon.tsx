import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  stageBadge: string;
  description: string;
  upcomingFeatures: string[];
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  title,
  stageBadge,
  description,
  upcomingFeatures,
}) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="glass-panel rounded-2xl p-8 border border-nexora-border/60 shadow-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-nexora-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nexora-primary/15 border border-nexora-primary/30 text-nexora-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            {stageBadge}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-nexora-muted font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Architectural Extension Point Prepared
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
          {title}
        </h1>

        <p className="text-base sm:text-lg text-nexora-subtext mb-8 leading-relaxed max-w-2xl">
          {description}
        </p>

        <div className="border-t border-nexora-border/40 pt-6">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Scheduled Implementation Pipeline:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-nexora-elevated/50 border border-nexora-border/40 text-sm text-nexora-subtext"
              >
                <ArrowRight className="w-4 h-4 text-nexora-accent shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
