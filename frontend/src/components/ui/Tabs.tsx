import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  items?: TabItem[];
  tabs?: TabItem[];
  activeId?: string;
  activeTab?: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  tabs,
  activeId,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  const actualItems = items || tabs || [];
  const actualActiveId = activeId || activeTab || (actualItems[0]?.id ?? '');
  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 p-1 bg-nexora-surface/80 rounded-xl border border-nexora-border/70 ${className}`}>
        {actualItems.map((tab) => {
          const isActive = tab.id === actualActiveId;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-nexora-primary text-white shadow-glow/40'
                  : 'text-nexora-subtext hover:text-white hover:bg-nexora-elevated'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-nexora-elevated text-nexora-muted'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex items-center border-b border-nexora-border ${className}`}>
      {actualItems.map((tab) => {
        const isActive = tab.id === actualActiveId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
              isActive
                ? 'border-nexora-accent text-nexora-accent'
                : 'border-transparent text-nexora-subtext hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-nexora-elevated text-nexora-muted">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
