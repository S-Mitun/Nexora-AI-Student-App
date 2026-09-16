import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Compass,
  MessageSquare,
  BookMarked,
  User,
  X,
  FlaskConical,
  GitFork,
  TrendingUp,
  FileText,
  Layers,
} from 'lucide-react';

interface MobileNavProps {
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isDrawerOpen, onCloseDrawer }) => {
  const primaryTabs = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/learn', label: 'Learn', icon: Compass },
    { path: '/chat', label: 'AI Chat', icon: MessageSquare },
    { path: '/notes', label: 'Notes', icon: BookMarked },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const secondaryLinks = [
    { path: '/materials', label: 'My Materials', icon: FileText, desc: 'Textbooks & notes' },
    { path: '/labs', label: 'Virtual Labs', icon: FlaskConical, desc: 'Simulations & experiments' },
    { path: '/mindmap', label: 'Concept Mind Map', icon: GitFork, desc: 'Visual prerequisite tree' },
    { path: '/progress', label: 'Mastery Progress', icon: TrendingUp, desc: 'Learning retention matrix' },
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
                    isActive ? 'text-nexora-accent' : 'text-nexora-muted hover:text-white'
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
                  <Layers className="w-4 h-4" />
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
                          ? 'bg-nexora-primary text-white shadow-glow'
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
          </div>
        </div>
      )}
    </>
  );
};
