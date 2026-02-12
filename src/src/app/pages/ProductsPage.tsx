import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Filter,
  Gauge,
  Search,
  ShoppingCart,
  Volume2,
  X,
} from 'lucide-react';
import { useProductsStore, type Product } from '../stores/products';
import { useCartStore } from '../stores/cart';
import './ProductsPage.css';

interface PriceRange {
  min: number;
  max: number | null;
  count: number;
  label: string;
}

interface ProductTechSeals {
  rollingResistance?: string;
  wetGrip?: string;
  externalNoise?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  passeio: 'Passeio',
  suv: 'Caminhonete e SUV',
  caminhonete: 'Caminhonete',
  van: 'Van e Utilitario',
  moto: 'Moto',
};

const ORDER_OPTIONS = [
  { value: 'name', label: 'Nome do Produto' },
  { value: 'price_asc', label: 'Menor Preco' },
  { value: 'price_desc', label: 'Maior Preco' },
  { value: 'featured', label: 'Destaque' },
  { value: 'newest', label: 'Lancamento' },
];

const PAGE_SIZE = 12;

function parseCsvParam(params: URLSearchParams, key: string) {
  const rawValue = params.get(key);
  if (!rawValue) return [];

  return rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueSorted(values: string[], numeric = false) {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));
  return uniqueValues.sort((left, right) => {
    if (numeric) {
      return Number(left) - Number(right);
    }
    return left.localeCompare(right, 'pt-BR');
  });
}

