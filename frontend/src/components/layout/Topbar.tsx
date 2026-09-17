import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Search, Sparkles, User, Layers, Menu, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export interface TopbarProps {
  onOpenMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const getPageTitle = () => {
    if (location.pathname.startsWith('/subjects/')) return 'Subject Curriculum';
    switch (location.pathname) {
      case '/':
        return 'Student Dashboard';
      case '/learn':
        return 'My Learning';
      case '/subjects':
        return 'Subjects & Courses';
      case '/materials':
        return 'Study Materials';
      case '/practice':
        return 'Practice & Review';
      case '/labs':
        return 'Interactive Labs';
      case '/notes':
        return 'Personal Notes';
      case '/progress':
        return 'Learning Progress';
      case '/profile':
        return 'Student Profile';
      case '/settings':
        return 'Settings';
      case '/chat':
        return 'Study Assistant';
      case '/mindmap':
        return 'Concept Mind Map';
      default:
        return 'NEXORA';
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/learn?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-20 w-full h-16 border-b border-nexora-border/70 bg-nexora-bg/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Mobile brand & toggle */}
      <div className="flex items-center gap-3 lg:hidden">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl text-nexora-subtext hover:text-white hover:bg-nexora-elevated"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-glow">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-base">NEXORA</span>
        </Link>
      </div>

      {/* Desktop Breadcrumb/Title */}
      <div className="hidden lg:flex items-center gap-2">
        <span className="text-xs text-nexora-muted font-medium">NEXORA</span>
        <span className="text-xs text-nexora-border">/</span>
        <h2 className="text-sm font-semibold text-white tracking-tight">{getPageTitle()}</h2>
      </div>

      {/* Quick Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden sm:block">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-nexora-muted absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects, topics, or concepts..."
            className="w-full bg-nexora-surface/90 border border-nexora-border text-xs text-white placeholder-nexora-muted rounded-xl pl-9 pr-3 py-2 transition-all focus:outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
          />
        </div>
      </form>

      {/* Quick Actions & Profile */}
      <div className="flex items-center gap-2.5">
        <Link to="/practice">
          <Button variant="outline" size="sm">
            Quick Practice
          </Button>
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-nexora-elevated border border-nexora-border text-xs text-nexora-text hover:text-white hover:border-nexora-primary/50 transition-colors"
              title="Student Profile & Settings"
            >
              <div className="w-5 h-5 rounded-full bg-nexora-primary/20 text-nexora-primary flex items-center justify-center font-bold text-[10px]">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <span className="hidden sm:inline font-medium max-w-[100px] truncate">
                {profile?.full_name || user?.email?.split('@')[0] || 'Student'}
              </span>
            </Link>
            <button
              onClick={() => signOut()}
              className="p-2 text-nexora-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link to="/login">
            <Button variant="primary" size="sm">
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};
