import React from 'react';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'checking' | 'healthy' | 'offline';
  version?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, version }) => {
  if (status === 'healthy') {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>API Live {version ? `v${version}` : ''}</span>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
        <Activity className="w-3.5 h-3.5 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
      <AlertCircle className="w-3.5 h-3.5" />
      <span>Offline Mode</span>
    </div>
  );
};
