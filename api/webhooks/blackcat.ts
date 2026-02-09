import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const signatureHeader = req.headers['x-signature'];

  if (!secret) return res.status(500).send('Missing PAYMENT_WEBHOOK_SECRET');
  if (!signatureHeader || typeof signatureHeader !== 'string') return res.status(400).send('Missing X-Signature');

  const signature = signatureHeader.trim().replace(/^sha256=/i, '');
  if (!signature) return res.status(400).send('Missing X-Signature');

  // raw body e obrigatorio para HMAC
  let rawBody = await getRawBody(req);

  // Fallback defensivo caso algum parser tenha consumido o stream.
  if ((!rawBody || rawBody.length === 0) && req.body) {
    const serialized = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    rawBody = Buffer.from(serialized, 'utf8');
  }

  if (!rawBody || rawBody.length === 0) return res.status(400).send('Empty body');

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  // comparacao timing-safe
  const sigOk =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));

  if (!sigOk) return res.status(401).send('Invalid signature');

  // webhook legitimo
  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  // TODO: atualizar Supabase com SERVICE_ROLE_KEY (somente server-side)
  // Ex.: marcar order/payment como paid, processing, cancelled etc.
  // Exemplo de campos esperados no payload:
  // payload.paymentId, payload.orderId, payload.status
  void payload;

  return res.status(200).json({ ok: true });
}

