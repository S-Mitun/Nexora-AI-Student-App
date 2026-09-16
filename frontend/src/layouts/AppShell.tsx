import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { MobileNav } from '../components/layout/MobileNav';

export const AppShell: React.FC = () => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-nexora-bg text-nexora-text flex">
      {/* Desktop Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onOpenMobileMenu={() => setIsMobileDrawerOpen(true)} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          <Outlet />
        </main>

        <footer className="border-t border-nexora-border/50 py-5 text-center text-xs text-nexora-muted bg-nexora-bg/60 hidden lg:block">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <span>
              <strong className="text-nexora-subtext">NEXORA</strong> — Learn it. See it. Try it. Apply it. Master it.
            </span>
            <span className="font-mono text-[11px] text-nexora-muted">
              Master Prompt 02 UI/UX System
            </span>
          </div>
        </footer>
      </div>

      {/* Mobile Navigation and Drawer */}
      <MobileNav
        isDrawerOpen={isMobileDrawerOpen}
        onCloseDrawer={() => setIsMobileDrawerOpen(false)}
      />
    </div>
  );
};