function countBy(products: Product[], selector: (product: Product) => string) {
  return products.reduce<Record<string, number>>((accumulator, product) => {
    const key = selector(product);
    if (!key) return accumulator;

    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function normalizeToken(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function extractEfficiencyGrade(value: string) {
  const match = value.match(/\b([A-G])\b/i);
  return match ? match[1].toUpperCase() : undefined;
}

function extractNoiseLabel(value: string) {
  const decibelMatch = value.match(/(\d{2})\s*d?b/i);
  if (decibelMatch) {
    return `${decibelMatch[1]} dB`;
  }

  return undefined;
}

function parseTechSeals(features: string[] | undefined): ProductTechSeals {
  if (!features || features.length === 0) {
    return {};
  }

  let rollingResistance: string | undefined;
  let wetGrip: string | undefined;
  let externalNoise: string | undefined;

  for (const feature of features) {
    const normalized = normalizeToken(feature);

    if (!rollingResistance && /(resist|rolamento|rolling|consumo)/.test(normalized)) {
      rollingResistance = extractEfficiencyGrade(feature);
    }

    if (!wetGrip && /(aderenc|molhad|wet|grip)/.test(normalized)) {
      wetGrip = extractEfficiencyGrade(feature);
    }

    if (!externalNoise && /(ruid|noise|db|decibel)/.test(normalized)) {
      externalNoise = extractNoiseLabel(feature);
    }
  }

  return {
    rollingResistance,
    wetGrip,
    externalNoise,
  };
}

function buildPriceRanges(products: Product[]): PriceRange[] {
  if (products.length === 0) return [];

  const prices = products
    .map((product) => Number(product.price))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((left, right) => left - right);

  if (prices.length === 0) return [];

  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];

  if (minPrice === maxPrice) {
    return [
      {
        min: Math.floor(minPrice),
        max: null,
        count: products.length,
        label: `A partir de ${formatCurrency(minPrice)}`,
      },
    ];
  }

  const slices = 6;
  const step = (maxPrice - minPrice) / slices;

  return Array.from({ length: slices }, (_, index) => {
    const min = Math.floor(minPrice + step * index);
    const max = index === slices - 1 ? null : Math.floor(minPrice + step * (index + 1));

    const count = products.filter((product) => {
      if (max === null) return product.price >= min;
      return product.price >= min && product.price <= max;
    }).length;

    let label = '';
    if (index === 0 && max !== null) {
      label = `Ate ${formatCurrency(max)}`;
    } else if (max === null) {
      label = `Acima de ${formatCurrency(min)}`;
    } else {
      label = `De ${formatCurrency(min)} a ${formatCurrency(max)}`;
    }

    return {
      min,
      max,
      count,
      label,
    };
  });
}

function sortProducts(products: Product[], order: string) {
  const sorted = [...products];

  if (order === 'name') {
    sorted.sort((left, right) => {
      const leftName = `${left.brand} ${left.model}`.trim();
      const rightName = `${right.brand} ${right.model}`.trim();
      return leftName.localeCompare(rightName, 'pt-BR');
    });
    return sorted;
  }

  if (order === 'price_asc') {
    sorted.sort((left, right) => left.price - right.price);
    return sorted;
  }

  if (order === 'price_desc') {
    sorted.sort((left, right) => right.price - left.price);
    return sorted;
  }

  if (order === 'featured') {
    sorted.sort((left, right) => {
      if (left.featured !== right.featured) {
        return Number(right.featured) - Number(left.featured);
      }
      if (left.stock !== right.stock) {
        return right.stock - left.stock;
      }
      return left.price - right.price;
    });
    return sorted;
  }

  sorted.sort((left, right) => {
    const leftDate = new Date(left.created_at).getTime();
    const rightDate = new Date(right.created_at).getTime();
    return rightDate - leftDate;
  });

  return sorted;
}

function buildVisiblePages(totalPages: number, currentPage: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 6, totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages - 1, totalPages];
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
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

  const [searchParams] = useSearchParams();
  const { brandSlug } = useParams();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');

  const navigate = useNavigate();

  const searchParamsString = searchParams.toString();

  useEffect(() => {
    void fetchProducts(true);
  }, [fetchProducts]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);

    const search = params.get('search') || '';
    const category = parseCsvParam(params, 'category');
    const brandFromRoute = brandSlug ? brandSlug.replace(/-/g, ' ') : '';
    const brandFromQuery = parseCsvParam(params, 'brand');
    const brand = brandFromQuery.length > 0 ? brandFromQuery : brandFromRoute ? [brandFromRoute] : [];
    const width = parseCsvParam(params, 'width');
    const profile = parseCsvParam(params, 'profile');
    const diameter = parseCsvParam(params, 'diameter');
    const season = parseCsvParam(params, 'season');

    const minPriceRaw = Number(params.get('minPrice'));
    const maxPriceRaw = Number(params.get('maxPrice'));

    resetFilters();
    setFilters({
      search,
      category,
      brand,
      width,
      profile,
      diameter,
      season,
      minPrice: Number.isFinite(minPriceRaw) && minPriceRaw >= 0 ? minPriceRaw : 0,
      maxPrice: Number.isFinite(maxPriceRaw) && maxPriceRaw > 0 ? maxPriceRaw : 100000,
      runflat: null,
      featured: null,
    });
  }, [brandSlug, resetFilters, searchParamsString, setFilters]);

  useEffect(() => {
    setSearchDraft(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    document.body.style.overflow = isMobileFiltersOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileFiltersOpen]);

  const categories = useMemo(() => uniqueSorted(products.map((product) => product.category)), [products]);
  const brands = useMemo(() => uniqueSorted(products.map((product) => product.brand)), [products]);
  const widths = useMemo(() => uniqueSorted(products.map((product) => product.width), true), [products]);
  const profiles = useMemo(() => uniqueSorted(products.map((product) => product.profile), true), [products]);
  const diameters = useMemo(() => uniqueSorted(products.map((product) => product.diameter), true), [products]);
  const seasons = useMemo(() => uniqueSorted(products.map((product) => product.season)), [products]);

  const brandCount = useMemo(() => countBy(products, (product) => product.brand), [products]);
  const widthCount = useMemo(() => countBy(products, (product) => product.width), [products]);
  const profileCount = useMemo(() => countBy(products, (product) => product.profile), [products]);
  const diameterCount = useMemo(() => countBy(products, (product) => product.diameter), [products]);
  const categoryCount = useMemo(() => countBy(products, (product) => product.category), [products]);
  const seasonCount = useMemo(() => countBy(products, (product) => product.season), [products]);

  const priceRanges = useMemo(() => buildPriceRanges(products), [products]);

  const currentOrder = searchParams.get('order') || 'newest';
  const rawCurrentPage = Number(searchParams.get('pg') || '1');
  const currentPage = Number.isFinite(rawCurrentPage) && rawCurrentPage > 0 ? rawCurrentPage : 1;

  const sortedProducts = useMemo(
    () => sortProducts(filteredProducts, currentOrder),
    [currentOrder, filteredProducts]
  );

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedProducts.slice(start, start + PAGE_SIZE);
  }, [safePage, sortedProducts]);

  const visiblePages = useMemo(() => buildVisiblePages(totalPages, safePage), [safePage, totalPages]);

  const selectedCategory = filters.category[0];
  const selectedBrand = filters.brand[0];
  const routeBrandLabel = brandSlug ? titleCase(brandSlug.replace(/-/g, ' ')) : '';

  const breadcrumbCategoryLabel = selectedBrand
    ? titleCase(selectedBrand)
    : selectedCategory
      ? CATEGORY_LABELS[selectedCategory] || selectedCategory
      : 'Catalogo';

  const pageTitle = selectedBrand
    ? `Marcas - ${titleCase(selectedBrand)}`
    : routeBrandLabel
      ? `Marcas - ${routeBrandLabel}`
      : 'Catalogo de Produtos';

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.category.length ||
      filters.brand.length ||
      filters.width.length ||
      filters.profile.length ||
      filters.diameter.length ||
      filters.season.length ||
      filters.minPrice > 0 ||
      filters.maxPrice < 100000
  );

  const updateQuery = (updates: Record<string, string | null>, resetPage = true) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
        return;
      }
      params.set(key, value);
    });

    if (resetPage) {
      params.set('pg', '1');
    }

    const nextQuery = params.toString();
    const basePath = brandSlug ? `/marcas/${brandSlug}` : '/products';
    navigate(nextQuery ? `${basePath}?${nextQuery}` : basePath);
  };

  const toggleMultiFilter = (key: string, value: string) => {
    const currentValues = parseCsvParam(searchParams, key);
    const exists = currentValues.includes(value);
    const nextValues = exists
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    updateQuery({ [key]: nextValues.length ? nextValues.join(',') : null });
  };

  const togglePriceRange = (range: PriceRange) => {
    const currentMin = Number(searchParams.get('minPrice'));
    const currentMax = searchParams.get('maxPrice');

    const isActive =
      currentMin === range.min &&
      ((range.max === null && !currentMax) || (range.max !== null && Number(currentMax) === range.max));

    if (isActive) {
      updateQuery({ minPrice: null, maxPrice: null });
      return;
    }

    updateQuery({
      minPrice: String(range.min),
      maxPrice: range.max === null ? null : String(range.max),
    });
  };

  const applySearch = () => {
    const value = searchDraft.trim();
    updateQuery({ search: value || null });
  };

  const clearFilters = () => {
    if (brandSlug) {
      navigate(`/marcas/${brandSlug}`);
      return;
    }

    navigate('/products');
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    addItem(product);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    updateQuery({ pg: String(page) }, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentMinPrice = Number(searchParams.get('minPrice'));
  const currentMaxPriceRaw = searchParams.get('maxPrice');

  return (
    <div className="tray-catalog-page">
      <section className="tray-catalog-banner" aria-label="Banner do catalogo">
        <img src={`${import.meta.env.BASE_URL}banner-meio.png`} alt="Banner de categorias" />
      </section>

      <section className="tray-breadcrumbs">
        <div className="container tray-breadcrumbs-inner">
          <ol>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to={brandSlug ? '/marcas' : '/products'}>{brandSlug ? 'Marcas' : 'Produtos'}</Link>
            </li>
            <li>{breadcrumbCategoryLabel}</li>
          </ol>

          <div className="tray-breadcrumbs-info">
            Encontramos {filteredProducts.length} produto(s) em {totalPages} pagina(s)
          </div>
        </div>
      </section>

      <section className="tray-catalog-content container">
        <div className="tray-catalog-headline">
          <h1>{pageTitle}</h1>
          <p>Galeria no formato de vitrine com filtros laterais, ordenacao e paginação.</p>
        </div>

        <div className="tray-catalog-mobile-actions">
          <button type="button" onClick={() => setIsMobileFiltersOpen(true)}>
            <Filter size={16} />
            Filtrar
          </button>

          <label>
            Classificar por
            <select value={currentOrder} onChange={(event) => updateQuery({ order: event.target.value })}>
              {ORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          className={`tray-catalog-overlay ${isMobileFiltersOpen ? 'is-open' : ''}`}
          onClick={() => setIsMobileFiltersOpen(false)}
        />

        <aside className={`tray-catalog-sidebar ${isMobileFiltersOpen ? 'is-open' : ''}`}>
          <div className="tray-sidebar-header">
            <strong>Filtros</strong>
            <button type="button" onClick={() => setIsMobileFiltersOpen(false)} aria-label="Fechar filtros">
              <X size={16} />
            </button>
          </div>

          <div className="tray-sidebar-search">
            <label htmlFor="products-filter-search">Busca</label>
            <div className="tray-sidebar-search-control">
              <input
                id="products-filter-search"
                type="text"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applySearch();
                  }
                }}
                placeholder="Marca, modelo ou medida"
              />
              <button type="button" onClick={applySearch} aria-label="Buscar">
                <Search size={15} />
              </button>
            </div>
          </div>

          <div className="tray-sidebar-group">
            <h4>Marcas</h4>
            <ul>
              {brands.map((brand) => (
                <li key={brand}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.brand.includes(brand)}
                      onChange={() => toggleMultiFilter('brand', brand)}
                    />
                    <span>{brand}</span>
                    <em>({brandCount[brand] || 0})</em>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="tray-sidebar-group">
            <h4>Precos</h4>
            <ul>
              {priceRanges.map((range) => {
                const isActive =
                  currentMinPrice === range.min &&
                  ((range.max === null && !currentMaxPriceRaw) ||
                    (range.max !== null && Number(currentMaxPriceRaw) === range.max));

                return (
                  <li key={`${range.min}-${range.max ?? 'plus'}`}>
                    <label>
                      <input type="checkbox" checked={isActive} onChange={() => togglePriceRange(range)} />
                      <span>{range.label}</span>
                      <em>({range.count})</em>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="tray-sidebar-group">
            <h4>Categorias</h4>
            <ul>
              {categories.map((category) => (
                <li key={category}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.category.includes(category)}
                      onChange={() => toggleMultiFilter('category', category)}
                    />
                    <span>{CATEGORY_LABELS[category] || category}</span>
                    <em>({categoryCount[category] || 0})</em>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="tray-sidebar-group">
            <h4>Aro</h4>
            <ul>
              {diameters.map((diameter) => (
                <li key={diameter}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.diameter.includes(diameter)}
                      onChange={() => toggleMultiFilter('diameter', diameter)}
                    />
                    <span>{diameter}</span>
                    <em>({diameterCount[diameter] || 0})</em>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="tray-sidebar-group">
            <h4>Largura</h4>
            <ul>
              {widths.map((width) => (
                <li key={width}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.width.includes(width)}
                      onChange={() => toggleMultiFilter('width', width)}
                    />
                    <span>{width}</span>
                    <em>({widthCount[width] || 0})</em>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="tray-sidebar-group">
            <h4>Perfil</h4>
            <ul>
              {profiles.map((profile) => (
                <li key={profile}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.profile.includes(profile)}
                      onChange={() => toggleMultiFilter('profile', profile)}
                    />
                    <span>{profile}</span>
                    <em>({profileCount[profile] || 0})</em>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {seasons.length > 0 && (
            <div className="tray-sidebar-group">
              <h4>Sazonalidade</h4>
              <ul>
                {seasons.map((season) => (
                  <li key={season}>
                    <label>
                      <input
                        type="checkbox"
                        checked={filters.season.includes(season)}
                        onChange={() => toggleMultiFilter('season', season)}
                      />
                      <span>{season}</span>
                      <em>({seasonCount[season] || 0})</em>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="tray-sidebar-actions">
            <button type="button" className="secondary" onClick={clearFilters}>
              Limpar
            </button>
            <button type="button" onClick={() => setIsMobileFiltersOpen(false)}>
              Filtrar
            </button>
          </div>
        </aside>

        <div className="tray-catalog-main">
          <div className="tray-catalog-toolbar">
            <span>
              Resultado: {filteredProducts.length} produto(s) em {totalPages} pagina(s)
            </span>

            <label>
              Classificar por
              <select value={currentOrder} onChange={(event) => updateQuery({ order: event.target.value })}>
                {ORDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="tray-state-card">Carregando produtos...</div>
          ) : error ? (
            <div className="tray-state-card error">
              <p>{error}</p>
              <button type="button" onClick={() => void fetchProducts(true)}>
                Tentar novamente
              </button>
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="tray-state-card">
              <p>Nenhum produto encontrado.</p>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters}>
                  Ver catalogo completo
                </button>
              )}
            </div>
          ) : (
            <>
              <ul className="tray-catalog-grid">
                {paginatedProducts.map((product) => {
                  const installmentTotal =
                    product.old_price && product.old_price > product.price
                      ? product.old_price
                      : Number((product.price * 1.136).toFixed(2));
                  const installmentValue = installmentTotal / 12;
                  const techSeals = parseTechSeals(product.features);

                  return (
                    <li key={product.id} className="tray-product-card-wrapper">
                      <article className="tray-product-card">
                        <div className="tray-product-tags">
                          {product.featured && <span className="tag-new">Novo</span>}
                          {product.stock > 0 && product.stock <= 3 && (
                            <span className="tag-hot">Ultimas unidades</span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="tray-product-image"
                          onClick={() => navigate(`/product/${product.id}`)}
                          aria-label={`Abrir produto ${product.brand} ${product.model}`}
                        >
                          <img src={product.image} alt={`${product.brand} ${product.model}`} />
                          <span>DETALHES</span>
                        </button>

                        {(techSeals.rollingResistance || techSeals.wetGrip || techSeals.externalNoise) && (
                          <div className="tray-product-tech-seals">
                            {techSeals.rollingResistance && (
                              <span>
                                <Gauge size={14} />
                                {techSeals.rollingResistance}
                              </span>
                            )}
                            {techSeals.wetGrip && (
                              <span>
                                <CloudRain size={14} />
                                {techSeals.wetGrip}
                              </span>
                            )}
                            {techSeals.externalNoise && (
                              <span>
                                <Volume2 size={14} />
                                {techSeals.externalNoise}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="tray-product-seals">
                          <span>Aro {product.diameter}</span>
                          <span>{product.width}/{product.profile}</span>
                          <span>{product.speed_rating || 'Sem indice'}</span>
                        </div>

                        <div className="tray-product-info">
                          <h3>{product.brand} {product.model}</h3>

                          <div className="tray-product-price">
                            <strong>{formatCurrency(product.price)}</strong>
                            <small>a vista com desconto PIX ou</small>
                            <p>
                              <span>{formatCurrency(installmentTotal)}</span> em ate 12x de{' '}
                              <span>{formatCurrency(installmentValue)}</span> sem juros
                            </p>
                          </div>

                          <div className="tray-product-actions">
                            <button
                              type="button"
                              className="detail"
                              onClick={() => navigate(`/product/${product.id}`)}
                            >
                              Ver Produto
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product)}
                              disabled={product.stock <= 0}
                            >
                              <ShoppingCart size={14} />
                              {product.stock > 0 ? 'Adicionar' : 'Esgotado'}
                            </button>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>

              <div className="tray-pagination">
                <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage <= 1}>
                  <ChevronLeft size={15} />
                  Anterior
                </button>

                <div className="tray-pagination-pages">
                  {visiblePages.map((page) => (
                    <button
                      type="button"
                      key={page}
                      className={page === safePage ? 'is-active' : ''}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage >= totalPages}>
                  Proxima
                  <ChevronRight size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
