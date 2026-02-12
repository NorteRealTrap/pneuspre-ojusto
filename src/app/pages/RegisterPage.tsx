import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import './Auth.css';

const STRONG_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function mapRegisterError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Erro ao criar conta. Tente novamente.';
  }

  const message = 'message' in error ? String(error.message || '') : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('user already registered')) {
    return 'Este email ja esta cadastrado. Tente entrar.';
  }

  if (normalized.includes('password should be at least')) {
    return 'A senha deve ter no minimo 8 caracteres.';
  }

  if (
    normalized.includes('duplicate key value violates unique constraint') &&
    normalized.includes('profiles_cpf_key')
  ) {
    return 'Este CPF ja esta cadastrado.';
  }

  if (normalized.includes('invalid email')) {
    return 'Email invalido.';
  }

  if (normalized.includes('rate limit')) {
    return 'Muitas tentativas de cadastro. Aguarde e tente novamente.';
  }

  return 'Erro ao criar conta. Tente novamente.';
}

export function RegisterPage() {
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim() || !normalizedEmail || !password || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setError('Email invalido');
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

    if (!acceptTerms) {
      setError('Voce deve aceitar os termos de uso');
      return;
    }

    try {
      setLoading(true);
      const { requiresEmailConfirmation } = await register(
        name.trim(),
        normalizedEmail,
        password,
        cpf.trim(),
        phone.trim()
      );

      if (requiresEmailConfirmation) {
        navigate('/login', {
          replace: true,
          state: {
            needsEmailConfirmation: true,
            email: normalizedEmail,
          },
        });
        return;
      }

      navigate('/');
    } catch (err: unknown) {
      setError(mapRegisterError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Criar sua conta</h1>
            <p>Junte-se a nos e aproveite os melhores produtos</p>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Nome Completo</label>
              <div className="input-wrapper">
                <User size={20} className="input-icon" />
                <input
                  id="name"
                  type="text"
                  placeholder="Joao Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  autoComplete="name"
                />
              </div>
            </div>

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
              <label htmlFor="cpf">CPF (opcional)</label>
              <div className="input-wrapper">
                <input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="form-input"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Telefone (opcional)</label>
              <div className="input-wrapper">
                <input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  autoComplete="tel"
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
                  autoComplete="new-password"
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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Senha</label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <input
                  id="confirmPassword"
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <span>
                  Aceito os{' '}
                  <Link to="/terms" className="auth-link">
                    Termos de Uso
                  </Link>{' '}
                  e a{' '}
                  <Link to="/privacy" className="auth-link">
                    Politica de Privacidade
                  </Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="spinner" size={20} />
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <div className="auth-footer">
            <p>
              Ja tem uma conta?{' '}
              <Link to="/login" className="auth-link">
                Entrar
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-illustration">
          <div className="illustration-content">
            <h2>Por que se cadastrar?</h2>
            <ul className="features-list">
              <li>Ofertas exclusivas para membros</li>
              <li>Rastreamento de pedidos</li>
              <li>Lista de desejos personalizada</li>
              <li>Checkout rapido</li>
              <li>Novidades em primeira mao</li>
              <li>Recomendacoes personalizadas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
