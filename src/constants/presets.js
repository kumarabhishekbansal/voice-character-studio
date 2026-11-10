/**
 * Default Neutral Voice Settings
 */
export const DEFAULT_VOICE_SETTINGS = {
  // Basic
  pitch: 0,          // -12 to +12 semitones
  rate: 1.0,         // 0.75x to 1.25x
  volume: 100,       // 0 to 150%

  // Character & Formant & EQ
  formant: 0,        // -10 to +10 (envelope preservation & shift)
  bass: 0,           // -12 to +12 dB
  presence: 0,       // -12 to +12 dB
  treble: 0,         // -12 to +12 dB
  highPass: 45,      // 20 to 300 Hz (sub-bass rumble cut)
  lowPass: 20000,    // 3500 to 20000 Hz (upper bandwidth / air limit)
  warmth: 15,        // 0 to 100%

  // Effects & Dynamics
  reverb: 4,         // 0 to 30%
  echo: 0,           // 0 to 30%
  compression: 20,   // 0 to 100%
  noiseReduction: 10,// 0 to 100%
  deEsser: 15,       // 0 to 100%
  saturation: 3,     // 0 to 20%
};

/**
 * Authoritative DSP Filter Metadata & Exact Execution Order
 * Used by VoiceControls UI and Universal Voice Identity Profile v2.0 serialization.
 */
export const FILTER_DEFINITIONS = [
  { key: 'pitch', name: 'Pitch Shift (WSOLA)', min: -12, max: 12, step: 0.5, defaultValue: 0, unit: 'st', order: 1, group: 'basic' },
  { key: 'rate', name: 'Speaking Rate (Tempo)', min: 0.75, max: 1.25, step: 0.01, defaultValue: 1.0, unit: 'x', order: 2, group: 'basic' },
  { key: 'highPass', name: 'High-Pass Filter (Rumble Cut)', min: 20, max: 300, step: 5, defaultValue: 45, unit: 'Hz', order: 3, group: 'basic' },
  { key: 'formant', name: 'Vocal Formant Shape', min: -10, max: 10, step: 0.5, defaultValue: 0, unit: 'st', order: 4, group: 'character' },
  { key: 'bass', name: 'Bass EQ (125 Hz)', min: -12, max: 12, step: 0.5, defaultValue: 0, unit: 'dB', order: 5, group: 'character' },
  { key: 'presence', name: 'Presence EQ (3.2 kHz)', min: -12, max: 12, step: 0.5, defaultValue: 0, unit: 'dB', order: 6, group: 'character' },
  { key: 'treble', name: 'Treble EQ (7.2 kHz)', min: -12, max: 12, step: 0.5, defaultValue: 0, unit: 'dB', order: 7, group: 'character' },
  { key: 'lowPass', name: 'Low-Pass Filter (High-Cut)', min: 3500, max: 20000, step: 250, defaultValue: 20000, unit: 'Hz', order: 8, group: 'character' },
  { key: 'deEsser', name: 'De-Esser (6.8 kHz)', min: 0, max: 100, step: 5, defaultValue: 15, unit: '%', order: 9, group: 'dynamics' },
  { key: 'warmth', name: 'Warmth (Even Harmonics)', min: 0, max: 100, step: 5, defaultValue: 15, unit: '%', order: 10, group: 'character' },
  { key: 'saturation', name: 'Saturation (Analog Drive)', min: 0, max: 20, step: 1, defaultValue: 3, unit: '%', order: 11, group: 'dynamics' },
  { key: 'compression', name: 'Vocal Compression', min: 0, max: 100, step: 5, defaultValue: 20, unit: '%', order: 12, group: 'dynamics' },
  { key: 'reverb', name: 'Studio Reverb', min: 0, max: 30, step: 1, defaultValue: 4, unit: '%', order: 13, group: 'dynamics' },
  { key: 'echo', name: 'Echo / Delay', min: 0, max: 30, step: 1, defaultValue: 0, unit: '%', order: 14, group: 'dynamics' },
  { key: 'volume', name: 'Master Volume / Gain', min: 0, max: 150, step: 5, defaultValue: 100, unit: '%', order: 15, group: 'basic' },
  { key: 'noiseReduction', name: 'Noise Reduction Gate', min: 0, max: 100, step: 5, defaultValue: 10, unit: '%', order: 16, group: 'dynamics' },
];

export const PROCESSING_CHAIN_ORDER = [
  'pitch-tempo-wsola',
  'high-pass-filter',
  'formant-shaper',
  'bass-eq-125hz',
  'presence-eq-3200hz',
  'treble-eq-7200hz',
  'low-pass-filter',
  'de-esser-6800hz',
  'warmth-saturation',
  'dynamic-compressor',
  'spatial-reverb-delay',
  'master-gain-limiter',
  'noise-reduction-gate',
];

/**
 * Character Presets designed around believable YouTube voice workflows
 */
