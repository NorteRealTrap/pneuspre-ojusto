import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Headphones,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  ThumbsUp,
  Truck,
  User,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { useSiteConfigStore } from '../stores/siteConfig';
import './Navbar.css';

interface HeaderMenuItem {
  label: string;
  to: string;
  submenu?: Array<{ label: string; to: string }>;
}

const brandLinks = [
  'Agate',
  'Aptany',
  'Bridgestone',
  'Continental',
  'Cooper',
  'Goodyear',
  'Michelin',
  'Pirelli',
  'Triangle',
  'Xbri',
  'Yokohama',
].map((brand) => ({
  label: brand,
  to: `/marcas/${encodeURIComponent(brand.toLowerCase())}`,
}));

const headerMenu: HeaderMenuItem[] = [
  { label: 'Kit de Pneus', to: '/products?search=kit' },
  { label: 'Marcas', to: '/marcas', submenu: brandLinks },
  {
    label: 'Caminhonete e SUV',
    to: '/products?category=suv',
    submenu: [
      { label: 'Caminhonete', to: '/products?category=caminhonete' },
      { label: 'SUV', to: '/products?category=suv' },
    ],
  },
  { label: 'Van e Utilitario', to: '/products?category=van' },
  {
    label: 'Moto',
    to: '/products?category=moto',
    submenu: [
      { label: 'Pneu Urbano', to: '/products?category=moto&season=summer' },
      { label: 'Pneu Off-Road', to: '/products?category=moto&search=off-road' },
      { label: 'Pneu Trail', to: '/products?category=moto&search=trail' },
    ],
  },
  { label: 'Caminhao e Onibus', to: '/products?search=caminhao' },
  {
    label: 'Agricola e OTR',
    to: '/products?search=agricola',
    submenu: [
      { label: 'Agricola', to: '/products?search=agricola' },
      { label: 'OTR', to: '/products?search=otr' },
    ],
  },
  { label: 'Camaras de Ar', to: '/products?search=camara' },
];

