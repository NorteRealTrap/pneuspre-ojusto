import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

interface GuardProps {
  children: ReactNode;
}

function GuardLoadingState({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '40vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem 1rem',
      }}
      aria-live="polite"
    >
      <p
        style={{
          margin: 0,
          fontSize: '0.95rem',
          color: '#4b5563',
          textAlign: 'center',
        }}
      >
        {message}
      </p>
    </div>
  );
}

export function RequireAuth({ children }: GuardProps) {
  const { isAuthenticated, loading } = useAuthStore();

  if (loading) {
    return <GuardLoadingState message="Carregando sua sessao..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: GuardProps) {
  const { isAuthenticated, loading, profile } = useAuthStore();

  if (loading) {
    return <GuardLoadingState message="Validando acesso ao painel..." />;
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
    return <>{children}</>;
  }

  if (isAuthenticated) {
    if (profile?.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
