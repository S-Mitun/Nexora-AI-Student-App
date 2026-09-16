import React from 'react';
import { HelpCircle, Lightbulb, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface CalloutProps {
  type?: 'why' | 'info' | 'tip' | 'warning' | 'success';
  variant?: 'why' | 'info' | 'tip' | 'warning' | 'success';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Callout: React.FC<CalloutProps> = ({
  type,
  variant,
  title,
  children,
  action,
  className = '',
}) => {
  const actualType = variant || type || 'info';
  const configs = {
    why: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      icon: Lightbulb,
      defaultTitle: 'WHY DOES THIS EXIST?',
    },
    info: {
      border: 'border-indigo-500/30',
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-300',
      icon: Info,
      defaultTitle: 'KEY CONCEPT INSIGHT',
    },
    tip: {
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-300',
      icon: HelpCircle,
      defaultTitle: 'STUDENT TIP',
    },
    warning: {
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/10',
      text: 'text-rose-300',
      icon: AlertTriangle,
      defaultTitle: 'COMMON MISCONCEPTION',
    },
    success: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      icon: CheckCircle2,
      defaultTitle: 'MASTERY CHECKPOINT',
    },
  };

  const config = configs[actualType];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${config.bg} ${config.border} ${className}`}
      role="region"
      aria-label={title || config.defaultTitle}
    >
      <div className="flex items-start gap-3.5">
        <div className={`p-2 rounded-xl bg-nexora-bg/60 border border-white/10 shrink-0 ${config.text}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${config.text}`}>
            {title || config.defaultTitle}
          </h4>
          <div className="text-sm text-nexora-text leading-relaxed">{children}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
};
