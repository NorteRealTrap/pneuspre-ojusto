import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Eye, ChevronDown } from 'lucide-react';
import { useProductsStore } from '../stores/products';
import { useCartStore } from '../stores/cart';

const categoryLabels: Record<string, string> = {
  passeio: 'Automóveis',
  suv: 'SUV e 4x4',
  caminhonete: 'Caminhonetes',
  van: 'Vans',
  moto: 'Motos',
};

const categoryCards = [
  { label: 'Automoveis', category: 'passeio' },
  { label: 'SUV e 4x4', category: 'suv' },
  { label: 'Caminhonetes', category: 'caminhonete' },
  { label: 'Vans', category: 'van' },
];

export function HomePage() {
  const navigate = useNavigate();
  const { products, loading, error, fetchProducts, getFeaturedProducts } = useProductsStore();
  const { addItem } = useCartStore();
  const [showMenu, setShowMenu] = useState(false);

  const featuredProducts = getFeaturedProducts(4);
  const galleryProducts = products.slice(0, 8);
  const heroBanner = `${import.meta.env.BASE_URL}banner-topo.png`;
  const middleBanner = `${import.meta.env.BASE_URL}banner-meio.png`;

  // Extrair categorias, modelos e diâmetros únicos
  const categories = Array.from(new Set(products.map(p => p.category)));
  const models = Array.from(new Set(products.map(p => p.model))).sort();
  const diameters = Array.from(new Set(products.map(p => p.diameter))).sort((a, b) => Number(a) - Number(b));

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
      <section className="relative overflow-hidden text-white h-96">
        <img
          src={heroBanner}
          alt="Banner principal"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-700/70 to-emerald-700/70" />

        <div className="relative container mx-auto px-4 py-20 h-full flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Pneus.PrecoJusto</h1>
          <p className="text-xl mb-8 max-w-2xl">
            Catalogo completo com pneus para passeio, SUV, caminhonete e vans. Compra segura e envio rapido.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="bg-yellow-400 text-blue-900 px-8 py-3 rounded-lg font-bold hover:bg-yellow-300 transition w-fit"
          >
            Ver Catalogo Completo
          </button>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4">
          <div className="relative inline-block w-full md:w-auto">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              Filtrar por Categoria, Modelo e Diâmetro
              <ChevronDown size={20} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 p-6 md:w-96">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Categorias</h3>
                    <div className="space-y-2">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            navigate(`/products?category=${encodeURIComponent(cat)}`);
                            setShowMenu(false);
                          }}
                          className="block w-full text-left px-3 py-2 rounded hover:bg-blue-100 text-gray-700 hover:text-blue-700 transition"
                        >
                          {categoryLabels[cat] || cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Modelos</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {models.map(model => (
                        <button
                          key={model}
                          onClick={() => {
                            navigate(`/products?search=${encodeURIComponent(model)}`);
                            setShowMenu(false);
                          }}
                          className="block w-full text-left px-3 py-2 rounded hover:bg-blue-100 text-gray-700 hover:text-blue-700 transition text-sm"
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Diâmetros (Aro)</h3>
                    <div className="space-y-2">
                      {diameters.map(diameter => (
                        <button
                          key={diameter}
                          onClick={() => {
                            navigate(`/products?diameter=${encodeURIComponent(diameter)}`);
                            setShowMenu(false);
                          }}
                          className="block w-full text-left px-3 py-2 rounded hover:bg-blue-100 text-gray-700 hover:text-blue-700 transition"
                        >
                          {diameter}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-28 md:py-36 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-24 md:mb-28 gap-4">
            <h2 className="text-4xl font-bold">Produtos em Destaque</h2>
            <button
              onClick={() => navigate('/products')}
              className="text-blue-700 font-semibold hover:underline"
            >
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
              {featuredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
                  <div className="bg-gray-100 h-80 flex items-center justify-center overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.model}
                      className="max-w-full max-h-full object-contain cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg">{product.brand}</h3>
                    <p className="text-gray-600 text-sm mb-4">{product.model}</p>
                    <p className="text-gray-500 text-xs mb-5">
                      {product.width}/{product.profile}R{product.diameter}
                    </p>
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-2xl font-extrabold text-green-600">R$ {product.price.toFixed(2)}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
                      </span>
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

      <section className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-20 md:mb-24 text-center">Galeria de Produtos para Venda</h2>

          {loading ? (
            <div className="text-center py-10">Carregando galeria...</div>
          ) : galleryProducts.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg border">Nenhum produto encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              {galleryProducts.map((product) => (
                <div key={`gallery-${product.id}`} className="rounded-xl border bg-white overflow-hidden flex flex-col">
                  <div className="bg-gray-100 h-80 flex items-center justify-center overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.model}
                      className="max-w-full max-h-full object-contain cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg mb-1">{product.brand}</h3>
                    <p className="text-gray-600 text-sm mb-4">{product.model}</p>
                    <p className="text-gray-500 text-xs mb-5">
                      {product.width}/{product.profile}R{product.diameter}
                    </p>
                    <div className="flex items-center justify-between mb-5 mt-auto">
                      <span className="text-2xl font-extrabold text-green-600">R$ {product.price.toFixed(2)}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
                      </span>
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
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
