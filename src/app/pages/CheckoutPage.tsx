import { useMemo, useState } from 'react';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { useNavigate } from 'react-router-dom';
import { ordersService } from '../../services/supabase';
import { paymentService } from '../../services/paymentService';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Landmark,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Truck,
  Wallet,
} from 'lucide-react';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const acceptedConfirmationStatuses = new Set(['confirmed', 'approved', 'pending', 'processing']);
const approvedPaymentStatuses = new Set(['confirmed', 'approved']);

const paymentOptions = [
  {
    value: 'credit_card',
    label: 'Cartao de credito',
    description: 'Confirmacao imediata apos validacao',
    icon: CreditCard,
    highlight: 'Mais rapido',
  },
  {
    value: 'pix',
    label: 'PIX',
    description: 'Pagamento instantaneo com chave dinamica',
    icon: Wallet,
    highlight: 'Sem taxa',
  },
  {
    value: 'boleto',
    label: 'Boleto bancario',
    description: 'Compensacao conforme horario bancario',
    icon: Landmark,
    highlight: 'Flexivel',
  },
] as const;

type PaymentMethodValue = (typeof paymentOptions)[number]['value'];

type CheckoutAddressForm = {
  street: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  zipcode: string;
};

const initialFormData: CheckoutAddressForm = {
  street: '',
  number: '',
  complement: '',
  city: '',
  state: '',
  zipcode: '',
};

const paymentMethodLabels: Record<PaymentMethodValue, string> = {
  credit_card: 'Cartao de credito',
  pix: 'PIX',
  boleto: 'Boleto bancario',
};

const addressFields: Array<{
  name: keyof CheckoutAddressForm;
  label: string;
  placeholder: string;
  autoComplete: string;
  colSpan?: string;
}> = [
  {
    name: 'street',
    label: 'Rua',
    placeholder: 'Ex.: Avenida Paulista',
    autoComplete: 'address-line1',
    colSpan: 'md:col-span-2',
  },
  {
    name: 'number',
    label: 'Numero',
    placeholder: 'Ex.: 1500',
    autoComplete: 'address-line2',
  },
  {
    name: 'complement',
    label: 'Complemento',
    placeholder: 'Ex.: Bloco B, apto 45 (opcional)',
    autoComplete: 'address-line2',
  },
  {
    name: 'city',
    label: 'Cidade',
    placeholder: 'Ex.: Sao Paulo',
    autoComplete: 'address-level2',
  },
  {
    name: 'state',
    label: 'Estado',
    placeholder: 'Ex.: SP',
    autoComplete: 'address-level1',
  },
  {
    name: 'zipcode',
    label: 'CEP',
    placeholder: 'Ex.: 01310-100',
    autoComplete: 'postal-code',
    colSpan: 'md:col-span-2',
  },
];

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const normalizePaymentStatus = (status?: string | null) => (status || '').trim().toLowerCase();

const sectionCardClass =
  'rounded-3xl border border-black/10 bg-white/90 p-6 md:p-7 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm';

const inputClass =
  'h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-gray-900 placeholder:text-gray-400 transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100';

