import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
const backendRootDirectory = path.resolve(__dirname, '..');
const utf8TextDecoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });

type PaymentMethod = 'credit_card' | 'pix' | 'boleto';
type InternalPaymentStatus =
  | 'initialized'
  | 'processing'
  | 'pending'
  | 'confirmed'
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'refunded';

interface PaymentIntent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: 'BRL';
  paymentMethod: PaymentMethod;
  status: InternalPaymentStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  confirmations: number;
  idempotencyKey: string;
}

interface CreditCardPaymentData {
  holderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  installments: number;
}

interface PixPaymentData {
  payerName: string;
  payerCpf: string;
}

interface BoletoPaymentData {
  payerName: string;
  payerCpf: string;
  payerEmail: string;
}

interface SupabaseOrderRecord {
  id: string;
  user_id: string;
  total: number | string;
  status: string;
  payment_method: PaymentMethod;
  payment_id?: string | null;
  shipping_address?: Record<string, unknown> | null;
}

interface SupabaseOrderItemRecord {
  product_id: string;
  quantity: number | string;
}

interface SupabaseProductRecord {
  id: string;
  price: number | string;
}

interface SupabaseProfileRoleRecord {
  id: string;
  role: string | null;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
  message: string;
}

interface ProtectedCheckoutFileRecord {
  version: 1;
  event: 'checkout_initiated';
  createdAt: string;
  paymentId: string;
  orderId: string;
  userId: string;
  userEmail: string | null;
  amount: number;
  currency: 'BRL';
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
  orderStatus: string;
  shippingAddress: Record<string, unknown> | null;
  requestMetadata: {
    ip: string;
    userAgent: string;
  };
  paymentData: Record<string, unknown>;
}

const normalizeEnv = (value?: string) => (value || '').trim();
const looksLikePlaceholder = (value: string) => {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('seu_') ||
    normalized.includes('your_') ||
    normalized.includes('example') ||
    normalized.includes('placeholder') ||
    normalized.includes('changeme')
  );
};
const hasConfiguredSecret = (value?: string) => {
  const normalized = normalizeEnv(value);
  return normalized.length > 0 && !looksLikePlaceholder(normalized);
};

const localBannerDirectory = path.resolve(process.cwd(), 'public', 'login-banner');
const checkoutLogDirectory = path.resolve(
  backendRootDirectory,
  normalizeEnv(process.env.CHECKOUT_PROTECTED_LOG_DIR) || '.secure/checkout-checkpoints'
);
const supabaseUrl = normalizeEnv(process.env.SUPABASE_URL);
const supabaseAnonKey = normalizeEnv(process.env.SUPABASE_ANON_KEY);
const supabaseServiceKey = normalizeEnv(
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);
const supabaseAdminKey = hasConfiguredSecret(supabaseServiceKey) ? supabaseServiceKey : '';
const supabaseAuthKey = hasConfiguredSecret(supabaseAnonKey)
  ? supabaseAnonKey
  : hasConfiguredSecret(supabaseServiceKey)
  ? supabaseServiceKey
  : '';

const defaultAllowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const envAllowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...defaultAllowedOrigins, ...envAllowedOrigins];
const vercelDomainRegex = /\.vercel\.app$/i;

const isOriginAllowed = (origin?: string | null) => {
  if (!origin) return true; // server-to-server ou same-origin sem header
  if (allowedOrigins.includes(origin)) return true;

  try {
    const parsed = new URL(origin);
    if (vercelDomainRegex.test(parsed.hostname)) return true;
  } catch {
    return false;
  }

  return false;
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const paymentIdRegex = /^pay_[a-z0-9]{24,}$/i;
const idempotencyKeyRegex = /^[A-Za-z0-9._:-]{8,120}$/;
const validPaymentMethods = new Set<PaymentMethod>(['credit_card', 'pix', 'boleto']);
const paymentIntents = new Map<string, PaymentIntent>();
const paymentByOrderAndKey = new Map<string, string>();
const PAYMENT_INTENT_TTL_MS = 30 * 60 * 1000;
const MAX_CONFIRM_ATTEMPTS = 5;
const rateLimitBuckets = new Map<string, RateLimitBucket>();

if (!supabaseUrl || !supabaseAuthKey) {
  console.warn(
    '[SECURITY] SUPABASE_URL/SUPABASE_AUTH_KEY nao configurados corretamente no backend. ' +
      'Rotas protegidas por token podem falhar.'
  );
}

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    const [firstIp] = forwardedFor.split(',');
    return firstIp.trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return String(forwardedFor[0]).trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

const createRateLimit = (config: RateLimitConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const bucketKey = `${config.keyPrefix}:${getClientIp(req)}`;
    const currentBucket = rateLimitBuckets.get(bucketKey);

    if (!currentBucket || currentBucket.resetAt <= now) {
      rateLimitBuckets.set(bucketKey, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return next();
    }

    if (currentBucket.count >= config.maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((currentBucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: config.message });
    }

    currentBucket.count += 1;
    rateLimitBuckets.set(bucketKey, currentBucket);
    return next();
  };
};

const paymentInitiateRateLimit = createRateLimit({
  keyPrefix: 'payment-initiate',
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Muitas tentativas para iniciar pagamento. Aguarde alguns segundos.',
});

const paymentConfirmRateLimit = createRateLimit({
  keyPrefix: 'payment-confirm',
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Muitas confirmacoes em sequencia. Tente novamente em instantes.',
});

const paymentStatusRateLimit = createRateLimit({
  keyPrefix: 'payment-status',
  windowMs: 60 * 1000,
  maxRequests: 80,
  message: 'Limite de consultas de status excedido temporariamente.',
});

const paymentRefundRateLimit = createRateLimit({
  keyPrefix: 'payment-refund',
  windowMs: 60 * 1000,
  maxRequests: 12,
  message: 'Limite de solicitacoes de reembolso excedido temporariamente.',
});

const webhookRateLimit = createRateLimit({
  keyPrefix: 'payment-webhook',
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Limite de webhook excedido temporariamente.',
});

const apiGlobalRateLimit = createRateLimit({
  keyPrefix: 'api-global',
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'Muitas requisicoes em pouco tempo. Aguarde alguns segundos.',
});

const adminRateLimit = createRateLimit({
  keyPrefix: 'admin-api',
  windowMs: 60 * 1000,
  maxRequests: 80,
  message: 'Limite de requisicoes do painel excedido temporariamente.',
});

const hiddenRepositoryPathRegex = /^\/\.(?:git|svn|hg)(?:\/|$)/i;
const suspiciousProbeRegex =
  /(think(?:\\\\|\/)?app|invokefunction|call_user_func_array|phpinfo|wpgmza|wp_automatic|mphb_action|get_data_from_database|server-status|\/etc\/passwd|\.\.\/)/i;
const suspiciousUserAgentRegex =
  /(nuclei|assetnote|sqlmap|acunetix|nikto|zgrab|masscan|react2shell)/i;

setInterval(() => {
  const now = Date.now();
  for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(bucketKey);
    }
  }
}, 60 * 1000).unref();

