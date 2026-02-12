import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const parseTrustProxySetting = (value?: string): boolean | number | string => {
  const raw = (value || '').trim().toLowerCase();
  if (!raw) return 'loopback';
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 0) {
    return numeric;
  }

  return raw;
};

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', parseTrustProxySetting(process.env.TRUST_PROXY));

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

interface SupabaseOrderRecord {
  id: string;
  user_id: string;
  total: number | string;
  status: string;
  payment_method: PaymentMethod;
  payment_id?: string | null;
}

interface SupabaseOrderItemRecord {
  product_id: string;
  quantity: number | string;
}

interface SupabaseProductRecord {
  id: string;
  price: number | string;
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

interface WiseTokenCache {
  token: string;
  expiresAt: number;
}

const normalizeEnv = (value?: string) => (value || '').trim();
const parsePositiveIntegerEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number((value || '').trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};
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
const supabaseUrl = normalizeEnv(process.env.SUPABASE_URL);
const supabaseAnonKey = normalizeEnv(process.env.SUPABASE_ANON_KEY);
const supabaseServiceKey = normalizeEnv(process.env.SUPABASE_SERVICE_KEY);
const blackcatApiUrl = normalizeEnv(process.env.BLACKCAT_API_URL) || 'https://api.blackcat.com.br/v1';
const wiseEnv = normalizeEnv(process.env.WISE_ENV).toLowerCase() === 'production' ? 'production' : 'sandbox';
const wiseBaseUrl =
  normalizeEnv(process.env.WISE_BASE_URL) ||
  (wiseEnv === 'production' ? 'https://api.wise.com' : 'https://api.wise-sandbox.com');
const wiseClientId = normalizeEnv(process.env.WISE_CLIENT_ID);
const wiseClientSecret = normalizeEnv(process.env.WISE_CLIENT_SECRET);
const wiseApiToken = normalizeEnv(process.env.WISE_API_TOKEN);
const wiseWebhookPublicKey = normalizeEnv(process.env.WISE_WEBHOOK_PUBLIC_KEY);
const supabaseAdminKey = hasConfiguredSecret(supabaseServiceKey) ? supabaseServiceKey : '';
const supabaseAuthKey = hasConfiguredSecret(supabaseAnonKey)
  ? supabaseAnonKey
  : hasConfiguredSecret(supabaseServiceKey)
  ? supabaseServiceKey
  : '';

const defaultAllowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const envAllowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));
const allowVercelPreviewOrigins =
  normalizeEnv(process.env.ALLOW_VERCEL_PREVIEW_ORIGINS).toLowerCase() === 'true';
const vercelDomainRegex = /(^|\.)vercel\.app$/i;
const localhostHostRegex = /^(localhost|127\.0\.0\.1)$/i;
const requestTimeoutMs = parsePositiveIntegerEnv(process.env.REQUEST_TIMEOUT_MS, 15000);

