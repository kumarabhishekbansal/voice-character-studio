import { GoogleGenAI } from '@google/genai';
import { sendJson, checkRateLimit, readJsonBody, sanitizeProviderError } from './_lib/security.js';

const ALLOWED_MODELS = new Set(['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']);
const MAX_TURNS = 15;
const MAX_CHARS_PER_BATCH = 6000;

function extractAudioFromInteraction(interaction) {
  if (interaction?.output_audio?.data) {
    return interaction.output_audio.data;
  }
  const steps = interaction?.steps;
  if (Array.isArray(steps)) {
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      if (step?.type === 'model_output' && Array.isArray(step.content)) {
        for (let j = step.content.length - 1; j >= 0; j--) {
          const item = step.content[j];
          if (item?.type === 'audio' && item?.data) {
            return item.data;
          }
        }
      }
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for TTS synthesis.' });
  }

  const rl = checkRateLimit(req);
  if (!rl.allowed) {
    return sendJson(res, 429, {
      code: 'RATE_LIMITED',
      message: `Too many requests. Please wait ${rl.retryAfterSec}s before generating again.`,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return sendJson(res, 503, {
      code: 'MISSING_API_KEY',
      provider: 'gemini',
      message: 'GEMINI_API_KEY is not configured in Vercel Environment Variables. Add your free Google AI Studio key in Vercel Settings -> Environment Variables, or switch to Local Kokoro-82M Neural mode.',
    });
  }

  let body;
  try {
    body = await readJsonBody(req, 512 * 1024);
  } catch (err) {
    return sendJson(res, 400, { code: 'INVALID_REQUEST', message: 'Malformed request payload.' });
  }

  const model = ALLOWED_MODELS.has(body?.model) ? body.model : 'gemini-3.8-flash-tts';
  const turns = Array.isArray(body?.turns) ? body.turns : [];

  if (turns.length === 0 || turns.length > MAX_TURNS) {
    return sendJson(res, 400, { code: 'INVALID_TURNS', message: `Provide between 1 and ${MAX_TURNS} dialogue turns per request.` });
  }

  let totalChars = 0;
  const contentItems = [];

  for (const turn of turns) {
    if (!turn || typeof turn.text !== 'string' || !turn.text.trim()) {
      return sendJson(res, 400, { code: 'EMPTY_TURN', message: 'Text segment cannot be empty.' });
    }
    const cleanText = turn.text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
    totalChars += cleanText.length;
    if (totalChars > MAX_CHARS_PER_BATCH) {
      return sendJson(res, 400, {
        code: 'TEXT_TOO_LONG',
        message: `Batch exceeds ${MAX_CHARS_PER_BATCH} characters. Split long scripts cleanly into smaller segments.`,
      });
    }

    const annotation = { type: 'speech_metadata' };
    if (typeof turn.style === 'string' && turn.style.trim()) {
      annotation.style = turn.style.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 180);
    }
    if (typeof turn.speaker === 'string' && turn.speaker.trim()) {
      annotation.speaker = turn.speaker.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 60);
    }

    contentItems.push({
      type: 'text',
      text: cleanText,
      annotations: [annotation],
    });
  }

  // Configure voice or multi-speaker pair
  let speechConfig;
  if (Array.isArray(body?.speakers) && body.speakers.length === 2) {
    speechConfig = {
      speakers: body.speakers.map((s) => ({
        speaker: String(s.speaker || 'Speaker').slice(0, 60),
        voice: String(s.voice || 'Kore').slice(0, 1024),
      })),
    };
  } else {
    const voice = typeof body?.voice === 'string' && body.voice.trim()
      ? body.voice.trim().slice(0, 1024)
      : 'Kore';
    speechConfig = [{ voice }];
  }

  try {
    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
    const interaction = await ai.interactions.create({
      model,
      input: [
        {
          type: 'user_input',
          content: contentItems,
        },
      ],
      response_format: {
        type: 'audio',
        mime_type: 'audio/wav',
        sample_rate: 24000,
      },
      generation_config: {
        speech_config: speechConfig,
      },
    });

    const audioB64 = extractAudioFromInteraction(interaction);
    if (!audioB64) {
      return sendJson(res, 502, {
        code: 'NO_AUDIO_RETURNED',
        message: 'Gemini did not return an audio block for this segment.',
      });
    }

    return sendJson(res, 200, {
      mimeType: 'audio/wav',
      sampleRate: 24000,
      model,
      audioBase64: audioB64,
    });
  } catch (err) {
    const safeErr = sanitizeProviderError(err);
    return sendJson(res, safeErr.status, {
      code: safeErr.code,
      message: safeErr.message,
    });
  }
}
