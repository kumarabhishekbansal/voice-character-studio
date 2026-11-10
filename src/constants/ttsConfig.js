/**
 * Authoritative Text-to-Speech Configuration, Engine Capabilities, Emotions,
 * Delivery Styles, Verified Voices, Consent Statements, and Starting Presets.
 */

export const TTS_ENGINES = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini 3.8 Flash TTS',
    badge: 'Cloud Expressive AI',
    models: [
      { id: 'gemini-3.8-flash-tts', label: 'Gemini 3.8 Flash TTS (Studio Expressive Fidelity)' },
      { id: 'gemini-3.8-flash-lite-tts', label: 'Gemini 3.8 Flash-Lite TTS (Fast / High Throughput)' },
    ],
    supportsEmotions: true,
    supportsSpeakingStyles: true,
    supportsInlineVocalTags: true,
    supportsHindiAndHinglish: true,
    supportsMultiSpeaker: true,
    supportsVoiceReplication: true, // Requires source + consent audio & GEMINI_API_KEY
    supportsSpeechToSpeechConversion: false, // Honest limitation: Gemini TTS is text-input only
    costNote: 'Free Tier available per Google AI Studio GEMINI_API_KEY quotas (inputs/outputs used to improve Google products on Free Tier). Server-side key required on Vercel.',
  },
  kokoro: {
    id: 'kokoro',
    name: 'Kokoro-82M (Local Neural In-Browser)',
    badge: '100% Local • Zero Cost',
    models: [
      { id: 'onnx-community/Kokoro-82M-v1.0-ONNX', label: 'Kokoro-82M v1.0 ONNX (WebGPU / WASM)' },
    ],
    supportsEmotions: false, // Honest: no native emotion tags in Kokoro-82M
    supportsSpeakingStyles: false,
    supportsInlineVocalTags: false,
    supportsHindiAndHinglish: false, // Honest: kokoro-js v1.2.1 bundles en-us & en-gb voices only
    supportsMultiSpeaker: true, // Supports switching across its 28 US/UK English voices per segment
    supportsVoiceReplication: false,
    supportsSpeechToSpeechConversion: false,
    costNote: 'Runs 100% locally in your browser via WebGPU/WASM (~86 MB ONNX download cached locally once). Zero API keys, zero server cost.',
  },
  elevenlabs: {
    id: 'elevenlabs',
    name: 'ElevenLabs (Optional / Future Key)',
    badge: 'Disabled unless configured',
    disabledByDefault: true,
    supportsEmotions: true,
    supportsSpeakingStyles: true,
    supportsInlineVocalTags: true,
    supportsHindiAndHinglish: true,
    supportsMultiSpeaker: true,
    supportsVoiceReplication: true,
    supportsSpeechToSpeechConversion: true,
    costNote: 'Optional future adapter. Disabled because ELEVENLABS_API_KEY is not configured and no paid subscription is required.',
  },
  browserFallback: {
    id: 'browser-fallback',
    name: 'Browser Web Speech (Fallback Only)',
    badge: 'OS Live Preview Only',
    isFallback: true,
    supportsEmotions: false,
    supportsSpeakingStyles: false,
    supportsInlineVocalTags: false,
    supportsHindiAndHinglish: true, // Depends on OS voices
    supportsMultiSpeaker: false,
    supportsVoiceReplication: false,
    supportsSpeechToSpeechConversion: false,
    supportsAudioExport: false, // Important: Web Speech API cannot export WAV/MP3 audio buffers
    costNote: 'Built-in OS fallback for live preview listening only. Cannot export WAV/MP3 files or apply DSP filters.',
  },
};

/**
 * 18 Distinct Emotions (kept cleanly separate from Delivery Styles)
 * Mapped strictly to subtle / moderate / strong turn-level Gemini speech_metadata.style directions.
 */