const isOriginAllowed = (origin?: string | null) => {
  if (!origin) return true; // server-to-server ou same-origin sem header
  if (allowedOrigins.includes(origin)) return true;

  try {
    const parsed = new URL(origin);
    const isLocalhostOrigin = localhostHostRegex.test(parsed.hostname);

    if (isLocalhostOrigin && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
      return true;
    }

    // Origens remotas devem usar HTTPS, exceto localhost explicitamente permitido.
    if (!isLocalhostOrigin && parsed.protocol !== 'https:') return false;

    if (allowVercelPreviewOrigins && vercelDomainRegex.test(parsed.hostname)) return true;
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
let wiseTokenCache: WiseTokenCache | null = null;
type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

if (!supabaseUrl || !supabaseAuthKey) {
  console.warn(
    '[SECURITY] SUPABASE_URL/SUPABASE_AUTH_KEY nao configurados corretamente no backend. ' +
      'Rotas protegidas por token podem falhar.'
  );
}

const getClientIp = (req: Request): string => {
  const firstTrustedIp = Array.isArray(req.ips) && req.ips.length > 0 ? req.ips[0] : req.ip;
  if (typeof firstTrustedIp === 'string' && firstTrustedIp.trim()) {
    return firstTrustedIp.replace(/^::ffff:/, '').trim();
  }

  return (req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '').trim();
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

const blackcatAddressRateLimit = createRateLimit({
  keyPrefix: 'blackcat-address',
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Limite de validacao de endereco excedido temporariamente.',
});

const blackcatPaymentProcessRateLimit = createRateLimit({
  keyPrefix: 'blackcat-payment-process',
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Limite de tentativas de processamento excedido temporariamente.',
});

const blackcatPaymentRefundRateLimit = createRateLimit({
  keyPrefix: 'blackcat-payment-refund',
  windowMs: 60 * 1000,
  maxRequests: 12,
  message: 'Limite de solicitacoes de reembolso excedido temporariamente.',
});

const blackcatPaymentStatusRateLimit = createRateLimit({
  keyPrefix: 'blackcat-payment-status',
  windowMs: 60 * 1000,
  maxRequests: 80,
  message: 'Limite de consultas de status excedido temporariamente.',
});

const wisePayoutRateLimit = createRateLimit({
  keyPrefix: 'wise-payout',
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Limite de chamadas de payout Wise excedido temporariamente.',
});

setInterval(() => {
  const now = Date.now();
  for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(bucketKey);
    }
  }
}, 60 * 1000).unref();

const fetchWithTimeout = async (
  input: FetchInput,
  init?: FetchInit,
  timeoutMs = requestTimeoutMs
): Promise<globalThis.Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...(init || {}),
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo limite excedido para comunicacao com servico externo');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Origin-Agent-Cluster', '?1');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    );
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

const normalizeCurrencyCode = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
};

const normalizeObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const normalizeText = (value: unknown, minLength = 1, maxLength = 200): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) return null;
  return normalized;
};

const normalizeEmail = (value: unknown): string | null => {
  const email = normalizeText(value, 5, 200);
  if (!email) return null;
  const lowered = email.toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(lowered) ? lowered : null;
};

const normalizePhone = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
};

const normalizeCpf = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return null;
  return digits;
};

const normalizeCep = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return digits;
};

const normalizeUf = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const uf = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(uf) ? uf : null;
};

const normalizeCardNumber = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return null;
  return digits;
};

const normalizeCardCvv = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 3 || digits.length > 4) return null;
  return digits;
};

const normalizeCardMonth = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 1 || digits.length > 2) return null;
  const month = Number(digits);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return String(month).padStart(2, '0');
};

const normalizeCardYear = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 2) {
    return `20${digits}`;
  }
  if (digits.length === 4) {
    return digits;
  }
  return null;
};

const normalizeInstallments = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  const rounded = Math.floor(parsed);
  if (rounded < 1) return 1;
  return Math.min(rounded, 12);
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
    res.status(500).json({ error: 'SUPABASE_URL/SUPABASE_SERVICE_KEY nao configurados para operacoes de pagamento' });
    return null;
  }
  return { url: supabaseUrl, key: supabaseAdminKey };
};

