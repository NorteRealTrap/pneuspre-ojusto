import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/supabase';
import './Auth.css';

const STRONG_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function mapResetPasswordError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Nao foi possivel atualizar a senha. Tente novamente.';
  }

  const message = 'message' in error ? String(error.message || '') : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('same password')) {
    return 'A nova senha deve ser diferente da senha atual.';
  }

  if (normalized.includes('password should be at least')) {
    return 'A senha deve ter no minimo 8 caracteres.';
  }

  if (normalized.includes('session')) {
    return 'Sessao de recuperacao invalida ou expirada. Solicite um novo link.';
  }

  return 'Nao foi possivel atualizar a senha. Tente novamente.';
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [validRecovery, setValidRecovery] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const searchKey = searchParams.toString();

  useEffect(() => {
    let active = true;

    const validateRecoveryLink = async () => {
      setCheckingLink(true);
      setError('');

      try {
        const params = new URLSearchParams(searchKey);
        const tokenHash = params.get('token_hash');
        const type = params.get('type');

        if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await authService.verifyRecoveryToken(tokenHash);
          if (verifyError) {
            throw verifyError;
          }

          if (active) {
            setValidRecovery(true);
          }
          return;
        }

        const session = await authService.getSession();
        if (session) {
          if (active) {
            setValidRecovery(true);
          }
          return;
        }

        // Supabase pode levar um curto intervalo para processar tokens vindos da URL.
        await new Promise((resolve) => setTimeout(resolve, 700));
        const retriedSession = await authService.getSession();
        if (!retriedSession) {
          throw new Error('Invalid recovery session');
        }

        if (active) {
          setValidRecovery(true);
        }
      } catch {
        if (active) {
          setValidRecovery(false);
          setError('Link de recuperacao invalido ou expirado. Solicite um novo link.');
        }
      } finally {
        if (active) {
          setCheckingLink(false);
        }
      }
    };

    void validateRecoveryLink();

    return () => {
      active = false;
    };
  }, [searchKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!password || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }

    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError('Use ao menos 8 caracteres com letras e numeros');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem');
      return;
    }

    try {
      setLoading(true);
      const { error: updateError } = await authService.updatePassword(password);
      if (updateError) {
        throw updateError;
      }

      await authService.signOut();
      setMessage('Senha redefinida com sucesso. Voce ja pode entrar com a nova senha.');

      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { info: 'Senha redefinida com sucesso. Entre com a nova senha.' },
        });
      }, 1500);
    } catch (err: unknown) {
      setError(mapResetPasswordError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page reset-page">
      <div className="auth-container reset-container">
        <div className="auth-card reset-card">
          <div className="auth-header">
            <h1>Definir nova senha</h1>
            <p>Crie uma senha forte para concluir sua recuperacao</p>
          </div>

          {checkingLink && (
            <div className="auth-success auth-loading-state">
              <Loader className="spinner" size={16} />
              Validando link de recuperacao...
            </div>
          )}

          {!checkingLink && error && <div className="auth-error">{error}</div>}
          {!checkingLink && message && <div className="auth-success">{message}</div>}

          {!checkingLink && validRecovery && (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="new-password">Nova senha</label>
                <div className="input-wrapper">
                  <Lock size={20} className="input-icon" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm-new-password">Confirmar nova senha</label>
                <div className="input-wrapper">
                  <Lock size={20} className="input-icon" />
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? (
                  <>
                    <Loader className="spinner" size={20} />
                    Salvando nova senha...
                  </>
                ) : (
                  'Atualizar senha'
                )}
              </button>
            </form>
          )}

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <div className="auth-footer">
            <p>
              Voltar para{' '}
              <Link to="/login" className="auth-link">
                login
              </Link>{' '}
              ou{' '}
              <Link to="/forgot-password" className="auth-link">
                solicitar novo link
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-illustration reset-illustration">
          <div className="illustration-content">
            <h2>Protecao da sua conta</h2>
            <ul className="features-list">
              <li>Use no minimo 8 caracteres</li>
              <li>Combine letras, numeros e simbolos</li>
              <li>Evite reutilizar senhas antigas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
