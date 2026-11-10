import { sendJson, checkRateLimit } from './_lib/security.js';

/**
 * Optional / Disabled Speech-to-Speech Voice Conversion Adapter (ElevenLabs)
 * Remains completely disabled and costs zero until an operator explicitly adds ELEVENLABS_API_KEY.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' });
  }

  const rl = checkRateLimit(req);
  if (!rl.allowed) {
    return sendJson(res, 429, { code: 'RATE_LIMITED', message: 'Too many requests.' });
  }

  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!elevenKey) {
    return sendJson(res, 501, {
      code: 'PROVIDER_DISABLED',
      provider: 'elevenlabs',
      message:
        'AI target-speaker Speech-to-Speech Voice Conversion is disabled because ELEVENLABS_API_KEY is not configured. Google Gemini 3.8 TTS handles Text-to-Speech + Voice Replication only, while local Speech-to-Speech uses studio DSP filters.',
    });
  }

  return sendJson(res, 501, {
    code: 'ADAPTER_STANDBY',
    message: 'Optional ElevenLabs Speech-to-Speech forwarding is reserved for future key activation.',
  });
}