export const TTS_EMOTIONS = [
  {
    id: 'neutral',
    label: 'Neutral',
    directions: {
      subtle: '',
      moderate: 'natural, steady neutral tone',
      strong: 'clear, poised neutral delivery',
    },
  },
  {
    id: 'happy',
    label: 'Happy',
    directions: {
      subtle: 'gently warm, light positive undertone',
      moderate: 'cheerful and friendly',
      strong: 'bright, joyful and very cheerful inflection',
    },
  },
  {
    id: 'sad',
    label: 'Sad',
    directions: {
      subtle: 'slightly somber, reflective undertone',
      moderate: 'noticeably sad and downcast',
      strong: 'deeply emotional, sorrowful with heavy heart',
    },
  },
  {
    id: 'angry',
    label: 'Angry',
    directions: {
      subtle: 'controlled frustration, tight understated tone',
      moderate: 'clearly angry and firm',
      strong: 'intense anger, sharp confrontational delivery',
    },
  },
  {
    id: 'excited',
    label: 'Excited',
    directions: {
      subtle: 'lightly upbeat, mild anticipation',
      moderate: 'enthusiastic and energized',
      strong: 'high energy, burst of genuine excitement',
    },
  },
  {
    id: 'curious',
    label: 'Curious',
    directions: {
      subtle: 'mildly inquisitive inflection',
      moderate: 'engaged and genuinely curious',
      strong: 'intrigued, eager questioning tone',
    },
  },
  {
    id: 'fearful',
    label: 'Fearful',
    directions: {
      subtle: 'uneasy, slightly hesitant tone',
      moderate: 'anxious and clearly fearful',
      strong: 'terrified, trembling nervous urgency',
    },
  },
  {
    id: 'surprised',
    label: 'Surprised',
    directions: {
      subtle: 'mildly taken aback',
      moderate: 'genuinely surprised and reactive',
      strong: 'astonished, stunned disbelief',
    },
  },
  {
    id: 'confident',
    label: 'Confident',
    directions: {
      subtle: 'assured and grounded',
      moderate: 'confident and decisive',
      strong: 'commanding, bold authority',
    },
  },
  {
    id: 'calm',
    label: 'Calm',
    directions: {
      subtle: 'relaxed, unhurried',
      moderate: 'calm, composed and reassuring',
      strong: 'deeply tranquil and soothing',
    },
  },
  {
    id: 'serious',
    label: 'Serious',
    directions: {
      subtle: 'focused and earnest',
      moderate: 'serious and weighty',
      strong: 'grave, solemn seriousness',
    },
  },
  {
    id: 'suspenseful',
    label: 'Suspenseful',
    directions: {
      subtle: 'quietly guarded tension',
      moderate: 'suspenseful, building mystery and dread',
      strong: 'chilling, tense thriller suspense',
    },
  },
  {
    id: 'emotional',
    label: 'Emotional',
    directions: {
      subtle: 'tender, heartfelt sincerity',
      moderate: 'visibly moved and emotional',
      strong: 'deeply heartfelt, choked-up vulnerability',
    },
  },
  {
    id: 'empathetic',
    label: 'Empathetic',
    directions: {
      subtle: 'gentle, attentive sympathy',
      moderate: 'warm, understanding and empathetic',
      strong: 'deeply compassionate and comforting',
    },
  },
  {
    id: 'sarcastic',
    label: 'Sarcastic',
    directions: {
      subtle: 'dry understatement, slight irony',
      moderate: 'noticeably sarcastic and wry',
      strong: 'biting sarcasm with mocking inflection',
    },
  },
  {
    id: 'romantic',
    label: 'Romantic',
    directions: {
      subtle: 'affectionate warm softness',
      moderate: 'tender, intimate romantic tone',
      strong: 'deeply passionate, poetic warmth',
    },
  },
  {
    id: 'motivational',
    label: 'Motivational',
    directions: {
      subtle: 'encouraging and supportive',
      moderate: 'inspiring, uplifting conviction',
      strong: 'passionate, rallying motivational fervor',
    },
  },
  {
    id: 'dramatic',
    label: 'Dramatic',
    directions: {
      subtle: 'heightened narrative gravitas',
      moderate: 'dramatic, theatrical intensity',
      strong: 'bold cinematic dramatic climax',
    },
  },
];

export const EMOTION_INTENSITIES = [
  { id: 'subtle', label: 'Subtle', desc: 'Restrained, natural human nuance' },
  { id: 'moderate', label: 'Moderate', desc: 'Clear, balanced expression (Default)' },
  { id: 'strong', label: 'Strong', desc: 'Heightened cinematic performance' },
];

/**
 * 11 Separate Speaking / Delivery Styles (distinct from Emotions)
 */