const getSupabaseOrderById = async (
  config: { url: string; key: string },
  orderId: string
): Promise<SupabaseOrderRecord | null> => {
  const query = `id=eq.${encodeURIComponent(orderId)}&select=id,user_id,total,status,payment_method,payment_id`;
  const response = await fetchWithTimeout(`${config.url}/rest/v1/orders?${query}`, {
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
  const query = `payment_id=eq.${encodeURIComponent(paymentId)}&select=id,user_id,total,status,payment_method,payment_id`;
  const response = await fetchWithTimeout(`${config.url}/rest/v1/orders?${query}`, {
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
  const response = await fetchWithTimeout(`${config.url}/rest/v1/order_items?${query}`, {
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

  const response = await fetchWithTimeout(`${config.url}/rest/v1/products?${query}`, {
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
  const response = await fetchWithTimeout(
    `${config.url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
    {
      method: 'PATCH',
      headers: buildSupabaseHeaders(config.key, true),
      body: JSON.stringify(updates),
    }
  );

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

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (rawBody.length === 0) {
      return res.status(400).json({ error: 'Payload vazio no webhook' });
    }

    const providedSignature = signature.replace(/^sha256=/i, '');
    if (!/^[a-f0-9]{64}$/i.test(providedSignature)) {
      return res.status(400).json({ error: 'Assinatura invalida no webhook' });
    }
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (!safeTimingEqual(providedSignature, expectedSignature)) {
      return res.status(401).json({ error: 'Assinatura invalida no webhook' });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch (_error) {
      return res.status(400).json({ error: 'Payload JSON invalido no webhook' });
    }

    const paymentId = normalizePaymentId(event?.paymentId);
    const paymentStatus = webhookStatusToInternal(event?.status);
    const explicitOrderId = normalizeOrderId(event?.orderId);
    const explicitPaymentMethod = normalizePaymentMethod(event?.paymentMethod);

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
  if (token.length > 4096) {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }

  if (!supabaseUrl || !supabaseAuthKey) {
    return res.status(500).json({ error: 'Configuracao de autenticacao ausente no backend' });
  }

  try {
    const response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/user`, {
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

const requirePaymentKey = (res: Response): string | null => {
  const privateKey = normalizeEnv(process.env.PAYMENT_API_KEY);
  if (!hasConfiguredSecret(privateKey)) {
    res.status(500).json({ error: 'PAYMENT_API_KEY nao configurada no backend' });
    return null;
  }
  return privateKey;
};

const requireBlackcatConfig = (res: Response): { apiUrl: string; apiKey: string } | null => {
  const apiKey = normalizeEnv(process.env.BLACKCAT_API_KEY);
  if (!hasConfiguredSecret(apiKey)) {
    res.status(500).json({ error: 'BLACKCAT_API_KEY nao configurada no backend' });
    return null;
  }

  return { apiUrl: blackcatApiUrl, apiKey };
};

const mapBlackcatStatus = (status: unknown): 'aprovado' | 'pendente' | 'rejeitado' | 'erro' => {
  const normalized = typeof status === 'string' ? status.toLowerCase() : '';
  if (normalized === 'aprovado' || normalized === 'approved') return 'aprovado';
  if (normalized === 'pendente' || normalized === 'pending') return 'pendente';
  if (normalized === 'rejeitado' || normalized === 'declined' || normalized === 'failed') return 'rejeitado';
  return 'erro';
};

const requestBlackcatApi = async <T>(
  config: { apiUrl: string; apiKey: string },
  endpoint: string,
  payload: Record<string, unknown>
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'User-Agent': 'PneusPrecojustoBackend/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as { mensagem?: string } | null;
      const message =
        (errorPayload && typeof errorPayload.mensagem === 'string' && errorPayload.mensagem) ||
        `Falha na API Blackcat (${response.status})`;
      throw new Error(message);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo de resposta da Blackcat excedido');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const requireWiseConfigured = (res: Response): null | { baseUrl: string } => {
  if (!hasConfiguredSecret(wiseApiToken) && (!hasConfiguredSecret(wiseClientId) || !hasConfiguredSecret(wiseClientSecret))) {
    res.status(500).json({
      error: 'Configure WISE_API_TOKEN ou WISE_CLIENT_ID/WISE_CLIENT_SECRET no backend para habilitar payout Wise',
    });
    return null;
  }

  return { baseUrl: wiseBaseUrl };
};

const getWiseAccessToken = async (): Promise<string> => {
  if (hasConfiguredSecret(wiseApiToken)) {
    return wiseApiToken;
  }

  if (wiseTokenCache && wiseTokenCache.expiresAt > Date.now()) {
    return wiseTokenCache.token;
  }

  const basicAuth = Buffer.from(`${wiseClientId}:${wiseClientSecret}`).toString('base64');
  const response = await fetchWithTimeout(`${wiseBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string; error_description?: string };
    throw new Error(
      payload.error_description || payload.error || `Falha ao autenticar na Wise (HTTP ${response.status})`
    );
  }

  const tokenPayload = (await response.json()) as { access_token: string; expires_in?: number };
  const expiresInSec = Math.max(120, Number(tokenPayload.expires_in || 3600));
  wiseTokenCache = {
    token: tokenPayload.access_token,
    expiresAt: Date.now() + (expiresInSec - 60) * 1000,
  };

  return tokenPayload.access_token;
};

const requestWiseApi = async <T>(
  endpoint: string,
  init: RequestInit = {},
  headers: Record<string, string> = {}
): Promise<T> => {
  const token = await getWiseAccessToken();
  const response = await fetchWithTimeout(`${wiseBaseUrl}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(payload.message || payload.error || `Erro Wise API (HTTP ${response.status})`);
  }

  return (await response.json()) as T;
};

const validateBlackcatAddress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = requireBlackcatConfig(res);
    if (!config) return;

    if (!req.authUser?.id) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const street = normalizeText(req.body?.rua, 3, 120);
    const number = normalizeText(req.body?.numero, 1, 20);
    const city = normalizeText(req.body?.cidade, 2, 100);
    const state = normalizeUf(req.body?.estado);
    const cep = normalizeCep(req.body?.cep);
    const complement = normalizeText(req.body?.complemento ?? '', 0, 80) || '';

    if (!street || !number || !city || !state || !cep) {
      return res.status(400).json({ error: 'Dados de endereco invalidos' });
    }

    const response = await requestBlackcatApi<{ valido?: boolean }>(config, '/endereco/validar', {
      logradouro: street,
      numero: number,
      complemento: complement,
      cidade: city,
      estado: state,
      cep,
    });

    return res.status(200).json({ valido: response.valido === true });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao validar endereco com Blackcat' });
  }
};

const processBlackcatPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = requireBlackcatConfig(res);
    if (!config) return;

    if (!req.authUser?.id) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const amount = normalizeAmount(req.body?.valor);
    const description = normalizeText(req.body?.descricao, 3, 180);
    const customerName = normalizeText(req.body?.cliente?.nome, 3, 120);
    const customerEmail = normalizeEmail(req.body?.cliente?.email);
    const customerPhone = normalizePhone(req.body?.cliente?.telefone);
    const customerCpf = normalizeCpf(req.body?.cliente?.cpf) || '';

    const street = normalizeText(req.body?.endereco?.rua, 3, 120);
    const number = normalizeText(req.body?.endereco?.numero, 1, 20);
    const complement = normalizeText(req.body?.endereco?.complemento ?? '', 0, 80) || '';
    const city = normalizeText(req.body?.endereco?.cidade, 2, 100);
    const state = normalizeUf(req.body?.endereco?.estado);
    const cep = normalizeCep(req.body?.endereco?.cep);

    const cardNumber = normalizeCardNumber(req.body?.cartao?.numero);
    const cardHolder = normalizeText(req.body?.cartao?.nomeCartao, 3, 120);
    const cardMonth = normalizeCardMonth(req.body?.cartao?.mes);
    const cardYear = normalizeCardYear(req.body?.cartao?.ano);
    const cardCvv = normalizeCardCvv(req.body?.cartao?.cvv);
    const installments = normalizeInstallments(req.body?.parcelas);

    if (
      amount === null ||
      !description ||
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !street ||
      !number ||
      !city ||
      !state ||
      !cep ||
      !cardNumber ||
      !cardHolder ||
      !cardMonth ||
      !cardYear ||
      !cardCvv
    ) {
      return res.status(400).json({ error: 'Dados obrigatorios de pagamento invalidos' });
    }

    const blackcatPayload = {
      valor: Math.round(amount * 100),
      descricao: description,
      reference_id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      cliente: {
        nome_completo: customerName,
        email: customerEmail,
        telefone: customerPhone,
        cpf: customerCpf,
      },
      endereco_entrega: {
        logradouro: street,
        numero: number,
        complemento: complement,
        cidade: city,
        estado: state,
        cep,
      },
      metodo_pagamento: 'credito',
      cartao: {
        numero: cardNumber,
        nome_titular: cardHolder,
        mes_validade: cardMonth,
        ano_validade: cardYear,
        cvv: cardCvv,
      },
      parcelas: installments,
    };

    const response = await requestBlackcatApi<any>(config, '/pagamento/processar', blackcatPayload);

    return res.status(200).json({
      sucesso: response.status === 'aprovado' || response.status === 'APROVADO',
      transactionId: response.id || response.transaction_id || '',
      mensagem: response.mensagem || response.message || 'Pagamento processado',
      codigo: response.codigo || response.code,
      status: mapBlackcatStatus(response.status),
      tempo_processamento: response.tempo_processamento,
    });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao processar pagamento Blackcat' });
  }
};

const refundBlackcatPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = requireBlackcatConfig(res);
    if (!config) return;

    if (!req.authUser?.id) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const transactionId = normalizeText(req.body?.transactionId, 6, 120);
    const amount = req.body?.valor === undefined ? null : normalizeAmount(req.body?.valor);
    if (!transactionId || (req.body?.valor !== undefined && amount === null)) {
      return res.status(400).json({ error: 'Dados de reembolso invalidos' });
    }

    const response = await requestBlackcatApi<any>(config, '/pagamento/reembolsar', {
      transaction_id: transactionId,
      valor: amount === null ? undefined : Math.round(amount * 100),
    });

    return res.status(200).json({
      sucesso: response.status === 'reembolsado' || response.status === 'REEMBOLSADO',
      transactionId: response.id || transactionId,
      mensagem: response.mensagem || 'Reembolso processado',
      status: 'aprovado',
    });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao reembolsar transacao na Blackcat' });
  }
};

const getBlackcatPaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = requireBlackcatConfig(res);
    if (!config) return;

    if (!req.authUser?.id) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const transactionId = normalizeText(req.body?.transactionId, 6, 120);
    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId invalido' });
    }

    const response = await requestBlackcatApi<any>(config, '/pagamento/consultar', {
      transaction_id: transactionId,
    });

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao consultar transacao na Blackcat' });
  }
};

const getWiseProfileId = async (requestedProfileId?: unknown): Promise<number> => {
  const profileFromRequest = Number(requestedProfileId);
  if (Number.isInteger(profileFromRequest) && profileFromRequest > 0) {
    return profileFromRequest;
  }

  const profiles = await requestWiseApi<Array<{ id: number; type: string }>>('/v2/profiles', { method: 'GET' });
  const selectedProfile = profiles.find((profile) => profile.type === 'business') || profiles[0];
  if (!selectedProfile) {
    throw new Error('Nenhum profile Wise encontrado para a conta configurada');
  }

  return selectedProfile.id;
};

const createWiseQuote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.authUser?.id) return res.status(401).json({ error: 'Usuario nao autenticado' });
    if (!requireWiseConfigured(res)) return;

    const sourceCurrency = normalizeCurrencyCode(req.body?.sourceCurrency);
    const targetCurrency = normalizeCurrencyCode(req.body?.targetCurrency);
    const sourceAmount = req.body?.sourceAmount === undefined ? undefined : normalizeAmount(req.body?.sourceAmount);
    const targetAmount = req.body?.targetAmount === undefined ? undefined : normalizeAmount(req.body?.targetAmount);
    const targetAccount = req.body?.targetAccount === undefined ? null : String(req.body?.targetAccount || '').trim();

    if (!sourceCurrency || !targetCurrency || (sourceAmount === undefined && targetAmount === undefined)) {
      return res.status(400).json({
        error: 'Campos invalidos: sourceCurrency, targetCurrency e (sourceAmount ou targetAmount) sao obrigatorios',
      });
    }

    const profileId = await getWiseProfileId(req.body?.profileId);
    const payload = {
      sourceCurrency,
      targetCurrency,
      sourceAmount: sourceAmount ?? null,
      targetAmount: targetAmount ?? null,
      targetAccount: targetAccount || null,
    };

    const quote = await requestWiseApi<Record<string, any>>(
      `/v3/profiles/${profileId}/quotes`,
      { method: 'POST', body: JSON.stringify(payload) }
    );

    return res.status(201).json({
      id: String(quote.id || ''),
      profileId,
      sourceCurrency: quote.sourceCurrency || sourceCurrency,
      targetCurrency: quote.targetCurrency || targetCurrency,
      sourceAmount: quote.sourceAmount ?? sourceAmount,
      targetAmount: quote.targetAmount ?? targetAmount,
      rate: Number(quote.rate || 0),
      fee: quote.fee || { total: 0 },
      payOut: quote.payOut,
      createdAt: quote.createdTime || quote.createdAt || new Date().toISOString(),
      expiresAt: quote.expirationTime || quote.expiresAt || new Date().toISOString(),
      rateType: quote.rateType || 'FIXED',
    });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao criar quote Wise' });
  }
};

