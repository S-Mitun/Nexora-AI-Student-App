import React from 'react';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`glass-panel rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto border border-nexora-border/70 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-nexora-elevated border border-nexora-border/80 flex items-center justify-center text-nexora-primary mx-auto mb-5 shadow-glow/30">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-nexora-subtext leading-relaxed mb-6 max-w-md mx-auto">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};
