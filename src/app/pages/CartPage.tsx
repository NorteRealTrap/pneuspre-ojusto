import React from 'react';
import { useCartStore } from '../stores/cart';
import { useNavigate } from 'react-router-dom';

export function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems, clearCart } = useCartStore();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Carrinho de Compras</h1>
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600 mb-4">Seu carrinho está vazio</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700"
          >
            Continuar Comprando
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Carrinho de Compras</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Itens do Carrinho */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {items.map(item => (
              <div key={item.product.id} className="flex gap-4 p-4 border-b last:border-b-0">
                <img
                  src={item.product.image}
                  alt={item.product.model}
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {item.product.brand} {item.product.model}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {item.product.width}/{item.product.profile}R{item.product.diameter}
                  </p>
                  <p className="text-green-600 font-bold mt-2">
                    R$ {item.product.price.toFixed(2)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remover
                  </button>
                  <p className="font-semibold">
                    R$ {(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>

            <div className="space-y-2 mb-4 pb-4 border-b">
              <div className="flex justify-between">
                <span>Itens ({getTotalItems()})</span>
                <span>R$ {getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete</span>
                <span>Calcular</span>
              </div>
            </div>

            <div className="flex justify-between text-xl font-bold mb-6">
              <span>Total</span>
              <span>R$ {getTotalPrice().toFixed(2)}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-green-600 text-white py-3 px-4 rounded hover:bg-green-700 font-semibold mb-2"
            >
              Ir para Checkout
            </button>

            <button
              onClick={() => navigate('/products')}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 mb-2"
            >
              Continuar Comprando
            </button>

            <button
              onClick={clearCart}
              className="w-full text-red-600 hover:text-red-800 py-2 px-4"
            >
              Limpar Carrinho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
