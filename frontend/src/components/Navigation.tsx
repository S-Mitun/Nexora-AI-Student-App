import React from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';

interface NavigationProps {
  onItemClick?: () => void;
  orientation?: 'horizontal' | 'vertical';
}

export const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/learn', label: 'Learn', icon: Compass },
  { path: '/materials', label: 'My Materials', icon: FileText },
  { path: '/chat', label: 'AI Chat', icon: MessageSquare },
  { path: '/labs', label: 'Labs', icon: FlaskConical },
  { path: '/mindmap', label: 'Mind Map', icon: GitFork },
  { path: '/notes', label: 'My Notes', icon: BookMarked },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '/profile', label: 'Profile', icon: User },
];

export const Navigation: React.FC<NavigationProps> = ({
  onItemClick,
  orientation = 'horizontal',
}) => {
  if (orientation === 'vertical') {
    return (
      <nav className="flex flex-col gap-1 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-nexora-primary text-white shadow-glow'
                    : 'text-nexora-subtext hover:text-white hover:bg-nexora-elevated'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden lg:flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-nexora-primary text-white shadow-glow'
                  : 'text-nexora-subtext hover:text-white hover:bg-nexora-elevated/70'
              }`
            }
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
