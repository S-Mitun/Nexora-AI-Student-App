import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Layers, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-nexora-bg flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-glow mb-6 animate-pulse">
          <Layers className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-3 text-nexora-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold tracking-wide text-nexora-text">
            Authenticating NEXORA student session...
          </span>
        </div>
        <p className="text-xs text-nexora-text-muted mt-2">
          Restoring secure cryptographic keys and student profile
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated visitors to login, preserving intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
