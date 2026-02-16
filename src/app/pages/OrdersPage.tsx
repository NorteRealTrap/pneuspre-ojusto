import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersService } from '../../services/supabase';
import { useNotificationsStore } from '../stores/notifications';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  products?: {
    brand: string;
    model: string;
  };
}

interface Order {
  id: string;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  order_items?: OrderItem[];
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const notifyOrderOnTheWay = useNotificationsStore((state) => state.notifyOrderOnTheWay);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const { data, error: ordersError } = await ordersService.getMyOrders();
        if (ordersError) {
          const normalizedMessage = String(ordersError.message || '').toLowerCase();
          if (normalizedMessage.includes('usuario nao autenticado')) {
            navigate('/login', { replace: true });
            return;
          }
          throw ordersError;
        }
        const fetchedOrders = (data as Order[]) || [];
        setOrders(fetchedOrders);

        fetchedOrders
          .filter((order) => order.status === 'shipped')
          .forEach((order) => notifyOrderOnTheWay(order.id));
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar pedidos');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate, notifyOrderOnTheWay]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Meus Pedidos</h1>
        <div className="bg-white p-8 rounded-lg shadow text-center">Carregando pedidos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Meus Pedidos</h1>
        <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Meus Pedidos</h1>
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600 mb-4">Voce ainda nao fez nenhum pedido</p>
          <button
            onClick={() => navigate('/products')}
            className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700"
          >
            Comecar a Comprar
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'Pendente',
      processing: 'Processando',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Meus Pedidos</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">Pedido #{order.id.slice(0, 8)}</h3>
                <p className="text-gray-600 text-sm">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div className="mb-4 pb-4 border-b">
              {(order.order_items || []).map((item) => (
                <div key={item.id} className="flex justify-between text-sm mb-2">
                  <span>
                    {item.products?.brand} {item.products?.model} x{item.quantity}
                  </span>
                  <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600 text-sm">Total</p>
                <p className="text-2xl font-bold">R$ {order.total.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-sm">Metodo de Pagamento</p>
                <p className="font-semibold">
                  {order.payment_method === 'credit_card'
                    ? 'Cartao de Credito'
                    : order.payment_method === 'pix'
                      ? 'PIX'
                      : order.payment_method === 'boleto'
                        ? 'Boleto'
                        : order.payment_method}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
