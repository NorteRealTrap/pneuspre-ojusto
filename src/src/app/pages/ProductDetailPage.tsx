import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductsStore, type Product } from '../stores/products';
import { useCartStore } from '../stores/cart';
import { useWishlistStore } from '../stores/wishlist';
import { Heart, ShoppingCart, ArrowLeft } from 'lucide-react';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchProductById } = useProductsStore();
  const { addItem } = useCartStore();
  const { toggleFavorite, isFavorite } = useWishlistStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setProduct(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const found = await fetchProductById(id);
      setProduct(found);
      setLoading(false);
    };

    void loadProduct();
  }, [id, fetchProductById]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">Carregando produto...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4 text-blue-600">
          <ArrowLeft size={20} /> Voltar
        </button>
        <div className="text-center py-12">
          <p className="text-gray-600">Produto nao encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4 text-blue-600">
        <ArrowLeft size={20} /> Voltar
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-100 rounded-lg p-8">
          <img src={product.image} alt={product.model} className="w-full h-96 object-cover rounded" />
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">
            {product.brand} {product.model}
          </h1>
          <p className="text-gray-600 mb-4">
            {product.width}/{product.profile}R{product.diameter} - {product.load_index}
            {product.speed_rating}
          </p>

          <div className="mb-6">
            <span className="text-4xl font-bold text-green-600">R$ {product.price.toFixed(2)}</span>
            {product.old_price && (
              <span className="ml-4 text-lg text-gray-500 line-through">
                R$ {product.old_price.toFixed(2)}
              </span>
            )}
          </div>

          <div className="mb-6">
            <span
              className={`px-4 py-2 rounded ${
                product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
            </span>
          </div>

          {product.features && product.features.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold mb-2">Caracteristicas:</h3>
              <ul className="list-disc list-inside space-y-1">
                {product.features.map((feature, idx) => (
                  <li key={idx} className="text-gray-700">
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-6 bg-gray-50 p-4 rounded">
            <h3 className="font-bold mb-3">Especificacoes:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Largura</p>
                <p className="font-semibold">{product.width}mm</p>
              </div>
              <div>
                <p className="text-gray-600">Perfil</p>
                <p className="font-semibold">{product.profile}%</p>
              </div>
              <div>
                <p className="text-gray-600">Aro</p>
                <p className="font-semibold">{product.diameter}"</p>
              </div>
              <div>
                <p className="text-gray-600">Indice de Carga</p>
                <p className="font-semibold">{product.load_index}</p>
              </div>
              <div>
                <p className="text-gray-600">Indice de Velocidade</p>
                <p className="font-semibold">{product.speed_rating}</p>
              </div>
              <div>
                <p className="text-gray-600">Categoria</p>
                <p className="font-semibold capitalize">{product.category}</p>
              </div>
              <div>
                <p className="text-gray-600">Temporada</p>
                <p className="font-semibold capitalize">{product.season}</p>
              </div>
              <div>
                <p className="text-gray-600">RunFlat</p>
                <p className="font-semibold">{product.runflat ? 'Sim' : 'Nao'}</p>
              </div>
            </div>
          </div>

          {product.description && (
            <div className="mb-6">
              <h3 className="font-bold mb-2">Descricao:</h3>
              <p className="text-gray-700">{product.description}</p>
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                -
              </button>
              <span className="w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(Math.max(product.stock, 1), quantity + 1))}
                disabled={product.stock === 0 || quantity >= product.stock}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShoppingCart size={20} />
              Adicionar ao Carrinho
            </button>

            <button
              onClick={() => toggleFavorite(product.id)}
              className={`px-6 py-3 rounded border-2 ${
                isFavorite(product.id)
                  ? 'bg-red-50 border-red-600 text-red-600'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              <Heart size={20} fill={isFavorite(product.id) ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