export const SPEAKING_STYLES = [
  { id: 'normal-conversation', label: 'Normal Conversation', direction: 'natural conversational phrasing' },
  { id: 'storytelling', label: 'Storytelling', direction: 'engaging storytelling cadence' },
  { id: 'whispering', label: 'Whispering', direction: 'soft whispered voice close to the mic' },
  { id: 'shouting', label: 'Shouting', direction: 'loud projected shouting voice' },
  { id: 'soft-speaking', label: 'Soft Speaking', direction: 'gentle, soft-spoken low volume' },
  { id: 'deep-serious', label: 'Deep and Serious', direction: 'deep resonant low vocal register' },
  { id: 'energetic-speaking', label: 'Energetic Speaking', direction: 'brisk, lively energetic delivery' },
  { id: 'news-presentation', label: 'News Presentation', direction: 'crisp broadcast news anchor delivery' },
  { id: 'documentary-narration', label: 'Documentary Narration', direction: 'measured documentary narrator pacing' },
  { id: 'podcast-style', label: 'Podcast Style', direction: 'relaxed, warm podcast host cadence' },
  { id: 'audiobook-narration', label: 'Audiobook Narration', direction: 'immersive audiobook narration flow' },
];

/**
 * Language & Accent Options
 */
export const TTS_LANGUAGES = [
  { id: 'auto', label: 'Auto-Detect (Recommended)', code: 'auto', geminiOnly: true, note: 'Automatically detects English, Hindi, Hinglish & 130+ languages.' },
  { id: 'en-US', label: 'English (United States)', code: 'en-US', kokoroSupported: true },
  { id: 'en-GB', label: 'English (United Kingdom)', code: 'en-GB', kokoroSupported: true },
  { id: 'en-IN', label: 'English (India)', code: 'en-IN', geminiOnly: true },
  { id: 'hi-IN', label: 'Hindi (हिन्दी)', code: 'hi-IN', geminiOnly: true },
  { id: 'hi-Latn', label: 'Hinglish (Hindi + English Mix)', code: 'hi-Latn', geminiOnly: true, note: 'Code-switched Roman Hindi & English (supported by Gemini 3.8 TTS).' },
];

export const TTS_ACCENTS = [
  { id: 'default', label: 'Match Selected Voice / Auto' },
  { id: 'indian', label: 'Natural Indian Inflection' },
  { id: 'american', label: 'Neutral American' },
  { id: 'british', label: 'British RP' },
  { id: 'neutral-global', label: 'Clear Global Neutral' },
];

/**
 * All 30 Official Prebuilt Studio Voices for Gemini 3.8 TTS (from official docs)
 */
export const GEMINI_PREBUILT_VOICES = [
  { id: 'Kore', name: 'Kore', gender: 'Female', tone: 'Firm & Clear', recommended: true },
  { id: 'Puck', name: 'Puck', gender: 'Male', tone: 'Upbeat & Conversational', recommended: true },
  { id: 'Charon', name: 'Charon', gender: 'Male', tone: 'Informative & Steady', recommended: true },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female', tone: 'Bright & Engaging', recommended: true },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', tone: 'Excitable & Dynamic', recommended: true },
  { id: 'Sulafat', name: 'Sulafat', gender: 'Female', tone: 'Warm & Welcoming', recommended: true },
  { id: 'Gacrux', name: 'Gacrux', gender: 'Male', tone: 'Mature & Authoritative', recommended: true },
  { id: 'Algenib', name: 'Algenib', gender: 'Male', tone: 'Gravelly & Dramatic', recommended: true },
  { id: 'Aoede', name: 'Aoede', gender: 'Female', tone: 'Breezy & Casual' },
  { id: 'Leda', name: 'Leda', gender: 'Female', tone: 'Youthful & Expressive' },
  { id: 'Orus', name: 'Orus', gender: 'Male', tone: 'Firm & Direct' },
  { id: 'Callirrhoe', name: 'Callirrhoe', gender: 'Female', tone: 'Easy-going' },
  { id: 'Autonoe', name: 'Autonoe', gender: 'Female', tone: 'Bright' },
  { id: 'Enceladus', name: 'Enceladus', gender: 'Male', tone: 'Breathy' },
  { id: 'Iapetus', name: 'Iapetus', gender: 'Male', tone: 'Clear' },
  { id: 'Umbriel', name: 'Umbriel', gender: 'Male', tone: 'Easy-going' },
  { id: 'Algieba', name: 'Algieba', gender: 'Male', tone: 'Smooth' },
  { id: 'Despina', name: 'Despina', gender: 'Female', tone: 'Smooth' },
  { id: 'Erinome', name: 'Erinome', gender: 'Female', tone: 'Clear' },
  { id: 'Rasalgethi', name: 'Rasalgethi', gender: 'Male', tone: 'Informative' },
  { id: 'Laomedeia', name: 'Laomedeia', gender: 'Female', tone: 'Upbeat' },
  { id: 'Achernar', name: 'Achernar', gender: 'Female', tone: 'Soft' },
  { id: 'Alnilam', name: 'Alnilam', gender: 'Male', tone: 'Firm' },
  { id: 'Schedar', name: 'Schedar', gender: 'Male', tone: 'Even' },
  { id: 'Pulcherrima', name: 'Pulcherrima', gender: 'Female', tone: 'Forward' },
  { id: 'Achird', name: 'Achird', gender: 'Male', tone: 'Friendly' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi', gender: 'Male', tone: 'Casual' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix', gender: 'Female', tone: 'Gentle' },
  { id: 'Sadachbia', name: 'Sadachbia', gender: 'Male', tone: 'Lively' },
  { id: 'Sadaltager', name: 'Sadaltager', gender: 'Male', tone: 'Knowledgeable' },
];

