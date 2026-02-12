import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useProductsStore } from '../stores/products';
import { useCartStore } from '../stores/cart';

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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();

  // Helper function to get route-based filters
  const getRouteBasedFilters = () => {
    const pathname = location.pathname;
    const filters: Record<string, string | string[]> = {};

    // Map routes to category filters
    if (pathname === '/kit-de-pneus' || pathname === '/passageiros') {
      filters.category = 'passeio';
    } else if (pathname === '/caminhonete-e-suv') {
      // No specific category - show all
    } else if (pathname.startsWith('/caminhonete-e-suv/suv')) {
      filters.category = 'suv';
    } else if (pathname.startsWith('/caminhonete-e-suv/caminhonete')) {
      filters.category = 'caminhonete';
    } else if (pathname === '/moto' || pathname.startsWith('/moto/')) {
      filters.category = 'moto';
    } else if (pathname === '/agricola-e-otr') {
      filters.category = 'agricola';
    } else if (pathname === '/camaras-de-ar' || pathname.startsWith('/camaras-de-ar/')) {
      // Extract aro number from route like /camaras-de-ar/aro-13
      const aroMatch = pathname.match(/aro-(\d+)/);
      if (aroMatch) {
        filters.diameter = aroMatch[1];
      }
    } else if (pathname === '/marcas' || pathname.startsWith('/marcas/')) {
      // Extract brand from route like /marcas/michelin
      const brandMatch = pathname.match(/\/marcas\/(.+)/);
      if (brandMatch) {
        filters.brand = decodeURIComponent(brandMatch[1]);
      }
    }

    return filters;
  };

  // Helper function to get page title from route
  const getPageTitle = () => {
    const pathname = location.pathname;

    if (pathname === '/kit-de-pneus' || pathname === '/passageiros') return 'Pneus para Automoveis';
    if (pathname === '/caminhonete-e-suv') return 'Pneus para Caminhonete e SUV';
    if (pathname.includes('/suv')) return 'Pneus para SUV';
    if (pathname.includes('/caminhonete')) return 'Pneus para Caminhonete';
    if (pathname === '/moto' || pathname.includes('/moto')) return 'Pneus para Moto';
    if (pathname === '/agricola-e-otr') return 'Pneus Agricola e OTR';
    if (pathname === '/camaras-de-ar') return 'Camaras de Ar';
    if (pathname.includes('/camaras-de-ar/aro-')) {
      const aroMatch = pathname.match(/aro-(\d+)/);
      if (aroMatch) return `Camaras de Ar - Aro ${aroMatch[1]}`;
    }
    if (pathname === '/marcas') return 'Todas as Marcas';
    if (pathname.startsWith('/marcas/')) {
      const brandMatch = pathname.match(/\/marcas\/(.+)/);
      if (brandMatch) return `Pneus ${decodeURIComponent(brandMatch[1])}`;
    }
    if (pathname === '/produtos' || pathname === '/products') return 'Catalogo de Pneus';

    return 'Catalogo de Pneus';
  };

  useEffect(() => {
    void fetchProducts(true);
  }, [fetchProducts]);

  useEffect(() => {
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const width = searchParams.get('width') || '';
    const profile = searchParams.get('profile') || '';
    const diameter = searchParams.get('diameter') || '';
    const season = searchParams.get('season') || '';

    // Get filters from route if no query params
    const routeFilters = getRouteBasedFilters();

    resetFilters();
    setFilters({
      search,
      category: category ? [category] : (typeof routeFilters.category === 'string' ? [routeFilters.category] : []),
      brand: brand ? [brand] : (typeof routeFilters.brand === 'string' ? [routeFilters.brand] : []),
      width: width ? [width] : [],
      profile: profile ? [profile] : [],
      diameter: diameter ? [diameter] : (typeof routeFilters.diameter === 'string' ? [routeFilters.diameter] : []),
      season: season ? [season] : [],
    });
  }, [searchParamsString, location.pathname, resetFilters, setFilters]);

  const categories = [
    { value: 'passeio', label: 'Passeio' },
    { value: 'suv', label: 'SUV' },
    { value: 'caminhonete', label: 'Caminhonete' },
    { value: 'van', label: 'Van / Utilitário' },
    { value: 'moto', label: 'Moto' },
  ];
  const brands = Array.from(new Set(products.map((product) => product.brand))).sort();

  const handleAddToCart = (productId: string) => {
    const product = filteredProducts.find((item) => item.id === productId);
    if (product && product.stock > 0) {
      addItem(product);
    }
  };

  const hasFilters =
    filters.search ||
    filters.category.length > 0 ||
    filters.brand.length > 0 ||
    filters.width.length > 0 ||
    filters.profile.length > 0 ||
    filters.diameter.length > 0 ||
    filters.season.length > 0;

  const clearFilters = () => {
    navigate('/products');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{getPageTitle()}</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold mb-4">Filtros</h3>

            <div className="mb-6">
              <label className="block font-semibold mb-2">Categoria</label>
              <select
                value={filters.category[0] || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const params = new URLSearchParams(searchParams);
                  if (value) params.set('category', value);
                  else params.delete('category');
                  navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`);
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block font-semibold mb-2">Marca</label>
              <select
                value={filters.brand[0] || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const params = new URLSearchParams(searchParams);
                  if (value) params.set('brand', value);
                  else params.delete('brand');
                  navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`);
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Todas</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block font-semibold mb-2">Busca</label>
              <input
                value={filters.search}
                onChange={(e) => {
                  const value = e.target.value;
                  const params = new URLSearchParams(searchParams);
                  if (value.trim()) params.set('search', value);
                  else params.delete('search');
                  navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`);
                }}
                placeholder="Marca, modelo ou medida"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <button
              onClick={clearFilters}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        <div className="md:col-span-3">
          {loading ? (
            <div className="text-center py-8">Carregando produtos...</div>
          ) : error ? (
            <div className="bg-red-100 text-red-800 p-4 rounded">
              <p>{error}</p>
              <button
                className="mt-3 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
                onClick={() => void fetchProducts(true)}
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p>Nenhum produto encontrado</p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  Ver catalogo completo
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  aria-label={`${product.brand} ${product.model}`}
                >
                  <a href={`/product/${product.id}`} onClick={(e) => { e.preventDefault(); navigate(`/product/${product.id}`); }}>
                    <img
                      src={product.image}
                      alt={`${product.brand} ${product.model}`}
                      className="w-full h-48 object-cover cursor-pointer"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = `${import.meta.env.BASE_URL}logo.png`; }}
                    />
                  </a>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg">
                      {product.brand} {product.model}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {product.width}/{product.profile} R{product.diameter}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-green-600">
                          {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        {product.old_price && (
                          <span className="ml-2 text-sm text-gray-500 line-through">
                            {product.old_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
                      </span>
                    </div>

                    {product.features && product.features.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold mb-1">Caracteristicas:</p>
                        <ul className="text-xs text-gray-600">
                          {product.features.slice(0, 3).map((feature, idx) => (
                            <li key={idx}>- {feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={() => handleAddToCart(product.id)}
                      disabled={product.stock === 0}
                      aria-disabled={product.stock === 0}
                      aria-label={product.stock > 0 ? `Adicionar ${product.brand} ${product.model} ao carrinho` : `${product.brand} ${product.model} esgotado`}
                      className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {product.stock > 0 ? 'Adicionar ao Carrinho' : 'Esgotado'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
