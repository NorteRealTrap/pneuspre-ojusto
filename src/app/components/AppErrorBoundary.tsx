import { Component, ErrorInfo, ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

function clearPersistedClientState() {
  try {
    const keys = [
      'cart-storage',
      'wishlist-storage',
      'notifications-storage',
      'site-config-storage-v2',
      'tire-storage',
    ];

    for (const key of keys) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore clear failures.
  }
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Erro inesperado de carregamento.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary capturou erro:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    clearPersistedClientState();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
          background: '#f3f4f6',
          color: '#111827',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '640px',
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Falha ao renderizar a aplicacao</h1>
          <p style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            Detectamos um erro de apresentacao e interrompemos o carregamento para evitar tela em branco.
          </p>
          <p
            style={{
              marginTop: '0.75rem',
              marginBottom: 0,
              color: '#4b5563',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.82rem',
              wordBreak: 'break-word',
            }}
          >
            {this.state.errorMessage}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                border: '0',
                borderRadius: '8px',
                padding: '0.6rem 0.9rem',
                background: '#111827',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Recarregar
            </button>
            <button
              type="button"
              onClick={this.handleResetAndReload}
              style={{
                border: '1px solid #111827',
                borderRadius: '8px',
                padding: '0.6rem 0.9rem',
                background: '#ffffff',
                color: '#111827',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Limpar dados locais e recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