/**
 * Verified Kokoro-82M v1.0 Voices in kokoro-js v1.2.1 (English US & UK only)
 */
export const KOKORO_VOICES = [
  { id: 'af_heart', name: 'Heart (US)', gender: 'Female', language: 'en-US', tone: 'Grade A • Warm Natural' },
  { id: 'af_bella', name: 'Bella (US)', gender: 'Female', language: 'en-US', tone: 'Grade A- • Expressive' },
  { id: 'am_michael', name: 'Michael (US)', gender: 'Male', language: 'en-US', tone: 'Grade C+ • Clear Narration' },
  { id: 'am_fenrir', name: 'Fenrir (US)', gender: 'Male', language: 'en-US', tone: 'Grade C+ • Deep Assertive' },
  { id: 'am_puck', name: 'Puck (US)', gender: 'Male', language: 'en-US', tone: 'Grade C+ • Crisp Conversational' },
  { id: 'af_nicole', name: 'Nicole (US)', gender: 'Female', language: 'en-US', tone: 'Grade B- • Soft Intimate' },
  { id: 'af_sarah', name: 'Sarah (US)', gender: 'Female', language: 'en-US', tone: 'Grade C+ • Balanced' },
  { id: 'af_aoede', name: 'Aoede (US)', gender: 'Female', language: 'en-US', tone: 'Grade C+ • Breezy' },
  { id: 'af_kore', name: 'Kore (US)', gender: 'Female', language: 'en-US', tone: 'Grade C+ • Clean' },
  { id: 'af_alloy', name: 'Alloy (US)', gender: 'Female', language: 'en-US', tone: 'Grade C • Neutral' },
  { id: 'af_sky', name: 'Sky (US)', gender: 'Female', language: 'en-US', tone: 'Grade C- • Bright' },
  { id: 'am_echo', name: 'Echo (US)', gender: 'Male', language: 'en-US', tone: 'Grade D • Smooth' },
  { id: 'am_adam', name: 'Adam (US)', gender: 'Male', language: 'en-US', tone: 'Deep Voice' },
  { id: 'am_onyx', name: 'Onyx (US)', gender: 'Male', language: 'en-US', tone: 'Rich Baritone' },
  { id: 'bf_emma', name: 'Emma (UK)', gender: 'Female', language: 'en-GB', tone: 'Grade B- • British Studio' },
  { id: 'bf_isabella', name: 'Isabella (UK)', gender: 'Female', language: 'en-GB', tone: 'Grade C • British Poised' },
  { id: 'bm_george', name: 'George (UK)', gender: 'Male', language: 'en-GB', tone: 'Grade C • British Narrator' },
  { id: 'bm_fable', name: 'Fable (UK)', gender: 'Male', language: 'en-GB', tone: 'Grade C • Storytelling UK' },
  { id: 'bm_lewis', name: 'Lewis (UK)', gender: 'Male', language: 'en-GB', tone: 'Grade D+ • Classic UK' },
];

