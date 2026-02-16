import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  X,
} from 'lucide-react';
import { useProductsStore } from '../stores/products';
import type { Product } from '../stores/products';
import { useCartStore } from '../stores/cart';
import { useSiteConfigStore } from '../stores/siteConfig';
import './ProductsPage.css';

const PRODUCTS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price-asc', label: 'Menor preco' },
  { value: 'price-desc', label: 'Maior preco' },
  { value: 'newest', label: 'Mais recentes' },
  { value: 'stock-desc', label: 'Maior estoque' },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  passeio: 'Passeio',
  suv: 'SUV',
  caminhonete: 'Caminhonete',
  van: 'Van e Utilitario',
  moto: 'Moto',
  agricola: 'Agricola',
  otr: 'OTR',
  caminhao: 'Caminhao',
  onibus: 'Onibus',
};

const BRAND_LOGOS: Record<string, string> = {
  michelin: 'https://commons.wikimedia.org/wiki/Special:FilePath/Michelin_Wordmark.svg',
  pirelli: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pirelli%20-%20logo%20full%20%28Italy%2C%201997%29.svg',
  goodyear: 'https://commons.wikimedia.org/wiki/Special:FilePath/Goodyear_logo.png',
  continental: 'https://commons.wikimedia.org/wiki/Special:FilePath/Continental_logo.svg',
  bridgestone: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bridgestone_logo_full_color.svg',
  yokohama: 'https://commons.wikimedia.org/wiki/Special:FilePath/Yokohama_Tire_new_logo.svg',
};

function parseCsvParam(value: string | null) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeCsvParam(values: string[]) {
  return values.join(',');
}

function sortNumericText(a: string, b: string) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b);
}

