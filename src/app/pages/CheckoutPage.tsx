import { useState } from 'react';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { useNavigate } from 'react-router-dom';
import { ordersService } from '../../services/supabase';
import { paymentService } from '../../services/paymentService';
import {
  CreditCard,
  Landmark,
  MapPin,
  ShieldCheck,
  Truck,
  Wallet,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const paymentOptions = [
  {
    value: 'credit_card',
    label: 'Cartão de crédito',
    description: 'Até 12x sem juros',
    icon: CreditCard,
  },
  {
    value: 'pix',
    label: 'PIX',
    description: 'Confirmação rápida',
    icon: Wallet,
  },
  {
    value: 'boleto',
    label: 'Boleto bancário',
    description: 'Vencimento conforme emissão',
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
  'rounded-3xl border-2 border-black bg-white p-8 md:p-10 shadow-[0_14px_36px_rgba(0,0,0,0.08)] transition duration-300 hover:shadow-[0_20px_48px_rgba(0,0,0,0.12)]';

const inputClass =
  'h-12 w-full rounded-2xl border-2 border-black/15 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-500 transition-all duration-200 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200 font-medium';

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
  const selectedPaymentOption = paymentOptions.find((opt) => opt.value === paymentMethod)!;

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
        throw new Error('Usuário não autenticado');
      }

      if (items.length === 0) {
        throw new Error('Carrinho vazio');
      }

      const hasInvalidProductId = items.some((item) => !uuidRegex.test(item.product.id));
      if (hasInvalidProductId) {
        throw new Error('Carrinho contém produtos antigos. Remova os itens e adicione novamente.');
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
        throw new Error('Pedido criado com identificador inválido');
      }

      const initiatedPayment = await paymentService.createCharge(
        subtotal,
        createdOrderId,
        paymentMethod,
        `checkout-${createdOrderId}`
      );

      if (!initiatedPayment?.paymentId) {
        throw new Error('Não foi possível iniciar a confirmação de pagamento');
      }

      const paymentConfirmation = await paymentService.confirmPayment(initiatedPayment.paymentId);
      if (!paymentConfirmation?.success) {
        throw new Error('Não foi possível confirmar o pagamento');
      }

      const validConfirmationStatuses = new Set(['confirmed', 'approved', 'pending', 'processing']);
      if (!validConfirmationStatuses.has((paymentConfirmation.status || '').toLowerCase())) {
        throw new Error('Pagamento não confirmado. Tente novamente.');
      }

      clearCart();
      notifyPurchaseCompleted(createdOrderId);
      navigate('/orders');
    } catch (err: any) {
      if (createdOrderId) {
        try {
          await ordersService.updateStatus(createdOrderId, 'cancelled');
        } catch (_cancelError) {
          // Não interrompe o tratamento principal de erro
        }
      }
      setError(err.message || 'Erro ao processar pedido');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-16">
        <div className={`${panelClass} max-w-2xl w-full text-center`}>
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <Wallet size={40} className="text-amber-700" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Checkout indisponível</h1>
          <p className="text-gray-600 mb-10 text-lg leading-relaxed">
            Seu carrinho está vazio. Adicione alguns pneus de qualidade para começar sua compra.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-black px-8 py-4 font-black text-black transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 cursor-pointer text-base"
            style={{ background: 'var(--primary-yellow)' }}
          >
            <ArrowLeft size={20} />
            <span>Volta ao Catálogo</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50/80 to-white min-h-screen py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className={`${panelClass} mb-10 md:mb-14`}>
          <div className="flex items-start gap-4 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-green-600 bg-green-50 flex-shrink-0">
              <ShieldCheck size={28} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.16em] font-black text-green-700 mb-2">Checkout Seguro</p>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900">Finalize sua compra</h1>
              <p className="text-gray-600 mt-3 max-w-2xl text-base leading-relaxed">
                Confirme seu endereço e escolha a forma de pagamento. 100% seguro e criptografado.
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="rounded-2xl border-2 border-green-600 bg-green-50 px-4 md:px-6 py-4 text-center hover:shadow-md transition-shadow">
              <div className="text-xs uppercase tracking-wider font-black text-green-700">
                <div className="text-lg font-black mb-1">✓</div>
                Endereço
              </div>
            </div>
            <div className="rounded-2xl border-2 border-green-600 bg-green-50 px-4 md:px-6 py-4 text-center hover:shadow-md transition-shadow">
              <div className="text-xs uppercase tracking-wider font-black text-green-700">
                <div className="text-lg font-black mb-1">✓</div>
                Pagamento
              </div>
            </div>
            <div className="rounded-2xl border-2 border-black/20 bg-white px-4 md:px-6 py-4 text-center">
              <div className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                <div className="text-lg font-black mb-1">3</div>
                Confirmação
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_380px]">
          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Error Alert */}
            {error && (
              <div className="rounded-2xl border-2 border-red-300 bg-red-50 px-6 py-5 flex gap-4 items-start animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={22} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-800">Erro ao processar compra</p>
                  <p className="text-sm text-red-700 mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Delivery Address Section */}
            <section className={panelClass}>
              <div className="mb-8 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-green-600 bg-green-50 flex-shrink-0">
                  <MapPin size={22} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-gray-900">Endereço de entrega</h2>
                  <p className="text-sm text-gray-600 mt-2">Todos os campos são necessários</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Rua</label>
                  <input
                    type="text"
                    name="street"
                    placeholder="Ex: Avenida Paulista"
                    value={formData.street}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Número</label>
                  <input
                    type="text"
                    name="number"
                    placeholder="Ex: 1000"
                    value={formData.number}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Complemento</label>
                  <input
                    type="text"
                    name="complement"
                    placeholder="Apto, andar, bloco... (opcional)"
                    value={formData.complement}
                    onChange={handleInputChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Cidade</label>
                  <input
                    type="text"
                    name="city"
                    placeholder="Ex: São Paulo"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Estado</label>
                  <input
                    type="text"
                    name="state"
                    placeholder="Ex: SP"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">CEP</label>
                  <input
                    type="text"
                    name="zipcode"
                    placeholder="Ex: 01311-100"
                    value={formData.zipcode}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </section>

            {/* Payment Method Section */}
            <section className={panelClass}>
              <div className="mb-8 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-blue-600 bg-blue-50 flex-shrink-0">
                  <CreditCard size={22} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-gray-900">Forma de pagamento</h2>
                  <p className="text-sm text-gray-600 mt-2">Escolha seu método preferido</p>
                </div>
              </div>

              <div className="space-y-3 mb-7">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = paymentMethod === option.value;

                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 px-6 py-4 transition-all duration-200 ${
                        isSelected
                          ? 'border-green-600 bg-green-50 shadow-md'
                          : 'border-black/15 bg-white hover:border-black/40 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodValue)}
                        className="sr-only"
                      />
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 flex-shrink-0 transition-all duration-200 ${
                        isSelected
                          ? 'border-green-600 bg-green-100'
                          : 'border-gray-300 bg-white'
                      }`}>
                        <Icon size={22} className={isSelected ? 'text-green-700' : 'text-gray-700'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900">{option.label}</p>
                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                      </div>
                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        isSelected
                          ? 'border-green-600 bg-green-600'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && <CheckCircle2 size={16} className="text-white" />}
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Security Notice */}
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-4 flex gap-3">
                <ShieldCheck size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-bold">Totalmente seguro.</p>
                  <p className="mt-1">Criptografia SSL de 256-bits. Seus dados nunca são armazenados.</p>
                </div>
              </div>
            </section>

            {/* Trust Badges */}
            <section className={`${panelClass} bg-gradient-to-r from-green-50 to-blue-50 border-green-700`}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={22} className="text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900">Compra segura</p>
                    <p className="text-xs text-gray-600 mt-1">Ambiente 100% protegido</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Truck size={22} className="text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900">Entrega rápida</p>
                    <p className="text-xs text-gray-600 mt-1">Frete grátis em qualquer lugar</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={22} className="text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-900">Suporte 24/7</p>
                    <p className="text-xs text-gray-600 mt-1">Sempre à sua disposição</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-black px-6 py-4 font-bold text-black transition-all duration-200 hover:bg-gray-100 active:translate-y-0.5 cursor-pointer text-base"
              >
                <ArrowLeft size={20} />
                <span>Voltar ao carrinho</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-black py-4 px-6 text-base font-black text-white transition-all duration-200 hover:brightness-95 hover:shadow-lg active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: 'var(--primary-green)' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    <span>Finalizar compra</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Order Summary Sidebar */}
          <aside className="self-start xl:sticky xl:top-28">
            <div className={panelClass}>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Resumo da compra</h2>
              <p className="text-sm text-gray-600 mb-6">
                {totalItems} {totalItems === 1 ? 'item' : 'itens'} no carrinho
              </p>

              {/* Items List */}
              <div className="mb-6 pb-6 border-b-2 border-black/10">
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="group flex items-start gap-3 rounded-xl border border-black/10 p-4 bg-gray-50/50 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <img
                        src={item.product.image}
                        alt={item.product.model}
                        className="h-16 w-16 rounded-lg border border-black/10 object-cover group-hover:shadow-md transition-shadow duration-200 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {item.product.brand} {item.product.model}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {item.product.width}/{item.product.profile}R{item.product.diameter}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-lg font-semibold">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-black text-green-700 shrink-0 text-right">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Frete</span>
                  <span className="font-bold text-green-700 bg-green-100 px-3 py-1 rounded-lg text-xs">
                    Grátis
                  </span>
                </div>

                <div className="h-px bg-black/15" />

                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-gray-900">Total</span>
                  <span className="text-3xl font-black text-green-700">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              {/* Selected Payment Method Info */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 px-5 py-4 mb-6">
                <p className="text-xs uppercase tracking-wider font-bold text-blue-900 mb-2">Método selecionado</p>
                <div className="flex items-center gap-2">
                  {selectedPaymentOption.icon && 
                    <selectedPaymentOption.icon size={18} className="text-blue-700" />
                  }
                  <p className="font-bold text-gray-900">{selectedPaymentOption.label}</p>
                </div>
                <p className="text-xs text-blue-800 mt-2">
                  {paymentMethod === 'credit_card'
                    ? 'Parcelamento disponível em até 12x sem juros.'
                    : 'Confirmação após compensação do pagamento.'}
                </p>
              </div>

              {/* Terms Agreement */}
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-4 text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-2">Ao finalizar você concorda com:</p>
                <ul className="space-y-1.5 text-amber-900">
                  <li>✓ Termos de compra e direitos do consumidor</li>
                  <li>✓ Política de entrega e prazos</li>
                  <li>✓ Endereço de entrega informado</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