/**
 * Gemini 3.8 Native Inline Vocal Tags & Pauses (Prompting Guide)
 */
export const INLINE_VOCAL_CUES = [
  { id: 'short-pause', tag: '<short pause>', label: 'Short Pause', group: 'pause' },
  { id: 'long-pause', tag: '<long pause>', label: 'Long Pause', group: 'pause' },
  { id: 'breath', tag: '<breath>', label: 'Natural Breath', group: 'cue' },
  { id: 'sigh', tag: '<sigh>', label: 'Sigh', group: 'cue' },
  { id: 'gasp', tag: ' <gasp>', label: 'Gasp', group: 'cue' },
  { id: 'chuckle', tag: '<chuckle>', label: 'Chuckle', group: 'cue' },
  { id: 'laugh', tag: '<laugh>', label: 'Laugh', group: 'cue' },
  { id: 'throat-clearing', tag: '<throat-clearing>', label: 'Clear Throat', group: 'cue' },
];

/**
 * Mandatory Google Gemini Voice Replication Verbatim Consent Phrases (Selected Locales)
 */
export const GEMINI_CONSENT_PHRASES = [
  { locale: 'en-IN', language: 'English (India)', phrase: 'I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.' },
  { locale: 'en-US', language: 'English (US)', phrase: 'I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.' },
  { locale: 'en-GB', language: 'English (UK)', phrase: 'I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.' },
  { locale: 'hi-IN', language: 'Hindi (हिन्दी)', phrase: 'मैं इस आवाज का मालिक हूं और मैं सिंथेटिक आवाज मॉडल बनाने के लिए Google को इस आवाज का उपयोग करने की सहमति देता हूं' },
];

/**
 * 10 Editable TTS Starting Presets (Section 17Q)
 */
