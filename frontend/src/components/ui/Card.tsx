import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'interactive';
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  hover = false,
  className = '',
  ...props
}) => {
  const actualVariant = hover ? 'interactive' : variant;
  const variantStyles = {
    default: 'bg-nexora-surface border border-nexora-border/70',
    elevated: 'bg-nexora-elevated border border-nexora-border/80 shadow-md',
    glass: 'glass-panel shadow-sm',
    interactive:
      'glass-panel hover:border-nexora-primary/50 hover:shadow-glow/40 transition-all duration-200 cursor-pointer hover:-translate-y-0.5',
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden ${variantStyles[actualVariant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-6 pb-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-lg font-bold text-white tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs text-nexora-subtext mt-1 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-6 pt-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`p-6 pt-0 border-t border-nexora-border/40 mt-4 flex items-center justify-between ${className}`}
    {...props}
  >
    {children}
  </div>
);
