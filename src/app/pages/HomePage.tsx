import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Eye,
  ChevronDown,
  Shield,
  Truck,
  CreditCard,
  Award,
  Star,
} from 'lucide-react';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import { useProductsStore, type Product } from '../stores/products';
import { useCartStore } from '../stores/cart';
import { useSiteConfigStore } from '../stores/siteConfig';
import { TireMarquee } from '../components/TireMarquee';

const categoryLabels: Record<string, string> = {
  passeio: 'Automóveis',
  suv: 'SUV e 4x4',
  caminhonete: 'Caminhonetes',
  van: 'Vans',
  moto: 'Motos',
};

const featureIconMap: Record<string, JSX.Element> = {
  Shield: <Shield size={18} />,
  Truck: <Truck size={18} />,
  CreditCard: <CreditCard size={18} />,
  Award: <Award size={18} />,
};

const ensureFontLoaded = (font: string) => {
  const id = `font-${font.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
};

export function HomePage() {
  const navigate = useNavigate();
  const { config: siteConfig } = useSiteConfigStore();
  const { products, loading, error, fetchProducts, getFeaturedProducts } = useProductsStore();
  const { addItem } = useCartStore();

  const heroBanner = `${import.meta.env.BASE_URL}banner-topo.png`;
  const middleBanner = `${import.meta.env.BASE_URL}banner-meio.png`;

  const heroImage = siteConfig.heroImage || heroBanner;
  const bannerImage = siteConfig.bannerImage || middleBanner;
  const gradientOverlay = `linear-gradient(135deg, ${siteConfig.primaryColor}e6, ${siteConfig.secondaryColor}d9)`;

  useEffect(() => {
    void fetchProducts(true);
  }, [fetchProducts]);

  useEffect(() => {
    ensureFontLoaded(siteConfig.primaryFont);
    ensureFontLoaded(siteConfig.headingFont);

    const root = document.documentElement;
    root.style.setProperty('--primary-yellow', siteConfig.primaryColor);
    root.style.setProperty('--primary-green', siteConfig.secondaryColor);
    root.style.setProperty('--accent-yellow', siteConfig.accentColor);
    root.style.setProperty('--dark-bg', siteConfig.darkBg);
    document.body.style.fontFamily = `'${siteConfig.primaryFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  }, [siteConfig]);

  const sortedProducts = useMemo(
    () => (siteConfig.autoFeatureLowStock ? [...products].sort((a, b) => a.stock - b.stock) : products),
    [products, siteConfig.autoFeatureLowStock]
  );

  const featuredProducts = siteConfig.smartRecommendations ? getFeaturedProducts(6) : getFeaturedProducts(4);
  const galleryProducts = sortedProducts.slice(0, 8);

  const productCardBase =
    siteConfig.productCardStyle === 'glass'
      ? 'bg-white/70 backdrop-blur border border-white/50 shadow-lg'
      : siteConfig.productCardStyle === 'outline'
        ? 'bg-white border border-gray-200'
        : 'bg-white shadow-sm border';

  const handleAddToCart = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product || product.stock <= 0) return;
    addItem(product);
  };

  const renderProductCard = (product: Product, compact = false) => (
    <div
      key={`gallery-${product.id}-${compact ? 'compact' : 'full'}`}
      className={`${productCardBase} rounded-xl overflow-hidden flex flex-col`}
    >
      <div className={`bg-gray-100 ${compact ? 'h-60' : 'h-80'} flex items-center justify-center overflow-hidden`}>
        <img
          src={product.image}
          alt={product.model}
          className="max-w-full max-h-full object-contain cursor-pointer"
          onClick={() => navigate(`/product/${product.id}`)}
        />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg" style={{ fontFamily: siteConfig.headingFont }}>
            {product.brand}
          </h3>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-2">{product.model}</p>
        <p className="text-gray-500 text-xs mb-5">
          {product.width}/{product.profile}R{product.diameter}
        </p>
        <div className="flex items-center justify-between mb-5 mt-auto">
          <span className="text-2xl font-extrabold text-green-600">R$ {product.price.toFixed(2)}</span>
          {product.old_price && product.old_price > product.price ? (
            <span className="text-sm text-gray-500 line-through">R$ {product.old_price.toFixed(2)}</span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleAddToCart(product.id)}
            disabled={product.stock <= 0}
            className="bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            <ShoppingCart size={14} />
            Carrinho
          </button>
          <button
            onClick={() => navigate(`/product/${product.id}`)}
            className="bg-gray-100 text-gray-800 py-2 px-3 rounded hover:bg-gray-200 text-sm flex items-center justify-center gap-2"
          >
            <Eye size={14} />
            Ver
          </button>
        </div>
      </div>
    </div>
  );

  const renderGallery = () => {
    if (galleryProducts.length === 0) {
      return <div className="text-center py-10 bg-gray-50 rounded-lg border">Nenhum produto encontrado.</div>;
    }

    if (siteConfig.galleryLayout === 'masonry') {
      return (
        <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2, 1100: 3, 1400: 4 }}>
          <Masonry gutter="16px">{galleryProducts.map((product) => renderProductCard(product, true))}</Masonry>
        </ResponsiveMasonry>
      );
    }

    if (siteConfig.galleryLayout === 'carousel') {
      return (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
          {galleryProducts.map((product) => (
            <div key={`carousel-${product.id}`} className="min-w-[240px] snap-start">
              {renderProductCard(product, true)}
            </div>
          ))}
        </div>
      );
    }

    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">{galleryProducts.map(renderProductCard)}</div>;
  };

  return (
    <div className="w-full">
      <section
        className={`relative overflow-hidden text-white ${siteConfig.layoutStyle === 'immersive' ? 'min-h-[420px]' : 'h-96'}`}
        style={
          siteConfig.layoutStyle === 'immersive'
            ? { backgroundImage: `${gradientOverlay}, url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        {siteConfig.layoutStyle !== 'immersive' && (
          <img
            src={heroImage}
            alt="Banner principal"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0" style={{ background: gradientOverlay }} />

        <div
          className={`${
            siteConfig.contentWidth === 'full' ? 'w-full max-w-screen-xl mx-auto px-6' : 'container px-4'
          } py-16 h-full flex flex-col ${siteConfig.layoutStyle === 'split' ? 'md:flex-row md:items-center md:gap-10' : ''}`}
        >
          <div
            className={`flex-1 space-y-4 ${siteConfig.layoutStyle === 'split' ? 'md:max-w-xl' : ''} ${
              siteConfig.heroAlignment === 'center' ? 'text-center' : 'text-left'
            }`}
            style={{ fontFamily: siteConfig.headingFont }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              {siteConfig.heroBadge}
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">{siteConfig.heroTitle}</h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl">{siteConfig.heroDescription}</p>
            <div className={`flex flex-wrap gap-3 ${siteConfig.heroAlignment === 'center' ? 'justify-center' : ''}`}>
              <button
                onClick={() => navigate('/products')}
                className={
                  siteConfig.ctaVariant === 'outline'
                    ? 'border border-white text-white px-6 py-3 rounded-lg font-bold hover:bg-white/10'
                    : 'bg-yellow-400 text-blue-900 px-6 py-3 rounded-lg font-bold hover:bg-yellow-300'
                }
              >
                {siteConfig.ctaButtonText}
              </button>
              <button
                onClick={() => navigate('/products')}
                className="bg-white/15 border border-white/25 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20"
              >
                Ver catálogo completo
              </button>
            </div>
          </div>

          {siteConfig.layoutStyle === 'split' && (
            <div className="flex-1 mt-8 md:mt-0">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur">
                <img
                  src={heroImage}
                  alt="Hero destaque"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <TireMarquee />

      <section className="py-24 md:py-32 bg-white">
        <div className={`${siteConfig.contentWidth === 'full' ? 'w-full max-w-screen-xl mx-auto px-6' : 'container px-4'}`}>
          <div className="flex items-center gap-3 rounded-full bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2 text-blue-800 font-semibold">
              <ChevronDown size={18} />
              Explore por filtros
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(products.map((p) => p.category))).slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  onClick={() => navigate(`/products?category=${encodeURIComponent(cat)}`)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow hover:bg-blue-100"
                >
                  {categoryLabels[cat] || cat}
                </button>
              ))}
              {Array.from(new Set(products.map((p) => p.diameter))).slice(0, 4).map((diameter) => (
                <button
                  key={`home-dia-${diameter}`}
                  onClick={() => navigate(`/products?diameter=${encodeURIComponent(diameter)}`)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow hover:bg-blue-100"
                >
                  Aro {diameter}
                </button>
              ))}
              <button
                onClick={() => navigate('/products')}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Ver todos
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-28 md:py-36 bg-gray-50">
        <div className={`${siteConfig.contentWidth === 'full' ? 'w-full max-w-screen-xl mx-auto px-6' : 'container px-4'}`}>
          <div className="flex items-center justify-between mb-24 md:mb-28 gap-4">
            <h2 className="text-4xl font-bold" style={{ fontFamily: siteConfig.headingFont }}>
              Produtos em Destaque
            </h2>
            <button onClick={() => navigate('/products')} className="text-blue-700 font-semibold hover:underline">
              Ver todos
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10">Carregando produtos...</div>
          ) : error ? (
            <div className="text-center py-10 bg-white rounded-lg border">
              <p className="mb-3 text-red-700">{error}</p>
              <button
                onClick={() => void fetchProducts(true)}
                className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg border">Nenhum destaque encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {featuredProducts.map((product) => renderProductCard(product))}
            </div>
          )}
        </div>
      </section>

      <section className="w-full bg-white border-t-[14px] border-b-[14px] border-white py-16 md:py-20">
        {bannerImage ? (
          <img
            src={bannerImage}
            alt="Banner promocional"
            className="block w-full h-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
      </section>

      <section className="py-24 md:py-32 bg-white">
        <div className={`${siteConfig.contentWidth === 'full' ? 'w-full max-w-screen-xl mx-auto px-6' : 'container px-4'}`}>
          <div className="text-center mb-20 md:mb-24">
            <h2 className="text-4xl font-bold" style={{ fontFamily: siteConfig.headingFont }}>
              {siteConfig.galleryTitle}
            </h2>
            <p className="text-gray-600 mt-3">{siteConfig.galleryDescription}</p>
          </div>

          {loading ? <div className="text-center py-10">Carregando galeria...</div> : renderGallery()}
        </div>
      </section>

      <section className="py-16 bg-gray-50 border-t">
        <div className={`${siteConfig.contentWidth === 'full' ? 'w-full max-w-screen-xl mx-auto px-6' : 'container px-4'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {siteConfig.features.map((feature, index) => (
              <div key={`${feature.title}-${index}`} className="bg-white rounded-xl border p-5 flex items-start gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
                  {featureIconMap[feature.icon] || <Star size={18} />}
                </div>
                <div>
                  <h4 className="font-semibold" style={{ fontFamily: siteConfig.headingFont }}>
                    {feature.title}
                  </h4>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