export const CHARACTER_PRESETS = [
  {
    id: 'natural-male',
    name: 'Natural Male',
    characterName: 'Male Voice',
    description: 'Warm, clear studio dialogue with subtle body and natural articulation.',
    badge: 'Natural',
    settings: {
      pitch: 0,
      rate: 1.0,
      volume: 100,
      formant: 0,
      bass: 1.5,
      presence: 1.2,
      treble: 0.5,
      warmth: 20,
      reverb: 5,
      echo: 0,
      compression: 25,
      noiseReduction: 15,
      deEsser: 20,
      saturation: 4,
    }
  },
  {
    id: 'deep-male',
    name: 'Deep Male',
    characterName: 'Deep Voice',
    description: 'Resonant low pitch with intelligent formant balance to preserve speed and avoid boominess.',
    badge: 'Baritone',
    settings: {
      pitch: -3.5,
      rate: 0.98,
      volume: 100,
      formant: -1.5,
      bass: 3.5,
      presence: 1.5,
      treble: -0.5,
      warmth: 35,
      reverb: 7,
      echo: 0,
      compression: 35,
      noiseReduction: 20,
      deEsser: 25,
      saturation: 6,
    }
  },
  {
    id: 'young-male',
    name: 'Young Male',
    characterName: 'Young Hero',
    description: 'Slightly higher pitch with minimal coloring and natural vocal transient preservation.',
    badge: 'Youthful',
    settings: {
      pitch: 2.0,
      rate: 1.02,
      volume: 100,
      formant: 1.2,
      bass: -1.0,
      presence: 2.0,
      treble: 1.5,
      warmth: 10,
      reverb: 6,
      echo: 0,
      compression: 20,
      noiseReduction: 15,
      deEsser: 30,
      saturation: 2,
    }
  },
  {
    id: 'female',
    name: 'Female',
    characterName: 'Female Lead',
    description: 'Higher pitch with feminine formant compensation to prevent chipmunk artifacts.',
    badge: 'Feminine',
    settings: {
      pitch: 4.5,
      rate: 1.0,
      volume: 100,
      formant: 3.5,
      bass: -2.5,
      presence: 3.0,
      treble: 2.0,
      warmth: 15,
      reverb: 8,
      echo: 0,
      compression: 30,
      noiseReduction: 20,
      deEsser: 40,
      saturation: 3,
    }
  },
  {
    id: 'narrator',
    name: 'Narrator',
    characterName: 'Narrator',
    description: 'Authoritative, clear broadcast tone with controlled dynamic leveling and warmth.',
    badge: 'Documentary',
    settings: {
      pitch: -1.0,
      rate: 0.97,
      volume: 105,
      formant: -0.5,
      bass: 2.5,
      presence: 2.8,
      treble: 1.2,
      warmth: 30,
      reverb: 4,
      echo: 0,
      compression: 45,
      noiseReduction: 25,
      deEsser: 35,
      saturation: 5,
    }
  },
  {
    id: 'villain',
    name: 'Villain',
    characterName: 'Villain',
    description: 'Dark, commanding vocal character with deepened chest resonance and ominous presence.',
    badge: 'Dark / Threat',
    settings: {
      pitch: -5.0,
      rate: 0.94,
      volume: 105,
      formant: -4.0,
      bass: 5.0,
      presence: 0.5,
      treble: -2.0,
      warmth: 45,
      reverb: 14,
      echo: 8,
      compression: 50,
      noiseReduction: 25,
      deEsser: 30,
      saturation: 12,
    }
  },
  {
    id: 'old-character',
    name: 'Old Character',
    characterName: 'Elder',
    description: 'Slightly slower cadence, lower pitch, softened highs and subtle raspy warmth.',
    badge: 'Elderly',
    settings: {
      pitch: -2.0,
      rate: 0.90,
      volume: 98,
      formant: -2.0,
      bass: 1.0,
      presence: -1.0,
      treble: -3.5,
      warmth: 40,
      reverb: 6,
      echo: 0,
      compression: 25,
      noiseReduction: 20,
      deEsser: 20,
      saturation: 8,
    }
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    characterName: 'Cartoon Buddy',
    description: 'Exaggerated playful character with elevated pitch, snappy rate and bright presence.',
    badge: 'Animation',
    settings: {
      pitch: 7.0,
      rate: 1.10,
      volume: 100,
      formant: 6.0,
      bass: -4.0,
      presence: 4.5,
      treble: 3.5,
      warmth: 10,
      reverb: 8,
      echo: 10,
      compression: 40,
      noiseReduction: 15,
      deEsser: 35,
      saturation: 5,
    }
  },
  {
    id: 'robot',
    name: 'Robot',
    characterName: 'Android 01',
    description: 'Intentionally stylized mechanical voice with heavy compression and metallic reflection.',
    badge: 'Sci-Fi Synth',
    settings: {
      pitch: -2.0,
      rate: 1.0,
      volume: 100,
      formant: 0,
      bass: 0,
      presence: 3.5,
      treble: 4.5,
      warmth: 0,
      reverb: 16,
      echo: 24,
      compression: 75,
      noiseReduction: 20,
      deEsser: 20,
      saturation: 18,
    }
  }
];
