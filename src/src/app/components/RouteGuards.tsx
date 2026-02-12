import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

interface GuardProps {
  children: ReactNode;
}

export function RequireAuth({ children }: GuardProps) {
  const { isAuthenticated, loading } = useAuthStore();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: GuardProps) {
  const { isAuthenticated, loading, profile } = useAuthStore();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function RequireGuest({ children }: GuardProps) {
  const { isAuthenticated, loading, profile } = useAuthStore();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    if (profile?.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
