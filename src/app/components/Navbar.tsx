import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  User,
  Search,
  Menu,
  X,
  Heart,
  LogOut,
  Settings,
  Package,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { useProductsStore } from '../stores/products';
import './Navbar.css';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

  const { isAuthenticated, user, profile, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const { products, fetchProducts } = useProductsStore();
  const navigate = useNavigate();

  const totalItems = getTotalItems();

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products]
  );
  const models = useMemo(
    () => Array.from(new Set(products.map((p) => p.model))).sort(),
    [products]
  );
  const diameters = useMemo(
    () => Array.from(new Set(products.map((p) => p.diameter))).sort((a, b) => Number(a) - Number(b)),
    [products]
  );

  const navigateWithFilters = (filters: Record<string, string>) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      const normalized = value.trim();
      if (normalized) params.set(key, normalized);
    });

    const query = params.toString();
    navigate(query ? `/products?${query}` : '/products');
    setShowMegaMenu(false);
    setIsMobileMenuOpen(false);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    navigateWithFilters({ search: searchQuery });
    setSearchQuery('');
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-top">
          <div className="container navbar-container">
            <Link to="/" className="navbar-logo">
              <img
                src={logoUrl}
                alt="Pneus.PrecoJusto"
                className="logo-image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="logo-text hidden">Pneus.PrecoJusto</span>
            </Link>

            <form onSubmit={handleSearch} className="navbar-search">
              <input
                type="text"
                placeholder="Buscar pneus por medida, marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-button">
                <Search size={20} />
              </button>
            </form>

            <div className="navbar-actions">
              <div className="user-menu-wrapper">
                <button
                  className="navbar-icon-btn"
                  onClick={() => setShowMegaMenu((prev) => !prev)}
                  title="Menu de produtos"
                >
                  <Menu size={24} />
                  <ChevronDown size={14} />
                </button>
                {showMegaMenu && (
                  <div className="mega-dropdown">
                    <div className="mega-column">
                      <h4>Categorias</h4>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          className="mega-item"
                          onClick={() => navigateWithFilters({ category: cat })}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="mega-column">
                      <h4>Modelos</h4>
                      <div className="mega-scroll">
                        {models.map((model) => (
                          <button
                            key={model}
                            className="mega-item"
                            onClick={() => navigateWithFilters({ search: model })}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mega-column">
                      <h4>Diâmetros</h4>
                      {diameters.map((diameter) => (
                        <button
                          key={diameter}
                          className="mega-item"
                          onClick={() => navigateWithFilters({ diameter })}
                        >
                          Aro {diameter}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isAuthenticated && (
                <Link to="/wishlist" className="navbar-icon-btn" title="Favoritos">
                  <Heart size={24} />
                </Link>
              )}

              <Link to="/cart" className="navbar-icon-btn cart-btn" title="Carrinho">
                <ShoppingCart size={24} />
                {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
              </Link>

              <div className="user-menu-wrapper">
                <button
                  className="navbar-icon-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  title={isAuthenticated ? 'Minha Conta' : 'Entrar'}
                >
                  <User size={24} />
                </button>

                {isUserMenuOpen && (
                  <div className="user-dropdown">
                    {isAuthenticated ? (
                      <>
                        <div className="user-info">
                          <p className="user-name">{profile?.name || user?.email}</p>
                          <p className="user-email">{user?.email}</p>
                        </div>
                        <div className="dropdown-divider" />
                        <Link
                          to="/account"
                          className="dropdown-item"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User size={16} />
                          Minha Conta
                        </Link>
                        <Link
                          to="/orders"
                          className="dropdown-item"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Package size={16} />
                          Meus Pedidos
                        </Link>
                        {profile?.role === 'admin' && (
                          <Link
                            to="/dashboard"
                            className="dropdown-item"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Settings size={16} />
                            Painel Admin
                          </Link>
                        )}
                        <div className="dropdown-divider" />
                        <button className="dropdown-item" onClick={handleLogout}>
                          <LogOut size={16} />
                          Sair
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/login"
                          className="dropdown-item"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Entrar
                        </Link>
                        <Link
                          to="/register"
                          className="dropdown-item"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Criar Conta
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                className="navbar-icon-btn mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-content">
            <form onSubmit={handleSearch} className="mobile-search">
              <input
                type="text"
                placeholder="Buscar pneus por medida, marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-button">
                <Search size={20} />
              </button>
            </form>

            <div className="mobile-categories">
              <h3>Menu de Produtos</h3>
              <ul>
                <li>
                  <Link to="/products" onClick={() => setIsMobileMenuOpen(false)}>
                    Catalogo Completo
                  </Link>
                </li>
                {categories.map((category) => (
                  <li key={category}>
                    <Link
                      to="/products"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateWithFilters({ category });
                      }}
                    >
                      {category}
                    </Link>
                  </li>
                ))}
                {diameters.map((diameter) => (
                  <li key={`dia-${diameter}`}>
                    <Link
                      to="/products"
                      onClick={(e) => {
                        e.preventDefault();
                        navigateWithFilters({ diameter });
                      }}
                    >
                      Aro {diameter}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
