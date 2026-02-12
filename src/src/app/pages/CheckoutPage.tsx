import { useEffect, useMemo, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { useNavigate } from 'react-router-dom';
import { ordersService } from '../../services/supabase';
import { paymentService } from '../../services/paymentService';
import {
  CreditCard,
  Landmark,
  ShieldCheck,
  Truck,
  Wallet,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import './CheckoutPage.css';

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
    description: 'Emissão imediata',
    icon: Landmark,
  },
] as const;

const checkoutSteps = [
  { id: 'personal', label: 'Informações', status: 'done' as const },
  { id: 'delivery', label: 'Entrega', status: 'active' as const },
  { id: 'payment', label: 'Pagamento', status: 'todo' as const },
];

const shippingOptions = [
  {
    id: 'express',
    label: 'Entrega expressa',
    eta: '2 dias úteis',
    priceLabel: 'Grátis',
    description: 'Rastreamento em tempo real e entrega priorizada.',
    icon: Truck,
  },
] as const;

type PaymentMethodValue = (typeof paymentOptions)[number]['value'];
type CheckoutFieldName = keyof CheckoutFormData;
type CheckoutFieldErrors = Partial<Record<CheckoutFieldName, string>>;

type CheckoutFormData = {
  street: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  zipcode: string;
};

