import { GoogleGenAI } from '@google/genai';
import {
  sendJson,
  checkRateLimit,
  readJsonBody,
  validateWavMagicBase64,
  sanitizeProviderError,
} from './_lib/security.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for voice replication.' });
  }

  const rl = checkRateLimit(req);
  if (!rl.allowed) {
    return sendJson(res, 429, { code: 'RATE_LIMITED', message: 'Too many requests. Please wait briefly.' });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return sendJson(res, 503, {
      code: 'MISSING_API_KEY',
      message: 'GEMINI_API_KEY is not configured in Vercel Environment Variables. Voice replication requires a Google AI Studio key.',
    });
  }

  let body;
  try {
    body = await readJsonBody(req, 4.2 * 1024 * 1024);
  } catch {
    return sendJson(res, 400, {
      code: 'PAYLOAD_INVALID',
      message: 'Reference + consent WAV audio payload is invalid or exceeds the 4.2 MB transfer limit.',
    });
  }

  const { sourceAudioB64, consentAudioB64, displayName = 'AbhiVoice Replicated', store = false } = body || {};

  if (!validateWavMagicBase64(sourceAudioB64)) {
    return sendJson(res, 400, {
      code: 'INVALID_SOURCE_AUDIO',
      message: 'Reference voice audio must be a valid 16-bit PCM WAV sample.',
    });
  }

  if (!validateWavMagicBase64(consentAudioB64)) {
    return sendJson(res, 400, {
      code: 'INVALID_CONSENT_AUDIO',
      message: 'Speaker consent recording must be a valid 16-bit PCM WAV recording reciting Google consent phrase.',
    });
  }

  const cleanDisplayName = String(displayName).replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 48) || 'Replicated Voice';

  try {
    const ai = new GoogleGenAI({ apiKey });
    const voicePayload = {
      model: 'gemini-3.8-flash-tts',
      type: 'replicated',
      replicated: {
        source_audio: { mime_type: 'audio/wav', data: sourceAudioB64 },
        consent_audio: { mime_type: 'audio/wav', data: consentAudioB64 },
      },
    };
    if (store) {
      voicePayload.display_name = cleanDisplayName;
    }

    const replicated = await ai.voices.create({
      store: Boolean(store),
      voice: voicePayload,
    });

    return sendJson(res, 200, {
      id: replicated?.id || null,
      key: replicated?.key || null,
      store: Boolean(store),
      expireTime: replicated?.expire_time || null,
      displayName: cleanDisplayName,
    });
  } catch (err) {
    const safeErr = sanitizeProviderError(err);
    return sendJson(res, safeErr.status, { code: safeErr.code, message: safeErr.message });
  }
}
