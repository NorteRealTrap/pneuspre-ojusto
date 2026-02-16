import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Headphones,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { useProductsStore } from '../stores/products';
import { useSiteConfigStore } from '../stores/siteConfig';
import './Navbar.css';

interface NavChild {
  label: string;
  to: string;
}

interface NavItem {
  label: string;
  to: string;
  children?: NavChild[];
}

const FALLBACK_BRANDS = [
  'Michelin',
  'Pirelli',
  'Goodyear',
  'Bridgestone',
  'Continental',
  'Firestone',
  'Yokohama',
  'Levorin',
  'Maggion',
  'Xbri',
  'Ira Tires',
  'Roadx',
];

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildMenu(brands: string[]): NavItem[] {
  return [
    {
      label: 'KIT DE PNEUS',
      to: '/kit-de-pneus',
    },
    {
      label: 'Marcas',
      to: '/marcas',
      children: brands.map((brand) => ({
        label: brand,
        to: `/marcas/${slugify(brand)}`,
      })),
    },
    {
      label: 'Caminhonete e SUV',
      to: '/caminhonete-e-suv',
      children: [
        { label: 'Caminhonete', to: '/caminhonete-e-suv/caminhonete' },
        { label: 'SUV', to: '/caminhonete-e-suv/suv' },
      ],
    },
    {
      label: 'Van e Utilitario',
      to: '/van-e-utilitario',
    },
    {
      label: 'Moto',
      to: '/moto',
      children: [
        { label: 'Pneu Urbano', to: '/pneu-urbano' },
        { label: 'Pneu Off-Road', to: '/pneu-off-road' },
        { label: 'Pneu Trail', to: '/pneu-trail' },
        { label: 'Valvula', to: '/moto/valvula' },
      ],
    },
    {
      label: 'Caminhao e Onibus',
      to: '/caminhao-e-onibus',
    },
    {
      label: 'Agricola e OTR',
      to: '/agricola-e-otr',
      children: [
        { label: 'Agricola', to: '/agricola-e-otr/agricola' },
        { label: 'OTR', to: '/agricola-e-otr/otr' },
      ],
    },
    {
      label: 'Shampoo Automotivo',
      to: '/shampoo-automotivo',
    },
    {
      label: 'Camaras de Ar',
      to: '/camaras-de-ar',
      children: [
        { label: 'Aro 15', to: '/camaras-de-ar/aro-15' },
        { label: 'Aro 16', to: '/camaras-de-ar/aro-16' },
        { label: 'Aro 17', to: '/camaras-de-ar/aro-17' },
        { label: 'Aro 18', to: '/camaras-de-ar/aro-18' },
      ],
    },
  ];
}

