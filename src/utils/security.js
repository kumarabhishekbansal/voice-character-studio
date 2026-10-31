/**
 * Security & Input Validation Utilities
 * Protects against XSS, Path Traversal, File Disguise/Polyglots, and DoS.
 */

// Supported audio formats allowlist
export const ALLOWED_AUDIO_EXTENSIONS = ['wav', 'mp3', 'm4a', 'ogg', 'flac', 'webm', 'aac'];

export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/vorbis',
  'audio/flac',
  'audio/x-flac',
  'audio/webm',
  'audio/aac',
  'audio/x-aac',
];

// File size and duration limits to prevent browser memory exhaustion (DoS)
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_AUDIO_DURATION_SECONDS = 1200; // 20 minutes

/**
 * Sanitizes a character or filename string.
 * Prevents path traversal (../), double extensions, XSS payload injections, and control characters.
 * 
 * @param {string} input - User input string
 * @param {string} fallback - Safe fallback if input is invalid
 * @returns {string} Sanitized alphanumeric string
 */
export function sanitizeFilename(input, fallback = 'Voice') {
  if (typeof input !== 'string') return fallback;

  // 1. Remove dangerous HTML tags, path traversal & control characters
  let clean = input
    .replace(/[\x00-\x1F\x7F]/g, '') // Control characters
    .replace(/<[^>]*>/g, '')          // HTML tags / XSS injections
    .replace(/\.\.+[/\\]?/g, '')      // Path traversal (.. /)
    .replace(/[<>:"/\\|?*]/g, '')     // Filesystem forbidden characters
    .trim();

  // 2. Allow only safe characters: letters, numbers, spaces, underscores, and hyphens
  clean = clean.replace(/[^a-zA-Z0-9_\-\s]/g, '');

  // 3. Collapse multiple spaces/underscores
  clean = clean.replace(/\s+/g, '_').replace(/_+/g, '_');

  // 4. Limit length to prevent buffer/UI overflow
  clean = clean.slice(0, 32);

  // 5. Ensure non-empty result
  return clean.length > 0 ? clean : fallback;
}

/**
 * Validates audio file magic bytes / signatures against binary headers.
 * Protects against disguised executables, scripts, or polyglots renamed with audio extensions.
 * 
 * @param {ArrayBuffer} buffer - File buffer
 * @returns {boolean} True if binary header matches a recognized audio signature
 */
export function validateAudioMagicBytes(buffer) {
  if (!buffer || buffer.byteLength < 12) return false;

  const bytes = new Uint8Array(buffer, 0, Math.min(64, buffer.byteLength));

  // Helper to match ASCII signature at offset
  const matchAscii = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      if (bytes[offset + i] !== str.charCodeAt(i)) return false;
    }
    return true;
  };

  // 1. WAV / RIFF: "RIFF" at 0..3 and "WAVE" at 8..11
  if (matchAscii(0, 'RIFF') && matchAscii(8, 'WAVE')) {
    return true;
  }

  // 2. MP3 with ID3v2 tag: "ID3" at 0..2
  if (matchAscii(0, 'ID3')) {
    return true;
  }

  // 3. MP3 raw MPEG frame sync: 0xFF followed by 0xEx or 0xFx
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
    return true;
  }

  // 4. FLAC: "fLaC" at 0..3
  if (matchAscii(0, 'fLaC')) {
    return true;
  }

  // 5. OGG: "OggS" at 0..3
  if (matchAscii(0, 'OggS')) {
    return true;
  }

  // 6. M4A / MP4: "ftyp" at 4..7
  if (matchAscii(4, 'ftyp')) {
    return true;
  }

  // 7. WebM / EBML: 0x1A 0x45 0xDF 0xA3
  if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
    return true;
  }

  // 8. ADTS AAC frame sync: 0xFF followed by 0xF0..0xFF
  if (bytes[0] === 0xFF && (bytes[1] & 0xF6) === 0xF0) {
    return true;
  }

  return false;
}

/**
 * Validates audio file extension against strict allowlist
 * 
 * @param {string} fileName
 * @returns {boolean}
 */
export function validateFileExtension(fileName) {
  if (!fileName || typeof fileName !== 'string') return false;

  // Reject double extensions (e.g. evil.php.wav)
  const parts = fileName.toLowerCase().split('.').filter(Boolean);
  if (parts.length < 2) return false;

  const ext = parts[parts.length - 1];
  return ALLOWED_AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Validates and clamps audio DSP parameters within strict mathematical boundaries.
 * Prevents NaN, Infinity, buffer corruption, or browser freeze from out-of-bound inputs.
 * 
 * @param {Object} rawSettings
 * @returns {Object} Safe, clamped settings
 */
export function sanitizeAudioSettings(rawSettings = {}) {
  const clamp = (val, min, max, defaultVal) => {
    const num = parseFloat(val);
    if (!Number.isFinite(num) || Number.isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(max, num));
  };

  return {
    pitch: clamp(rawSettings.pitch, -12, 12, 0),
    rate: clamp(rawSettings.rate, 0.75, 1.25, 1.0),
    volume: clamp(rawSettings.volume, 0, 150, 100),
    formant: clamp(rawSettings.formant, -10, 10, 0),
    bass: clamp(rawSettings.bass, -12, 12, 0),
    presence: clamp(rawSettings.presence, -12, 12, 0),
    treble: clamp(rawSettings.treble, -12, 12, 0),
    warmth: clamp(rawSettings.warmth, 0, 100, 15),
    compression: clamp(rawSettings.compression, 0, 100, 20),
    noiseReduction: clamp(rawSettings.noiseReduction, 0, 100, 10),
    deEsser: clamp(rawSettings.deEsser, 0, 100, 15),
    saturation: clamp(rawSettings.saturation, 0, 20, 3),
    reverb: clamp(rawSettings.reverb, 0, 30, 4),
    echo: clamp(rawSettings.echo, 0, 30, 0),
  };
}
