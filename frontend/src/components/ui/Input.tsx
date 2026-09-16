import React from 'react';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ icon, leftIcon, rightIcon, error, className = '', ...props }, ref) => {
    const actualLeftIcon = icon || leftIcon;
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {actualLeftIcon && (
            <div className="absolute left-3 text-nexora-muted pointer-events-none flex items-center">
              {actualLeftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full rounded-xl bg-nexora-surface/90 border border-nexora-border/80 text-white placeholder-nexora-muted text-sm px-3.5 py-2.5 transition-all duration-200 focus:outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary ${
              actualLeftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-nexora-muted flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search concepts, topics, or materials...',
  className = '',
  ...props
}) => {
  return (
    <Input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      leftIcon={<Search className="w-4 h-4 text-nexora-muted" />}
      rightIcon={
        value ? (
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded-md text-nexora-muted hover:text-white hover:bg-nexora-elevated"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-nexora-muted bg-nexora-elevated rounded border border-nexora-border">
            /
          </kbd>
        )
      }
      className={className}
      {...props}
    />
  );
};
