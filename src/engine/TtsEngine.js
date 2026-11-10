import { buildGeminiTurnStyle, KOKORO_VOICES } from '../constants/ttsConfig';
import { EmotionAnalyzer } from './EmotionAnalyzer';
import { AudioResampler } from './AudioResampler';
import { base64ToUint8Array, sanitizeTextScript } from '../utils/security';

class LocalKokoroAdapter {
  constructor() {
    this.instance = null;
    this.loadingPromise = null;
    this.deviceUsed = null;
  }

  isLoaded() {
    return Boolean(this.instance);
  }

  async ensureLoaded(onProgress = null) {
    if (this.instance) return this.instance;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        if (onProgress) onProgress({ stage: 'Loading Kokoro-82M neural runtime...', pct: 5 });

        const { KokoroTTS } = await import('kokoro-js');

        // Detect WebGPU safely with WASM fallback
        let device = 'wasm';
        let dtype = 'q8';
        try {
          if (typeof navigator !== 'undefined' && navigator.gpu) {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
              device = 'webgpu';
              dtype = 'fp32'; // Recommended by kokoro-js docs for WebGPU
            }
          }
        } catch {
          device = 'wasm';
          dtype = 'q8';
        }

        this.deviceUsed = device;
        const modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX';

        const fileProgressMap = new Map();
        const tts = await KokoroTTS.from_pretrained(modelId, {
          dtype,
          device,
          progress_callback: (info) => {
            if (!onProgress || !info) return;
            if (info.status === 'progress' && info.file && typeof info.progress === 'number') {
              fileProgressMap.set(info.file, info.progress);
              const avg = Array.from(fileProgressMap.values()).reduce((a, b) => a + b, 0) / fileProgressMap.size;
              onProgress({
                stage: `Downloading Kokoro-82M (${device.toUpperCase()}): ${Math.round(avg)}%`,
                pct: Math.min(95, Math.max(10, Math.round(avg))),
              });
            } else if (info.status === 'ready') {
              onProgress({ stage: 'Kokoro-82M neural model ready in browser!', pct: 100 });
            }
          },
        });

        this.instance = tts;
        return tts;
      } catch (err) {
        this.loadingPromise = null;
        throw new Error(`Failed to initialize local Kokoro-82M ONNX runtime: ${err.message || 'Unknown error'}`);
      }
    })();

    return this.loadingPromise;
  }

  async synthesizeSegment({ text, voiceId, speed = 1.0, audioCtx, signal, onModelProgress }) {
    if (signal?.aborted) throw new Error('Generation cancelled.');

    const tts = await this.ensureLoaded(onModelProgress);
    if (signal?.aborted) throw new Error('Generation cancelled.');

    const validKokoroId = KOKORO_VOICES.some((v) => v.id === voiceId) ? voiceId : 'af_heart';
    const cleanText = EmotionAnalyzer.sanitizeTextForLocalKokoro(text);
    if (!cleanText) {
      throw new Error('Segment contains no speakable text for local synthesis.');
    }

    const clampedSpeed = Math.max(0.7, Math.min(1.5, Number(speed) || 1.0));
    const rawAudio = await tts.generate(cleanText, {
      voice: validKokoroId,
      speed: clampedSpeed,
    });

    if (signal?.aborted) throw new Error('Generation cancelled.');

    const sampleRate = rawAudio.sampling_rate || 24000;
    const pcm = rawAudio.audio;
    const buffer = audioCtx.createBuffer(1, pcm.length, sampleRate);
    buffer.getChannelData(0).set(pcm);
    return buffer;
  }
}

class GeminiCloudAdapter {
  async synthesizeSegment({
    model = 'gemini-3.8-flash-tts',
    text,
    voiceId = 'Kore',
    speakerName = 'Speaker',
    emotion = 'neutral',
    intensity = 'moderate',
    style = 'normal-conversation',
    speed = 1.0,
    pitchPreference = 0,
    accent = 'default',
    audioCtx,
    signal,
  }) {
    const turnStyle = buildGeminiTurnStyle({
      emotion,
      intensity,
      style,
      speed,
      pitchPreference,
      accent,
    });

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        voice: voiceId,
        turns: [
          {
            text: sanitizeTextScript(text, 5500),
            style: turnStyle,
            speaker: speakerName,
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(payload.message || 'Cloud TTS synthesis failed.');
      err.code = payload.code || 'PROVIDER_ERROR';
      err.status = response.status;
      throw err;
    }

    const wavBytes = base64ToUint8Array(payload.audioBase64);
    const decoded = await audioCtx.decodeAudioData(wavBytes.buffer.slice(0));
    return decoded;
  }

  async replicateVoice({ sourceAudioB64, consentAudioB64, displayName, store = false }) {
    const response = await fetch('/api/voice-replicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAudioB64,
        consentAudioB64,
        displayName,
        store: Boolean(store),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(payload.message || 'Voice replication failed.');
      err.code = payload.code || 'REPLICATION_ERROR';
      err.status = response.status;
      throw err;
    }

    return payload;
  }
}

export class TtsEngine {
  constructor() {
    this.kokoro = new LocalKokoroAdapter();
    this.gemini = new GeminiCloudAdapter();
    this.abortController = null;
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  async fetchServerStatus() {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('Status check unavailable');
      return await res.json();
    } catch {
      return {
        geminiConfigured: false,
        elevenlabsConfigured: false,
        offlineOnly: true,
      };
    }
  }

