import { sendJson, checkRateLimit } from './_lib/security.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const rl = checkRateLimit(req);
  if (!rl.allowed) {
    return sendJson(res, 429, { error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec });
  }

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
  const elevenlabsConfigured = Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim().length > 10);

  return sendJson(res, 200, {
    geminiConfigured,
    elevenlabsConfigured,
    engines: {
      gemini: {
        configured: geminiConfigured,
        models: ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'],
        supportsEmotions: true,
        supportsSpeakingStyles: true,
        supportsVoiceReplication: true,
        supportsSpeechToSpeechConversion: false,
      },
      kokoro: {
        configured: true,
        localInBrowser: true,
        supportsEmotions: false,
        supportsVoiceReplication: false,
      },
      elevenlabs: {
        configured: elevenlabsConfigured,
        optional: true,
        supportsSpeechToSpeechConversion: elevenlabsConfigured,
      },
    },
  });
}