const mobileQuickAccess = [
  { label: 'Kit de Pneus', to: '/products?search=kit' },
  { label: 'Marcas', to: '/marcas' },
  { label: 'Caminhonete e SUV', to: '/products?category=suv' },
  { label: 'Van e Utilitario', to: '/products?category=van' },
  { label: 'Moto', to: '/products?category=moto' },
  { label: 'Caminhao e Onibus', to: '/products?search=caminhao' },
  { label: 'Agricola e OTR', to: '/products?search=agricola' },
  { label: 'Camaras de Ar', to: '/products?search=camara' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function Navbar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

  const { isAuthenticated, user, profile, logout } = useAuthStore();
  const { getTotalItems, getTotalPrice } = useCartStore();
  const { config: siteConfig } = useSiteConfigStore();
  const navigate = useNavigate();

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  const accountLabel = profile?.name || user?.email || 'Minha Conta';
  const normalizedWhatsapp = useMemo(() => {
    const fallback = '5511999999999';
    const phone = siteConfig.whatsapp || fallback;
    return phone.replace(/\D/g, '') || fallback;
  }, [siteConfig.whatsapp]);

  useEffect(() => {
    if (!isMobileOpen) {
      document.body.style.overflow = 'unset';
      return;
    }

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMobileOpen(false);
      setIsAccountOpen(false);
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const closeMenus = () => {
    setIsMobileOpen(false);
    setIsAccountOpen(false);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
    setSearchQuery('');
    closeMenus();
  };

  const handleLogout = async () => {
    await logout();
    closeMenus();
    navigate('/');
  };

  return (
    <>
      <section className="tray-topbar">
        <div className="container tray-topbar-content">
          <div className="tray-topbar-left">
            <Link to="/shipping" className="tray-topbar-link">
              <Truck size={14} />
              <span>Frete Gratis. Ver regras *</span>
            </Link>
            <span className="tray-topbar-item">
              <ThumbsUp size={14} />
              <span>Entrega Garantida</span>
            </span>
            <span className="tray-topbar-item">
              <Headphones size={14} />
              <span>
                Precisa de Ajuda?
                <a
                  href={`https://wa.me/${normalizedWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tray-topbar-whatsapp"
                >
                  {' '}
                  WhatsApp
                </a>
              </span>
            </span>
          </div>

          <div className="tray-topbar-right">
            <Link to="/orders" className="tray-topbar-cta">
              Meus Pedidos
            </Link>
            <Link to={isAuthenticated ? '/account' : '/login'} className="tray-topbar-cta">
              Minha Conta
            </Link>
          </div>
        </div>
      </section>

      <header className="tray-header">
        <div className="container tray-header-main">
          <button
            type="button"
            className="tray-mobile-menu-btn"
            aria-label="Abrir menu"
            onClick={() => setIsMobileOpen((prev) => !prev)}
          >
            {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/" className="tray-logo" onClick={closeMenus}>
            <img
              src={logoUrl}
              alt="Pneus Preçojusto"
              className="tray-logo-image"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
            <span className="tray-logo-fallback">Pneus Preçojusto</span>
          </Link>

          <form className="tray-search" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="O que voce procura?"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Buscar produtos"
            />
            <button type="submit" aria-label="Buscar">
              <Search size={18} />
            </button>
          </form>

          <div className="tray-header-actions">
            <div className="tray-account">
              <button
                type="button"
                className="tray-account-button"
                onClick={() => setIsAccountOpen((prev) => !prev)}
                aria-label="Abrir menu da conta"
              >
                <User size={20} />
                <span className="tray-account-label">
                  <span>{isAuthenticated ? 'Minha Conta' : 'Entre ou Cadastre-se'}</span>
                  <strong>{isAuthenticated ? accountLabel : 'Acesse sua conta'}</strong>
                </span>
                <ChevronDown size={16} />
              </button>

              {isAccountOpen && (
                <div className="tray-account-dropdown">
                  {isAuthenticated ? (
                    <>
                      <Link to="/account" onClick={closeMenus}>
                        <User size={15} />
                        Minha Conta
                      </Link>
                      <Link to="/orders" onClick={closeMenus}>
                        <Package size={15} />
                        Meus Pedidos
                      </Link>
                      {profile?.role === 'admin' && (
                        <Link to="/dashboard" onClick={closeMenus}>
                          <Settings size={15} />
                          Painel Admin
                        </Link>
                      )}
                      <button type="button" onClick={handleLogout}>
                        <LogOut size={15} />
                        Sair
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={closeMenus}>
                        Entrar
                      </Link>
                      <Link to="/register" onClick={closeMenus}>
                        Cadastre-se
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <Link to="/cart" className="tray-cart" onClick={closeMenus}>
              <span className="tray-cart-icon">
                <ShoppingCart size={20} />
                <em>{totalItems}</em>
              </span>
              <span className="tray-cart-text">
                <small>Meus Itens ({totalItems})</small>
                <strong>{formatCurrency(totalPrice)}</strong>
              </span>
            </Link>
          </div>
        </div>

        <div className="tray-nav-wrap">
          <div className="container">
            <nav className="tray-nav" aria-label="Menu principal">
              <ul>
                {headerMenu.map((item) => (
                  <li key={item.label} className={item.submenu ? 'has-submenu' : ''}>
                    <Link to={item.to} onClick={closeMenus}>
                      <span>{item.label}</span>
                      {item.submenu && <ChevronDown size={14} />}
                    </Link>

                    {item.submenu && (
                      <div className="tray-submenu">
                        <ul>
                          {item.submenu.map((subItem) => (
                            <li key={subItem.label}>
                              <Link to={subItem.to} onClick={closeMenus}>
                                {subItem.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <div className={`tray-mobile-overlay ${isMobileOpen ? 'is-open' : ''}`} onClick={closeMenus} />

      <aside className={`tray-mobile-drawer ${isMobileOpen ? 'is-open' : ''}`} aria-hidden={!isMobileOpen}>
        <div className="tray-mobile-header">
          <Link to="/" className="tray-mobile-logo" onClick={closeMenus}>
            <img
              src={logoUrl}
              alt="Pneus Preçojusto"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          </Link>
          <p>Ola! Seja bem-vindo.</p>
        </div>

        <form className="tray-mobile-search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Buscar produtos"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button type="submit" aria-label="Buscar">
            <Search size={17} />
          </button>
        </form>

        <div className="tray-mobile-auth">
          {isAuthenticated ? (
            <>
              <Link to="/account" onClick={closeMenus}>
                Minha Conta
              </Link>
              <button type="button" onClick={handleLogout}>
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenus}>
                Login
              </Link>
              <Link to="/register" onClick={closeMenus}>
                Cadastre-se
              </Link>
            </>
          )}
        </div>

        <nav className="tray-mobile-nav" aria-label="Menu mobile">
          <ul>
            {mobileQuickAccess.map((item) => (
              <li key={item.label}>
                <Link to={item.to} onClick={closeMenus}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="tray-mobile-footer">
          <p>
            <strong>Precisa de ajuda?</strong>
          </p>
          <a href={`https://wa.me/${normalizedWhatsapp}`} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <Link to="/orders" onClick={closeMenus}>
            Meus Pedidos
          </Link>
        </div>
      </aside>
    </>
  );
}