const joinClasses = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');
const brazilStates = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);
const streetPattern = /^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s.,\-ºª/]{2,119}$/u;
const numberPattern = /^[A-Za-z0-9\-\/]{1,12}$/;
const cityPattern = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{1,99}$/u;
const complementPattern = /^[A-Za-zÀ-ÿ0-9\s.,\-ºª/#]{0,80}$/u;

const normalizeZipcode = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const sanitizeCheckoutForm = (value: CheckoutFormData): CheckoutFormData => ({
  street: value.street.trim(),
  number: value.number.trim(),
  complement: value.complement.trim(),
  city: value.city.trim(),
  state: value.state.trim().toUpperCase(),
  zipcode: normalizeZipcode(value.zipcode.trim()),
});

const validateCheckoutField = (
  field: CheckoutFieldName,
  value: string,
  formData: CheckoutFormData
): string | null => {
  const normalized = value.trim();

  if (field === 'street') {
    if (!normalized) return 'Informe a rua.';
    if (!streetPattern.test(normalized)) return 'Rua inválida. Verifique o nome informado.';
    return null;
  }

  if (field === 'number') {
    if (!normalized) return 'Informe o número.';
    if (!numberPattern.test(normalized)) return 'Número inválido. Use apenas letras, números, "/" ou "-".';
    return null;
  }

  if (field === 'complement') {
    if (normalized && !complementPattern.test(normalized)) {
      return 'Complemento inválido.';
    }
    return null;
  }

  if (field === 'city') {
    if (!normalized) return 'Informe a cidade.';
    if (!cityPattern.test(normalized)) return 'Cidade inválida.';
    return null;
  }

  if (field === 'state') {
    if (!normalized) return 'Informe o estado.';
    if (!/^[A-Z]{2}$/.test(normalized) || !brazilStates.has(normalized)) {
      return 'UF inválida. Use a sigla de um estado brasileiro (ex.: SP).';
    }
    return null;
  }

  if (field === 'zipcode') {
    if (!normalized) return 'Informe o CEP.';
    if (!/^\d{5}-\d{3}$/.test(normalized)) return 'CEP inválido. Use o formato 00000-000.';
    return null;
  }

  return null;
};

const validateCheckoutForm = (value: CheckoutFormData): CheckoutFieldErrors => {
  const nextErrors: CheckoutFieldErrors = {};
  const fields: CheckoutFieldName[] = ['street', 'number', 'complement', 'city', 'state', 'zipcode'];

  for (const field of fields) {
    const message = validateCheckoutField(field, value[field], value);
    if (message) {
      nextErrors[field] = message;
    }
  }

  return nextErrors;
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user, profile } = useAuthStore();
  const notifyPurchaseCompleted = useNotificationsStore((state) => state.notifyPurchaseCompleted);
  const notifyPaymentApproved = useNotificationsStore((state) => state.notifyPaymentApproved);
  const navigate = useNavigate();
  const storeName = 'Pneus PreçoJusto';
  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;
  const fallbackProductImage = `${import.meta.env.BASE_URL}logo.png`;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>('credit_card');
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [formData, setFormData] = useState<CheckoutFormData>({
    street: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    zipcode: '',
  });

  const subtotal = getTotalPrice();
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const selectedPaymentOption = paymentOptions.find((opt) => opt.value === paymentMethod) || paymentOptions[0];
  const currentShipping = shippingOptions[0];
  const orderCode = useMemo(() => items[0]?.product.id.slice(0, 6).toUpperCase() || 'NOVO', [items]);
  const goToCart = () => navigate('/carrinho');

  useEffect(() => {
    const previousTitle = document.title;
    const previousPrefix = document.body.getAttribute('data-prefix');

    document.title = `Checkout Seguro | ${storeName}`;
    document.body.setAttribute('data-prefix', 'checkout');

    return () => {
      document.title = previousTitle;
      if (previousPrefix) {
        document.body.setAttribute('data-prefix', previousPrefix);
      } else {
        document.body.removeAttribute('data-prefix');
      }
    };
  }, [storeName]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let normalizedValue = value;

    if (name === 'state') {
      normalizedValue = value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
    }

    if (name === 'zipcode') {
      normalizedValue = normalizeZipcode(value);
    }

    if (name === 'number') {
      normalizedValue = value.replace(/[^A-Za-z0-9\-\/]/g, '');
    }

    setFormData((prev) => ({ ...prev, [name]: normalizedValue }));
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name as CheckoutFieldName];
      return next;
    });
  };

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const field = e.target.name as CheckoutFieldName;
    const normalized = sanitizeCheckoutForm(formData);
    const message = validateCheckoutField(field, normalized[field], normalized);

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let createdOrderId: string | null = null;
    let paymentInitiated = false;

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

      const shippingAddress = sanitizeCheckoutForm(formData);
      const nextFieldErrors = validateCheckoutForm(shippingAddress);
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        const firstError = Object.values(nextFieldErrors)[0] || 'Verifique os dados de entrega.';
        throw new Error(firstError);
      }

      const orderData = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        total: subtotal,
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
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

      paymentInitiated = true;

      if (!initiatedPayment?.paymentId) {
        throw new Error('Não foi possível iniciar a confirmação de pagamento');
      }

      if (paymentMethod === 'credit_card') {
        const paymentConfirmation = await paymentService.confirmPayment(initiatedPayment.paymentId);
        if (!paymentConfirmation?.success) {
          throw new Error('Não foi possível confirmar o pagamento');
        }

        const normalizedConfirmationStatus = (paymentConfirmation.status || '').toLowerCase();
        const validConfirmationStatuses = new Set(['confirmed', 'approved', 'processing']);
        if (!validConfirmationStatuses.has(normalizedConfirmationStatus)) {
          throw new Error('Pagamento não confirmado. Tente novamente.');
        }

        if (normalizedConfirmationStatus === 'confirmed' || normalizedConfirmationStatus === 'approved') {
          notifyPaymentApproved(createdOrderId, selectedPaymentOption.label);
        }
      } else {
        const normalizedInitiatedStatus = (initiatedPayment.status || '').toLowerCase();
        const validInitiatedStatuses = new Set(['pending', 'processing', 'confirmed', 'approved']);
        if (!validInitiatedStatuses.has(normalizedInitiatedStatus)) {
          throw new Error('Não foi possível iniciar o pagamento. Tente novamente.');
        }
      }

      clearCart();
      notifyPurchaseCompleted(createdOrderId);
      navigate('/orders');
    } catch (err: unknown) {
      if (createdOrderId && !paymentInitiated) {
        try {
          await ordersService.updateStatus(createdOrderId, 'cancelled');
        } catch (_cancelError) {
          // Mantem o erro principal
        }
      }

      const fallbackMessage = err instanceof Error ? err.message : 'Erro ao processar pedido';
      if (createdOrderId && paymentInitiated) {
        setError(`${fallbackMessage} Verifique o status em "Meus Pedidos".`);
      } else {
        setError(fallbackMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-gradient-to-b from-gray-50 to-white min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm max-w-2xl w-full text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <Wallet size={40} className="text-amber-700" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Checkout indisponível</h1>
          <p className="text-gray-600 mb-10 text-lg leading-relaxed">
            Seu carrinho está vazio. Adicione alguns pneus para começar sua compra.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-black px-8 py-4 font-black text-black transition duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 cursor-pointer text-base"
            style={{ background: 'var(--primary-yellow)' }}
          >
            <ArrowLeft size={20} />
            <span>Voltar ao catálogo</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-shell min-h-screen bg-[#f4f6fb]">
      <div className="mx-auto max-w-6xl px-4 py-8 checkout-shell-container">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-black/10 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img src={logoUrl} alt={storeName} className="checkout-logo h-12 w-auto object-contain" loading="eager" />
            <div className="leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-400">Checkout seguro</p>
              <h1 className="text-2xl font-black text-gray-900">{storeName}</h1>
            </div>
          </div>

          <Pill>
            <ShieldCheck size={16} />
            <span>Seus dados 100% seguros</span>
          </Pill>
        </header>

        <nav className="mb-8 rounded-3xl border border-black/10 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-500">Etapas</p>
            <ol className="flex flex-wrap gap-3" aria-label="Etapas do checkout">
              {checkoutSteps.map((step, index) => (
                <StepChip key={step.id} state={step.status} label={step.label} number={index + 1} />
              ))}
            </ol>
          </div>
        </nav>

        <div className="checkout-layout grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-3xl border border-red-300 bg-red-50 px-6 py-5 flex gap-4"
              >
                <AlertCircle className="text-red-600 mt-1" size={20} />
                <div>
                  <p className="text-sm font-bold text-red-800">Erro ao processar compra</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            <Card>
              <CardHeader
                kicker="Passo 1"
                title="Informações pessoais"
                right={
                  <Pill>
                    <ShieldCheck size={16} />
                    <span>Dados protegidos</span>
                  </Pill>
                }
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Info label="E-mail" value={user?.email ?? 'Preencha seu e-mail cadastrado'} />
                <Info label="Telefone" value={profile?.phone || 'Atualize em Minha conta'} />
                <Info label="CPF" value={profile?.cpf || 'Cadastro seguro'} />
              </div>
              <p className="text-xs text-gray-500">
                Utilizamos seus dados para agilizar o preenchimento. Atualize-os em "Minha conta" caso precise.
              </p>
            </Card>

            <Card>
              <CardHeader
                kicker="Passo 2"
                title="Endereço de entrega"
                right={<span className="text-xs font-semibold text-gray-500">Confirme CEP e número</span>}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Rua" htmlFor="checkout-street" error={fieldErrors.street}>
                  <Input
                    id="checkout-street"
                    name="street"
                    placeholder="Ex: Avenida Paulista"
                    autoComplete="street-address"
                    required
                    value={formData.street}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    aria-invalid={Boolean(fieldErrors.street)}
                    className={fieldErrors.street ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : undefined}
                  />
                </Field>

                <Field label="Número" htmlFor="checkout-number" error={fieldErrors.number}>
                  <Input
                    id="checkout-number"
                    name="number"
                    placeholder="Ex: 1000"
                    inputMode="numeric"
                    autoComplete="address-line1"
                    required
                    value={formData.number}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    aria-invalid={Boolean(fieldErrors.number)}
                    className={fieldErrors.number ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : undefined}
                  />
                </Field>

                <Field
                  label="Complemento"
                  className="md:col-span-2"
                  htmlFor="checkout-complement"
                  error={fieldErrors.complement}
                >
                  <Input
                    id="checkout-complement"
                    name="complement"
                    placeholder="Apto, bloco, sala..."
                    autoComplete="address-line2"
                    value={formData.complement}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    aria-invalid={Boolean(fieldErrors.complement)}
                    className={fieldErrors.complement ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : undefined}
                  />
                </Field>

                <Field label="Cidade" htmlFor="checkout-city" error={fieldErrors.city}>
                  <Input
                    id="checkout-city"
                    name="city"
                    placeholder="Ex: São Paulo"
                    autoComplete="address-level2"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    aria-invalid={Boolean(fieldErrors.city)}
                    className={fieldErrors.city ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : undefined}
                  />
                </Field>

                <Field label="Estado (UF)" htmlFor="checkout-state" error={fieldErrors.state}>
                  <Input
                    id="checkout-state"
                    name="state"
                    placeholder="Ex: SP"
                    maxLength={2}
                    autoComplete="address-level1"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    aria-invalid={Boolean(fieldErrors.state)}
                    className={fieldErrors.state ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : undefined}
                  />
                </Field>

                <Field label="CEP" className="md:col-span-2" htmlFor="checkout-zipcode" error={fieldErrors.zipcode}>
                  <Input
                    id="checkout-zipcode"
                    name="zipcode"
                    placeholder="Ex: 01311-100"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    required
                    value={formData.zipcode}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    aria-invalid={Boolean(fieldErrors.zipcode)}
                    className={fieldErrors.zipcode ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : undefined}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader
                kicker="Passo 3"
                title="Forma de pagamento"
                right={<span className="text-xs font-semibold text-gray-500">Até 12x</span>}
              />

              <fieldset className="space-y-3">
                <legend className="sr-only">Selecione a forma de pagamento</legend>
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = paymentMethod === option.value;

                  return (
                    <RadioCard
                      key={option.value}
                      name="payment_method"
                      value={option.value}
                      isSelected={isSelected}
                      onSelect={() => setPaymentMethod(option.value)}
                      title={option.label}
                      subtitle={option.description}
                      icon={<Icon size={22} />}
                    />
                  );
                })}
              </fieldset>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <p className="font-black">Checkout protegido</p>
                <p className="text-amber-900/90">
                  Criptografia SSL 256 bits. Nunca armazenamos dados sensíveis em nosso servidor.
                </p>
              </div>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goToCart}
                className="flex-1 rounded-2xl border border-black/15 bg-white px-6 py-4 text-base font-black text-gray-900 shadow-sm transition hover:bg-gray-50"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <ArrowLeft size={20} />
                  Voltar ao carrinho
                </span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-2xl bg-black px-6 py-4 text-base font-black text-white shadow-sm transition hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" />
                    Processando...
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <CheckCircle2 size={20} />
                    Finalizar compra
                  </span>
                )}
              </button>
            </div>
          </form>

          <aside className="checkout-summary space-y-5 lg:sticky lg:top-8 lg:self-start">
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">Entrega</h3>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  {currentShipping.priceLabel}
                </span>
              </div>

              <div
                className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-green-600 bg-green-50 px-4 py-3"
                aria-label={`${currentShipping.label} | ${currentShipping.eta} | ${currentShipping.priceLabel}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-green-600 bg-green-100 text-green-700">
                  <Truck size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-gray-900">{currentShipping.label}</p>
                  <p className="text-sm text-gray-500">{currentShipping.description}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">
                    {currentShipping.eta}
                  </p>
                </div>
                <div className="text-sm font-black text-gray-900">{currentShipping.priceLabel}</div>
              </div>
            </Card>

            <Card>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-500">Resumo</p>

              <div className="mt-2">
                <h3 className="text-2xl font-black text-gray-900">Pedido #{orderCode}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {totalItems} {totalItems === 1 ? 'item' : 'itens'} no carrinho
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3 rounded-2xl border border-black/10 bg-gray-50/70 p-4">
                    <img
                      src={item.product.image}
                      alt={item.product.model}
                      className="checkout-order-item-image h-16 w-16 flex-shrink-0 rounded-xl border border-black/10 bg-white object-contain"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = fallbackProductImage;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-gray-900">
                        {item.product.brand} {item.product.model}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.product.width}/{item.product.profile}R{item.product.diameter}
                      </p>
                      <span className="mt-2 inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        Qty: {item.quantity}
                      </span>
                    </div>
                    <p className="text-sm font-black text-green-700">{formatCurrency(item.product.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3 border-t border-black/10 pt-4">
                <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
                <SummaryRow
                  label={`Frete (${currentShipping.label})`}
                  value={currentShipping.priceLabel}
                  valueClass="text-green-700"
                />
                <div className="h-px bg-black/10" />
                <SummaryRow label="Total" value={formatCurrency(subtotal)} isStrong />
              </div>

              <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-green-700" />
                  <p className="text-sm font-semibold text-gray-900">Compra protegida</p>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Método: {selectedPaymentOption.label}. Ao finalizar, você concorda com os termos e confirma os dados informados.
                </p>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

type CardProps = {
  children: ReactNode;
};

function Card({ children }: CardProps) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="space-y-5">{children}</div>
    </section>
  );
}

type CardHeaderProps = {
  kicker: string;
  title: string;
  right?: ReactNode;
};

function CardHeader({ kicker, title, right }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-400">{kicker}</p>
        <h2 className="text-2xl font-black text-gray-900">{title}</h2>
      </div>
      {right}
    </div>
  );
}

type PillProps = {
  children: ReactNode;
};

function Pill({ children }: PillProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
      {children}
    </div>
  );
}

type InfoProps = {
  label: string;
  value: string;
};

function Info({ label, value }: InfoProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  error?: string;
};

function Field({ label, children, className, htmlFor, error }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-semibold text-gray-600">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={joinClasses(
        'h-12 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-sm text-gray-900',
        'placeholder:text-gray-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200',
        props.className
      )}
    />
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
  isStrong?: boolean;
  valueClass?: string;
};

function SummaryRow({ label, value, isStrong = false, valueClass }: SummaryRowProps) {
  return (
    <div
      className={joinClasses(
        'flex items-center justify-between',
        isStrong ? 'text-lg font-black text-gray-900' : 'text-sm font-semibold text-gray-700'
      )}
    >
      <span>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

type StepChipProps = {
  state: 'done' | 'active' | 'todo';
  label: string;
  number: number;
};

function StepChip({ state, label, number }: StepChipProps) {
  const chipClass =
    state === 'done'
      ? 'border-green-600 bg-green-50 text-green-700'
      : state === 'active'
      ? 'border-amber-500 bg-amber-50 text-amber-700'
      : 'border-black/10 bg-white text-gray-500';

  return (
    <li
      className={joinClasses(
        'flex items-center gap-3 rounded-2xl border px-4 py-2 text-sm font-semibold',
        chipClass
      )}
      aria-current={state === 'active' ? 'step' : undefined}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full border text-[0.7rem] font-black uppercase leading-none">
        {state === 'done' ? <CheckCircle2 size={16} className="text-green-600" /> : number}
      </span>
      <span>{label}</span>
    </li>
  );
}

type RadioCardProps = {
  name: string;
  value: string;
  isSelected: boolean;
  onSelect: () => void;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  badge?: string;
  price?: string;
  isCompact?: boolean;
};

function RadioCard({
  name,
  value,
  isSelected,
  onSelect,
  title,
  subtitle,
  icon,
  badge,
  price,
  isCompact = false,
}: RadioCardProps) {
  return (
    <label
      className={joinClasses(
        'group flex cursor-pointer items-center gap-4 rounded-2xl border-2 transition',
        isCompact ? 'px-4 py-3' : 'px-5 py-4',
        isSelected ? 'border-green-600 bg-green-50 shadow-md' : 'border-black/10 bg-white hover:border-black/25 hover:bg-gray-50'
      )}
      aria-label={badge ? `${title} | ${badge} | ${price || ''}` : title}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
      />

      <div
        className={joinClasses(
          'flex h-12 w-12 items-center justify-center rounded-xl border-2 transition',
          isSelected ? 'border-green-600 bg-green-100 text-green-700' : 'border-gray-200 bg-white text-gray-700'
        )}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-black text-gray-900">{title}</p>
        {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
        {badge ? <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">{badge}</p> : null}
      </div>

      {price ? <div className="text-sm font-black text-gray-900">{price}</div> : null}

      <div
        className={joinClasses(
          'h-6 w-6 rounded-full border-2 flex items-center justify-center transition',
          isSelected ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 bg-white text-transparent'
        )}
        aria-hidden="true"
      >
        <CheckCircle2 size={16} />
      </div>
    </label>
  );
}
