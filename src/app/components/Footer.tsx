import { Link, useNavigate } from 'react-router-dom';
import { Facebook, Instagram, Mail, MapPin, Phone, MessageCircle } from 'lucide-react';
import './Footer.css';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const sealUrl = `${import.meta.env.BASE_URL}selo-seguranca.png`;

  const navigateToCategory = (category: string) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">Pneus.PrecoJusto</h3>
            <p className="footer-description">
              Especialistas em pneus desde 2010. Qualidade, seguranca e precos competitivos para todos os tipos de
              veiculos.
            </p>
            <div className="footer-social">
              <a
                href="https://wa.me/5537998464172"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link whatsapp"
                title="WhatsApp"
              >
                <MessageCircle size={20} />
              </a>
              <a
                href="https://www.instagram.com/pneugreen_"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link instagram"
                title="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://www.facebook.com/usepneugreen?mibextid=LQQJ4d"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link facebook"
                title="Facebook"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h4 className="footer-section-title">Categorias</h4>
            <ul className="footer-links">
              <li>
                <button type="button" className="footer-link-button" onClick={() => navigateToCategory('passeio')}>
                  Pneus para Automoveis
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-button" onClick={() => navigateToCategory('suv')}>
                  Pneus para SUV
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-link-button"
                  onClick={() => navigateToCategory('caminhonete')}
                >
                  Pneus para Caminhonetes
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-button" onClick={() => navigateToCategory('van')}>
                  Pneus para Vans
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-section-title">Informacoes</h4>
            <ul className="footer-links">
              <li>
                <Link to="/frete-e-entrega">Politica de Entrega</Link>
              </li>
              <li>
                <Link to="/politica-de-troca-e-devolucao">Trocas e Devolucoes</Link>
              </li>
              <li>
                <Link to="/politica-de-garantia">Garantia dos Produtos</Link>
              </li>
              <li>
                <Link to="/contato">Fale Conosco</Link>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-section-title">Contato</h4>
            <ul className="footer-contact">
              <li>
                <MapPin size={16} />
                <span>Sao Paulo, SP - Brasil</span>
              </li>
              <li>
                <Phone size={16} />
                <a href="tel:+553799846417">(37) 99846-4172</a>
              </li>
              <li>
                <Mail size={16} />
                <a href="mailto:contato@pneusprecojusto.com.br">contato@pneusprecojusto.com.br</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-payment">
          <h4>Metodos de Pagamento</h4>
          <div className="payment-methods">
            <div className="payment-badge">Cartao de Credito</div>
            <div className="payment-badge">PIX</div>
            <div className="payment-badge">Boleto Bancario</div>
            <div className="payment-badge">Pagamento Seguro</div>
          </div>
        </div>

        <div className="footer-seal">
          <img
            src={sealUrl}
            alt="Selo de Seguranca"
            className="security-seal"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="footer-copyright">(c) {currentYear} Pneus.PrecoJusto. Todos os direitos reservados.</p>
            <div className="footer-legal">
              <Link to="/politica-de-privacidade">Politica de Privacidade</Link>
              <span className="separator">-</span>
              <Link to="/politica-de-troca-e-devolucao">Termos de Uso</Link>
              <span className="separator">-</span>
              <Link to="/contato">Contato</Link>
            </div>
          </div>
        </div>
      </div>

      <a
        href="https://wa.me/5537998464172?text=Ola! Gostaria de informacoes sobre pneus."
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float"
        title="Fale conosco no WhatsApp"
      >
        <MessageCircle size={28} />
      </a>
    </footer>
  );
}
