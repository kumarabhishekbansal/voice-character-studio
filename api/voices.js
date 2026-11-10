import { GoogleGenAI } from '@google/genai';
import { sendJson, checkRateLimit, sanitizeProviderError } from './_lib/security.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for listing voices.' });
  }

  const rl = checkRateLimit(req);
  if (!rl.allowed) {
    return sendJson(res, 429, { code: 'RATE_LIMITED', message: 'Rate limit exceeded.' });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return sendJson(res, 200, {
      configured: false,
      voices: [],
      message: 'GEMINI_API_KEY not configured on server; showing prebuilt studio catalog locally.',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const urlObj = new URL(req.url || '/api/voices', 'http://localhost');
    const params = { page_size: 100 };

    const lang = urlObj.searchParams.get('language_code');
    if (lang && lang !== 'auto') params.language_code = [lang];

    const gender = urlObj.searchParams.get('gender');
    if (gender && gender !== 'all') params.gender = [gender];

    const search = urlObj.searchParams.get('search');
    if (search) params.search = search.slice(0, 50);

    const typeFilter = urlObj.searchParams.get('type');
    if (typeFilter) params.type = [typeFilter];

    const response = await ai.voices.list(params);
    const voices = (response?.voices || []).map((v) => ({
      id: v.id,
      displayName: v.display_name || v.id,
      languageCode: v.language_code || '',
      accent: v.accent || '',
      gender: v.gender || '',
      pitch: v.pitch || '',
      type: v.type || 'prebuilt',
      description: v.description || '',
    }));

    return sendJson(res, 200, { configured: true, voices });
  } catch (err) {
    const safeErr = sanitizeProviderError(err);
    return sendJson(res, safeErr.status, { code: safeErr.code, message: safeErr.message });
  }
}