app.use((req: Request, res: Response, next: NextFunction) => {
  if (hiddenRepositoryPathRegex.test(req.path)) {
    return res.status(404).json({ error: 'Not Found' });
  }

  const rawUserAgent = String(req.headers['user-agent'] || '');
  const originalUrl = req.originalUrl || req.url || '';
  let decodedUrl = originalUrl;
  try {
    decodedUrl = decodeURIComponent(originalUrl);
  } catch {
    // Keep raw URL if decode fails.
  }

  if (suspiciousUserAgentRegex.test(rawUserAgent) || suspiciousProbeRegex.test(decodedUrl)) {
    console.warn(
      '[SECURITY] Probe blocked',
      JSON.stringify({
        ip: getClientIp(req),
        path: req.path,
        query: req.query,
      })
    );
    return res.status(400).json({ error: 'Bad Request' });
  }

  return next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Signature',
      'Idempotency-Key',
      'X-Idempotency-Key',
    ],
    maxAge: 86400,
  })
);
app.use(
  '/static/login-banner',
  express.static(localBannerDirectory, {
    fallthrough: true,
    index: false,
    etag: true,
    maxAge: '1h',
  })
);

app.use('/api', apiGlobalRateLimit);

interface AuthenticatedRequest extends Request {
  authUser?: {
    id: string;
    email?: string;
  };
}

const normalizePaymentMethod = (value: unknown): PaymentMethod | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!validPaymentMethods.has(normalized as PaymentMethod)) return null;
  return normalized as PaymentMethod;
};

const normalizeAmount = (value: unknown): number | null => {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return null;
  if (amount <= 0 || amount > 1_000_000) return null;
  return Math.round(amount * 100) / 100;
};

const normalizeOrderId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const orderId = value.trim();
  return uuidRegex.test(orderId) ? orderId : null;
};

const normalizePaymentId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const paymentId = value.trim();
  return paymentIdRegex.test(paymentId) ? paymentId : null;
};

const normalizeIdempotencyKey = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const key = value.trim();
  return idempotencyKeyRegex.test(key) ? key : null;
};

const normalizeCurrency = (value: unknown): 'BRL' | null => {
  if (value === undefined || value === null || value === '') return 'BRL';
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized === 'BRL' ? 'BRL' : null;
};

const digitsOnly = (value: unknown) => String(value ?? '').replace(/\D/g, '');

const normalizeTextField = (value: unknown, minLength = 1, maxLength = 160): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) return null;
  return normalized;
};

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(normalized) ? normalized : null;
};

const maskCardNumberForStorage = (value: unknown) => {
  const digits = digitsOnly(value);
  if (!digits) return '';
  const lastFour = digits.slice(-4).padStart(4, '0');
  return `**** **** **** ${lastFour}`;
};

const maskCpfForStorage = (value: unknown) => {
  const cpf = digitsOnly(value);
  if (!cpf) return '';
  const suffix = cpf.slice(-2).padStart(2, '0');
  return `***.***.***-${suffix}`;
};

const maskEmailForStorage = (value: unknown) => {
  const email = normalizeEmail(value);
  if (!email) return '';

  const [namePart, domainPart] = email.split('@');
  if (!namePart || !domainPart) return '';
  const visibleName = namePart.slice(0, 2).padEnd(2, '*');

  return `${visibleName}***@${domainPart}`;
};

const sanitizePaymentDataForStorage = (
  paymentMethod: PaymentMethod,
  paymentData: unknown
): Record<string, unknown> => {
  if (!paymentData || typeof paymentData !== 'object') return {};
  const payload = paymentData as Record<string, unknown>;

  if (paymentMethod === 'credit_card') {
    return {
      holderName: normalizeTextField(payload.holderName, 1, 120) || '',
      cardNumberMasked: maskCardNumberForStorage(payload.cardNumber),
      cardFingerprint: crypto
        .createHash('sha256')
        .update(`${digitsOnly(payload.cardNumber)}:${normalizeEnv(process.env.PAYMENT_API_KEY)}`)
        .digest('hex'),
      expiryMonth: digitsOnly(payload.expiryMonth),
      expiryYear: digitsOnly(payload.expiryYear),
      installments: normalizeInstallments(payload.installments) || 1,
      cvvStored: false,
    };
  }

  if (paymentMethod === 'pix') {
    return {
      payerName: normalizeTextField(payload.payerName, 1, 120) || '',
      payerCpfMasked: maskCpfForStorage(payload.payerCpf),
    };
  }

  return {
    payerName: normalizeTextField(payload.payerName, 1, 120) || '',
    payerCpfMasked: maskCpfForStorage(payload.payerCpf),
    payerEmailMasked: maskEmailForStorage(payload.payerEmail),
  };
};

const resolveProtectedCheckoutKey = (): Buffer => {
  const explicitKey = normalizeEnv(process.env.CHECKOUT_PROTECTED_ENCRYPTION_KEY);
  if (explicitKey) {
    if (/^[a-f0-9]{64}$/i.test(explicitKey)) {
      return Buffer.from(explicitKey, 'hex');
    }

    try {
      const base64Buffer = Buffer.from(explicitKey, 'base64');
      if (base64Buffer.length === 32) {
        return base64Buffer;
      }
    } catch {
      // ignore invalid base64 and fallback to sha256
    }

    return crypto.createHash('sha256').update(explicitKey).digest();
  }

  const fallbackSecret = normalizeEnv(process.env.PAYMENT_API_KEY);
  if (fallbackSecret) {
    return crypto.createHash('sha256').update(fallbackSecret).digest();
  }

  throw new Error('CHECKOUT_PROTECTED_ENCRYPTION_KEY ou PAYMENT_API_KEY devem estar configuradas');
};

const appendProtectedCheckoutRecord = (record: ProtectedCheckoutFileRecord) => {
  fs.mkdirSync(checkoutLogDirectory, { recursive: true, mode: 0o700 });

  const encryptionKey = resolveProtectedCheckoutKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const plaintext = Buffer.from(JSON.stringify(record), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const linePayload = JSON.stringify({
    alg: 'aes-256-gcm',
    v: 1,
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
    data: encrypted.toString('base64'),
  });

  const fileDate = new Date().toISOString().slice(0, 10);
  const filePath = path.join(checkoutLogDirectory, `checkout-${fileDate}.protected.log`);
  fs.appendFileSync(filePath, `${linePayload}\n`, { encoding: 'utf8', mode: 0o600 });
};

const isValidCpf = (value: unknown): boolean => {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(cpf[i]) * (10 - i);
  }
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  if (firstDigit !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(cpf[i]) * (11 - i);
  }
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;

  return secondDigit === Number(cpf[10]);
};

