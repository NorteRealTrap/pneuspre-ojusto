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
const supabaseUrl = normalizeEnv(process.env.SUPABASE_URL);
const supabaseAnonKey = normalizeEnv(process.env.SUPABASE_ANON_KEY);
const supabaseServiceKey = normalizeEnv(process.env.SUPABASE_SERVICE_KEY);
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

setInterval(() => {
  const now = Date.now();
  for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(bucketKey);
    }
  }
}, 60 * 1000).unref();

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
  const query = `payment_id=eq.${encodeURIComponent(paymentId)}&select=id,user_id,total,status,payment_method,payment_id`;
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

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (rawBody.length === 0) {
      return res.status(400).json({ error: 'Payload vazio no webhook' });
    }

    const providedSignature = signature.replace(/^sha256=/i, '');
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

// Rota raiz - retorna status de saúde
app.get('/', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    message: 'PneusPrecojusto Backend v1.0',
    endpoints: {
      health: '/api/health',
      loginBanner: '/api/public/login-banner',
      payment: '/api/payment/*'
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
