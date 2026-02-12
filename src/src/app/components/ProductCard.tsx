import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { type Product } from '../stores/products';
import { useCartStore } from '../stores/cart';
import { useWishlistStore } from '../stores/wishlist';
import { ImageWithFallback } from './figma/ImageWithFallback';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const { toggleFavorite, isFavorite } = useWishlistStore();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.stock <= 0) return;
    addItem(product);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleFavorite(product.id);
  };

  const discountPercentage = product.old_price
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
    : 0;

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-image-wrapper">
        <ImageWithFallback src={product.image} alt={`${product.brand} ${product.model}`} className="product-image" />
        {discountPercentage > 0 && <span className="product-badge discount-badge">-{discountPercentage}%</span>}
        {product.featured && <span className="product-badge featured-badge">Destaque</span>}
        <button className="wishlist-btn" title="Adicionar aos favoritos" onClick={handleToggleFavorite}>
          <Heart size={20} fill={isFavorite(product.id) ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="product-info">
        <div className="product-category">{product.category}</div>
        <h3 className="product-name">
          {product.brand} {product.model}
        </h3>

        <div className="product-rating">
          <div className="rating-stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={14} fill={i < 4 ? '#F7B801' : 'none'} color="#F7B801" />
            ))}
          </div>
          <span className="rating-count">({product.stock} em estoque)</span>
        </div>

        <div className="product-pricing">
          <div className="price-wrapper">
            <span className="current-price">
              R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            {product.old_price && (
              <span className="original-price">
                R$ {product.old_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <button className="add-to-cart-btn" onClick={handleAddToCart} title="Adicionar ao carrinho">
            <ShoppingCart size={18} />
          </button>
        </div>

        <div className="product-stock">
          {product.stock > 0 ? <span className="in-stock">Em estoque</span> : <span className="out-of-stock">Esgotado</span>}
        </div>
      </div>
    </Link>
  );
}