  async fetchGeminiVoices(filters = {}) {
    try {
      const qs = new URLSearchParams();
      if (filters.language && filters.language !== 'auto') qs.set('language_code', filters.language);
      if (filters.gender && filters.gender !== 'all') qs.set('gender', filters.gender);
      if (filters.search) qs.set('search', filters.search);
      const res = await fetch(`/api/voices?${qs.toString()}`);
      if (!res.ok) return { configured: false, voices: [] };
      return await res.json();
    } catch {
      return { configured: false, voices: [] };
    }
  }

  /**
   * Emergency Browser Web Speech Fallback (Live Audio Playback ONLY — cannot produce AudioBuffer/WAV)
   */
  playBrowserFallback(text, { speed = 1.0, pitch = 0, lang = 'en-US' } = {}) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      throw new Error('Browser SpeechSynthesis API is not supported in this browser.');
    }
    window.speechSynthesis.cancel();
    const clean = EmotionAnalyzer.sanitizeTextForLocalKokoro(text);
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = Math.max(0.5, Math.min(2.0, speed || 1.0));
    utter.pitch = Math.max(0.5, Math.min(2.0, 1.0 + (pitch || 0) / 12));
    if (lang && lang !== 'auto' && lang !== 'hi-Latn') utter.lang = lang;
    window.speechSynthesis.speak(utter);
    return utter;
  }

  /**
   * Generates a complete multi-segment / multi-character script and stitches all segments
   * cleanly into one master AudioBuffer while returning per-segment AudioBuffers too.
   */
  async generateScript({
    engine = 'gemini',
    model = 'gemini-3.8-flash-tts',
    segments = [],
    speakers = [],
    pronunciationDictionary = [],
    language = 'auto',
    accent = 'default',
    speakerSwitchPauseMs = 650,
    paragraphPauseMs = 550,
    audioCtx,
    onProgress,
    onModelProgress,
  }) {
    this.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    if (!segments || segments.length === 0) {
      throw new Error('Please enter script text or at least one speech segment.');
    }

    const generatedSegments = [];

    for (let i = 0; i < segments.length; i++) {
      if (signal.aborted) throw new Error('Generation cancelled.');

      const seg = segments[i];
      const speakerObj = speakers.find((sp) => sp.id === seg.speakerId) || speakers[0] || {
        id: 'narrator',
        name: 'Narrator',
        voiceId: engine === 'kokoro' ? 'af_heart' : 'Kore',
      };

      const workingText = EmotionAnalyzer.applyPronunciationDictionary(seg.text, pronunciationDictionary);
      if (!workingText || !workingText.trim()) {
        continue;
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: segments.length,
          pct: Math.round((i / segments.length) * 90),
          stage: `Generating segment ${i + 1} of ${segments.length} (${speakerObj.name})...`,
        });
      }

      let segBuffer;
      if (engine === 'gemini') {
        segBuffer = await this.gemini.synthesizeSegment({
          model,
          text: workingText,
          voiceId: speakerObj.voiceId || 'Kore',
          speakerName: speakerObj.name,
          emotion: seg.emotion || 'neutral',
          intensity: seg.intensity || 'moderate',
          style: seg.style || 'normal-conversation',
          speed: seg.speed ?? 1.0,
          pitchPreference: seg.pitchPreference ?? 0,
          accent,
          audioCtx,
          signal,
        });
      } else if (engine === 'kokoro') {
        segBuffer = await this.kokoro.synthesizeSegment({
          text: workingText,
          voiceId: speakerObj.voiceId || 'af_heart',
          speed: seg.speed ?? 1.0,
          audioCtx,
          signal,
          onModelProgress,
        });
      } else {
        throw new Error('Selected fallback engine supports live playback only. Select Gemini 3.8 Flash TTS or Kokoro-82M to generate downloadable audio.');
      }

      // Compute pause between this segment and next
      const nextSeg = segments[i + 1];
      let pauseAfterMs = seg.pauseAfterMs ?? paragraphPauseMs;
      if (nextSeg && nextSeg.speakerId !== seg.speakerId) {
        pauseAfterMs = Math.max(pauseAfterMs, speakerSwitchPauseMs);
      }

      generatedSegments.push({
        id: seg.id,
        index: i + 1,
        speakerName: speakerObj.name,
        emotion: seg.emotion,
        textPreview: seg.text.slice(0, 60),
        audioBuffer: segBuffer,
        pauseAfterMs,
      });
    }

    if (signal.aborted) throw new Error('Generation cancelled.');
    if (generatedSegments.length === 0) {
      throw new Error('No speakable text segments found to synthesize.');
    }

    if (onProgress) {
      onProgress({
        current: segments.length,
        total: segments.length,
        pct: 95,
        stage: 'Stitching timeline pauses & normalizing speech tracks...',
      });
    }

    const combinedBuffer = await AudioResampler.concatenateSegments(generatedSegments, audioCtx);

    if (onProgress) {
      onProgress({
        current: segments.length,
        total: segments.length,
        pct: 100,
        stage: 'Speech generation complete!',
      });
    }

    return {
      combinedBuffer,
      segments: generatedSegments,
    };
  }
}

export const ttsEngine = new TtsEngine();
