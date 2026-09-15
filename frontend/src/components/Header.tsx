import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Layers } from 'lucide-react';
import { Navigation } from './Navigation';
import { StatusBadge } from './StatusBadge';
import { apiService } from '../services/api';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    const interval = setInterval(checkBackend, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-nexora-border/70 bg-nexora-bg/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white group-hover:text-nexora-accent transition-colors">
                  NEXORA
                </span>
                <span className="text-[10px] text-nexora-muted font-medium -mt-1 hidden sm:inline">
                  Experience-First Learning
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <Navigation />

          {/* Status & Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <StatusBadge status={healthStatus} version={backendVersion} />
          </div>

          {/* Mobile menu button */}
          <div className="flex sm:hidden items-center gap-2">
            <StatusBadge status={healthStatus} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-nexora-subtext hover:text-white hover:bg-nexora-elevated"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-nexora-border/80 bg-nexora-surface px-4 pt-2 pb-6">
          <Navigation orientation="vertical" onItemClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
};