const getWiseQuote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.authUser?.id) return res.status(401).json({ error: 'Usuario nao autenticado' });
    if (!requireWiseConfigured(res)) return;

    const quoteId = normalizeText(req.params.quoteId, 6, 80);
    if (!quoteId) return res.status(400).json({ error: 'quoteId invalido' });

    const profileId = await getWiseProfileId(req.query.profileId);
    const quote = await requestWiseApi<Record<string, any>>(
      `/v3/profiles/${profileId}/quotes/${encodeURIComponent(quoteId)}`,
      { method: 'GET' }
    );

    return res.status(200).json({
      id: String(quote.id || quoteId),
      profileId: Number(quote.profileId || quote.profile?.id || profileId),
      sourceCurrency: quote.sourceCurrency,
      targetCurrency: quote.targetCurrency,
      sourceAmount: quote.sourceAmount,
      targetAmount: quote.targetAmount,
      rate: Number(quote.rate || 0),
      fee: quote.fee || { total: 0 },
      payOut: quote.payOut,
      createdAt: quote.createdTime || quote.createdAt || new Date().toISOString(),
      expiresAt: quote.expirationTime || quote.expiresAt || new Date().toISOString(),
      rateType: quote.rateType || 'FIXED',
    });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao buscar quote Wise' });
  }
};

