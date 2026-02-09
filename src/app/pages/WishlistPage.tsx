import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProductsStore } from '../stores/products';
import { useCartStore } from '../stores/cart';
import { useWishlistStore } from '../stores/wishlist';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';

export function WishlistPage() {
  const { products, fetchProducts } = useProductsStore();
  const { addItem } = useCartStore();
  const { favorites, toggleFavorite } = useWishlistStore();

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const favoriteProducts = products.filter((product) => favorites.includes(product.id));

  const handleAddToCart = (productId: string) => {
    const product = favoriteProducts.find((item) => item.id === productId);
    if (!product) return;
    addItem(product);
  };

  if (favoriteProducts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Meus Favoritos</h1>
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <Heart size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 mb-4">Voce ainda nao tem favoritos</p>
          <Link to="/products" className="text-blue-600 hover:underline">
            Voltar ao catalogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Meus Favoritos ({favoriteProducts.length})</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favoriteProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <Link to={`/product/${product.id}`} className="block">
              <img src={product.image} alt={product.model} className="w-full h-48 object-cover" />
            </Link>
            <div className="p-4">
              <Link to={`/product/${product.id}`} className="font-semibold text-lg hover:text-blue-700">
                {product.brand} {product.model}
              </Link>
              <p className="text-gray-600 text-sm">
                {product.width}/{product.profile}R{product.diameter}
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">R$ {product.price.toFixed(2)}</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleAddToCart(product.id)}
                  disabled={product.stock === 0}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={16} />
                  Carrinho
                </button>
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
