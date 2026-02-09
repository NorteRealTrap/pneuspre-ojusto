import { useState } from 'react';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { useNavigate } from 'react-router-dom';
import { ordersService } from '../../services/supabase';
import { paymentService } from '../../services/paymentService';
import { CreditCard, Landmark, MapPin, ShieldCheck, Truck, Wallet } from 'lucide-react';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const paymentOptions = [
  {
    value: 'credit_card',
    label: 'Cartao de credito',
    description: 'Ate 12x sem juros',
    icon: CreditCard,
  },
  {
    value: 'pix',
    label: 'PIX',
    description: 'Confirmacao rapida',
    icon: Wallet,
  },
  {
    value: 'boleto',
    label: 'Boleto bancario',
    description: 'Vencimento conforme emissao',
    icon: Landmark,
  },
] as const;
type PaymentMethodValue = (typeof paymentOptions)[number]['value'];

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const panelClass =
  'rounded-2xl border-2 border-black bg-white p-6 md:p-8 shadow-[0_14px_36px_rgba(0,0,0,0.08)]';

const inputClass =
  'h-12 w-full rounded-xl border-2 border-black/15 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-500 transition focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-200';

export function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const notifyPurchaseCompleted = useNotificationsStore((state) => state.notifyPurchaseCompleted);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>('credit_card');
  const [formData, setFormData] = useState({
    street: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    zipcode: '',
  });
  const subtotal = getTotalPrice();
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let createdOrderId: string | null = null;

    try {
      if (!user) {
        throw new Error('Usuario nao autenticado');
      }

      if (items.length === 0) {
        throw new Error('Carrinho vazio');
      }

      const hasInvalidProductId = items.some((item) => !uuidRegex.test(item.product.id));
      if (hasInvalidProductId) {
        throw new Error('Carrinho contem produtos antigos. Remova os itens e adicione novamente.');
      }

      const orderData = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        total: subtotal,
        payment_method: paymentMethod,
        shipping_address: formData,
      };

      const { data: createdOrder, error: orderError } = await ordersService.create(orderData);
      if (orderError) {
        throw new Error(orderError.message || 'Erro ao criar pedido');
      }

      createdOrderId = createdOrder?.id || null;
      if (!createdOrderId || !uuidRegex.test(createdOrderId)) {
        throw new Error('Pedido criado com identificador invalido');
      }

      const initiatedPayment = await paymentService.createCharge(
        subtotal,
        createdOrderId,
        paymentMethod,
        `checkout-${createdOrderId}`
      );

      if (!initiatedPayment?.paymentId) {
        throw new Error('Nao foi possivel iniciar a confirmacao de pagamento');
      }

      const paymentConfirmation = await paymentService.confirmPayment(initiatedPayment.paymentId);
      if (!paymentConfirmation?.success) {
        throw new Error('Nao foi possivel confirmar o pagamento');
      }

      const validConfirmationStatuses = new Set(['confirmed', 'approved', 'pending', 'processing']);
      if (!validConfirmationStatuses.has((paymentConfirmation.status || '').toLowerCase())) {
        throw new Error('Pagamento nao confirmado. Tente novamente.');
      }

      clearCart();
      notifyPurchaseCompleted(createdOrderId);
      navigate('/orders');
    } catch (err: any) {
      if (createdOrderId) {
        try {
          await ordersService.updateStatus(createdOrderId, 'cancelled');
        } catch (_cancelError) {
          // Nao interrompe o tratamento principal de erro.
        }
      }
      setError(err.message || 'Erro ao processar pedido');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className={`${panelClass} max-w-2xl text-center mx-auto`}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
            <Wallet size={24} />
          </div>
          <h1 className="mb-3 text-2xl md:text-3xl font-extrabold text-gray-900">Checkout indisponivel</h1>
          <p className="text-gray-600 mb-6">Seu carrinho esta vazio no momento.</p>
          <button
            onClick={() => navigate('/products')}
            className="rounded-xl border-2 border-black px-6 py-3 font-bold text-black transition hover:-translate-y-0.5"
            style={{ background: 'var(--primary-yellow)' }}
          >
            Voltar ao Catalogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[linear-gradient(180deg,#fffef8_0%,#f7fff9_100%)]">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className={`${panelClass} mb-8 md:mb-10`}>
          <p className="text-xs uppercase tracking-[0.14em] font-bold text-green-700">Checkout seguro</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-black text-gray-900">Finalize seu pagamento</h1>
          <p className="mt-3 text-gray-600 max-w-3xl">
            Confirme seus dados de entrega e escolha a forma de pagamento. Todas as transacoes sao protegidas e
            processadas em ambiente seguro.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border-2 border-black bg-yellow-100 px-4 py-3 text-sm font-bold text-gray-900">
              1. Dados de entrega
            </div>
            <div className="rounded-xl border-2 border-black bg-emerald-100 px-4 py-3 text-sm font-bold text-gray-900">
              2. Pagamento
            </div>
            <div className="rounded-xl border-2 border-black bg-white px-4 py-3 text-sm font-bold text-gray-900">
              3. Confirmacao
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <section className={panelClass}>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-yellow-200">
                  <MapPin size={18} />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Endereco de entrega</h2>
                  <p className="text-sm text-gray-600">Informe um endereco valido para recebimento do pedido.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="text"
                  name="street"
                  placeholder="Rua"
                  value={formData.street}
                  onChange={handleInputChange}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  name="number"
                  placeholder="Numero"
                  value={formData.number}
                  onChange={handleInputChange}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  name="complement"
                  placeholder="Complemento (opcional)"
                  value={formData.complement}
                  onChange={handleInputChange}
                  className={`${inputClass} md:col-span-2`}
                />
                <input
                  type="text"
                  name="city"
                  placeholder="Cidade"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  name="state"
                  placeholder="Estado"
                  value={formData.state}
                  onChange={handleInputChange}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  name="zipcode"
                  placeholder="CEP"
                  value={formData.zipcode}
                  onChange={handleInputChange}
                  className={inputClass}
                  required
                />
              </div>
            </section>

            <section className={panelClass}>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-emerald-200">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Forma de pagamento</h2>
                  <p className="text-sm text-gray-600">Selecione o metodo que preferir para concluir seu pedido.</p>
                </div>
              </div>

              <div className="space-y-3">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = paymentMethod === option.value;

                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-3 transition ${
                        isSelected ? 'border-green-700 bg-emerald-50' : 'border-black/20 bg-white hover:border-black/60'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/30 bg-white">
                        <Icon size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{option.label}</p>
                        <p className="text-xs text-gray-600">{option.description}</p>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border-2 ${
                          isSelected ? 'border-green-700 bg-green-600' : 'border-black/30'
                        }`}
                      />
                    </label>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-gray-700">
                Pagamento protegido com criptografia. Seus dados sao tratados em ambiente seguro.
              </div>
            </section>

            <section className={`${panelClass} bg-gray-50`}>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-green-700" />
                  Compra segura
                </div>
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-green-700" />
                  Envio rapido
                </div>
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-green-700" />
                  Suporte ao cliente
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border-2 border-black py-3.5 px-5 text-base font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'var(--primary-green)' }}
            >
              {loading ? 'Finalizando pedido...' : 'Finalizar pedido'}
            </button>
          </form>

          <aside className="self-start xl:sticky xl:top-24">
            <div className={panelClass}>
              <h2 className="text-2xl font-extrabold text-gray-900">Resumo da compra</h2>
              <p className="mt-1 text-sm text-gray-600">
                {totalItems} {totalItems === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>

              <div className="mt-6 max-h-[360px] space-y-4 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 rounded-xl border border-black/10 p-3">
                    <img
                      src={item.product.image}
                      alt={item.product.model}
                      className="h-16 w-16 rounded-lg border border-black/10 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {item.product.brand} {item.product.model}
                      </p>
                      <p className="text-xs text-gray-600">
                        {item.product.width}/{item.product.profile}R{item.product.diameter} x{item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(item.product.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="my-6 h-px bg-black/15" />

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Frete</span>
                  <span className="font-semibold text-green-700">Gratis</span>
                </div>
                <div className="flex items-center justify-between border-t border-black/15 pt-3 text-lg font-black text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-black/10 bg-emerald-50 px-4 py-3 text-xs text-gray-700">
                Ao finalizar, voce concorda com os termos de compra e politica de entrega.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