function getBrandLogoUrl(brand: string) {
  return BRAND_LOGOS[brand.trim().toLowerCase()] || '';
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveBrandNames(tokens: string[], availableBrands: string[]) {
  if (tokens.length === 0) return [];
  const mapByNormalized = new Map(availableBrands.map((brand) => [brand.toLowerCase(), brand]));
  const mapBySlug = new Map(availableBrands.map((brand) => [slugify(brand), brand]));
  return Array.from(
    new Set(
      tokens.map((token) => {
        const normalized = token.toLowerCase();
        return mapByNormalized.get(normalized) || mapBySlug.get(slugify(token)) || token;
      })
    )
  );
}

function buildRouteFilters(pathname: string) {
  const routeFilters: {
    category: string[];
    brand: string[];
    diameter: string[];
    search: string;
  } = {
    category: [],
    brand: [],
    diameter: [],
    search: '',
  };

  if (pathname === '/kit-de-pneus' || pathname === '/passageiros') {
    routeFilters.search = 'kit';
  } else if (pathname.startsWith('/caminhonete-e-suv/suv')) {
    routeFilters.category = ['suv'];
  } else if (pathname.startsWith('/caminhonete-e-suv/caminhonete')) {
    routeFilters.category = ['caminhonete'];
  } else if (pathname === '/van-e-utilitario') {
    routeFilters.category = ['van'];
  } else if (pathname === '/moto' || pathname.startsWith('/moto/')) {
    routeFilters.category = ['moto'];
  } else if (pathname === '/agricola-e-otr' || pathname.startsWith('/agricola-e-otr/')) {
    if (pathname.endsWith('/otr')) {
      routeFilters.category = ['otr'];
    } else if (pathname.endsWith('/agricola')) {
      routeFilters.category = ['agricola'];
    } else {
      routeFilters.category = ['agricola', 'otr'];
    }
  } else if (pathname === '/caminhao-e-onibus') {
    routeFilters.category = ['caminhao', 'onibus'];
  } else if (pathname === '/shampoo-automotivo') {
    routeFilters.search = 'shampoo';
  } else if (pathname === '/camaras-de-ar' || pathname.startsWith('/camaras-de-ar/')) {
    routeFilters.search = 'camara';
    const aroMatch = pathname.match(/aro-(\d+)/);
    if (aroMatch) routeFilters.diameter = [aroMatch[1]];
  } else if (pathname.startsWith('/marcas/')) {
    const slug = pathname.split('/')[2];
    if (slug) routeFilters.brand = [decodeURIComponent(slug)];
  }

  return routeFilters;
}

function getCatalogTitle(pathname: string, filters: { category: string[]; brand: string[]; search: string }) {
  if (filters.brand.length > 0) return `Catalogo da marca ${filters.brand.join(', ')}`;
  if (filters.category.length > 0) {
    const first = filters.category[0];
    return `Catalogo ${CATEGORY_LABELS[first] || first}`;
  }
  if (pathname === '/kit-de-pneus') return 'Kits de Pneus';
  if (pathname.startsWith('/camaras-de-ar')) return 'Camaras de Ar';
  if (filters.search) return `Resultados para "${filters.search}"`;
  return 'Catalogo de Produtos';
}

export function ProductsPage() {
  const {
    products,
    filteredProducts,
    filters,
    loading,
    error,
    fetchProducts,
    setFilters,
    resetFilters,
  } = useProductsStore();
  const { addItem } = useCartStore();
  const { config } = useSiteConfigStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const catalogBanner = config.bannerImage || `${import.meta.env.BASE_URL}banner-meio.png`;
  const catalogClassName = [
    'tray-catalog-page',
    `catalog-card-${config.productCardStyle}`,
    `catalog-layout-${config.galleryLayout}`,
    `catalog-content-${config.contentWidth}`,
  ].join(' ');
  const catalogThemeStyle: CSSProperties = {
    ['--catalog-primary' as string]: config.primaryColor || '#009933',
    ['--catalog-accent' as string]: config.accentColor || '#ffe500',
  };
  const brands = useMemo(
    () => Array.from(new Set(products.map((product) => product.brand))).sort((a, b) => a.localeCompare(b)),
    [products]
  );
  const widths = useMemo(
    () => Array.from(new Set(products.map((product) => product.width))).sort(sortNumericText),
    [products]
  );
  const profiles = useMemo(
    () => Array.from(new Set(products.map((product) => product.profile))).sort(sortNumericText),
    [products]
  );
  const diameters = useMemo(
    () => Array.from(new Set(products.map((product) => product.diameter))).sort(sortNumericText),
    [products]
  );

  const categoryCounts = useMemo(() => {
    const counters = new Map<string, number>();
    products.forEach((product) => {
      counters.set(product.category, (counters.get(product.category) || 0) + 1);
    });
    return counters;
  }, [products]);

  const brandCounts = useMemo(() => {
    const counters = new Map<string, number>();
    products.forEach((product) => {
      counters.set(product.brand, (counters.get(product.brand) || 0) + 1);
    });
    return counters;
  }, [products]);

  const routeFilters = useMemo(() => buildRouteFilters(location.pathname), [location.pathname]);
  const sortBy = searchParams.get('sort') || 'relevance';
  const currentPage = Math.max(1, Number(searchParams.get('page') || '1'));

  useEffect(() => {
    void fetchProducts(true);
  }, [fetchProducts]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const querySearch = params.get('search') || '';
    const queryCategories = parseCsvParam(params.get('category'));
    const queryBrands = parseCsvParam(params.get('brand'));
    const queryWidths = parseCsvParam(params.get('width'));
    const queryProfiles = parseCsvParam(params.get('profile'));
    const queryDiameters = parseCsvParam(params.get('diameter'));
    const querySeasons = parseCsvParam(params.get('season'));

    const resolvedBrands = resolveBrandNames(
      queryBrands.length > 0 ? queryBrands : routeFilters.brand,
      brands
    );

    resetFilters();
    setFilters({
      search: querySearch || routeFilters.search,
      category: queryCategories.length > 0 ? queryCategories : routeFilters.category,
      brand: resolvedBrands,
      width: queryWidths,
      profile: queryProfiles,
      diameter: queryDiameters.length > 0 ? queryDiameters : routeFilters.diameter,
      season: querySeasons,
    });
    setSearchInput(querySearch || routeFilters.search);
  }, [searchParamsString, routeFilters, brands, resetFilters, setFilters]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        list.sort((a, b) => {
          const ta = new Date(a.created_at).getTime();
          const tb = new Date(b.created_at).getTime();
          return tb - ta;
        });
        break;
      case 'stock-desc':
        list.sort((a, b) => b.stock - a.stock);
        break;
      default:
        list.sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    return list;
  }, [filteredProducts, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const from = (safePage - 1) * PRODUCTS_PER_PAGE;
    return sortedProducts.slice(from, from + PRODUCTS_PER_PAGE);
  }, [sortedProducts, safePage]);

  useEffect(() => {
    if (safePage === currentPage) return;
    const params = new URLSearchParams(searchParamsString);
    params.set('page', String(safePage));
    navigate(`/products?${params.toString()}`, { replace: true });
  }, [safePage, currentPage, searchParamsString, navigate]);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (!value) params.delete(key);
    else params.set(key, value);
    if (key !== 'page') params.delete('page');
    navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const toggleCsvParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    const list = parseCsvParam(params.get(key));
    const exists = list.includes(value);
    const updated = exists ? list.filter((item) => item !== value) : [...list, value];
    if (updated.length === 0) params.delete(key);
    else params.set(key, serializeCsvParam(updated));
    params.delete('page');
    navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const clearFilters = () => {
    navigate('/products');
    setIsMobileFiltersOpen(false);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParam('search', searchInput.trim() || null);
    setIsMobileFiltersOpen(false);
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    addItem(product);
  };

  const hasFilters =
    filters.search ||
    filters.category.length > 0 ||
    filters.brand.length > 0 ||
    filters.width.length > 0 ||
    filters.profile.length > 0 ||
    filters.diameter.length > 0 ||
    filters.season.length > 0;

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, safePage + 2);
    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) pages.push(page);
    return pages;
  }, [safePage, totalPages]);

  const catalogTitle = getCatalogTitle(location.pathname, {
    category: filters.category,
    brand: filters.brand,
    search: filters.search,
  });

  return (
    <div className={catalogClassName} style={catalogThemeStyle}>
      <section className="tray-catalog-banner">
        <img
          src={catalogBanner}
          alt="Banner do catalogo"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      </section>

      <section className="tray-breadcrumbs">
        <div className="container tray-breadcrumbs-inner">
          <ol aria-label="Breadcrumb">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/products">Catalogo</Link>
            </li>
            <li>{catalogTitle}</li>
          </ol>
          <div className="tray-breadcrumbs-info">{sortedProducts.length} produtos encontrados</div>
        </div>
      </section>

      <div
        className={`tray-catalog-overlay ${isMobileFiltersOpen ? 'is-open' : ''}`}
        onClick={() => setIsMobileFiltersOpen(false)}
        aria-hidden="true"
      />

      <section className="container tray-catalog-content">
        <header className="tray-catalog-headline">
          <h1>{catalogTitle}</h1>
          <p>Selecione medidas, categorias e marcas para encontrar o pneu ideal para sua loja.</p>
        </header>

        <div className="tray-catalog-mobile-actions">
          <button type="button" onClick={() => setIsMobileFiltersOpen(true)}>
            <Filter size={15} />
            Filtros
          </button>
          <label htmlFor="catalog-sort-mobile">
            Ordenar:
            <select
              id="catalog-sort-mobile"
              value={sortBy}
              onChange={(event) => updateParam('sort', event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <aside className={`tray-catalog-sidebar ${isMobileFiltersOpen ? 'is-open' : ''}`}>
          <div className="tray-sidebar-header">
            <strong>Filtros</strong>
            <button type="button" aria-label="Fechar filtros" onClick={() => setIsMobileFiltersOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <form className="tray-sidebar-search" onSubmit={handleSearchSubmit}>
            <label htmlFor="catalog-search-input">Busca rapida</label>
            <div className="tray-sidebar-search-control">
              <input
                id="catalog-search-input"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Marca, modelo ou medida"
              />
              <button type="submit" aria-label="Buscar no catalogo">
                <Search size={14} />
              </button>
            </div>
          </form>

          <div className="tray-sidebar-group">
            <h4>Categorias</h4>
            <ul>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <li key={`cat-${value}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.category.includes(value)}
                      onChange={() => toggleCsvParam('category', value)}
                    />
                    <span>{label}</span>
                    <em>{categoryCounts.get(value) || 0}</em>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="tray-sidebar-group">
            <h4>Marcas</h4>
            <ul>
              {brands.map((brand) => {
                const brandLogo = getBrandLogoUrl(brand);

                return (
                  <li key={`brand-${brand}`}>
                    <label>
                      <input
                        type="checkbox"
                        checked={filters.brand.includes(brand)}
                        onChange={() => toggleCsvParam('brand', brand)}
                      />
                      <span className="tray-brand-filter-item">
                        {brandLogo ? (
                          <img
                            src={brandLogo}
                            alt={`Logo ${brand}`}
                            className="tray-brand-filter-logo"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="tray-brand-filter-name">{brand}</span>
                      </span>
                      <em>{brandCounts.get(brand) || 0}</em>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="tray-sidebar-group">
            <h4>Largura</h4>
            <ul>
              {widths.map((width) => (
                <li key={`width-${width}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.width.includes(width)}
                      onChange={() => toggleCsvParam('width', width)}
                    />
                    <span>{width}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="tray-sidebar-group">
            <h4>Perfil</h4>
            <ul>
              {profiles.map((profile) => (
                <li key={`profile-${profile}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.profile.includes(profile)}
                      onChange={() => toggleCsvParam('profile', profile)}
                    />
                    <span>{profile}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="tray-sidebar-group">
            <h4>Aro</h4>
            <ul>
              {diameters.map((diameter) => (
                <li key={`diameter-${diameter}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.diameter.includes(diameter)}
                      onChange={() => toggleCsvParam('diameter', diameter)}
                    />
                    <span>Aro {diameter}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="tray-sidebar-actions">
            <button type="button" onClick={() => setIsMobileFiltersOpen(false)}>
              Aplicar
            </button>
            <button type="button" className="secondary" onClick={clearFilters}>
              Limpar
            </button>
          </div>
        </aside>

        <main className="tray-catalog-main">
          <div className="tray-catalog-toolbar">
            <span>
              Mostrando {paginatedProducts.length} de {sortedProducts.length} produtos
            </span>
            <label htmlFor="catalog-sort-desktop">
              Ordenar:
              <select
                id="catalog-sort-desktop"
                value={sortBy}
                onChange={(event) => updateParam('sort', event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="tray-state-card">
              <p>Carregando catalogo...</p>
            </div>
          ) : error ? (
            <div className="tray-state-card error">
              <p>{error}</p>
              <button type="button" onClick={() => void fetchProducts(true)}>
                Tentar novamente
              </button>
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="tray-state-card">
              <p>Nenhum produto encontrado para os filtros selecionados.</p>
              {hasFilters ? (
                <button type="button" onClick={clearFilters}>
                  Ver catalogo completo
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <ul className="tray-catalog-grid">
                {paginatedProducts.map((product) => {
                  const installmentValue = product.price / 12;
                  const pixValue = product.price * 0.88;
                  const isHot = product.stock > 0 && product.stock <= 5;

                  return (
                    <li key={product.id} className="tray-product-card">
                      <div className="tray-product-tags">
                        {product.featured ? <span className="tag-hot">Destaque</span> : null}
                        {isHot ? <span className="tag-new">Ultimas unidades</span> : null}
                      </div>

                      <button
                        type="button"
                        className="tray-product-image"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        <img
                          src={product.image}
                          alt={`${product.brand} ${product.model}`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = `${import.meta.env.BASE_URL}logo.png`;
                          }}
                        />
                        <span>Ver detalhes</span>
                      </button>

                      <div className="tray-product-tech-seals">
                        <span>Aro {product.diameter}</span>
                        {product.runflat ? <span>Runflat</span> : null}
                        {product.speed_rating ? <span>Indice {product.speed_rating}</span> : null}
                      </div>

                      <div className="tray-product-info">
                        <h3>{`${product.brand} ${product.model}`}</h3>

                        <div className="tray-product-price">
                          <strong>
                            {product.price.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </strong>
                          {product.old_price && product.old_price > product.price ? (
                            <small>
                              de{' '}
                              {product.old_price.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </small>
                          ) : null}
                          <p>
                            a vista no PIX:{' '}
                            <span>
                              {pixValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </p>
                          <p>
                            ou em 12x de{' '}
                            <span>
                              {installmentValue.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </span>
                          </p>
                        </div>

                        <div className="tray-product-seals">
                          <span>
                            <ShieldCheck size={12} />
                            Compra segura
                          </span>
                          <span>
                            <Truck size={12} />
                            Entrega garantida
                          </span>
                        </div>

                        <div className="tray-product-actions">
                          <button
                            type="button"
                            className="detail"
                            onClick={() => navigate(`/product/${product.id}`)}
                          >
                            <Eye size={13} />
                            Detalhes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            disabled={product.stock <= 0}
                          >
                            <ShoppingCart size={13} />
                            {product.stock > 0 ? 'Comprar' : 'Esgotado'}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {totalPages > 1 ? (
                <div className="tray-pagination">
                  <button
                    type="button"
                    onClick={() => updateParam('page', String(Math.max(1, safePage - 1)))}
                    disabled={safePage <= 1}
                  >
                    <ChevronLeft size={14} />
                    Anterior
                  </button>

                  <div className="tray-pagination-pages">
                    {pageNumbers.map((page) => (
                      <button
                        type="button"
                        key={`page-${page}`}
                        className={page === safePage ? 'is-active' : ''}
                        onClick={() => updateParam('page', String(page))}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => updateParam('page', String(Math.min(totalPages, safePage + 1)))}
                    disabled={safePage >= totalPages}
                  >
                    Proxima
                    <ChevronRight size={14} />
                  </button>
                </div>
              ) : null}
            </>
          )}
        </main>
      </section>
    </div>
  );
}
