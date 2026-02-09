import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { authService } from '../../services/supabase';
import './Auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type AuthLocationState = {
  needsEmailConfirmation?: boolean;
  email?: string;
  info?: string;
} | null;

function isEmailConfirmationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error ? String(error.message || '') : '';
  return message.toLowerCase().includes('email not confirmed');
}

function mapLoginError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Nao foi possivel entrar agora. Tente novamente.';
  }

  const message = 'message' in error ? String(error.message || '') : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('email not confirmed')) {
    return 'Seu email ainda nao foi confirmado. Verifique a caixa de entrada.';
  }

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid email or password')
  ) {
    return 'Email ou senha incorretos. Se acabou de confirmar o email, redefina a senha em "Esqueceu a senha?".';
  }

  if (normalized.includes('too many requests')) {
    return 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';
  }

  return 'Nao foi possivel entrar agora. Tente novamente.';
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [bannerImage, setBannerImage] = useState('');

  const { login } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const fetchLoginBanner = async () => {
      try {
        const response = await fetch(`${API_URL}/public/login-banner`);

        if (!response.ok) {
          throw new Error('Nao foi possivel carregar o banner');
        }

        const data = (await response.json()) as { bannerImage?: string };

        if (active) {
          setBannerImage((data.bannerImage || '').trim());
        }
      } catch {
        if (active) {
          setBannerImage('');
        }
      }
    };

    void fetchLoginBanner();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const state = location.state as AuthLocationState;
    if (!state) {
      return;
    }

    if (state.email) {
      setEmail(state.email);
    }

    if (state.needsEmailConfirmation) {
      setNeedsEmailConfirmation(true);
      setInfo('Cadastro concluido. Confirme seu email para liberar o login.');
    }

    if (state.info) {
      setInfo(state.info);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setNeedsEmailConfirmation(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Preencha todos os campos');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setError('Email invalido');
      return;
    }

    try {
      setLoading(true);
      await login(normalizedEmail, password);
      navigate('/');
    } catch (err: unknown) {
      setError(mapLoginError(err));
      setNeedsEmailConfirmation(isEmailConfirmationError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setError('');
    setInfo('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setError('Informe um email valido para reenviar a confirmacao.');
      return;
    }

    try {
      setResendingConfirmation(true);
      const { error: resendError } = await authService.resendConfirmation(normalizedEmail);
      if (resendError) {
        throw resendError;
      }

      setInfo('Reenvio concluido. Verifique sua caixa de entrada e spam.');
      setNeedsEmailConfirmation(false);
    } catch {
      setError('Nao foi possivel reenviar o email de confirmacao agora.');
    } finally {
      setResendingConfirmation(false);
    }
  };

  return (
    <div className="auth-page login-page">
      <div className="auth-container login-container">
        <div className="auth-card login-card">
          <div className="auth-header">
            <h1>Bem-vindo de volta!</h1>
            <p>Entre na sua conta para continuar</p>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {info && (
            <div className="auth-success">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Mail size={20} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-footer">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Lembrar-me</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="spinner" size={20} />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>

            {needsEmailConfirmation && (
              <button
                type="button"
                className="auth-button auth-secondary-button"
                onClick={handleResendConfirmation}
                disabled={resendingConfirmation}
              >
                {resendingConfirmation ? (
                  <>
                    <Loader className="spinner" size={20} />
                    Reenviando...
                  </>
                ) : (
                  'Reenviar confirmacao por email'
                )}
              </button>
            )}
          </form>

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <div className="auth-footer">
            <p>
              Nao tem uma conta?{' '}
              <Link to="/register" className="auth-link">
                Criar conta
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-illustration login-banner-container">
          <div className="login-banner-slot" aria-label="Banner do login">
            {bannerImage && (
              <img
                src={bannerImage}
                alt="Banner do login"
                className="login-banner-image"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
