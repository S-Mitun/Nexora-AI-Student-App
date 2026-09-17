import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Home,
  BookOpen,
  FolderKanban,
  FileText,
  CheckCircle2,
  FlaskConical,
  BookMarked,
  TrendingUp,
  User,
  Settings,
  GraduationCap,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const primaryNavItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/learn', label: 'My Learning', icon: BookOpen },
  { path: '/subjects', label: 'Subjects', icon: FolderKanban },
  { path: '/materials', label: 'Materials', icon: FileText },
  { path: '/practice', label: 'Practice', icon: CheckCircle2 },
  { path: '/labs', label: 'Labs', icon: FlaskConical },
  { path: '/notes', label: 'Notes', icon: BookMarked },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
];

export const secondaryNavItems = [
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { user, profile, isAuthenticated, signOut } = useAuth();

  return (
    <aside
      className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-nexora-border/70 bg-nexora-surface/90 backdrop-blur-md z-30"
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-nexora-border/60">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-nexora-accent transition-colors">
            NEXORA
          </span>
        </Link>
      </div>

      {/* Primary Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-nexora-muted px-3 mb-2">
          Academic Workspace
        </div>
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-nexora-primary text-white shadow-glow/40 font-bold'
                    : 'text-nexora-subtext hover:text-white hover:bg-nexora-elevated/80'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
            </NavLink>
          );
        })}

        <div className="pt-4 mt-4 border-t border-nexora-border/40">
          <div className="text-[10px] font-bold uppercase tracking-wider text-nexora-muted px-3 mb-2">
            Preferences
          </div>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                    isActive
                      ? 'bg-nexora-primary text-white shadow-glow/40 font-bold'
                      : 'text-nexora-subtext hover:text-white hover:bg-nexora-elevated/80'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Authenticated Student Identity & Logout */}
      <div className="p-3 border-t border-nexora-border/60 bg-nexora-bg/40">
        {isAuthenticated ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-nexora-elevated/70 border border-nexora-border/60">
            <Link to="/profile" className="flex items-center gap-2.5 min-w-0 group/user">
              <div className="w-8 h-8 rounded-lg bg-nexora-primary/20 border border-nexora-primary/30 flex items-center justify-center text-nexora-primary font-bold text-xs shrink-0">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate group-hover/user:text-nexora-accent transition-colors">
                  {profile?.full_name || user?.email?.split('@')[0] || 'Student'}
                </span>
                <span className="text-[10px] text-nexora-muted truncate max-w-[110px]">
                  {user?.email || 'student@nexora.dev'}
                </span>
              </div>
            </Link>
            <button
              onClick={() => signOut()}
              className="p-1.5 text-nexora-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="w-full flex items-center justify-center py-2 px-3 rounded-xl bg-nexora-primary text-white text-xs font-semibold shadow-glow/30"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
};