const getWiseRecipientRequirements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.authUser?.id) return res.status(401).json({ error: 'Usuario nao autenticado' });
    if (!requireWiseConfigured(res)) return;

    const quoteId = normalizeText(req.params.quoteId, 6, 80);
    if (!quoteId) return res.status(400).json({ error: 'quoteId invalido' });

    const requirements = await requestWiseApi<Array<Record<string, any>>>(
      `/v1/quotes/${encodeURIComponent(quoteId)}/account-requirements`,
      { method: 'GET' },
      { 'Accept-Minor-Version': '1' }
    );

    return res.status(200).json(
      requirements.map((item) => ({
        key: String(item.key || ''),
        type: item.type || 'text',
        label: item.name || item.label || String(item.key || ''),
        required: Boolean(item.required),
        validationRegexp: item.validationRegexp || undefined,
        refreshRequirementsOnChange: Boolean(item.refreshRequirementsOnChange),
        minLength: item.minLength ?? undefined,
        maxLength: item.maxLength ?? undefined,
        valuesAllowed: item.valuesAllowed || undefined,
      }))
    );
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao consultar requisitos de recipient Wise' });
  }
};

const createWiseRecipient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.authUser?.id) return res.status(401).json({ error: 'Usuario nao autenticado' });
    if (!requireWiseConfigured(res)) return;

    const currency = normalizeCurrencyCode(req.body?.currency);
    const type = normalizeText(req.body?.type, 2, 40);
    const legalType = normalizeText(req.body?.legalType, 3, 20) || undefined;
    const accountHolderName = normalizeText(req.body?.accountHolderName, 2, 140);
    const details = normalizeObject(req.body?.details);
    if (!currency || !type || !accountHolderName || !details) {
      return res.status(400).json({
        error: 'Campos invalidos: currency, type, accountHolderName e details sao obrigatorios',
      });
    }

    const recipient = await requestWiseApi<Record<string, any>>('/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({
        currency,
        type,
        legalType,
        accountHolderName,
        details,
      }),
    });

    return res.status(201).json({
      id: String(recipient.id || ''),
      type,
      currency,
      accountHolderName,
      details,
      createdAt: recipient.creationTime || new Date().toISOString(),
      active: true,
    });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao criar recipient Wise' });
  }
};

