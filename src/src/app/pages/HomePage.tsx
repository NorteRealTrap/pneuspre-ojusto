import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Eye, ChevronDown } from 'lucide-react';
import { useProductsStore } from '../stores/products';
import { useCartStore } from '../stores/cart';
import { TireMarquee } from '../components/TireMarquee';

const categoryLabels: Record<string, string> = {
  passeio: 'Automóveis',
  suv: 'SUV e 4x4',
  caminhonete: 'Caminhonetes',
  van: 'Vans',
  moto: 'Motos',
};

export function HomePage() {
  const navigate = useNavigate();
  const { products, loading, error, fetchProducts, getFeaturedProducts } = useProductsStore();
  const { addItem } = useCartStore();

  const featuredProducts = getFeaturedProducts(4);
  const galleryProducts = products.slice(0, 8);
  const heroBanner = '/banner-topo.png';
  const middleBanner = '/banner-meio.png';

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();
  const diameters = Array.from(new Set(products.map((p) => p.diameter))).sort((a, b) => Number(a) - Number(b));

  useEffect(() => {
    void fetchProducts(true);
  }, [fetchProducts]);

  const handleAddToCart = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product || product.stock <= 0) return;
    addItem(product);
  };

  return (
    <div className="w-full">
      <section className="hero-banner-section">
        <div className="hero-banner-container">
          <img
            src={heroBanner}
            alt="Banner principal - Pneus Preçojusto"
            className="hero-banner-image"
            loading="eager"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="hero-banner-overlay" />

          <div className="hero-banner-content">
            <div className="hero-banner-inner">
              <span className="hero-badge">Especialistas em Pneus Desde 2010</span>
              <h1 className="hero-title">Pneus Preçojusto</h1>
              <p className="hero-subtitle">
                Catálogo completo com pneus para passeio, SUV, caminhonete e vans. Compra segura e envio rápido em todo o Brasil.
              </p>
              <button
                onClick={() => navigate('/products')}
                className="hero-button"
              >
                <span>Ver Catálogo Completo</span>
                <span className="hero-button-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 rounded-2xl md:rounded-full bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2 text-blue-800 font-semibold shrink-0">
              <ChevronDown size={18} />
              Explore por Filtros
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {categories.slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  onClick={() => navigate(`/products?category=${encodeURIComponent(cat)}`)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow hover:bg-blue-100"
                >
                  {categoryLabels[cat] || cat}
                </button>
              ))}
              {diameters.slice(0, 4).map((diameter) => (
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
                Ver Todos
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-28 md:py-36 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-24 md:mb-28 gap-4">
            <h2 className="text-3xl md:text-4xl lg:text-3xl font-bold">Produtos em Destaque</h2>
            <button
              onClick={() => navigate('/products')}
              className="text-blue-700 font-semibold hover:underline"
            >
              Ver Todos
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10">Carregando Produtos...</div>
          ) : error ? (
            <div className="text-center py-10 bg-white rounded-lg border">
              <p className="mb-3 text-red-700">{error}</p>
              <button
                onClick={() => void fetchProducts(true)}
                className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
              >
                Tentar Novamente
              </button>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg border">Nenhum Destaque Encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="product-card bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-full"
                >
                  <div className="bg-gray-100 flex items-center justify-center min-h-[220px] p-4">
                    <img
                      src={product.image}
                      alt={product.model}
                      className="w-full h-full max-h-[280px] object-contain block cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg mb-1">{product.brand}</h3>
                    <p className="text-gray-600 text-sm mb-3 min-h-[2.5rem] leading-5">{product.model}</p>
                    <p className="text-gray-500 text-xs mb-5 min-h-[1.25rem]">
                      {product.width}/{product.profile}R{product.diameter}
                    </p>
                    <div className="flex items-center justify-between mt-auto gap-2">
                      <span className="text-xl md:text-2xl lg:text-xl font-extrabold text-green-600">
                        R$ {product.price.toFixed(2)}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} Em Estoque` : 'Esgotado'}
                      </span>
                    </div>
                    <div className="gallery-actions mt-4">
                      <button
                        onClick={() => handleAddToCart(product.id)}
                        disabled={product.stock <= 0}
                        className="gallery-action-btn gallery-action-btn-cart"
                      >
                        <ShoppingCart size={14} />
                        Carrinho
                      </button>
                      <button
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="gallery-action-btn gallery-action-btn-view"
                      >
                        <Eye size={14} />
                        Ver Produto
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="w-full bg-white border-t-[14px] border-b-[14px] border-white py-16 md:py-20">
        <img
          src={middleBanner}
          alt="Banner promocional"
          className="block w-full h-auto"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </section>

      <TireMarquee />

      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl lg:text-3xl font-bold mb-8 text-center">Mais Vendidos</h2>
          <div
            aria-hidden="true"
            className="relative left-1/2 mb-20 md:mb-24 h-6 w-screen -translate-x-1/2 bg-white"
          />

          {loading ? (
            <div className="text-center py-10">Carregando Galeria...</div>
          ) : galleryProducts.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg border">Nenhum Produto Encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              {galleryProducts.map((product) => (
                <div
                  key={`gallery-${product.id}`}
                  className="product-card rounded-xl border bg-white overflow-hidden flex flex-col h-full"
                >
                  <div className="bg-gray-100 flex items-center justify-center min-h-[220px] p-4">
                    <img
                      src={product.image}
                      alt={product.model}
                      className="w-full h-full max-h-[280px] object-contain block cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg mb-1">{product.brand}</h3>
                    <p className="text-gray-600 text-sm mb-3 min-h-[2.5rem] leading-5">{product.model}</p>
                    <p className="text-gray-500 text-xs mb-5 min-h-[1.25rem]">
                      {product.width}/{product.profile}R{product.diameter}
                    </p>
                    <div className="flex items-center justify-between mt-auto gap-2">
                      <span className="text-xl md:text-2xl lg:text-xl font-extrabold text-green-600">
                        R$ {product.price.toFixed(2)}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} Em Estoque` : 'Esgotado'}
                      </span>
                    </div>
                    <div className="gallery-actions mt-4">
                      <button
                        onClick={() => handleAddToCart(product.id)}
                        disabled={product.stock <= 0}
                        className="gallery-action-btn gallery-action-btn-cart"
                      >
                        <ShoppingCart size={14} />
                        Carrinho
                      </button>
                      <button
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="gallery-action-btn gallery-action-btn-view"
                      >
                        <Eye size={14} />
                        Ver Produto
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
