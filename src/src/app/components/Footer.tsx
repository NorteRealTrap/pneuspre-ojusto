import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { useSiteConfigStore } from '../stores/siteConfig';
import './Footer.css';

const institutionalLinks = [
  { label: 'Quem somos', to: '/about' },
  { label: 'Seguranca', to: '/privacy' },
  { label: 'Frete e Entrega', to: '/shipping' },
  { label: 'Pagamento', to: '/terms' },
  { label: 'Depoimento de Clientes', to: '/faq' },
];

const helpLinks = [
  { label: 'Politica de Troca e Devolucao', to: '/returns' },
  { label: 'Politica de Reembolso', to: '/returns' },
  { label: 'Politica de Garantia', to: '/warranty' },
  { label: 'Politica de Privacidade', to: '/privacy' },
  { label: 'Contato', to: '/about' },
];

const accountLinks = [
  { label: 'Login', to: '/login' },
  { label: 'Cadastre-se', to: '/register' },
  { label: 'Meu Carrinho', to: '/cart' },
  { label: 'Meus Pedidos', to: '/orders' },
];

const paymentMethods = [
  {
    name: 'Visa',
    src: 'https://images.tcdn.com.br/commerce/assets/store/img/icons/formas_pagamento/pag_peqcartavisatraycheckout.png',
  },
  {
    name: 'Mastercard',
    src: 'https://images.tcdn.com.br/commerce/assets/store/img/icons/formas_pagamento/pag_peqmastercardtraycheckout.png',
  },
  {
    name: 'Diners',
    src: 'https://images.tcdn.com.br/commerce/assets/store/img/icons/formas_pagamento/pag_peqdinerstraycheckout.png',
  },
  {
    name: 'Elo',
    src: 'https://images.tcdn.com.br/commerce/assets/store/img/icons/formas_pagamento/pag_peqelotraycheckout.png',
  },
  {
    name: 'Boleto',
    src: 'https://images.tcdn.com.br/commerce/assets/store/img/icons/formas_pagamento/pag_peqboletotraycheckout.png',
  },
  {
    name: 'PIX',
    src: 'https://images.tcdn.com.br/commerce/assets/store/img/icons/formas_pagamento/pag_peqpix.png',
  },
];

const securitySeals = [
  {
    name: 'Compra Segura',
    src: 'https://images.tcdn.com.br/files/1063462/themes/154/img/compra-segura-site-protegido.png',
  },
  {
    name: 'Reclame Aqui',
    src: 'https://images.tcdn.com.br/files/1063462/themes/154/img/loja-verificada-reclame-aqui.png',
  },
  {
    name: 'Loja Protegida',
    src: 'https://images.tcdn.com.br/commerce/assets/store/img/selo_lojaprotegida.gif',
  },
  {
    name: 'Google Avaliacoes',
    src: 'https://images.tcdn.com.br/files/1063462/themes/154/img/avaliacoes-google.png',
  },
];

const localStorageCookieKey = 'pneusloja-cookie-consent';

