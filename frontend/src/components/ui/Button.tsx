import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const actualLeftIcon = icon || leftIcon;
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-nexora-primary focus-visible:ring-offset-2 focus-visible:ring-offset-nexora-bg active:scale-[0.98]';

  const variants = {
    primary:
      'bg-nexora-primary hover:bg-nexora-primaryHover text-white shadow-glow hover:shadow-glow/60 border border-indigo-400/30',
    secondary:
      'bg-nexora-elevated hover:bg-nexora-border text-white border border-nexora-border/80 shadow-sm',
    outline:
      'bg-transparent hover:bg-nexora-elevated text-nexora-text border border-nexora-border hover:border-nexora-primary/50',
    ghost:
      'bg-transparent hover:bg-nexora-elevated text-nexora-subtext hover:text-white',
    danger:
      'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[32px]',
    md: 'text-sm px-4 py-2 gap-2 min-h-[40px]',
    lg: 'text-base px-6 py-3 gap-2.5 min-h-[48px]',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        actualLeftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