export function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const notifyPurchaseCompleted = useNotificationsStore((state) => state.notifyPurchaseCompleted);
  const notifyPaymentApproved = useNotificationsStore((state) => state.notifyPaymentApproved);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>('credit_card');
  const [formData, setFormData] = useState<CheckoutAddressForm>(initialFormData);

  const subtotal = getTotalPrice();
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  const selectedPaymentOption = useMemo(
    () => paymentOptions.find((option) => option.value === paymentMethod) || paymentOptions[0],
    [paymentMethod]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      let finalPaymentStatus = normalizePaymentStatus(paymentConfirmation.status);

      if (!acceptedConfirmationStatuses.has(finalPaymentStatus)) {
        throw new Error('Pagamento nao confirmado. Tente novamente.');
      }

      try {
        const paymentSnapshot = await paymentService.getPaymentStatus(initiatedPayment.paymentId);
        const snapshotStatus = normalizePaymentStatus(paymentSnapshot?.status);
        if (snapshotStatus) {
          finalPaymentStatus = snapshotStatus;
        }
      } catch (_snapshotError) {
        // Mantem o status retornado na confirmacao.
      }

      if (approvedPaymentStatuses.has(finalPaymentStatus)) {
        notifyPaymentApproved(createdOrderId, paymentMethodLabels[paymentMethod]);
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
        <div className="mx-auto max-w-2xl rounded-3xl border border-black/15 bg-white p-8 text-center shadow-[0_20px_42px_rgba(15,23,42,0.10)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Wallet size={28} />
          </div>
          <h1 className="mb-3 text-2xl font-black text-gray-900 md:text-3xl">Checkout indisponivel</h1>
          <p className="mb-7 text-gray-600">Seu carrinho esta vazio no momento.</p>
          <button
            onClick={() => navigate('/products')}
            className="rounded-2xl border-2 border-black px-6 py-3 font-black text-black transition hover:-translate-y-0.5"
            style={{ background: 'var(--primary-yellow)' }}
          >
            Voltar ao catalogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_0%_0%,#fef3c7_0%,transparent_45%),radial-gradient(circle_at_95%_10%,#d1fae5_0%,transparent_40%),linear-gradient(180deg,#f8fafc_0%,#f0fdf4_52%,#fffbeb_100%)]">
      <div className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-yellow-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 top-10 h-72 w-72 rounded-full bg-emerald-200/45 blur-3xl" />

      <div className="container relative z-10 mx-auto px-4 py-10 md:py-12">
        <section className="relative overflow-hidden rounded-[28px] border-2 border-black bg-[linear-gradient(130deg,#0f172a_0%,#14532d_52%,#047857_100%)] px-6 py-7 text-white shadow-[0_26px_55px_rgba(0,0,0,0.28)] md:px-8 md:py-9">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-yellow-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 left-8 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
              <Sparkles size={14} />
              Checkout premium
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
              <Lock size={14} />
              Ambiente protegido
            </span>
          </div>

          <h1 className="relative z-10 mt-4 text-3xl font-black text-white md:text-4xl">Finalize seu pagamento</h1>
          <p className="relative z-10 mt-3 max-w-3xl text-sm text-emerald-50 md:text-base">
            Revise endereco, confirme o metodo e conclua com seguranca. A validacao do pagamento acontece em fluxo
            protegido antes da confirmacao final do pedido.
          </p>

          <div className="relative z-10 mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-sm font-bold">1. Entrega</div>
            <div className="rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-sm font-bold">2. Pagamento</div>
            <div className="rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-sm font-bold">3. Confirmacao</div>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[1.25fr_0.75fr]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <section className={sectionCardClass}>
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                  <MapPin size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 md:text-2xl">Endereco de entrega</h2>
                  <p className="text-sm text-gray-600">Dados completos evitam atraso no despacho do pedido.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {addressFields.map((field) => (
                  <label key={field.name} className={field.colSpan || ''}>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-gray-600">
                      {field.label}
                    </span>
                    <input
                      type="text"
                      name={field.name}
                      autoComplete={field.autoComplete}
                      placeholder={field.placeholder}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      className={inputClass}
                      required={field.name !== 'complement'}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className={sectionCardClass}>
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 md:text-2xl">Metodo de pagamento</h2>
                  <p className="text-sm text-gray-600">Escolha o formato ideal para fechar sua compra.</p>
                </div>
              </div>

              <div className="space-y-3">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = paymentMethod === option.value;

                  return (
                    <label
                      key={option.value}
                      className={`group flex cursor-pointer items-center gap-4 rounded-2xl border px-4 py-3 transition ${
                        isSelected
                          ? 'border-emerald-300 bg-[linear-gradient(120deg,#ecfdf5_0%,#f0fdf4_60%,#fffbeb_100%)] shadow-[0_8px_20px_rgba(16,185,129,0.15)]'
                          : 'border-black/15 bg-white hover:border-black/35'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={isSelected}
                        onChange={(event) => setPaymentMethod(event.target.value as PaymentMethodValue)}
                        className="sr-only"
                      />

                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                          isSelected ? 'border-emerald-300 bg-white text-emerald-700' : 'border-black/20 text-gray-700'
                        }`}
                      >
                        <Icon size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-gray-900 md:text-base">{option.label}</p>
                          <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600">
                            {option.highlight}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-600">{option.description}</p>
                      </div>

                      {isSelected ? (
                        <CheckCircle2 size={20} className="text-emerald-600" />
                      ) : (
                        <span className="h-5 w-5 rounded-full border border-black/25" />
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldCheck size={15} />
                    Validacao antifraude ativa
                  </div>
                  <p className="mt-1 text-xs text-emerald-700">A analise roda antes da confirmacao do pedido.</p>
                </div>
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                  <div className="flex items-center gap-2 font-bold">
                    <Clock3 size={15} />
                    Atualizacao de status
                  </div>
                  <p className="mt-1 text-xs text-yellow-700">Aprovacoes sao notificadas no checkout e em pedidos.</p>
                </div>
              </div>
            </section>

            <section className={sectionCardClass}>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
                  <ShieldCheck size={15} className="text-green-700" />
                  Compra segura
                </div>
                <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
                  <Truck size={15} className="text-green-700" />
                  Envio rapido
                </div>
                <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
                  <Wallet size={15} className="text-green-700" />
                  Suporte prioritario
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-black/70 bg-[linear-gradient(135deg,#00A651_0%,#047857_100%)] px-5 py-3.5 text-base font-black text-white shadow-[0_12px_28px_rgba(0,166,81,0.35)] transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white" />
                  Validando e confirmando pagamento...
                </>
              ) : (
                <>
                  Confirmar e pagar
                  <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <aside className="self-start xl:sticky xl:top-24">
            <div className={`${sectionCardClass} border-black/10`}>
              <h2 className="text-2xl font-black text-gray-900">Resumo da compra</h2>
              <p className="mt-1 text-sm text-gray-600">
                {totalItems} {totalItems === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>

              <div className="mt-5 max-h-[350px] space-y-3 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_5px_14px_rgba(0,0,0,0.06)]"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.model}
                      className="h-16 w-16 rounded-xl border border-black/10 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-gray-900">
                        {item.product.brand} {item.product.model}
                      </p>
                      <p className="text-xs text-gray-600">
                        {item.product.width}/{item.product.profile}R{item.product.diameter} x{item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-black text-gray-900">{formatCurrency(item.product.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="my-6 h-px bg-black/10" />

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Frete</span>
                  <span className="font-bold text-emerald-700">Gratis</span>
                </div>
                <div className="flex items-center justify-between border-t border-black/10 pt-3 text-lg font-black text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800">Metodo selecionado</p>
                <p className="mt-1 text-base font-black text-gray-900">{selectedPaymentOption.label}</p>
                <p className="mt-1 text-xs text-gray-700">
                  {paymentMethod === 'credit_card'
                    ? 'Aprovacao em segundos apos validacao no checkout.'
                    : 'Aprovacao concluida apos compensacao do pagamento.'}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50/80 p-4 text-xs text-yellow-900">
                Ao finalizar, voce concorda com os termos de compra e politica de entrega.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
