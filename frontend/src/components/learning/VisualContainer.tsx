import React from 'react';
import { Sliders, Eye, RotateCcw, Maximize2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface VisualContainerProps {
  title: string;
  subtitle?: string;
  modelType?: string;
  hasInteractiveModel?: boolean;
  onReset?: () => void;
  children?: React.ReactNode;
  controls?: React.ReactNode;
}

export const VisualContainer: React.FC<VisualContainerProps> = ({
  title,
  subtitle,
  modelType = 'Interactive Simulation',
  hasInteractiveModel = true,
  onReset,
  children,
  controls,
}) => {
  return (
    <div className="glass-panel rounded-2xl border border-nexora-border/80 overflow-hidden shadow-glow/30">
      {/* Container Header */}
      <div className="p-4 sm:p-5 border-b border-nexora-border/70 flex flex-wrap items-center justify-between gap-3 bg-nexora-surface/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="accent" size="sm" hasDot>
              {modelType}
            </Badge>
            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">{title}</h4>
          </div>
          {subtitle && <p className="text-xs text-nexora-muted">{subtitle}</p>}
        </div>

        {hasInteractiveModel && onReset && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Model
            </Button>
          </div>
        )}
      </div>

      {/* Main Canvas / Visualizer Area */}
      <div className="p-4 sm:p-6">
        {hasInteractiveModel && children ? (
          children
        ) : (
          <div className="py-14 px-4 text-center bg-[#090d16] rounded-xl border border-nexora-border/50">
            <div className="w-12 h-12 rounded-2xl bg-nexora-elevated flex items-center justify-center text-nexora-accent mx-auto mb-3">
              <Eye className="w-5 h-5" />
            </div>
            <h5 className="text-sm font-semibold text-white mb-1">
              Visual Model Architecture Prepared
            </h5>
            <p className="text-xs text-nexora-subtext max-w-sm mx-auto">
              Interactive visualization will appear here when this concept has an interactive simulation model.
            </p>
          </div>
        )}

        {/* Controls Drawer / Parameter Tuning */}
        {hasInteractiveModel && controls && (
          <div className="mt-5 pt-4 border-t border-nexora-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
              <Sliders className="w-3.5 h-3.5" />
              <span>Observable Parameter Tuning</span>
            </div>
            {controls}
          </div>
        )}
      </div>
    </div>
  );
};