export function Footer() {
  const { config } = useSiteConfigStore();
  const currentYear = new Date().getFullYear();

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'success'>('idle');
  const [showCookieConsent, setShowCookieConsent] = useState(false);

  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

  const normalizedWhatsapp = useMemo(() => {
    const fallback = '5511999999999';
    const value = config.whatsapp || fallback;
    return value.replace(/\D/g, '') || fallback;
  }, [config.whatsapp]);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(localStorageCookieKey);
    if (!storedValue) {
      setShowCookieConsent(true);
    }
  }, []);

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newsletterEmail.trim()) return;

    setNewsletterStatus('success');
    setNewsletterEmail('');

    window.setTimeout(() => {
      setNewsletterStatus('idle');
    }, 2800);
  };

  const acceptCookies = () => {
    window.localStorage.setItem(localStorageCookieKey, 'accepted');
    setShowCookieConsent(false);
  };

  return (
    <footer className="tray-footer">
      <section className="tray-newsletter">
        <div className="container tray-newsletter-content">
          <div className="tray-newsletter-copy">
            <div className="tray-newsletter-icon" aria-hidden="true">
              <Mail size={24} />
            </div>
            <div>
              <h3>Newsletter</h3>
              <p>As melhores ofertas direto no seu e-mail.</p>
            </div>
          </div>

          <form className="tray-newsletter-form" onSubmit={handleNewsletterSubmit}>
            <label htmlFor="footer-newsletter-email">Informe seu e-mail</label>
            <div className="tray-newsletter-input-wrap">
              <input
                id="footer-newsletter-email"
                type="email"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder="Seu melhor e-mail"
                required
              />
              <button type="submit">Enviar</button>
            </div>
            {newsletterStatus === 'success' && <span>Cadastro realizado com sucesso.</span>}
          </form>
        </div>
      </section>

      <section className="tray-footer-main">
        <div className="container">
          <div className="tray-footer-grid">
            <div className="tray-footer-column tray-footer-contact">
              <h4>Entre em Contato</h4>
              <ul>
                <li>
                  <a href={`https://wa.me/${normalizedWhatsapp}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={16} />
                    WhatsApp: {config.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${config.email}`}>
                    <Mail size={16} />
                    {config.email}
                  </a>
                </li>
                <li>
                  <span>
                    <Phone size={16} />
                    Segunda a Sexta: 07h as 17h30
                  </span>
                </li>
                <li>
                  <span>
                    <MapPin size={16} />
                    {config.address}
                  </span>
                </li>
              </ul>
            </div>

            <div className="tray-footer-column">
              <h4>Institucional</h4>
              <ul>
                {institutionalLinks.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="tray-footer-column">
              <h4>Ajuda</h4>
              <ul>
                {helpLinks.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="tray-footer-column">
              <h4>Minha Conta</h4>
              <ul>
                {accountLinks.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="tray-footer-badges-strip">
        <div className="container">
          <ul className="tray-footer-badges-list">
            <li className="tray-footer-badges-item">
              <h6>Meios de Pagamento:</h6>
              <ul className="tray-payment-list tray-payment-list-images">
                {paymentMethods.map((method) => (
                  <li key={method.name} title={method.name} className="payment-image-item">
                    <img src={method.src} alt={method.name} loading="lazy" />
                  </li>
                ))}
              </ul>
            </li>

            <li className="tray-footer-badges-item">
              <h6>Selos:</h6>
              <ul className="tray-payment-list tray-payment-list-images tray-security-list">
                {securitySeals.map((seal) => (
                  <li key={seal.name} title={seal.name} className="payment-image-item seal-image-item">
                    <img src={seal.src} alt={seal.name} loading="lazy" />
                  </li>
                ))}
                <li className="tray-google-safe">
                  <div className="tray-google-safe-badge" title="Google Safe Browsing">
                    <ShieldCheck size={14} />
                    <span>Google Safe Browsing</span>
                  </div>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      <section className="tray-footer-bottom">
        <div className="container tray-footer-bottom-content">
          <div className="tray-footer-brand">
            <img
              src={logoUrl}
              alt="Pneus Preçojusto"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
            <p>
              Copyright {currentYear} {config.storeName}. Todos os direitos reservados.
              Precos e estoque sujeitos a alteracoes sem aviso previo.
            </p>
          </div>

          <div className="tray-footer-social">
            <a
              href={config.facebook || 'https://www.facebook.com'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <Facebook size={18} />
            </a>
            <a
              href={config.instagram || 'https://www.instagram.com'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
            <a href={`mailto:${config.email}`} aria-label="Email">
              <Mail size={18} />
            </a>
          </div>
        </div>
      </section>

      {showCookieConsent && (
        <div className="tray-cookie-consent" role="dialog" aria-live="polite">
          <p>
            Utilizamos cookies para oferecer melhor experiencia, melhorar desempenho e personalizar conteudo.
            Ao continuar navegando, voce concorda com o uso de cookies.
          </p>
          <button type="button" onClick={acceptCookies}>
            Entendi
          </button>
        </div>
      )}

      <a
        href={`https://wa.me/${normalizedWhatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="tray-whatsapp-float"
        aria-label="Fale no WhatsApp"
      >
        <MessageCircle size={24} />
      </a>
    </footer>
  );
}
