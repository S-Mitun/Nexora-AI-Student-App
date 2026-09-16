import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'info' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  hasDot?: boolean;
  dot?: boolean;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  hasDot,
  dot,
  pulse = false,
  className = '',
  ...props
}) => {
  const showDot = hasDot || dot;
  const variants = {
    primary: 'bg-nexora-primary/15 border-nexora-primary/30 text-indigo-300',
    accent: 'bg-nexora-accent/15 border-nexora-accent/30 text-cyan-300',
    success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    warning: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    info: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    neutral: 'bg-nexora-elevated border-nexora-border text-nexora-subtext',
    outline: 'bg-transparent border-nexora-border text-nexora-text',
  };

  const dots = {
    primary: 'bg-nexora-primary',
    accent: 'bg-nexora-accent',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    info: 'bg-blue-400',
    neutral: 'bg-nexora-muted',
    outline: 'bg-nexora-subtext',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dots[variant]}`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dots[variant]}`} />
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};
