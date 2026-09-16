import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Home,
  Compass,
  FileText,
  MessageSquare,
  FlaskConical,
  GitFork,
  BookMarked,
  TrendingUp,
  User,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { apiService } from '../../services/api';

export const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/learn', label: 'Learn', icon: Compass },
  { path: '/materials', label: 'My Materials', icon: FileText, badge: 'Ingest' },
  { path: '/chat', label: 'AI Chat', icon: MessageSquare, badge: 'Socratic' },
  { path: '/labs', label: 'Labs', icon: FlaskConical },
  { path: '/mindmap', label: 'Mind Map', icon: GitFork },
  { path: '/notes', label: 'My Notes', icon: BookMarked },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '/profile', label: 'Profile', icon: User },
];

export const Sidebar: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'offline'>('checking');
  const [backendVersion, setBackendVersion] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const data = await apiService.getHealth();
        if (isMounted && data.status === 'healthy') {
          setHealthStatus('healthy');
          setBackendVersion(data.system.version);
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus('offline');
        }
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <aside
      className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-nexora-border/70 bg-nexora-surface/75 backdrop-blur-md z-30"
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-nexora-border/60">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-nexora-accent transition-colors">
              NEXORA
            </span>
            <span className="text-[10px] text-nexora-muted font-medium tracking-wide uppercase">
              Show me, don't tell me
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-nexora-muted px-3 mb-2">
          Experience Hub
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-nexora-primary text-white shadow-glow/50'
                    : 'text-nexora-subtext hover:text-white hover:bg-nexora-elevated/80'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-nexora-muted group-hover:text-white font-mono">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Philosophy Prompt & System Status */}
      <div className="p-4 border-t border-nexora-border/60 space-y-3 bg-nexora-bg/30">
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-300 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Learning Loop</span>
          </div>
          <p className="text-[11px] text-nexora-subtext leading-relaxed">
            Discover &bull; Visualize &bull; Experiment &bull; Apply &bull; Master
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-nexora-muted">Backend Link</span>
          <StatusBadge status={healthStatus} version={backendVersion} />
        </div>
      </div>
    </aside>
  );
};
