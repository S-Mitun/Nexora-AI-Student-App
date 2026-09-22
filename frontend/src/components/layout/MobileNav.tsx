import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  BookOpen,
  FolderKanban,
  CheckCircle2,
  User,
  X,
  FlaskConical,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  BookMarked,
  Settings,
  GraduationCap,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isDrawerOpen, onCloseDrawer }) => {
  const { user, profile, isAuthenticated, signOut } = useAuth();
  
  const primaryTabs = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/learn', label: 'Learning', icon: BookOpen },
    { path: '/subjects', label: 'Subjects', icon: FolderKanban },
    { path: '/practice', label: 'Practice', icon: CheckCircle2 },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const secondaryLinks = [
    { path: '/syllabus', label: 'Syllabus', icon: FileSpreadsheet, desc: 'Primary prescribed curriculum' },
    { path: '/materials', label: 'Materials', icon: FileText, desc: 'Study textbooks & lecture notes' },
    { path: '/notes', label: 'Notes', icon: BookMarked, desc: 'Personal study notes' },
    { path: '/labs', label: 'Labs', icon: FlaskConical, desc: 'Interactive practical learning' },
    { path: '/progress', label: 'Progress', icon: TrendingUp, desc: 'Subject completion & scores' },
    { path: '/settings', label: 'Settings', icon: Settings, desc: 'Appearance & preferences' },
  ];

  return (
    <>
      {/* Fixed Bottom Navigation Bar on Mobile */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-nexora-surface/95 backdrop-blur-lg border-t border-nexora-border/80 px-2 py-1.5 safe-area-pb"
        aria-label="Mobile Bottom Navigation"
      >
        <div className="flex items-center justify-around">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-medium transition-colors ${
                    isActive ? 'text-nexora-accent font-semibold' : 'text-nexora-muted hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Slide-over Drawer for all destinations */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseDrawer}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-nexora-surface h-full p-5 flex flex-col border-r border-nexora-border shadow-2xl z-10 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-nexora-border/60 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-glow">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-base">NEXORA</span>
              </div>
              <button
                onClick={onCloseDrawer}
                className="p-1.5 rounded-lg text-nexora-muted hover:text-white hover:bg-nexora-elevated"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-nexora-muted mb-2 px-1">
              All Learning Destinations
            </div>

            <div className="space-y-1">
              {[...primaryTabs, ...secondaryLinks].map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseDrawer}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-nexora-primary text-white shadow-glow font-bold'
                          : 'text-nexora-subtext hover:text-white hover:bg-nexora-elevated'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Student Auth Section in Drawer */}
            <div className="mt-auto pt-4 border-t border-nexora-border/60">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 px-1">
                    <div className="w-8 h-8 rounded-lg bg-nexora-primary/20 border border-nexora-primary/30 flex items-center justify-center text-nexora-primary font-bold text-xs shrink-0">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate">
                        {profile?.full_name || user?.email?.split('@')[0] || 'Student'}
                      </span>
                      <span className="text-[10px] text-nexora-muted truncate">
                        {user?.email || 'student@nexora.dev'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onCloseDrawer();
                      signOut();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold hover:bg-rose-500/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <NavLink
                  to="/login"
                  onClick={onCloseDrawer}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-nexora-primary text-white text-xs font-semibold shadow-glow"
                >
                  <span>Sign In</span>
                </NavLink>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
