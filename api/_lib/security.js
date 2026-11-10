/**
 * Server-side Security, Rate Limiting & Safe Error Helpers for Vercel Serverless Functions.
 * Zero logging of user scripts, Base64 audio, or secrets.
 */

const rateBuckets = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

export function getClientIp(req) {
  const fwd = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'local';
}

export function checkRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rateBuckets.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateBuckets.set(ip, { windowStart: now, count: 1 });
    return { allowed: true };
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000),
    };
  }

  return { allowed: true };
}

export function sendJson(res, status, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json(data);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export async function readJsonBody(req, maxBytes = 4 * 1024 * 1024) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }

  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', () => reject(new Error('STREAM_ERROR')));
  });
}

export function validateWavMagicBase64(b64) {
  if (typeof b64 !== 'string' || b64.length < 60) return false;
  try {
    const buf = Buffer.from(b64.slice(0, 32), 'base64');
    return (
      buf.length >= 12 &&
      buf.toString('ascii', 0, 4) === 'RIFF' &&
      buf.toString('ascii', 8, 12) === 'WAVE'
    );
  } catch {
    return false;
  }
}

export function sanitizeProviderError(err) {
  const status = err?.status || err?.statusCode || err?.code;
  const rawMsg = String(err?.message || '').toLowerCase();

  if (status === 429 || rawMsg.includes('resource_exhausted') || rawMsg.includes('quota') || rawMsg.includes('rate limit')) {
    return {
      status: 429,
      code: 'QUOTA_EXHAUSTED',
      message: 'Google Gemini API free-tier quota or rate limit exceeded. Wait briefly or switch to Local Kokoro-82M Neural mode (100% free offline).',
    };
  }

  if (status === 401 || status === 403 || rawMsg.includes('api_key') || rawMsg.includes('permission_denied') || rawMsg.includes('unauthorized')) {
    return {
      status: 403,
      code: 'API_KEY_INVALID',
      message: 'GEMINI_API_KEY was rejected or lacks access to this model. Verify your Google AI Studio key in Vercel Environment Variables.',
    };
  }

  if (rawMsg.includes('safety') || rawMsg.includes('blocked') || rawMsg.includes('consent')) {
    return {
      status: 400,
      code: 'POLICY_OR_CONSENT_REJECTED',
      message: 'Request rejected by Gemini safety/consent verification. Ensure speaker voice and consent clips match clearly in quiet audio.',
    };
  }

  if (rawMsg.includes('not found') || status === 404) {
    return {
      status: 404,
      code: 'MODEL_OR_VOICE_NOT_FOUND',
      message: 'Requested Gemini model or voice key/ID was not found or may have expired (stateless keys expire after 7 days).',
    };
  }

  return {
    status: 500,
    code: 'PROVIDER_UNAVAILABLE',
    message: 'Cloud synthesis encountered an upstream error. You can retry or switch to Local Kokoro-82M Neural mode.',
  };
}