export function Navbar() {
  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const { isAuthenticated, user, profile, logout } = useAuthStore();
  const { getTotalItems, getTotalPrice } = useCartStore();
  const { products, fetchProducts } = useProductsStore();
  const { config } = useSiteConfigStore();

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  const uniqueBrands = useMemo(() => {
    const fromProducts = Array.from(new Set(products.map((product) => product.brand.trim()).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b)
    );
    if (fromProducts.length > 0) return fromProducts.slice(0, 40);
    return FALLBACK_BRANDS;
  }, [products]);

  const menuItems = useMemo(() => buildMenu(uniqueBrands), [uniqueBrands]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setIsMobileOpen(false);
    setMobileExpanded(null);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const normalized = searchQuery.trim();
    if (!normalized) {
      navigate('/products');
      return;
    }

    navigate(`/products?search=${encodeURIComponent(normalized)}`);
    setSearchQuery('');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className={`pg-header-root ${isUserMenuOpen ? 'user-menu-open' : ''}`}>
      <section className="pg-topbar">
        <div className="container pg-topbar-row">
          <div className="pg-topbar-left">
            <div className="pg-topbar-highlight">
              <Truck size={15} />
              <Link to="/frete-e-entrega">Frete Gratis. Ver regras</Link>
            </div>
            <div className="pg-topbar-highlight">
              <ShieldCheck size={15} />
              <span>Entrega Garantida</span>
            </div>
            <div className="pg-topbar-highlight pg-topbar-support">
              <Headphones size={15} />
              <span>
                Precisa de ajuda?{' '}
                <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  {config.phone}
                </a>
              </span>
            </div>
          </div>
          <div className="pg-topbar-links">
            <Link to="/account">Minha Conta</Link>
            <Link to="/orders">Meus Pedidos</Link>
          </div>
        </div>
      </section>

      <section className="pg-mainbar">
        <div className="container pg-mainbar-row">
          <button
            type="button"
            className="pg-mobile-menu-button"
            aria-label={isMobileOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setIsMobileOpen((current) => !current)}
          >
            {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/" className="pg-logo" aria-label={`${config.storeName || 'Pneus PrecoJusto'} home`}>
            <img
              src={logoUrl}
              alt={config.storeName || 'Pneus PrecoJusto'}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
                const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'inline-block';
              }}
            />
            <span className="pg-logo-fallback">{config.storeName || 'Pneus PrecoJusto'}</span>
          </Link>

          <form className="pg-search" onSubmit={submitSearch}>
            <input
              type="search"
              placeholder="O que voce procura?"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Buscar produtos"
            />
            <button type="submit" aria-label="Buscar">
              <Search size={18} />
            </button>
          </form>

          <div className="pg-main-actions">
            <Link to="/cart" className="pg-cart" aria-label="Carrinho de compras">
              <div className="pg-cart-icon">
                <ShoppingCart size={20} />
                {totalItems > 0 && <span className="pg-cart-badge">{totalItems}</span>}
              </div>
              <div className="pg-cart-info">
                <small>MEUS ITENS ({totalItems})</small>
                <strong>
                  {totalPrice.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </strong>
              </div>
            </Link>

            <div className={`pg-user-menu-wrapper ${isUserMenuOpen ? 'is-open' : ''}`} ref={userMenuRef}>
              <button
                type="button"
                className="pg-user-menu-trigger"
                onClick={() => setIsUserMenuOpen((current) => !current)}
                aria-label="Menu do usuario"
              >
                <User size={20} />
              </button>

              {isUserMenuOpen && (
                <div className="pg-user-menu">
                  {isAuthenticated ? (
                    <>
                      <div className="pg-user-menu-header">
                        <strong>{profile?.name || 'Minha Conta'}</strong>
                        <small>{user?.email}</small>
                      </div>
                      <Link to="/account" className="pg-user-menu-mobile-only">
                        Minha Conta
                      </Link>
                      <Link to="/orders" className="pg-user-menu-mobile-only">
                        Meus Pedidos
                      </Link>
                      {profile?.role === 'admin' && <Link to="/dashboard">Painel Admin</Link>}
                      <button type="button" onClick={handleLogout}>
                        <LogOut size={16} />
                        Sair
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login">Entrar</Link>
                      <Link to="/register">Criar Conta</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="pg-nav-desktop-wrapper">
        <div className="container">
          <nav className="pg-nav-desktop" aria-label="Categorias principais">
            <ul>
              {menuItems.map((item) => (
                <li key={item.label} className={item.children ? 'has-children' : ''}>
                  <Link to={item.to}>
                    <span>{item.label}</span>
                    {item.children ? <ChevronDown size={14} /> : null}
                  </Link>

                  {item.children ? (
                    <div className="pg-mega-menu">
                      <ul>
                        {item.children.map((child) => (
                          <li key={`${item.label}-${child.label}`}>
                            <Link to={child.to}>{child.label}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <aside className={`pg-mobile-panel ${isMobileOpen ? 'is-open' : ''}`}>
        <div className="pg-mobile-panel-header">
          <strong>Menu</strong>
          <button type="button" onClick={() => setIsMobileOpen(false)} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <form className="pg-mobile-search" onSubmit={submitSearch}>
          <input
            type="search"
            placeholder="Buscar por medida, marca ou modelo"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button type="submit">
            <Search size={18} />
          </button>
        </form>

        <ul className="pg-mobile-nav-list">
          {menuItems.map((item) => {
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const isExpanded = mobileExpanded === item.label;

            return (
              <li key={`mobile-${item.label}`}>
                <div className="pg-mobile-nav-item-row">
                  <Link to={item.to} className="pg-mobile-nav-link">
                    {item.label}
                  </Link>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => setMobileExpanded((current) => (current === item.label ? null : item.label))}
                      aria-label={`Expandir ${item.label}`}
                    >
                      <ChevronDown size={16} className={isExpanded ? 'expanded' : ''} />
                    </button>
                  ) : null}
                </div>

                {hasChildren && isExpanded ? (
                  <ul className="pg-mobile-submenu">
                    {item.children?.map((child) => (
                      <li key={`mobile-${item.label}-${child.label}`}>
                        <Link to={child.to}>{child.label}</Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </aside>

      <div
        className={`pg-mobile-backdrop ${isMobileOpen ? 'is-visible' : ''}`}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />
    </header>
  );
}