export const TTS_PRESETS = [
  {
    id: 'natural-narrator',
    name: 'Natural Narrator',
    desc: 'Warm, grounded YouTube storytelling voice with clean room presence.',
    emotion: 'calm',
    intensity: 'moderate',
    style: 'storytelling',
    speed: 1.0,
    recommendedGeminiVoice: 'Charon',
    recommendedKokoroVoice: 'am_michael',
    filterOverrides: { bass: 1.5, presence: 1.5, compression: 30, reverb: 4 },
  },
  {
    id: 'horror-story',
    name: 'Horror Story',
    desc: 'Chilling late-night suspense with soft whispering capability and subtle atmosphere.',
    emotion: 'suspenseful',
    intensity: 'moderate',
    style: 'whispering',
    speed: 0.92,
    recommendedGeminiVoice: 'Algenib',
    recommendedKokoroVoice: 'bm_fable',
    filterOverrides: { pitch: -1.5, bass: 2.5, treble: -1.0, reverb: 14, echo: 6, compression: 35 },
  },
  {
    id: 'emotional-story',
    name: 'Emotional Story',
    desc: 'Sincere, heartfelt emotional storytelling with unhurried reflective pauses.',
    emotion: 'emotional',
    intensity: 'moderate',
    style: 'storytelling',
    speed: 0.95,
    recommendedGeminiVoice: 'Vindemiatrix',
    recommendedKokoroVoice: 'af_heart',
    filterOverrides: { warmth: 28, bass: 1.0, compression: 25, reverb: 6 },
  },
  {
    id: 'motivational-speech',
    name: 'Motivational Speech',
    desc: 'Bold, inspiring vocal conviction designed for punchy YouTube hooks.',
    emotion: 'motivational',
    intensity: 'strong',
    style: 'energetic-speaking',
    speed: 1.04,
    recommendedGeminiVoice: 'Gacrux',
    recommendedKokoroVoice: 'am_fenrir',
    filterOverrides: { presence: 2.5, bass: 2.0, compression: 45, saturation: 5 },
  },
  {
    id: 'documentary',
    name: 'Documentary',
    desc: 'Authoritative, measured factual narration built for video essays.',
    emotion: 'serious',
    intensity: 'moderate',
    style: 'documentary-narration',
    speed: 0.98,
    recommendedGeminiVoice: 'Orus',
    recommendedKokoroVoice: 'bm_george',
    filterOverrides: { bass: 2.0, presence: 2.0, compression: 40, noiseReduction: 15 },
  },
  {
    id: 'podcast-host',
    name: 'Podcast Host',
    desc: 'Friendly, close-mic conversational energy for interviews and commentary.',
    emotion: 'happy',
    intensity: 'subtle',
    style: 'podcast-style',
    speed: 1.02,
    recommendedGeminiVoice: 'Puck',
    recommendedKokoroVoice: 'am_puck',
    filterOverrides: { bass: 2.5, warmth: 30, compression: 38, reverb: 2 },
  },
  {
    id: 'friendly-conversation',
    name: 'Friendly Conversation',
    desc: 'Relaxed, approachable human dialogue with light upbeat warmth.',
    emotion: 'happy',
    intensity: 'subtle',
    style: 'normal-conversation',
    speed: 1.0,
    recommendedGeminiVoice: 'Achird',
    recommendedKokoroVoice: 'af_bella',
    filterOverrides: { warmth: 18, compression: 20, reverb: 3 },
  },
  {
    id: 'news-reader',
    name: 'News Reader',
    desc: 'Crisp, articulate broadcast pacing with sharp intelligibility.',
    emotion: 'confident',
    intensity: 'moderate',
    style: 'news-presentation',
    speed: 1.04,
    recommendedGeminiVoice: 'Kore',
    recommendedKokoroVoice: 'bf_emma',
    filterOverrides: { highPass: 80, presence: 2.5, treble: 1.0, compression: 45, reverb: 1 },
  },
  {
    id: 'audiobook',
    name: 'Audiobook',
    desc: 'Consistent, non-fatiguing long-form narration with gentle warmth.',
    emotion: 'calm',
    intensity: 'subtle',
    style: 'audiobook-narration',
    speed: 0.97,
    recommendedGeminiVoice: 'Sulafat',
    recommendedKokoroVoice: 'af_sarah',
    filterOverrides: { warmth: 25, deEsser: 25, compression: 28, reverb: 3 },
  },
  {
    id: 'dramatic-dialogue',
    name: 'Dramatic Dialogue',
    desc: 'High-stakes cinematic confrontation and expressive turn acting.',
    emotion: 'dramatic',
    intensity: 'strong',
    style: 'deep-serious',
    speed: 0.98,
    recommendedGeminiVoice: 'Fenrir',
    recommendedKokoroVoice: 'am_onyx',
    filterOverrides: { bass: 2.5, presence: 2.0, saturation: 6, compression: 42, reverb: 8 },
  },
];

/**
 * Helper to build the exact Gemini 3.8 turn-level speech_metadata.style string
 */
export function buildGeminiTurnStyle({ emotion, intensity, style, speed, pitchPreference, accent }) {
  const parts = [];

  const emoObj = TTS_EMOTIONS.find((e) => e.id === emotion);
  const emoDir = emoObj?.directions?.[intensity || 'moderate'] || emoObj?.directions?.moderate;
  if (emoDir) parts.push(emoDir);

  const styleObj = SPEAKING_STYLES.find((s) => s.id === style);
  if (styleObj?.direction && style !== 'normal-conversation') {
    parts.push(styleObj.direction);
  }

  if (typeof speed === 'number') {
    if (speed <= 0.85) parts.push('speaking very slowly');
    else if (speed <= 0.94) parts.push('speaking deliberately at a slower pace');
    else if (speed >= 1.15) parts.push('speaking briskly and rapidly');
    else if (speed >= 1.06) parts.push('speaking at a slightly lively pace');
  }

  if (typeof pitchPreference === 'number') {
    if (pitchPreference >= 3) parts.push('higher vocal pitch inflection');
    else if (pitchPreference <= -3) parts.push('deeper lower pitch inflection');
  }

  if (accent && accent !== 'default') {
    const accentMap = {
      indian: 'natural Indian English/Hindi inflection',
      american: 'American accent',
      british: 'British accent',
      'neutral-global': 'clear neutral accent',
    };
    if (accentMap[accent]) parts.push(accentMap[accent]);
  }

  return parts.join(', ');
}