const getWiseTransferRequirements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.authUser?.id) return res.status(401).json({ error: 'Usuario nao autenticado' });
    if (!requireWiseConfigured(res)) return;

    const quoteId = normalizeText(req.body?.quoteId, 6, 80);
    const recipientId = normalizeText(req.body?.recipientId, 1, 80);
    if (!quoteId || !recipientId) {
      return res.status(400).json({ error: 'Campos invalidos: quoteId e recipientId sao obrigatorios' });
    }

    const payload = {
      quoteUuid: quoteId,
      targetAccount: Number(recipientId),
      sourceOfFunds: req.body?.sourceOfFunds,
      transferPurpose: req.body?.transferPurpose,
      details: normalizeObject(req.body?.details) || undefined,
    };

    const requirements = await requestWiseApi<Array<Record<string, any>>>('/v1/transfer-requirements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res.status(200).json(
      requirements.map((item) => ({
        key: String(item.key || ''),
        type: item.type || 'text',
        label: item.name || item.label || String(item.key || ''),
        required: Boolean(item.required),
        validationRegexp: item.validationRegexp || undefined,
        refreshRequirementsOnChange: Boolean(item.refreshRequirementsOnChange),
        minLength: item.minLength ?? undefined,
        maxLength: item.maxLength ?? undefined,
        valuesAllowed: item.valuesAllowed || undefined,
      }))
    );
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao consultar requisitos de transferencia Wise' });
  }
};

