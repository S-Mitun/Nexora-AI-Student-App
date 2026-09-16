import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Search, Sparkles, User, Layers, Menu } from 'lucide-react';
import { Button } from '../ui/Button';

export interface TopbarProps {
  onOpenMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Home & Discover';
      case '/learn':
        return 'Learning Experience';
      case '/materials':
        return 'My Materials';
      case '/chat':
        return 'AI Tutor & Chat Companion';
      case '/labs':
        return 'Virtual Laboratories & Simulations';
      case '/mindmap':
        return 'Concept Mind Map';
      case '/notes':
        return 'Personal Learning Notes';
      case '/progress':
        return 'Mastery & Progress';
      case '/profile':
        return 'Student Profile & Preferences';
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
        <span className="text-xs text-nexora-muted">NEXORA</span>
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
            placeholder="Search concepts to understand (e.g. Doppler Effect, Binary Search)..."
            className="w-full bg-nexora-surface/90 border border-nexora-border text-xs text-white placeholder-nexora-muted rounded-xl pl-9 pr-3 py-2 transition-all focus:outline-none focus:border-nexora-primary focus:ring-1 focus:ring-nexora-primary"
          />
        </div>
      </form>

      {/* Quick Actions & Profile */}
      <div className="flex items-center gap-2.5">
        <Link to="/chat">
          <Button variant="outline" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-400" />}>
            <span className="hidden md:inline">Ask</span> AI Companion
          </Button>
        </Link>
        <Link
          to="/profile"
          className="w-9 h-9 rounded-xl bg-nexora-elevated border border-nexora-border flex items-center justify-center text-nexora-subtext hover:text-white hover:border-nexora-primary/50 transition-colors"
          title="Student Profile & Settings"
        >
          <User className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
};
