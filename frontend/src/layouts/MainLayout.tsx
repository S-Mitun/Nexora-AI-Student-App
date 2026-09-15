import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-nexora-bg text-nexora-text">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-nexora-border/60 py-6 text-center text-xs text-nexora-muted bg-nexora-bg">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-nexora-subtext">NEXORA</span> — Learn it. See it. Try it. Apply it. Master it.
          </div>
          <div>
            Master Prompt 01 Architectural Foundation
          </div>
        </div>
      </footer>
    </div>
  );
};
