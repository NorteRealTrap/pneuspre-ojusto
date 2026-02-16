import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Search, ShieldCheck, Truck } from 'lucide-react';
import { useProductsStore, type Product } from '../stores/products';
import { useCartStore } from '../stores/cart';
import { useSiteConfigStore } from '../stores/siteConfig';
import { TireMarquee } from '../components/TireMarquee';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import './HomePage.css';

const sortNumericText = (a: string, b: string) => {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    return na - nb;
  }
  return a.localeCompare(b);
};

const measurePlaceholderValue = '__placeholder__';
const maxShowcaseProducts = 8;

const mergeUniqueProducts = (groups: Product[][], limit = maxShowcaseProducts) => {
  const merged: Product[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const product of group) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      merged.push(product);
      if (merged.length >= limit) return merged;
    }
  }

  return merged;
};

const interleaveUniqueProducts = (primary: Product[], secondary: Product[]) => {
  const interleaved: Product[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(primary.length, secondary.length);

  for (let index = 0; index < maxLen; index += 1) {
    const primaryItem = primary[index];
    if (primaryItem && !seen.has(primaryItem.id)) {
      seen.add(primaryItem.id);
      interleaved.push(primaryItem);
    }

    const secondaryItem = secondary[index];
    if (secondaryItem && !seen.has(secondaryItem.id)) {
      seen.add(secondaryItem.id);
      interleaved.push(secondaryItem);
    }
  }

  return interleaved;
};

const buildShowcaseSections = (
  products: Product[],
  topSellerProductIds: string[],
  highlightProductIds: string[],
  autoMergeShowcaseSections: boolean
) => {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const selectedTopSellerProducts = (topSellerProductIds || [])
    .map((id) => productsById.get(id))
    .filter((product): product is Product => Boolean(product));
  const selectedHighlightProducts = (highlightProductIds || [])
    .map((id) => productsById.get(id))
    .filter((product): product is Product => Boolean(product));
  const featuredProducts = products.filter((item) => item.featured);
  const sortedByStock = [...products].sort((a, b) => b.stock - a.stock);
  const sortedByPrice = [...products].sort((a, b) => b.price - a.price);
  const interleavedFromConfig = interleaveUniqueProducts(selectedTopSellerProducts, selectedHighlightProducts);
  const reverseInterleavedFromConfig = interleaveUniqueProducts(
    selectedHighlightProducts,
    selectedTopSellerProducts
  );

  const topSellerPool = mergeUniqueProducts(
    autoMergeShowcaseSections
      ? [interleavedFromConfig, selectedTopSellerProducts, selectedHighlightProducts, featuredProducts, sortedByStock, sortedByPrice]
      : [selectedTopSellerProducts, featuredProducts, sortedByStock, sortedByPrice],
    products.length
  );

  const highlightPool = mergeUniqueProducts(
    autoMergeShowcaseSections
      ? [reverseInterleavedFromConfig, selectedHighlightProducts, selectedTopSellerProducts, featuredProducts, sortedByPrice, sortedByStock]
      : [selectedHighlightProducts, featuredProducts, sortedByPrice, sortedByStock],
    products.length
  );

  const topSellerProducts = topSellerPool.slice(0, maxShowcaseProducts);
  const highlightProducts = highlightPool.slice(0, maxShowcaseProducts);

  return { topSellerProducts, highlightProducts };
};

export function HomePage() {
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { config, loadConfig } = useSiteConfigStore();
  const { products, loading, error, fetchProducts } = useProductsStore();

  const [width, setWidth] = useState('');
  const [profile, setProfile] = useState('');
  const [diameter, setDiameter] = useState('');

  const heroBanner = `${import.meta.env.BASE_URL}banner-topo.png`;
  const middleBanner = `${import.meta.env.BASE_URL}banner-meio.png`;
  const middleBannerTarget = '/frete-e-entrega';
  const homeClassName = [
    'pg-home',
    `layout-${config.layoutStyle}`,
    `cards-${config.productCardStyle}`,
    `gallery-${config.galleryLayout}`,
    `content-${config.contentWidth}`,
    `hero-${config.heroAlignment}`,
  ].join(' ');
  const homeThemeStyle: CSSProperties = {
    ['--pg-primary' as string]: config.primaryColor || '#009933',
    ['--pg-accent' as string]: config.accentColor || '#ffe500',
    ['--pg-secondary' as string]: config.secondaryColor || '#1e1e1e',
  };

  useEffect(() => {
    void fetchProducts(true);
  }, [fetchProducts]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const widths = useMemo(
    () =>
      Array.from(
        new Set(products.map((item) => String(item.width || '').trim()).filter(Boolean))
      ).sort(sortNumericText),
    [products]
  );

  const profiles = useMemo(
    () =>
      Array.from(
        new Set(products.map((item) => String(item.profile || '').trim()).filter(Boolean))
      ).sort(sortNumericText),
    [products]
  );

  const diameters = useMemo(
    () =>
      Array.from(
        new Set(products.map((item) => String(item.diameter || '').trim()).filter(Boolean))
      ).sort(sortNumericText),
    [products]
  );

  const showcaseSections = useMemo(
    () =>
      buildShowcaseSections(
        products,
        config.topSellerProductIds || [],
        config.highlightProductIds || [],
        config.autoMergeShowcaseSections
      ),
    [config.autoMergeShowcaseSections, config.highlightProductIds, config.topSellerProductIds, products]
  );
  const topSellerProducts = showcaseSections.topSellerProducts;
  const highlightProducts = showcaseSections.highlightProducts;

  const onMeasureSearch = () => {
    const params = new URLSearchParams();

    if (width) params.set('width', width);
    if (profile) params.set('profile', profile);
    if (diameter) params.set('diameter', diameter);

    navigate(params.toString() ? `/products?${params.toString()}` : '/products');
  };

  const renderProductCard = (product: Product) => {
    return (
      <article key={product.id} className="pg-home-product-card">
        <button
          type="button"
          className="pg-home-product-image"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          <img src={product.image} alt={`${product.brand} ${product.model}`} loading="lazy" />
        </button>

        <div className="pg-home-product-body">
          <h3>{`${product.brand} ${product.model}`}</h3>
          <p className="pg-home-product-size">
            {product.width}/{product.profile} R{product.diameter}
          </p>

          <div className="pg-home-product-price-wrap">
            <strong>
              {product.price.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </strong>
            <small>
              em ate 12x de{' '}
              {(product.price / 12).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </small>
          </div>

          <div className="pg-home-product-actions">
            <button type="button" onClick={() => navigate(`/product/${product.id}`)}>
              Detalhes
            </button>
            <button type="button" onClick={() => addItem(product)} disabled={product.stock <= 0}>
              {product.stock > 0 ? 'Comprar' : 'Esgotado'}
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className={homeClassName} style={homeThemeStyle}>
      <section className="pg-home-hero">
        <img src={config.heroImage || heroBanner} alt="Banner principal" />
        {config.bannerOverlay ? <div className="pg-home-hero-overlay" /> : null}

        <div className="container pg-home-hero-content">
          <span>{config.heroBadge}</span>
          <h1>{config.heroTitle}</h1>
          <p>{config.heroDescription}</p>
          <div>
            <button
              type="button"
              className="pg-home-hero-primary-button"
              onClick={() => navigate('/products')}
            >
              Ver catalogo
            </button>
          </div>
        </div>
      </section>

      <section className="pg-home-measure-search">
        <div className="container pg-home-measure-grid">
          <div className="pg-home-measure-copy">
            <p>
              BUSQUE <strong>POR MEDIDA</strong>
            </p>
            <span>Verifique a medida na lateral do seu pneu.</span>
          </div>

          <div className="pg-home-measure-form">
            <label>
              Largura
              <Select value={width || measurePlaceholderValue} onValueChange={(value) => setWidth(value === measurePlaceholderValue ? '' : value)}>
                <SelectTrigger className="pg-home-measure-select-trigger">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent side="bottom" sideOffset={6} avoidCollisions={false} className="pg-home-measure-select-content">
                  <SelectItem value={measurePlaceholderValue}>Selecione</SelectItem>
                  {widths.map((value) => (
                    <SelectItem key={`w-${value}`} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label>
              Perfil
              <Select value={profile || measurePlaceholderValue} onValueChange={(value) => setProfile(value === measurePlaceholderValue ? '' : value)}>
                <SelectTrigger className="pg-home-measure-select-trigger">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent side="bottom" sideOffset={6} avoidCollisions={false} className="pg-home-measure-select-content">
                  <SelectItem value={measurePlaceholderValue}>Selecione</SelectItem>
                  {profiles.map((value) => (
                    <SelectItem key={`p-${value}`} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label>
              Aro
              <Select value={diameter || measurePlaceholderValue} onValueChange={(value) => setDiameter(value === measurePlaceholderValue ? '' : value)}>
                <SelectTrigger className="pg-home-measure-select-trigger">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent side="bottom" sideOffset={6} avoidCollisions={false} className="pg-home-measure-select-content">
                  <SelectItem value={measurePlaceholderValue}>Selecione</SelectItem>
                  {diameters.map((value) => (
                    <SelectItem key={`d-${value}`} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <button type="button" className="pg-home-measure-button" onClick={onMeasureSearch}>
              <Search size={16} />
              Buscar
            </button>
          </div>
        </div>
      </section>

      <section className="pg-home-products-section">
        <div className="container">
          <header className="pg-home-section-header">
            <h2>
              <span>Produtos</span> Mais Vendidos
            </h2>
            <button type="button" onClick={() => navigate('/products')}>
              Ver todos
            </button>
          </header>

          {loading ? (
            <div className="pg-home-placeholder">Carregando produtos...</div>
          ) : error ? (
            <div className="pg-home-placeholder error">{error}</div>
          ) : topSellerProducts.length === 0 ? (
            <div className="pg-home-placeholder">Nenhum produto encontrado.</div>
          ) : (
            <div className="pg-home-products-grid">
              {topSellerProducts.map((product) => renderProductCard(product))}
            </div>
          )}
        </div>
      </section>

      <section className="pg-home-middle-banner">
        <button
          type="button"
          className="pg-home-middle-banner-link"
          onClick={() => navigate(middleBannerTarget)}
          aria-label="Ver detalhes da promocao"
        >
          <img
            src={config.bannerImage || middleBanner}
            alt="Banner promocional"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </button>
      </section>

      <section className="pg-home-products-section is-highlight">
        <div className="container">
          <header className="pg-home-section-header">
            <h2>
              <span>Produtos</span> Destaque
            </h2>
            <button type="button" onClick={() => navigate('/products')}>
              Ver todos
            </button>
          </header>

          {loading ? (
            <div className="pg-home-placeholder">Carregando produtos...</div>
          ) : error ? (
            <div className="pg-home-placeholder error">{error}</div>
          ) : highlightProducts.length === 0 ? (
            <div className="pg-home-placeholder">Nenhum produto encontrado.</div>
          ) : (
            <div className="pg-home-products-grid">
              {highlightProducts.map((product) => renderProductCard(product))}
            </div>
          )}
        </div>
      </section>

      <TireMarquee />

      <section className="pg-home-benefits">
        <div className="container pg-home-benefits-grid">
          <article>
            <Truck size={18} />
            <h4>Entrega Garantida</h4>
            <p>Logistica nacional com rastreio e previsao real de prazo.</p>
          </article>
          <article>
            <CreditCard size={18} />
            <h4>Pagamento Facilitado</h4>
            <p>PIX, boleto e cartao em ate 12x sem juros.</p>
          </article>
          <article>
            <ShieldCheck size={18} />
            <h4>Compra Segura</h4>
            <p>Protecao de dados e validacoes de seguranca no checkout.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