const isValidCardNumber = (value: unknown): boolean => {
  const cardNumber = digitsOnly(value);
  if (cardNumber.length < 13 || cardNumber.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let digit = Number(cardNumber[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

const isValidCardExpiry = (monthValue: unknown, yearValue: unknown): boolean => {
  const month = Number(digitsOnly(monthValue));
  const year = Number(digitsOnly(yearValue));

  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(year) || year < 0 || year > 99) return false;

  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;

  return true;
};

const normalizeInstallments = (value: unknown): number | null => {
  const installments = Number(value);
  if (!Number.isInteger(installments)) return null;
  if (installments < 1 || installments > 12) return null;
  return installments;
};

const validatePaymentData = (
  paymentMethod: PaymentMethod,
  paymentData: unknown
): { ok: true } | { ok: false; error: string } => {
  if (!paymentData || typeof paymentData !== 'object') {
    return { ok: false, error: 'Dados de pagamento obrigatorios para continuar.' };
  }

  const payload = paymentData as Record<string, unknown>;

  if (paymentMethod === 'credit_card') {
    const holderName = normalizeTextField(payload.holderName, 3, 120);
    const cvv = digitsOnly(payload.cvv);
    const installments = normalizeInstallments(payload.installments);

    if (!holderName) {
      return { ok: false, error: 'Nome impresso no cartao invalido.' };
    }

    if (!isValidCardNumber(payload.cardNumber)) {
      return { ok: false, error: 'Numero do cartao invalido.' };
    }

    if (!isValidCardExpiry(payload.expiryMonth, payload.expiryYear)) {
      return { ok: false, error: 'Validade do cartao invalida ou expirada.' };
    }

    if (cvv.length < 3 || cvv.length > 4) {
      return { ok: false, error: 'Codigo de seguranca (CVV) invalido.' };
    }

    if (!installments) {
      return { ok: false, error: 'Numero de parcelas invalido.' };
    }

    return { ok: true };
  }

  if (paymentMethod === 'pix') {
    const payerName = normalizeTextField(payload.payerName, 3, 120);
    if (!payerName) {
      return { ok: false, error: 'Nome do pagador no PIX invalido.' };
    }

    if (!isValidCpf(payload.payerCpf)) {
      return { ok: false, error: 'CPF do pagador no PIX invalido.' };
    }

    return { ok: true };
  }

  if (paymentMethod === 'boleto') {
    const payerName = normalizeTextField(payload.payerName, 3, 120);
    const payerEmail = normalizeEmail(payload.payerEmail);

    if (!payerName) {
      return { ok: false, error: 'Nome do pagador no boleto invalido.' };
    }

    if (!isValidCpf(payload.payerCpf)) {
      return { ok: false, error: 'CPF do pagador no boleto invalido.' };
    }

    if (!payerEmail) {
      return { ok: false, error: 'Email para boleto invalido.' };
    }

    return { ok: true };
  }

  return { ok: false, error: 'Metodo de pagamento invalido.' };
};

const parseDatabaseAmount = (value: unknown): number => {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
};

const amountMatchesOrder = (requested: number, orderTotal: unknown) => {
  return Math.abs(requested - parseDatabaseAmount(orderTotal)) <= 0.01;
};

const buildOrderKey = (userId: string, orderId: string, idempotencyKey: string) =>
  `${userId}:${orderId}:${idempotencyKey}`;

const buildSupabaseHeaders = (serviceKey: string, json = false) => {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...(json ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}),
  };
};

const paymentStatusToOrderStatus = (
  paymentMethod: PaymentMethod,
  status: InternalPaymentStatus
): 'pending' | 'processing' | 'cancelled' => {
  if (status === 'cancelled' || status === 'declined' || status === 'refunded') return 'cancelled';
  if (status === 'confirmed' || status === 'approved') {
    return 'processing';
  }
  if (paymentMethod === 'credit_card' && status === 'processing') {
    return 'processing';
  }
  return 'pending';
};

const webhookStatusToInternal = (status: unknown): InternalPaymentStatus | null => {
  if (typeof status !== 'string') return null;
  const normalized = status.trim().toLowerCase();
  if (['approved', 'paid', 'confirmed'].includes(normalized)) return 'approved';
  if (['processing', 'in_analysis'].includes(normalized)) return 'processing';
  if (['pending', 'waiting'].includes(normalized)) return 'pending';
  if (['declined', 'rejected', 'failed'].includes(normalized)) return 'declined';
  if (['cancelled', 'canceled'].includes(normalized)) return 'cancelled';
  if (['refunded', 'refund'].includes(normalized)) return 'refunded';
  return null;
};

const cleanupExpiredIntents = () => {
  const now = Date.now();
  for (const [paymentId, intent] of paymentIntents.entries()) {
    if (intent.expiresAt <= now && ['initialized', 'processing'].includes(intent.status)) {
      paymentIntents.delete(paymentId);
      paymentByOrderAndKey.delete(buildOrderKey(intent.userId, intent.orderId, intent.idempotencyKey));
    }
  }
};

const requireSupabaseAdmin = (res: Response): { url: string; key: string } | null => {
  if (!supabaseUrl || !supabaseAdminKey) {
    res.status(500).json({
      error:
        'SUPABASE_URL/SUPABASE_SERVICE_KEY (ou SUPABASE_SERVICE_ROLE_KEY) nao configurados para operacoes de pagamento',
    });
    return null;
  }
  return { url: supabaseUrl, key: supabaseAdminKey };
};

const getSupabaseOrderById = async (
  config: { url: string; key: string },
  orderId: string
): Promise<SupabaseOrderRecord | null> => {
  const query = `id=eq.${encodeURIComponent(orderId)}&select=id,user_id,total,status,payment_method,payment_id,shipping_address`;
  const response = await fetch(`${config.url}/rest/v1/orders?${query}`, {
    method: 'GET',
    headers: buildSupabaseHeaders(config.key),
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar pedido no Supabase');
  }

  const rows = (await response.json()) as SupabaseOrderRecord[];
  return rows[0] || null;
};

const getSupabaseOrderByPaymentId = async (
  config: { url: string; key: string },
  paymentId: string
): Promise<SupabaseOrderRecord | null> => {
  const query = `payment_id=eq.${encodeURIComponent(paymentId)}&select=id,user_id,total,status,payment_method,payment_id,shipping_address`;
  const response = await fetch(`${config.url}/rest/v1/orders?${query}`, {
    method: 'GET',
    headers: buildSupabaseHeaders(config.key),
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar pedido por pagamento no Supabase');
  }

  const rows = (await response.json()) as SupabaseOrderRecord[];
  return rows[0] || null;
};

const getSupabaseOrderItems = async (
  config: { url: string; key: string },
  orderId: string
): Promise<SupabaseOrderItemRecord[]> => {
  const query = `order_id=eq.${encodeURIComponent(orderId)}&select=product_id,quantity`;
  const response = await fetch(`${config.url}/rest/v1/order_items?${query}`, {
    method: 'GET',
    headers: buildSupabaseHeaders(config.key),
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar itens do pedido no Supabase');
  }

  return (await response.json()) as SupabaseOrderItemRecord[];
};

const getSupabaseProductsByIds = async (
  config: { url: string; key: string },
  productIds: string[]
): Promise<SupabaseProductRecord[]> => {
  if (productIds.length === 0) {
    return [];
  }

  const joinedIds = productIds.map((id) => `"${id}"`).join(',');
  const query = `id=in.(${encodeURIComponent(joinedIds)})&select=id,price`;

  const response = await fetch(`${config.url}/rest/v1/products?${query}`, {
    method: 'GET',
    headers: buildSupabaseHeaders(config.key),
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar produtos do pedido no Supabase');
  }

  return (await response.json()) as SupabaseProductRecord[];
};

const calculateOrderTotalFromCatalog = async (
  config: { url: string; key: string },
  orderId: string
): Promise<number | null> => {
  const orderItems = await getSupabaseOrderItems(config, orderId);
  if (orderItems.length === 0) {
    return null;
  }

  const productIds = Array.from(
    new Set(
      orderItems
        .map((item) => String(item.product_id || '').trim())
        .filter((productId) => uuidRegex.test(productId))
    )
  );

  if (productIds.length === 0) {
    return null;
  }

  const products = await getSupabaseProductsByIds(config, productIds);
  const priceByProductId = new Map(products.map((product) => [product.id, parseDatabaseAmount(product.price)]));

  let total = 0;
  for (const item of orderItems) {
    const productId = String(item.product_id || '').trim();
    const quantity = Number(item.quantity);
    if (!priceByProductId.has(productId) || !Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }
    total += priceByProductId.get(productId)! * quantity;
  }

  return Math.round(total * 100) / 100;
};

const updateSupabaseOrder = async (
  config: { url: string; key: string },
  orderId: string,
  updates: Partial<Pick<SupabaseOrderRecord, 'status' | 'payment_method' | 'payment_id' | 'total'>>
) => {
  const response = await fetch(`${config.url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: buildSupabaseHeaders(config.key, true),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Falha ao atualizar pedido com dados de pagamento');
  }

  const rows = (await response.json()) as SupabaseOrderRecord[];
  return rows[0] || null;
};

const safeTimingEqual = (provided: string, expected: string) => {
  const providedBuffer = Buffer.from(provided, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

app.post('/api/payment/webhook', webhookRateLimit, express.raw({ type: 'application/json', limit: '100kb' }), async (req: Request, res: Response) => {
  try {
    const webhookSecret = normalizeEnv(process.env.PAYMENT_WEBHOOK_SECRET);
    if (!hasConfiguredSecret(webhookSecret)) {
      return res.status(500).json({ error: 'PAYMENT_WEBHOOK_SECRET nao configurada' });
    }

    const signatureHeader = req.headers['x-signature'];
    const signature = typeof signatureHeader === 'string' ? signatureHeader.trim() : '';
    if (!signature) {
      return res.status(400).json({ error: 'Assinatura ausente no webhook' });
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: 'Payload invalido: tipo nao suportado' });
    }

    const rawBody: Buffer = req.body;
    if (rawBody.length === 0) {
      return res.status(400).json({ error: 'Payload vazio no webhook' });
    }

    const providedSignature = signature.replace(/^sha256=/i, '');
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (!safeTimingEqual(providedSignature, expectedSignature)) {
      return res.status(401).json({ error: 'Assinatura invalida no webhook' });
    }

    const payloadText = utf8TextDecoder.decode(rawBody).trim();
    if (!payloadText) {
      return res.status(400).json({ error: 'Payload vazio no webhook' });
    }

    let event: unknown;
    try {
      event = JSON.parse(payloadText);
    } catch (_error) {
      return res.status(400).json({ error: 'Payload JSON invalido no webhook' });
    }

    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      return res.status(400).json({ error: 'Payload JSON deve ser um objeto' });
    }

    const webhookPayload = event as Record<string, unknown>;

    const paymentId = normalizePaymentId(webhookPayload.paymentId);
    const paymentStatus = webhookStatusToInternal(webhookPayload.status);
    const explicitOrderId = normalizeOrderId(webhookPayload.orderId);
    const explicitPaymentMethod = normalizePaymentMethod(webhookPayload.paymentMethod);

    if (!paymentId || !paymentStatus) {
      return res.status(400).json({ error: 'Campos obrigatorios no webhook: paymentId, status' });
    }

    const now = Date.now();
    const existingIntent = paymentIntents.get(paymentId);
    if (existingIntent) {
      const updatedIntent: PaymentIntent = {
        ...existingIntent,
        status: paymentStatus,
        updatedAt: now,
      };
      paymentIntents.set(paymentId, updatedIntent);
    }

    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    const order = explicitOrderId
      ? await getSupabaseOrderById(supabaseAdmin, explicitOrderId)
      : await getSupabaseOrderByPaymentId(supabaseAdmin, paymentId);

    if (!order) {
      return res.status(200).json({ success: true, ignored: true });
    }

    const paymentMethod = existingIntent?.paymentMethod || explicitPaymentMethod || order.payment_method;
    const nextOrderStatus = paymentStatusToOrderStatus(paymentMethod, paymentStatus);

    await updateSupabaseOrder(supabaseAdmin, order.id, {
      payment_id: paymentId,
      payment_method: paymentMethod,
      status: nextOrderStatus,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao processar webhook de pagamento' });
  }
});

app.use(express.json({ limit: '100kb' }));

const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  if (!supabaseUrl || !supabaseAuthKey) {
    return res.status(500).json({ error: 'Configuracao de autenticacao ausente no backend' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAuthKey,
      },
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Token invalido ou expirado' });
    }

    const user = (await response.json()) as { id: string; email?: string };
    req.authUser = { id: user.id, email: user.email };
    next();
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao validar autenticacao' });
  }
};

const getAdminProfileRole = async (
  config: { url: string; key: string },
  userId: string
): Promise<string | null> => {
  const query = `id=eq.${encodeURIComponent(userId)}&select=id,role&limit=1`;
  const response = await fetch(`${config.url}/rest/v1/profiles?${query}`, {
    method: 'GET',
    headers: buildSupabaseHeaders(config.key),
  });

  if (!response.ok) {
    throw new Error('Falha ao validar role administrativa no Supabase');
  }

  const rows = (await response.json()) as SupabaseProfileRoleRecord[];
  const profile = rows[0];
  return profile?.role ? String(profile.role).toLowerCase() : null;
};

const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.authUser?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Usuario nao autenticado' });
  }

  const supabaseAdmin = requireSupabaseAdmin(res);
  if (!supabaseAdmin) return;

  try {
    const role = await getAdminProfileRole(supabaseAdmin, userId);
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao painel administrativo' });
    }

    return next();
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Falha ao validar permissao de administrador' });
  }
};

const requirePaymentKey = (res: Response): string | null => {
  const privateKey = normalizeEnv(process.env.PAYMENT_API_KEY);
  if (!hasConfiguredSecret(privateKey)) {
    res.status(500).json({ error: 'PAYMENT_API_KEY nao configurada no backend' });
    return null;
  }
  return privateKey;
};

const initiateCheckoutPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    cleanupExpiredIntents();

    const orderId = normalizeOrderId(req.body?.orderId);
    const amount = normalizeAmount(req.body?.amount);
    const paymentMethod = normalizePaymentMethod(req.body?.paymentMethod);
    const currency = normalizeCurrency(req.body?.currency);
    const headerIdempotency = normalizeIdempotencyKey(req.headers['idempotency-key']);
    const bodyIdempotency = normalizeIdempotencyKey(req.body?.idempotencyKey);
    const idempotencyKey = bodyIdempotency || headerIdempotency || `order-${orderId || 'unknown'}`;

    if (!orderId || amount === null || !paymentMethod || !currency) {
      return res.status(400).json({
        error: 'Campos obrigatorios invalidos: orderId(UUID), amount(numero), paymentMethod(credit_card|pix|boleto), currency(BRL)',
      });
    }

    const paymentDataValidation = validatePaymentData(paymentMethod, req.body?.paymentData);
    if (!paymentDataValidation.ok) {
      return res.status(400).json({ error: paymentDataValidation.error });
    }

    if (!idempotencyKeyRegex.test(idempotencyKey)) {
      return res.status(400).json({ error: 'idempotencyKey invalido' });
    }

    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const privateKey = requirePaymentKey(res);
    if (!privateKey) return;

    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    const order = await getSupabaseOrderById(supabaseAdmin, orderId);
    if (!order) {
      return res.status(404).json({ error: 'Pedido nao encontrado' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ error: 'Pedido nao pertence ao usuario autenticado' });
    }

    if (order.payment_method !== paymentMethod) {
      return res.status(409).json({ error: 'Metodo de pagamento divergente do pedido' });
    }

    const expectedOrderTotal = await calculateOrderTotalFromCatalog(supabaseAdmin, orderId);
    if (expectedOrderTotal === null) {
      return res.status(409).json({ error: 'Nao foi possivel validar os itens do pedido para pagamento' });
    }

    if (!amountMatchesOrder(amount, expectedOrderTotal)) {
      return res.status(409).json({ error: 'Valor de pagamento divergente do total validado do pedido' });
    }

    if (!amountMatchesOrder(parseDatabaseAmount(order.total), expectedOrderTotal)) {
      const updatedOrder = await updateSupabaseOrder(supabaseAdmin, orderId, { total: expectedOrderTotal });
      if (updatedOrder) {
        order.total = updatedOrder.total;
      }
    }

    if (['cancelled', 'delivered'].includes(order.status)) {
      return res.status(409).json({ error: 'Nao e possivel iniciar pagamento para este pedido' });
    }

    const orderKey = buildOrderKey(userId, orderId, idempotencyKey);
    const existingPaymentId = paymentByOrderAndKey.get(orderKey);
    if (existingPaymentId) {
      const existingIntent = paymentIntents.get(existingPaymentId);
      if (existingIntent) {
        return res.status(200).json({
          success: true,
          paymentId: existingIntent.paymentId,
          orderId: existingIntent.orderId,
          paymentMethod: existingIntent.paymentMethod,
          status: existingIntent.status,
          amount: existingIntent.amount,
          currency: existingIntent.currency,
          expiresAt: new Date(existingIntent.expiresAt).toISOString(),
          idempotent: true,
        });
      }
    }

    const now = Date.now();
    const paymentId = `pay_${crypto.randomUUID().replace(/-/g, '')}`;
    const initialStatus: InternalPaymentStatus = paymentMethod === 'credit_card' ? 'processing' : 'pending';

    const intent: PaymentIntent = {
      paymentId,
      orderId,
      userId,
      amount,
      currency,
      paymentMethod,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + PAYMENT_INTENT_TTL_MS,
      confirmations: 0,
      idempotencyKey,
    };

    paymentIntents.set(paymentId, intent);
    paymentByOrderAndKey.set(orderKey, paymentId);

    const nextOrderStatus = paymentStatusToOrderStatus(paymentMethod, initialStatus);
    await updateSupabaseOrder(supabaseAdmin, orderId, {
      payment_id: paymentId,
      payment_method: paymentMethod,
      status: nextOrderStatus,
    });

    appendProtectedCheckoutRecord({
      version: 1,
      event: 'checkout_initiated',
      createdAt: new Date().toISOString(),
      paymentId,
      orderId,
      userId,
      userEmail: req.authUser?.email || null,
      amount,
      currency,
      paymentMethod,
      idempotencyKey,
      orderStatus: nextOrderStatus,
      shippingAddress: (order.shipping_address as Record<string, unknown> | null) || null,
      requestMetadata: {
        ip: getClientIp(req),
        userAgent: String(req.headers['user-agent'] || ''),
      },
      paymentData: sanitizePaymentDataForStorage(paymentMethod, req.body?.paymentData),
    });

    return res.status(201).json({
      success: true,
      paymentId,
      orderId,
      amount,
      currency,
      paymentMethod,
      status: initialStatus,
      orderStatus: nextOrderStatus,
      expiresAt: new Date(intent.expiresAt).toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao iniciar pagamento do checkout' });
  }
};

const confirmCheckoutPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = normalizePaymentId(req.body?.paymentId);
    if (!paymentId) {
      return res.status(400).json({ error: 'Campo obrigatorio invalido: paymentId' });
    }

    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const privateKey = requirePaymentKey(res);
    if (!privateKey) return;

    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    let intent = paymentIntents.get(paymentId) || null;
    let order = intent ? await getSupabaseOrderById(supabaseAdmin, intent.orderId) : await getSupabaseOrderByPaymentId(supabaseAdmin, paymentId);

    if (!order) {
      return res.status(404).json({ error: 'Pagamento nao encontrado' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ error: 'Pagamento nao pertence ao usuario autenticado' });
    }

    if (!intent) {
      const now = Date.now();
      intent = {
        paymentId,
        orderId: order.id,
        userId,
        amount: parseDatabaseAmount(order.total),
        currency: 'BRL',
        paymentMethod: order.payment_method,
        status: order.status === 'processing' ? 'processing' : 'pending',
        createdAt: now,
        updatedAt: now,
        expiresAt: now + PAYMENT_INTENT_TTL_MS,
        confirmations: 0,
        idempotencyKey: `legacy-${order.id}`,
      };
      paymentIntents.set(paymentId, intent);
      paymentByOrderAndKey.set(buildOrderKey(userId, order.id, intent.idempotencyKey), paymentId);
    }

    if (intent.userId !== userId) {
      return res.status(403).json({ error: 'Pagamento nao pertence ao usuario autenticado' });
    }

    if (intent.paymentMethod === 'credit_card' && Date.now() > intent.expiresAt && intent.status === 'processing') {
      intent.status = 'cancelled';
      intent.updatedAt = Date.now();
      await updateSupabaseOrder(supabaseAdmin, intent.orderId, {
        status: 'cancelled',
        payment_id: intent.paymentId,
      });

      return res.status(410).json({ error: 'Sessao de confirmacao expirada para pagamento com cartao' });
    }

    if (intent.confirmations >= MAX_CONFIRM_ATTEMPTS) {
      return res.status(429).json({ error: 'Limite de tentativas de confirmacao excedido' });
    }

    if (['confirmed', 'approved', 'pending'].includes(intent.status)) {
      const orderStatus = paymentStatusToOrderStatus(intent.paymentMethod, intent.status);
      return res.status(200).json({
        success: true,
        paymentId: intent.paymentId,
        orderId: intent.orderId,
        paymentMethod: intent.paymentMethod,
        status: intent.status,
        orderStatus,
        idempotent: true,
      });
    }

    intent.confirmations += 1;
    intent.updatedAt = Date.now();
    intent.status = intent.paymentMethod === 'credit_card' ? 'confirmed' : 'pending';
    paymentIntents.set(intent.paymentId, intent);

    const nextOrderStatus = paymentStatusToOrderStatus(intent.paymentMethod, intent.status);
    await updateSupabaseOrder(supabaseAdmin, intent.orderId, {
      payment_id: intent.paymentId,
      payment_method: intent.paymentMethod,
      status: nextOrderStatus,
    });

    return res.status(200).json({
      success: true,
      paymentId: intent.paymentId,
      orderId: intent.orderId,
      paymentMethod: intent.paymentMethod,
      status: intent.status,
      orderStatus: nextOrderStatus,
      confirmations: intent.confirmations,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao confirmar pagamento do checkout' });
  }
};

const getCheckoutPaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = normalizePaymentId(req.params.paymentId);
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId invalido' });
    }

    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    const intent = paymentIntents.get(paymentId) || null;
    if (intent && intent.userId !== userId) {
      return res.status(403).json({ error: 'Pagamento nao pertence ao usuario autenticado' });
    }

    const order = await getSupabaseOrderByPaymentId(supabaseAdmin, paymentId);
    if (order && order.user_id !== userId) {
      return res.status(403).json({ error: 'Pagamento nao pertence ao usuario autenticado' });
    }

    if (!intent && !order) {
      return res.status(404).json({ error: 'Pagamento nao encontrado' });
    }

    const paymentMethod = intent?.paymentMethod || order?.payment_method || 'credit_card';
    const paymentStatus = intent?.status || (order?.status === 'processing' ? 'confirmed' : (order?.status as InternalPaymentStatus)) || 'pending';
    const orderStatus = paymentStatusToOrderStatus(paymentMethod, paymentStatus);

    return res.status(200).json({
      success: true,
      paymentId,
      orderId: intent?.orderId || order?.id || null,
      paymentMethod,
      status: paymentStatus,
      orderStatus,
      amount: intent?.amount || parseDatabaseAmount(order?.total),
      currency: intent?.currency || 'BRL',
      expiresAt: intent ? new Date(intent.expiresAt).toISOString() : null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao consultar status de pagamento' });
  }
};

const refundCheckoutPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = normalizePaymentId(req.body?.paymentId);
    const amount = normalizeAmount(req.body?.amount);
    if (!paymentId || amount === null) {
      return res.status(400).json({ error: 'Campos obrigatorios invalidos: paymentId, amount' });
    }

    const userId = req.authUser?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const privateKey = requirePaymentKey(res);
    if (!privateKey) return;

    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    const intent = paymentIntents.get(paymentId) || null;
    const order = intent ? await getSupabaseOrderById(supabaseAdmin, intent.orderId) : await getSupabaseOrderByPaymentId(supabaseAdmin, paymentId);
    if (!order) {
      return res.status(404).json({ error: 'Pagamento nao encontrado' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ error: 'Pagamento nao pertence ao usuario autenticado' });
    }

    if (order.status === 'delivered') {
      return res.status(409).json({ error: 'Pedido entregue nao pode ser reembolsado automaticamente' });
    }

    if (intent) {
      intent.status = 'refunded';
      intent.updatedAt = Date.now();
      paymentIntents.set(paymentId, intent);
    }

    await updateSupabaseOrder(supabaseAdmin, order.id, {
      status: 'cancelled',
      payment_id: paymentId,
    });

    return res.status(200).json({
      success: true,
      paymentId,
      orderId: order.id,
      amount,
      status: 'refunded',
      orderStatus: 'cancelled',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao processar reembolso' });
  }
};

const supportedProductSeasons = new Set(['all-season', 'summer', 'winter']);
const supportedProductCategories = new Set([
  'passeio',
  'suv',
  'caminhonete',
  'van',
  'moto',
  'agricola',
  'otr',
  'caminhao',
  'onibus',
]);

const normalizeBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
};

const normalizeNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeInteger = (value: unknown): number | null => {
  const parsed = normalizeNumber(value);
  if (parsed === null) return null;
  return Number.isInteger(parsed) ? parsed : null;
};

const normalizeString = (value: unknown, minLength = 1, maxLength = 200): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) return null;
  return normalized;
};

const normalizeStringArray = (value: unknown, maxItems = 20, maxItemLength = 120): string[] | null => {
  if (!Array.isArray(value)) return null;
  const sanitized: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const text = normalizeString(item, 1, maxItemLength);
    if (!text) continue;
    const dedupeKey = text.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    sanitized.push(text);
    if (sanitized.length >= maxItems) break;
  }

  return sanitized;
};

type ProductPayloadMode = 'create' | 'update';

const sanitizeAdminProductPayload = (
  input: Record<string, unknown>,
  mode: ProductPayloadMode
): { data: Record<string, unknown> | null; error: string | null } => {
  const data: Record<string, unknown> = {};

  const requireField = (field: string) => mode === 'create' || Object.prototype.hasOwnProperty.call(input, field);

  if (requireField('brand')) {
    const value = normalizeString(input.brand, 1, 120);
    if (!value) return { data: null, error: 'Campo brand invalido.' };
    data.brand = value;
  }

  if (requireField('model')) {
    const value = normalizeString(input.model, 1, 120);
    if (!value) return { data: null, error: 'Campo model invalido.' };
    data.model = value;
  }

  if (requireField('width')) {
    const value = normalizeString(input.width, 1, 12);
    if (!value) return { data: null, error: 'Campo width invalido.' };
    data.width = value;
  }

  if (requireField('profile')) {
    const value = normalizeString(input.profile, 1, 12);
    if (!value) return { data: null, error: 'Campo profile invalido.' };
    data.profile = value;
  }

  if (requireField('diameter')) {
    const value = normalizeString(input.diameter, 1, 12);
    if (!value) return { data: null, error: 'Campo diameter invalido.' };
    data.diameter = value;
  }

  if (requireField('load_index')) {
    const value = normalizeString(input.load_index, 1, 12);
    if (!value) return { data: null, error: 'Campo load_index invalido.' };
    data.load_index = value;
  }

  if (requireField('speed_rating')) {
    const value = normalizeString(input.speed_rating, 1, 12);
    if (!value) return { data: null, error: 'Campo speed_rating invalido.' };
    data.speed_rating = value;
  }

  if (requireField('price')) {
    const value = normalizeNumber(input.price);
    if (value === null || value <= 0 || value > 1_000_000) {
      return { data: null, error: 'Campo price invalido.' };
    }
    data.price = Math.round(value * 100) / 100;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'old_price')) {
    const oldPriceRaw = input.old_price;
    if (oldPriceRaw === null || oldPriceRaw === undefined || oldPriceRaw === '') {
      data.old_price = null;
    } else {
      const value = normalizeNumber(oldPriceRaw);
      if (value === null || value <= 0 || value > 1_000_000) {
        return { data: null, error: 'Campo old_price invalido.' };
      }
      data.old_price = Math.round(value * 100) / 100;
    }
  } else if (mode === 'create') {
    data.old_price = null;
  }

  if (requireField('stock')) {
    const value = normalizeInteger(input.stock);
    if (value === null || value < 0 || value > 1_000_000) {
      return { data: null, error: 'Campo stock invalido.' };
    }
    data.stock = value;
  }

  if (requireField('image')) {
    const value = normalizeString(input.image, 1, 2000);
    if (!value) return { data: null, error: 'Campo image invalido.' };
    data.image = value;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'features')) {
    const features = normalizeStringArray(input.features);
    if (!features) return { data: null, error: 'Campo features invalido.' };
    data.features = features;
  } else if (mode === 'create') {
    data.features = [];
  }

  if (requireField('category')) {
    const value = normalizeString(input.category, 1, 50);
    if (!value) return { data: null, error: 'Campo category invalido.' };
    const normalized = value.toLowerCase();
    data.category = supportedProductCategories.has(normalized) ? normalized : value;
  }

  if (requireField('season')) {
    const value = normalizeString(input.season, 1, 50);
    if (!value) return { data: null, error: 'Campo season invalido.' };
    const normalized = value.toLowerCase();
    data.season = supportedProductSeasons.has(normalized) ? normalized : 'all-season';
  }

  if (Object.prototype.hasOwnProperty.call(input, 'runflat')) {
    const value = normalizeBoolean(input.runflat);
    if (value === null) return { data: null, error: 'Campo runflat invalido.' };
    data.runflat = value;
  } else if (mode === 'create') {
    data.runflat = false;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'featured')) {
    const value = normalizeBoolean(input.featured);
    if (value === null) return { data: null, error: 'Campo featured invalido.' };
    data.featured = value;
  } else if (mode === 'create') {
    data.featured = false;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    const rawDescription = input.description;
    if (rawDescription === null || rawDescription === undefined || rawDescription === '') {
      data.description = '';
    } else {
      const value = normalizeString(rawDescription, 1, 2000);
      if (!value) return { data: null, error: 'Campo description invalido.' };
      data.description = value;
    }
  } else if (mode === 'create') {
    data.description = '';
  }

  if (mode === 'update' && Object.keys(data).length === 0) {
    return { data: null, error: 'Nenhum campo valido informado para atualizacao.' };
  }

  return { data, error: null };
};

const normalizeSiteConfigPayload = (input: unknown): Record<string, unknown> | null => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  return input as Record<string, unknown>;
};

const logAdminAction = (req: AuthenticatedRequest, action: string, metadata: Record<string, unknown>) => {
  console.info(
    '[ADMIN_AUDIT]',
    JSON.stringify({
      at: new Date().toISOString(),
      action,
      userId: req.authUser?.id || null,
      ip: getClientIp(req),
      userAgent: String(req.headers['user-agent'] || ''),
      ...metadata,
    })
  );
};

const getAdminOrderSummary = async (
  config: { url: string; key: string },
  since: string | null
): Promise<{
  confirmedRevenue: number;
  pendingRevenue: number;
  confirmedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalOrders: number;
}> => {
  const selectFields = 'id,total,status,created_at';
  const filters: string[] = [`select=${encodeURIComponent(selectFields)}`];
  if (since) {
    filters.push(`created_at=gte.${encodeURIComponent(since)}`);
  }

  const response = await fetch(`${config.url}/rest/v1/orders?${filters.join('&')}`, {
    method: 'GET',
    headers: buildSupabaseHeaders(config.key),
  });

  if (!response.ok) {
    throw new Error('Falha ao consultar resumo de pedidos');
  }

  const rows = (await response.json()) as Array<{ total: number | string; status: string }>;

  const paidStatuses = new Set(['processing', 'confirmed', 'approved', 'shipped', 'delivered']);
  const pendingStatuses = new Set(['pending']);
  const cancelledStatuses = new Set(['cancelled', 'refunded', 'declined']);

  return rows.reduce(
    (acc, row) => {
      const total = parseDatabaseAmount(row.total);
      const status = String(row.status || '').toLowerCase();

      acc.totalOrders += 1;
      if (paidStatuses.has(status)) {
        acc.confirmedRevenue += total;
        acc.confirmedOrders += 1;
      } else if (pendingStatuses.has(status)) {
        acc.pendingRevenue += total;
        acc.pendingOrders += 1;
      } else if (cancelledStatuses.has(status)) {
        acc.cancelledOrders += 1;
      }

      return acc;
    },
    {
      confirmedRevenue: 0,
      pendingRevenue: 0,
      confirmedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      totalOrders: 0,
    }
  );
};

app.get('/api/admin/orders/summary', authenticate, requireAdmin, adminRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    const sinceRaw = typeof req.query.since === 'string' ? req.query.since.trim() : '';
    const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw).toISOString() : null;
    const summary = await getAdminOrderSummary(supabaseAdmin, since);

    logAdminAction(req, 'orders.summary.read', { since });
    return res.status(200).json({ data: summary });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao consultar resumo administrativo' });
  }
});

app.patch('/api/admin/orders/:id/status', authenticate, requireAdmin, adminRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = normalizeOrderId(req.params.id);
    if (!orderId) {
      return res.status(400).json({ error: 'ID de pedido invalido.' });
    }

    const nextStatus = normalizeTextField(req.body?.status, 3, 20);
    const allowedStatuses = new Set(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
    if (!nextStatus || !allowedStatuses.has(nextStatus.toLowerCase())) {
      return res.status(400).json({ error: 'Status invalido para atualizacao.' });
    }

    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    const updated = await updateSupabaseOrder(supabaseAdmin, orderId, {
      status: nextStatus.toLowerCase(),
    });

    if (!updated) {
      return res.status(404).json({ error: 'Pedido nao encontrado.' });
    }

    logAdminAction(req, 'orders.status.update', { orderId, status: nextStatus.toLowerCase() });
    return res.status(200).json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar status do pedido' });
  }
});

app.post('/api/admin/products', authenticate, requireAdmin, adminRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
    if (!payload) {
      return res.status(400).json({ error: 'Payload do produto invalido.' });
    }

    const { data: productPayload, error: payloadError } = sanitizeAdminProductPayload(payload, 'create');
    if (payloadError || !productPayload) {
      return res.status(400).json({ error: payloadError || 'Dados do produto invalidos.' });
    }

    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    const response = await fetch(`${supabaseAdmin.url}/rest/v1/products`, {
      method: 'POST',
      headers: buildSupabaseHeaders(supabaseAdmin.key, true),
      body: JSON.stringify(productPayload),
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Falha ao criar produto no catalogo' });
    }

    const rows = (await response.json()) as Record<string, unknown>[];
    const created = rows[0] || null;

    logAdminAction(req, 'products.create', { productId: created?.id || null });
    return res.status(201).json({ data: created });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao criar produto' });
  }
});

app.patch('/api/admin/products/:id', authenticate, requireAdmin, adminRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = normalizeOrderId(req.params.id);
    if (!productId) {
      return res.status(400).json({ error: 'ID de produto invalido.' });
    }

    const payload = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
    if (!payload) {
      return res.status(400).json({ error: 'Payload de atualizacao invalido.' });
    }

    const { data: updatePayload, error: payloadError } = sanitizeAdminProductPayload(payload, 'update');
    if (payloadError || !updatePayload) {
      return res.status(400).json({ error: payloadError || 'Dados de atualizacao invalidos.' });
    }

    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    const response = await fetch(`${supabaseAdmin.url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      headers: buildSupabaseHeaders(supabaseAdmin.key, true),
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Falha ao atualizar produto no catalogo' });
    }

    const rows = (await response.json()) as Record<string, unknown>[];
    const updated = rows[0] || null;
    if (!updated) {
      return res.status(404).json({ error: 'Produto nao encontrado.' });
    }

    logAdminAction(req, 'products.update', { productId });
    return res.status(200).json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar produto' });
  }
});

app.delete('/api/admin/products/:id', authenticate, requireAdmin, adminRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = normalizeOrderId(req.params.id);
    if (!productId) {
      return res.status(400).json({ error: 'ID de produto invalido.' });
    }

    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    const response = await fetch(`${supabaseAdmin.url}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      headers: buildSupabaseHeaders(supabaseAdmin.key, true),
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Falha ao excluir produto no catalogo' });
    }

    const rows = (await response.json()) as Record<string, unknown>[];
    const updated = rows[0] || null;
    if (!updated) {
      return res.status(404).json({ error: 'Produto nao encontrado.' });
    }

    logAdminAction(req, 'products.delete', { productId });
    return res.status(200).json({ data: { id: productId, deleted: true } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao excluir produto' });
  }
});

app.patch('/api/admin/site-config', authenticate, requireAdmin, adminRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configPayload = normalizeSiteConfigPayload(req.body?.config ?? req.body);
    if (!configPayload) {
      return res.status(400).json({ error: 'Payload de configuracao invalido.' });
    }

    const supabaseAdmin = requireSupabaseAdmin(res);
    if (!supabaseAdmin) return;

    const response = await fetch(`${supabaseAdmin.url}/rest/v1/site_config?on_conflict=id`, {
      method: 'POST',
      headers: {
        ...buildSupabaseHeaders(supabaseAdmin.key, true),
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        id: 'default',
        config_json: configPayload,
        updated_by: req.authUser?.id || null,
      }),
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Falha ao persistir configuracoes do site' });
    }

    const rows = (await response.json()) as Array<{ id: string; config_json: Record<string, unknown>; updated_at: string }>;
    const saved = rows[0] || null;

    logAdminAction(req, 'site_config.update', { rowId: saved?.id || 'default' });
    return res.status(200).json({ data: saved });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao salvar configuracoes do site' });
  }
});

app.get('/api/public/login-banner', (req: Request, res: Response) => {
  const localBannerFile = path.basename((process.env.LOGIN_BANNER_FILE || '').trim());
  const fallbackBannerUrl = (process.env.LOGIN_BANNER_IMAGE_URL || '').trim();

  if (localBannerFile) {
    const localFilePath = path.join(localBannerDirectory, localBannerFile);

    if (fs.existsSync(localFilePath)) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      return res.json({
        bannerImage: `${baseUrl}/static/login-banner/${encodeURIComponent(localBannerFile)}`,
      });
    }
  }

  return res.json({ bannerImage: fallbackBannerUrl });
});

app.get('/api/health', (_req: Request, res: Response) => {
  return res.status(200).json({ ok: true, service: 'payment-backend' });
});

// Rota raiz - retorna status de saúde
app.get('/', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    message: 'PneusPrecojusto Backend v1.0',
    endpoints: {
      health: '/api/health',
      loginBanner: '/api/public/login-banner',
      payment: '/api/payment/*',
      admin: '/api/admin/*'
    }
  });
});

app.post('/api/payment/checkout/initiate', paymentInitiateRateLimit, authenticate, initiateCheckoutPayment);
app.post('/api/payment/checkout/confirm', paymentConfirmRateLimit, authenticate, confirmCheckoutPayment);
app.get('/api/payment/checkout/:paymentId/status', paymentStatusRateLimit, authenticate, getCheckoutPaymentStatus);
app.post('/api/payment/checkout/refund', paymentRefundRateLimit, authenticate, refundCheckoutPayment);

// Rotas legadas mantidas para compatibilidade com clientes antigos
app.post('/api/payment/charge', paymentInitiateRateLimit, authenticate, initiateCheckoutPayment);
app.post('/api/payment/confirm', paymentConfirmRateLimit, authenticate, confirmCheckoutPayment);
app.post('/api/payment/refund', paymentRefundRateLimit, authenticate, refundCheckoutPayment);

app.use('/api', (_req: Request, res: Response) => {
  return res.status(404).json({ error: 'Rota de API nao encontrada' });
});

app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  if (error.message === 'CORS origin not allowed') {
    return res.status(403).json({ error: 'Origin nao permitida' });
  }

  console.error('[BACKEND ERROR]', error.message);
  return res.status(500).json({ error: 'Erro interno no servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`));
