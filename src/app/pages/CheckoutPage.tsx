import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { ordersService } from '../../services/supabase';
import { paymentService, type CheckoutPaymentData } from '../../services/paymentService';
import { obterEnderecos, salvarEndereco, type EnderecoResponse } from '../../services/enderecoService';
import { validarCartao, validarValidadeCartao } from '../../services/blackcatService';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { useIsMobile } from '../components/ui/use-mobile';
import './CheckoutPage.css';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const pixDiscountRate = 0.05;

const paymentOptions = [
  { value: 'credit_card', label: 'Cartao de Credito', hint: 'Ate 12x sem juros', icon: CreditCard, badge: '' },
  { value: 'pix', label: 'PIX', hint: 'Aprovacao imediata', icon: Wallet, badge: '5% OFF' },
  { value: 'boleto', label: 'Boleto', hint: 'Pagamento no vencimento', icon: Landmark, badge: '' },
] as const;

type PaymentMethodValue = (typeof paymentOptions)[number]['value'];

interface AddressFormData {
  email: string;
  fullName: string;
  street: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  zipcode: string;
}

interface PaymentFormData {
  cardHolderName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardInstallments: number;
  pixPayerName: string;
  pixPayerCpf: string;
  boletoPayerName: string;
  boletoPayerCpf: string;
  boletoPayerEmail: string;
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const onlyDigits = (value: string) => value.replace(/\D/g, '');
const normalizeZipcode = (value: string) => onlyDigits(value).slice(0, 8);

const formatZipcodeInput = (value: string) => {
  const normalized = normalizeZipcode(value);
  if (normalized.length <= 5) return normalized;
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
};

const formatCpfInput = (value: string) => {
  const normalized = onlyDigits(value).slice(0, 11);
  if (normalized.length <= 3) return normalized;
  if (normalized.length <= 6) return `${normalized.slice(0, 3)}.${normalized.slice(3)}`;
  if (normalized.length <= 9) return `${normalized.slice(0, 3)}.${normalized.slice(3, 6)}.${normalized.slice(6)}`;
  return `${normalized.slice(0, 3)}.${normalized.slice(3, 6)}.${normalized.slice(6, 9)}-${normalized.slice(9)}`;
};

const formatCardNumberInput = (value: string) => onlyDigits(value).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

const formatCardExpiryInput = (value: string) => {
  const normalized = onlyDigits(value).slice(0, 4);
  if (normalized.length <= 2) return normalized;
  return `${normalized.slice(0, 2)}/${normalized.slice(2)}`;
};

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  if (firstDigit !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;

  return secondDigit === Number(cpf[10]);
};

const addressToForm = (address: EnderecoResponse) => ({
  street: address.rua || '',
  number: address.numero || '',
  complement: address.complemento || '',
  city: address.cidade || '',
  state: String(address.estado || '').toUpperCase().slice(0, 2),
  zipcode: formatZipcodeInput(address.cep || ''),
});

const describeAddress = (address: EnderecoResponse) => {
  const complement = address.complemento ? `, ${address.complemento}` : '';
  return `${address.rua}, ${address.numero}${complement} - ${address.cidade}/${address.estado} - ${formatZipcodeInput(address.cep || '')}`;
};

export function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user, profile } = useAuthStore();
  const notifyPurchaseCompleted = useNotificationsStore((state) => state.notifyPurchaseCompleted);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>('credit_card');
  const [formData, setFormData] = useState<AddressFormData>({
    email: '',
    fullName: '',
    street: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    zipcode: '',
  });
  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    cardHolderName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardInstallments: 1,
    pixPayerName: '',
    pixPayerCpf: '',
    boletoPayerName: '',
    boletoPayerCpf: '',
    boletoPayerEmail: '',
  });
  const [savedAddresses, setSavedAddresses] = useState<EnderecoResponse[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [isZipcodeLookupLoading, setIsZipcodeLookupLoading] = useState(false);
  const [zipcodeLookupMessage, setZipcodeLookupMessage] = useState('');
  const [zipcodeLookupError, setZipcodeLookupError] = useState(false);
  const [lastZipcodeLookup, setLastZipcodeLookup] = useState('');

  const subtotal = getTotalPrice();
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const pixTotal = useMemo(() => roundCurrency(subtotal * (1 - pixDiscountRate)), [subtotal]);
  const checkoutTotal = paymentMethod === 'pix' ? pixTotal : subtotal;
  const pixDiscountValue = useMemo(() => Math.max(0, roundCurrency(subtotal - pixTotal)), [subtotal, pixTotal]);
  const selectedAddress = useMemo(
    () => savedAddresses.find((address) => address.id === selectedAddressId) || null,
    [savedAddresses, selectedAddressId]
  );

  useEffect(() => {
    const previousPrefix = document.body.getAttribute('data-prefix');
    document.body.setAttribute('data-prefix', 'checkout');

    return () => {
      if (previousPrefix === null) {
        document.body.removeAttribute('data-prefix');
      } else {
        document.body.setAttribute('data-prefix', previousPrefix);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadAddresses = async () => {
      if (!user?.id) return;
      setLoadingAddresses(true);

      try {
        const addresses = await obterEnderecos(user.id);
        if (!active) return;

        setSavedAddresses(addresses);

        if (addresses.length > 0) {
          const preferred = addresses.find((address) => address.endereco_padrao) || addresses[0];
          setSelectedAddressId(preferred.id);

          setFormData((current) => {
            if (current.street) return current;
            return {
              ...current,
              ...addressToForm(preferred),
              fullName: current.fullName || preferred.nome_completo || '',
            };
          });
        }
      } finally {
        if (active) setLoadingAddresses(false);
      }
    };

    void loadAddresses();

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const defaultName = String(profile?.name || user?.user_metadata?.name || '').trim();
    const defaultEmail = String(user?.email || '').trim();
    const defaultCpf = formatCpfInput(String(profile?.cpf || user?.user_metadata?.cpf || '').trim());

    if (!defaultName && !defaultEmail && !defaultCpf) return;

    setFormData((current) => ({
      ...current,
      fullName: current.fullName || defaultName,
      email: current.email || defaultEmail,
    }));

    setPaymentData((current) => ({
      ...current,
      cardHolderName: current.cardHolderName || defaultName.toUpperCase(),
      pixPayerName: current.pixPayerName || defaultName,
      pixPayerCpf: current.pixPayerCpf || defaultCpf,
      boletoPayerName: current.boletoPayerName || defaultName,
      boletoPayerCpf: current.boletoPayerCpf || defaultCpf,
      boletoPayerEmail: current.boletoPayerEmail || defaultEmail,
    }));
  }, [profile?.cpf, profile?.name, user?.email, user?.user_metadata?.cpf, user?.user_metadata?.name]);

  const fetchAddressByZipcode = async (zipcodeValue: string) => {
    const normalizedZipcode = normalizeZipcode(zipcodeValue);

    if (normalizedZipcode.length !== 8) {
      setZipcodeLookupMessage('CEP invalido. Informe 8 digitos.');
      setZipcodeLookupError(true);
      return;
    }

    if (normalizedZipcode === lastZipcodeLookup && !zipcodeLookupError) {
      return;
    }

    setIsZipcodeLookupLoading(true);
    setZipcodeLookupMessage('');
    setZipcodeLookupError(false);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${normalizedZipcode}/json/`);
      if (!response.ok) {
        throw new Error('Falha na consulta do CEP');
      }

      const data = (await response.json()) as ViaCepResponse;
      if (data?.erro) {
        setZipcodeLookupMessage('CEP nao encontrado. Verifique e tente novamente.');
        setZipcodeLookupError(true);
        return;
      }

      setFormData((current) => ({
        ...current,
        zipcode: formatZipcodeInput(normalizedZipcode),
        street: current.street || String(data.logradouro || '').trim(),
        city: current.city || String(data.localidade || '').trim(),
        state: current.state || String(data.uf || '').toUpperCase().slice(0, 2),
        complement: current.complement || String(data.bairro || '').trim(),
      }));
      setLastZipcodeLookup(normalizedZipcode);
      setZipcodeLookupMessage('Endereco preenchido automaticamente via ViaCEP.');
      setZipcodeLookupError(false);
    } catch {
      setZipcodeLookupMessage('Erro ao consultar ViaCEP. Tente novamente em instantes.');
      setZipcodeLookupError(true);
    } finally {
      setIsZipcodeLookupLoading(false);
    }
  };

  const handleAddressInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    if (!['email', 'fullName'].includes(name)) {
      setSelectedAddressId(null);
    }

    setFormData((current) => {
      if (name === 'zipcode') return { ...current, zipcode: formatZipcodeInput(value) };
      if (name === 'state') return { ...current, state: value.toUpperCase().slice(0, 2) };
      return { ...current, [name]: value };
    });

    if (name === 'zipcode') {
      const normalizedZipcode = normalizeZipcode(value);
      if (normalizedZipcode.length === 8) {
        void fetchAddressByZipcode(normalizedZipcode);
      } else {
        setZipcodeLookupMessage('');
        setZipcodeLookupError(false);
      }
    }
  };

  const buildPaymentPayload = (): { payload?: CheckoutPaymentData; message?: string } => {
    if (paymentMethod === 'credit_card') {
      const holderName = paymentData.cardHolderName.trim();
      const cardNumber = onlyDigits(paymentData.cardNumber);
      const cvv = onlyDigits(paymentData.cardCvv);
      const [expiryMonth, expiryYear] = paymentData.cardExpiry.split('/');

      if (holderName.length < 3) return { message: 'Nome no cartao invalido.' };
      if (!validarCartao(cardNumber)) return { message: 'Numero de cartao invalido.' };
      if (!validarValidadeCartao(expiryMonth || '', expiryYear || '')) return { message: 'Validade do cartao invalida.' };
      if (cvv.length < 3 || cvv.length > 4) return { message: 'CVV invalido.' };

      return {
        payload: {
          holderName,
          cardNumber,
          expiryMonth: expiryMonth || '',
          expiryYear: expiryYear || '',
          cvv,
          installments: paymentData.cardInstallments,
        },
      };
    }

    if (paymentMethod === 'pix') {
      const payerName = paymentData.pixPayerName.trim();
      const payerCpf = onlyDigits(paymentData.pixPayerCpf);

      if (payerName.length < 3) return { message: 'Nome do pagador PIX invalido.' };
      if (!isValidCpf(payerCpf)) return { message: 'CPF do pagador PIX invalido.' };

      return { payload: { payerName, payerCpf } };
    }

    const payerName = paymentData.boletoPayerName.trim();
    const payerCpf = onlyDigits(paymentData.boletoPayerCpf);
    const payerEmail = paymentData.boletoPayerEmail.trim().toLowerCase();

    if (payerName.length < 3) return { message: 'Nome do pagador no boleto invalido.' };
    if (!isValidCpf(payerCpf)) return { message: 'CPF do pagador no boleto invalido.' };
    if (!emailRegex.test(payerEmail)) return { message: 'Email de boleto invalido.' };

    return { payload: { payerName, payerCpf, payerEmail } };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    let createdOrderId: string | null = null;

    try {
      if (!user) throw new Error('Usuario nao autenticado.');
      if (items.length === 0) throw new Error('Carrinho vazio.');
      if (items.some((item) => !uuidRegex.test(item.product.id))) throw new Error('Carrinho contem produtos invalidos.');
      if (!emailRegex.test(formData.email.trim())) throw new Error('Informe um email valido.');
      if (formData.fullName.trim().length < 3) throw new Error('Informe o nome completo para entrega.');

      const normalizedAddress = {
        street: formData.street.trim(),
        number: formData.number.trim(),
        complement: formData.complement.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase().slice(0, 2),
        zipcode: normalizeZipcode(formData.zipcode),
      };

      if (!normalizedAddress.street || !normalizedAddress.number || !normalizedAddress.city || normalizedAddress.state.length !== 2 || normalizedAddress.zipcode.length !== 8) {
        throw new Error('Endereco de entrega invalido.');
      }

      const paymentPayload = buildPaymentPayload();
      if (!paymentPayload.payload) throw new Error(paymentPayload.message || 'Dados de pagamento invalidos.');

      if (!selectedAddressId) {
        try {
          const persistedAddress = await salvarEndereco({
            usuario_id: user.id,
            nome_completo: formData.fullName.trim(),
            rua: normalizedAddress.street,
            numero: normalizedAddress.number,
            complemento: normalizedAddress.complement || undefined,
            cidade: normalizedAddress.city,
            estado: normalizedAddress.state,
            cep: normalizedAddress.zipcode,
            verificado: true,
            endereco_padrao: false,
          });

          setSavedAddresses((previous) => [persistedAddress, ...previous]);
          setSelectedAddressId(persistedAddress.id);
        } catch (addressError: any) {
          const normalizedAddressError = String(addressError?.message || '').toLowerCase();
          const isDuplicateAddress = normalizedAddressError.includes('duplicate key value violates unique constraint');

          if (!isDuplicateAddress) {
            throw new Error('Nao foi possivel salvar o endereco de entrega.');
          }
        }
      }

      const orderData = {
        items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity, price: item.product.price })),
        total: checkoutTotal,
        payment_method: paymentMethod,
        shipping_address: normalizedAddress,
      };

      const { data: createdOrder, error: orderError } = await ordersService.create(orderData);
      if (orderError) throw new Error(orderError.message || 'Erro ao criar pedido.');

      createdOrderId = createdOrder?.id || null;
      if (!createdOrderId || !uuidRegex.test(createdOrderId)) throw new Error('Pedido criado com identificador invalido.');

      const initiatedPayment = await paymentService.createCharge(
        checkoutTotal,
        createdOrderId,
        paymentMethod,
        `checkout-${createdOrderId}`,
        paymentPayload.payload
      );

      if (!initiatedPayment?.paymentId) throw new Error('Nao foi possivel iniciar pagamento.');

      const paymentConfirmation = await paymentService.confirmPayment(initiatedPayment.paymentId);
      if (!paymentConfirmation?.success) throw new Error('Nao foi possivel confirmar o pagamento.');

      clearCart();
      notifyPurchaseCompleted(createdOrderId);
      navigate('/orders');
    } catch (submitError: any) {
      if (createdOrderId) {
        try {
          await ordersService.updateStatus(createdOrderId, 'cancelled');
        } catch {
          // keep original checkout error
        }
      }

      setError(submitError?.message || 'Erro ao processar pedido.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="checkout-shell checkout-zip-empty">
        <div className="checkout-shell-container">
          <div className="checkout-empty-panel">
            <h1>Checkout indisponivel</h1>
            <p>Seu carrinho esta vazio.</p>
            <button type="button" onClick={() => navigate('/products')}>
              Voltar ao catalogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-shell checkout-zip">
      <div className="checkout-zip-topbar">
        <div className="checkout-shell-container">
          <div className="checkout-header-card">
            <div className="checkout-brand">
              <div className="checkout-brand-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="checkout-brand-title">Pneus Preco Justo</p>
                <p className="checkout-brand-subtitle">Checkout Seguro</p>
              </div>
            </div>
            <div className="checkout-security">
              <Lock size={14} />
              <span>Pagamento seguro</span>
            </div>
          </div>
        </div>
      </div>

      <div className="checkout-zip-progress-wrap">
        <div className="checkout-shell-container">
          <div className="checkout-zip-progress">
            <div className="checkout-zip-step is-active">
              <span>1</span>
              <small>Endereco</small>
            </div>
            <div className="checkout-zip-step-line is-active" />
            <div className="checkout-zip-step is-active">
              <span>2</span>
              <small>Pagamento</small>
            </div>
            <div className="checkout-zip-step-line" />
            <div className="checkout-zip-step">
              <span>3</span>
              <small>Confirmacao</small>
            </div>
          </div>
        </div>
      </div>

      <div className="checkout-shell-container">
        <div className="checkout-section-intro">
          <h1>Finalizar compra</h1>
          <p>Revise endereco, escolha o pagamento e confirme seu pedido.</p>
        </div>

        <div className="checkout-layout">
          <form id="checkout-form" onSubmit={handleSubmit} className="checkout-main-column">
            {error ? (
              <div className="checkout-error-box">
                <AlertCircle size={17} />
                <p>{error}</p>
              </div>
            ) : null}

            <section className="checkout-panel">
              <div className="checkout-panel-header">
                <div className="checkout-step-badge checkout-step-yellow">1</div>
                <h2>Dados de Entrega</h2>
                <button type="button" className="checkout-saved-address-button" onClick={() => setIsAddressPickerOpen(true)}>
                  Enderecos salvos
                </button>
              </div>

              {selectedAddress ? (
                <div className="checkout-selected-address">
                  <p>{selectedAddress.nome_completo || 'Endereco selecionado'}</p>
                  <p>{describeAddress(selectedAddress)}</p>
                </div>
              ) : null}

              <div className="checkout-form-grid checkout-form-grid-two">
                <label>
                  <span>E-mail</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleAddressInputChange}
                    className="checkout-input"
                    placeholder="seu@email.com"
                    required
                  />
                </label>
                <label>
                  <span>Nome Completo</span>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleAddressInputChange}
                    className="checkout-input"
                    placeholder="Como no cartao"
                    required
                  />
                </label>
              </div>

              <div className="checkout-form-grid checkout-form-grid-zip">
                <label>
                  <span>CEP</span>
                  <div className="checkout-input-with-action">
                    <input
                      type="text"
                      name="zipcode"
                      value={formData.zipcode}
                      onChange={handleAddressInputChange}
                      className="checkout-input"
                      placeholder="00000-000"
                      maxLength={9}
                      required
                    />
                    <button
                      type="button"
                      className="checkout-zipcode-action"
                      onClick={() => void fetchAddressByZipcode(formData.zipcode)}
                      disabled={isZipcodeLookupLoading}
                    >
                      {isZipcodeLookupLoading ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
                    </button>
                  </div>
                  {zipcodeLookupMessage ? (
                    <small className={`checkout-zipcode-feedback ${zipcodeLookupError ? 'is-error' : 'is-success'}`}>
                      {zipcodeLookupMessage}
                    </small>
                  ) : null}
                </label>
                <label>
                  <span>Endereco</span>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleAddressInputChange}
                    className="checkout-input"
                    placeholder="Rua, Avenida..."
                    required
                  />
                </label>
              </div>

              <div className="checkout-form-grid checkout-form-grid-number">
                <label>
                  <span>Numero</span>
                  <input
                    type="text"
                    name="number"
                    value={formData.number}
                    onChange={handleAddressInputChange}
                    className="checkout-input"
                    placeholder="123"
                    required
                  />
                </label>
                <label>
                  <span>Bairro / Complemento</span>
                  <input
                    type="text"
                    name="complement"
                    value={formData.complement}
                    onChange={handleAddressInputChange}
                    className="checkout-input"
                    placeholder="Apartamento, bloco, referencia..."
                  />
                </label>
              </div>

              <div className="checkout-form-grid checkout-form-grid-city">
                <label>
                  <span>Cidade</span>
                  <input type="text" name="city" value={formData.city} onChange={handleAddressInputChange} className="checkout-input" placeholder="Cidade" required />
                </label>
                <label>
                  <span>UF</span>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleAddressInputChange}
                    className="checkout-input"
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
                </label>
              </div>
            </section>

            <section className="checkout-panel checkout-payment-panel">
              <div className="checkout-panel-header">
                <div className="checkout-step-badge checkout-step-green">2</div>
                <h2>Pagamento</h2>
                <div className="checkout-secure-badge">
                  <ShieldCheck size={12} />
                  <span>Ambiente Seguro</span>
                </div>
              </div>

              <div className="checkout-payment-methods">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = paymentMethod === option.value;

                  return (
                    <label key={option.value} className={`checkout-payment-method ${selected ? 'is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value={option.value}
                        checked={selected}
                        onChange={(event) => setPaymentMethod(event.target.value as PaymentMethodValue)}
                      />
                      <span className="checkout-payment-method-indicator">{selected ? <CheckCircle2 size={14} /> : null}</span>
                      <Icon size={17} />
                      <span className="checkout-payment-method-text">
                        {option.label}
                        <small>{option.hint}</small>
                      </span>
                      {option.badge ? <span className="checkout-payment-badge">{option.badge}</span> : null}
                    </label>
                  );
                })}
              </div>

              {paymentMethod === 'credit_card' ? (
                <div className="checkout-card-box">
                  <div className="checkout-card-title-row">
                    <h3>Cartao de Credito</h3>
                    <span>VISA MASTERCARD AMEX</span>
                  </div>

                  <div className="checkout-form-grid">
                    <label className="checkout-field-full">
                      <span>Numero do Cartao</span>
                      <div className="checkout-icon-input">
                        <CreditCard size={16} />
                        <input
                          type="text"
                          value={paymentData.cardNumber}
                          onChange={(event) => setPaymentData((current) => ({ ...current, cardNumber: formatCardNumberInput(event.target.value) }))}
                          className="checkout-input"
                          placeholder="0000 0000 0000 0000"
                          required
                        />
                      </div>
                    </label>

                    <label className="checkout-field-full">
                      <span>Nome Impresso no Cartao</span>
                      <input
                        type="text"
                        value={paymentData.cardHolderName}
                        onChange={(event) => setPaymentData((current) => ({ ...current, cardHolderName: event.target.value.toUpperCase() }))}
                        className="checkout-input"
                        placeholder="JOAO A SILVA"
                        required
                      />
                    </label>
                  </div>

                  <div className="checkout-form-grid checkout-form-grid-two">
                    <label>
                      <span>Validade</span>
                      <input
                        type="text"
                        value={paymentData.cardExpiry}
                        onChange={(event) => setPaymentData((current) => ({ ...current, cardExpiry: formatCardExpiryInput(event.target.value) }))}
                        className="checkout-input"
                        placeholder="MM/AA"
                        maxLength={5}
                        required
                      />
                    </label>
                    <label>
                      <span>CVV</span>
                      <div className="checkout-icon-input checkout-icon-input-right">
                        <input
                          type="password"
                          value={paymentData.cardCvv}
                          onChange={(event) => setPaymentData((current) => ({ ...current, cardCvv: onlyDigits(event.target.value).slice(0, 4) }))}
                          className="checkout-input"
                          placeholder="123"
                          maxLength={4}
                          required
                        />
                        <Lock size={14} />
                      </div>
                    </label>
                  </div>

                  <label className="checkout-field-full">
                    <span>Parcelamento</span>
                    <select
                      value={paymentData.cardInstallments}
                      onChange={(event) => setPaymentData((current) => ({ ...current, cardInstallments: Number(event.target.value) }))}
                      className="checkout-input checkout-select"
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((installment) => (
                        <option key={installment} value={installment}>
                          {installment}x de {formatCurrency(checkoutTotal / installment)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="checkout-card-status">
                    <p>Seus dados sao criptografados e usados apenas no processamento.</p>
                    <p>{paymentData.cardInstallments}x sem juros</p>
                  </div>
                </div>
              ) : null}
              {paymentMethod === 'pix' ? (
                <div className="checkout-pix-box">
                  <QrCode size={38} />
                  <h3>Pagamento via PIX</h3>
                  <p>O QR Code sera gerado apos clicar em "Finalizar Compra". A aprovacao e imediata.</p>
                  <div className="checkout-pix-preview">
                    <QrCode size={82} />
                  </div>
                  <p className="checkout-pix-total">Total com desconto: {formatCurrency(pixTotal)}</p>

                  <div className="checkout-form-grid checkout-form-grid-two">
                    <label>
                      <span>Nome do pagador</span>
                      <input
                        type="text"
                        value={paymentData.pixPayerName}
                        onChange={(event) => setPaymentData((current) => ({ ...current, pixPayerName: event.target.value }))}
                        className="checkout-input"
                        placeholder="Nome completo"
                        required
                      />
                    </label>
                    <label>
                      <span>CPF do pagador</span>
                      <input
                        type="text"
                        value={paymentData.pixPayerCpf}
                        onChange={(event) => setPaymentData((current) => ({ ...current, pixPayerCpf: formatCpfInput(event.target.value) }))}
                        className="checkout-input"
                        placeholder="000.000.000-00"
                        required
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {paymentMethod === 'boleto' ? (
                <div className="checkout-boleto-box">
                  <p>Boleto bancario com vencimento e envio no email informado.</p>
                  <div className="checkout-form-grid checkout-form-grid-two">
                    <label className="checkout-field-full">
                      <span>Nome do pagador</span>
                      <input
                        type="text"
                        value={paymentData.boletoPayerName}
                        onChange={(event) => setPaymentData((current) => ({ ...current, boletoPayerName: event.target.value }))}
                        className="checkout-input"
                        required
                      />
                    </label>
                    <label>
                      <span>CPF do pagador</span>
                      <input
                        type="text"
                        value={paymentData.boletoPayerCpf}
                        onChange={(event) => setPaymentData((current) => ({ ...current, boletoPayerCpf: formatCpfInput(event.target.value) }))}
                        className="checkout-input"
                        placeholder="000.000.000-00"
                        required
                      />
                    </label>
                    <label>
                      <span>Email para boleto</span>
                      <input
                        type="email"
                        value={paymentData.boletoPayerEmail}
                        onChange={(event) => setPaymentData((current) => ({ ...current, boletoPayerEmail: event.target.value }))}
                        className="checkout-input"
                        placeholder="email@dominio.com"
                        required
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </section>
          </form>

          <aside className="checkout-summary">
            <div className="checkout-summary-panel">
              <h3>Resumo do Pedido</h3>
              <p className="checkout-summary-count">{totalItems} itens</p>

              <div className="checkout-summary-items">
                {items.map((item) => (
                  <div key={item.product.id} className="checkout-summary-item">
                    <img src={item.product.image} alt={item.product.model} className="checkout-order-item-image" />
                    <div>
                      <h4>
                        {item.product.brand} {item.product.model}
                      </h4>
                      <p>
                        {item.product.width}/{item.product.profile}R{item.product.diameter} - Qtd: {item.quantity}
                      </p>
                      <strong>{formatCurrency(item.product.price * item.quantity)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="checkout-summary-totals">
                <div>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div>
                  <span>Frete</span>
                  <span className="checkout-highlight-yellow">Gratis</span>
                </div>
                {paymentMethod === 'pix' ? (
                  <div>
                    <span>Desconto PIX</span>
                    <span className="checkout-highlight-green">- {formatCurrency(pixDiscountValue)}</span>
                  </div>
                ) : null}
                <div className="checkout-summary-total">
                  <span>Total</span>
                  <span className={paymentMethod === 'pix' ? 'checkout-highlight-green' : ''}>{formatCurrency(checkoutTotal)}</span>
                </div>
              </div>

              <button type="submit" form="checkout-form" disabled={loading} className="checkout-pay-button">
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    FINALIZAR COMPRA
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button type="button" onClick={() => navigate('/cart')} className="checkout-back-button">
                <ArrowLeft size={15} />
                Voltar ao carrinho
              </button>

              <div className="checkout-summary-security">
                <p>Ambiente verificado</p>
                <div>
                  <Lock size={14} />
                  CHECKOUT <span>SEGURO</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {isMobile ? (
        <Sheet open={isAddressPickerOpen} onOpenChange={setIsAddressPickerOpen}>
          <SheetContent side="bottom" className="checkout-address-sheet">
            <SheetHeader className="text-left">
              <SheetTitle>Selecionar endereco</SheetTitle>
              <SheetDescription>Use um endereco salvo ou preencha manualmente.</SheetDescription>
            </SheetHeader>
            {loadingAddresses ? (
              <div className="checkout-address-loading">
                <Loader2 size={16} className="animate-spin" />
                Carregando...
              </div>
            ) : (
              <div className="checkout-address-list">
                {savedAddresses.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => {
                      setFormData((current) => ({
                        ...current,
                        ...addressToForm(address),
                        fullName: address.nome_completo || current.fullName,
                      }));
                      setSelectedAddressId(address.id);
                      setIsAddressPickerOpen(false);
                    }}
                    className={`checkout-address-item ${selectedAddressId === address.id ? 'is-selected' : ''}`}
                  >
                    <p>{address.nome_completo || 'Endereco salvo'}</p>
                    <p>{describeAddress(address)}</p>
                  </button>
                ))}
                {savedAddresses.length === 0 ? <p className="checkout-address-empty">Nenhum endereco salvo.</p> : null}
              </div>
            )}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isAddressPickerOpen} onOpenChange={setIsAddressPickerOpen}>
          <DialogContent className="checkout-address-dialog">
            <DialogHeader>
              <DialogTitle>Selecionar endereco</DialogTitle>
              <DialogDescription>Use um endereco salvo ou preencha manualmente.</DialogDescription>
            </DialogHeader>
            {loadingAddresses ? (
              <div className="checkout-address-loading">
                <Loader2 size={16} className="animate-spin" />
                Carregando...
              </div>
            ) : (
              <div className="checkout-address-list">
                {savedAddresses.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => {
                      setFormData((current) => ({
                        ...current,
                        ...addressToForm(address),
                        fullName: address.nome_completo || current.fullName,
                      }));
                      setSelectedAddressId(address.id);
                      setIsAddressPickerOpen(false);
                    }}
                    className={`checkout-address-item ${selectedAddressId === address.id ? 'is-selected' : ''}`}
                  >
                    <p>{address.nome_completo || 'Endereco salvo'}</p>
                    <p>{describeAddress(address)}</p>
                  </button>
                ))}
                {savedAddresses.length === 0 ? <p className="checkout-address-empty">Nenhum endereco salvo.</p> : null}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {loading ? (
        <div className="checkout-processing-modal">
          <div className="checkout-processing-card">
            <Loader2 className="animate-spin" size={34} />
            <h3>Processando pagamento...</h3>
            <p>Conectando com gateway seguro.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

