import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader } from 'lucide-react';
import { authService } from '../../services/supabase';
import './Auth.css';

const GENERIC_RECOVERY_MESSAGE =
  'Se o email existir, enviamos o link de redefinicao. Verifique caixa de entrada e spam.';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setError('Informe um email valido');
      return;
    }

    try {
      setLoading(true);
      const redirectTo = new URL(
        `${import.meta.env.BASE_URL}reset-password`,
        window.location.origin
      ).toString();

      const { error: resetError } = await authService.resetPassword(normalizedEmail, redirectTo);
      if (resetError) {
        setMessage(GENERIC_RECOVERY_MESSAGE);
        return;
      }

      setMessage(GENERIC_RECOVERY_MESSAGE);
    } catch {
      // Evita vazamento de informacao sobre existencia de conta.
      setMessage(GENERIC_RECOVERY_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page forgot-page">
      <div className="auth-container forgot-container">
        <div className="auth-card forgot-card">
          <div className="auth-header">
            <h1>Recuperar senha</h1>
            <p>Informe seu email para receber o link de redefinicao</p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Mail size={20} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? (
                <>
                  <Loader className="spinner" size={20} />
                  Enviando...
                </>
              ) : (
                'Enviar link de redefinicao'
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <div className="auth-footer">
            <p>
              Lembrou da senha?{' '}
              <Link to="/login" className="auth-link">
                Voltar para login
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-illustration forgot-illustration">
          <div className="illustration-content">
            <h2>Recuperacao segura</h2>
            <ul className="features-list">
              <li>Link unico e temporario</li>
              <li>Fluxo direto para trocar senha</li>
              <li>Acesso liberado apos redefinicao</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