const createWiseTransfer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.authUser?.id) return res.status(401).json({ error: 'Usuario nao autenticado' });
    if (!requireWiseConfigured(res)) return;

    const quoteId = normalizeText(req.body?.quoteId, 6, 80);
    const recipientId = normalizeText(req.body?.recipientId, 1, 80);
    const customerTransactionId = normalizeText(req.body?.customerTransactionId, 8, 120);
    if (!quoteId || !recipientId || !customerTransactionId) {
      return res.status(400).json({
        error: 'Campos invalidos: quoteId, recipientId e customerTransactionId sao obrigatorios',
      });
    }

    const profileId = await getWiseProfileId(req.body?.profileId);
    const details = normalizeObject(req.body?.details) || {};
    const transfer = await requestWiseApi<Record<string, any>>(`/v1/transfers`, {
      method: 'POST',
      body: JSON.stringify({
        targetAccount: Number(recipientId),
        quoteUuid: quoteId,
        customerTransactionId,
        details,
      }),
    });

    return res.status(201).json({
      id: String(transfer.id || ''),
      quoteId,
      recipientId,
      customerTransactionId,
      status: transfer.status || 'processing',
      sourceAmount: transfer.sourceAmount,
      targetAmount: transfer.targetAmount,
      sourceCurrency: transfer.sourceCurrency || transfer.sourceValue?.currency || '',
      targetCurrency: transfer.targetCurrency || transfer.targetValue?.currency || '',
      exchangeRate: transfer.rate || transfer.exchangeRate || undefined,
      createdAt: transfer.created || transfer.createdAt || new Date().toISOString(),
      updatedAt: transfer.created || transfer.updatedAt || new Date().toISOString(),
      profileId,
    });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao criar transferencia Wise' });
  }
};

const fundWiseTransfer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.authUser?.id) return res.status(401).json({ error: 'Usuario nao autenticado' });
    if (!requireWiseConfigured(res)) return;

    const transferId = normalizeText(req.params.transferId, 1, 80);
    const method = normalizeText(req.body?.method, 3, 40)?.toUpperCase();
    if (!transferId || !method) {
      return res.status(400).json({ error: 'Campos invalidos: transferId e method sao obrigatorios' });
    }

    const profileId = await getWiseProfileId(req.body?.profileId);
    const payment = await requestWiseApi<Record<string, any>>(
      `/v3/profiles/${profileId}/transfers/${encodeURIComponent(transferId)}/payments`,
      {
        method: 'POST',
        body: JSON.stringify({ type: method }),
      }
    );

    return res.status(200).json({
      success: true,
      status: payment.status || 'processing',
      transferId,
      transactionId: payment.id ? String(payment.id) : undefined,
      message: 'Funding da transferencia solicitado com sucesso',
    });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao fundear transferencia Wise' });
  }
};

const getWiseTransferStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.authUser?.id) return res.status(401).json({ error: 'Usuario nao autenticado' });
    if (!requireWiseConfigured(res)) return;

    const transferId = normalizeText(req.params.transferId, 1, 80);
    if (!transferId) return res.status(400).json({ error: 'transferId invalido' });

    const transfer = await requestWiseApi<Record<string, any>>(`/v1/transfers/${encodeURIComponent(transferId)}`, {
      method: 'GET',
    });

    return res.status(200).json({
      id: String(transfer.id || transferId),
      status: transfer.status || 'processing',
      sourceAmount: transfer.sourceAmount || transfer.sourceValue?.value,
      targetAmount: transfer.targetAmount || transfer.targetValue?.value,
      exchangeRate: transfer.rate || transfer.exchangeRate || undefined,
      createdAt: transfer.created || transfer.createdAt || new Date().toISOString(),
      updatedAt: transfer.updated || transfer.updatedAt || new Date().toISOString(),
      details: normalizeObject(transfer.details) || {},
    });
  } catch (error: any) {
    return res.status(502).json({ error: error.message || 'Erro ao consultar status da transferencia Wise' });
  }
};

const handleWiseWebhookEvent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.authUser?.id) return res.status(401).json({ error: 'Usuario nao autenticado' });

    const payload = normalizeObject(req.body?.payload);
    const signature = normalizeText(req.body?.signature, 8, 4096) || '';
    if (!payload) {
      return res.status(400).json({ error: 'Payload de webhook invalido' });
    }

    const isSignatureValid = Boolean(signature && wiseWebhookPublicKey);
    return res.status(200).json({
      ok: true,
      acceptedAt: new Date().toISOString(),
      signatureChecked: hasConfiguredSecret(wiseWebhookPublicKey),
      signatureValid: isSignatureValid,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao processar webhook Wise' });
  }
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

app.post('/api/payment/checkout/initiate', paymentInitiateRateLimit, authenticate, initiateCheckoutPayment);
app.post('/api/payment/checkout/confirm', paymentConfirmRateLimit, authenticate, confirmCheckoutPayment);
app.get('/api/payment/checkout/:paymentId/status', paymentStatusRateLimit, authenticate, getCheckoutPaymentStatus);
app.post('/api/payment/checkout/refund', paymentRefundRateLimit, authenticate, refundCheckoutPayment);

app.post('/api/blackcat/address/validate', blackcatAddressRateLimit, authenticate, validateBlackcatAddress);
app.post('/api/blackcat/payment/process', blackcatPaymentProcessRateLimit, authenticate, processBlackcatPayment);
app.post('/api/blackcat/payment/refund', blackcatPaymentRefundRateLimit, authenticate, refundBlackcatPayment);
app.post('/api/blackcat/payment/status', blackcatPaymentStatusRateLimit, authenticate, getBlackcatPaymentStatus);

app.post('/api/payout/wise/quotes', wisePayoutRateLimit, authenticate, createWiseQuote);
app.get('/api/payout/wise/quotes/:quoteId', wisePayoutRateLimit, authenticate, getWiseQuote);
app.get(
  '/api/payout/wise/quotes/:quoteId/account-requirements',
  wisePayoutRateLimit,
  authenticate,
  getWiseRecipientRequirements
);
app.post('/api/payout/wise/recipients', wisePayoutRateLimit, authenticate, createWiseRecipient);
app.post('/api/payout/wise/transfers/requirements', wisePayoutRateLimit, authenticate, getWiseTransferRequirements);
app.post('/api/payout/wise/transfers', wisePayoutRateLimit, authenticate, createWiseTransfer);
app.post('/api/payout/wise/transfers/:transferId/fund', wisePayoutRateLimit, authenticate, fundWiseTransfer);
app.get('/api/payout/wise/transfers/:transferId/status', wisePayoutRateLimit, authenticate, getWiseTransferStatus);
app.post('/api/payout/wise/webhooks/handle', wisePayoutRateLimit, authenticate, handleWiseWebhookEvent);

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
