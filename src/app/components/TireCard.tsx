import { useState } from 'react';
import { ShoppingCart, Tag, Package, Star } from 'lucide-react';
import { type Product } from '../stores/products';
import { useCartStore } from '../stores/cart';
import './TireCard.css';

interface TireCardProps {
  tire: Product;
}

export function TireCard({ tire }: TireCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
  const addToCart = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addToCart(tire, quantity);
  };

  const discount = tire.old_price
    ? Math.round(((tire.old_price - tire.price) / tire.old_price) * 100)
    : 0;

  const tireSize = `${tire.width}/${tire.profile}R${tire.diameter}`;

  return (
    <div className="tire-card">
      {discount > 0 && (
        <div className="tire-card-badge">
          <Tag className="badge-icon" />
          <span>{discount}% OFF</span>
        </div>
      )}

      {tire.runflat && (
        <div className="tire-card-badge runflat">
          <span>Run Flat</span>
        </div>
      )}

      <div className="tire-card-image-container">
        {!imageError ? (
          <img
            src={tire.image}
            alt={`${tire.brand} ${tire.model}`}
            className="tire-card-image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="tire-card-image-placeholder">
            <Package size={64} />
            <p>Imagem nao disponivel</p>
          </div>
        )}
      </div>

      <div className="tire-card-content">
        <div className="tire-card-brand">{tire.brand}</div>
        <h3 className="tire-card-model">{tire.model}</h3>

        <div className="tire-card-size">
          <span className="size-label">Medida:</span>
          <span className="size-value">{tireSize}</span>
        </div>

        <div className="tire-card-specs">
          <span className="spec-item">
            <span className="spec-label">Indice:</span> {tire.load_index}
            {tire.speed_rating}
          </span>
          <span className="spec-item">
            <span className="spec-label">Tipo:</span>{' '}
            {tire.category === 'passeio'
              ? 'Passeio'
              : tire.category === 'suv'
                ? 'SUV'
                : tire.category === 'caminhonete'
                  ? 'Caminhonete'
                  : tire.category === 'van'
                    ? 'Van'
                    : tire.category}
          </span>
        </div>

        {tire.features && tire.features.length > 0 && (
          <div className="tire-card-features">
            {tire.features.slice(0, 3).map((feature, index) => (
              <span key={index} className="feature-tag">
                <Star size={12} />
                {feature}
              </span>
            ))}
          </div>
        )}

        <div className="tire-card-stock">
          <Package size={16} />
          <span>
            {tire.stock > 10 ? 'Em estoque' : tire.stock > 0 ? `Ultimas ${tire.stock} unidades` : 'Esgotado'}
          </span>
        </div>

        <div className="tire-card-pricing">
          {tire.old_price && (
            <div className="old-price">De: R$ {tire.old_price.toFixed(2).replace('.', ',')}</div>
          )}
          <div className="current-price">R$ {tire.price.toFixed(2).replace('.', ',')}</div>
          <div className="installment">ou 12x de R$ {(tire.price / 12).toFixed(2).replace('.', ',')}</div>
        </div>

        <div className="tire-card-actions">
          <div className="quantity-selector">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1 || tire.stock === 0}
              className="qty-btn"
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                const next = Number.isNaN(parsed) ? 1 : parsed;
                setQuantity(Math.min(Math.max(1, next), Math.max(tire.stock, 1)));
              }}
              min="1"
              max={Math.max(tire.stock, 1)}
              className="qty-input"
            />
            <button
              onClick={() => setQuantity(Math.min(tire.stock, quantity + 1))}
              disabled={quantity >= tire.stock || tire.stock === 0}
              className="qty-btn"
            >
              +
            </button>
          </div>

          <button onClick={handleAddToCart} disabled={tire.stock === 0} className="add-to-cart-btn">
            <ShoppingCart size={20} />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
