/**
 * Procedural Speech Sample Generator
 * Synthesizes a naturalistic human speech test phrase with vowels (A, E, I, O, U),
 * vocal cord pitch contour, pauses, and consonant bursts.
 * 
 * Allows instant testing without needing an initial file upload!
 */
export function generateSpeechSample(context, sampleRate = 44100) {
  const duration = 5.5; // 5.5 seconds of realistic spoken dialogue
  const totalSamples = Math.floor(sampleRate * duration);
  const audioBuffer = context.createBuffer(1, totalSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  // Spoken syllables timing (syllable start, duration, base pitch Hz, formants F1, F2)
  const speechEvents = [
    { start: 0.2, len: 0.35, f0: 125, f1: 750, f2: 1200 }, // "Hel-"
    { start: 0.6, len: 0.40, f0: 120, f1: 500, f2: 1800 }, // "-lo"
    { start: 1.1, len: 0.25, f0: 130, f1: 450, f2: 2100 }, // "this"
    { start: 1.4, len: 0.28, f0: 128, f1: 300, f2: 2200 }, // "is"
    { start: 1.8, len: 0.45, f0: 122, f1: 600, f2: 1400 }, // "Voice"
    { start: 2.35, len: 0.38, f0: 118, f1: 700, f2: 1700 }, // "Char-"
    { start: 2.8, len: 0.45, f0: 115, f1: 500, f2: 1500 }, // "-ac-ter"
    { start: 3.4, len: 0.55, f0: 110, f1: 400, f2: 1900 }, // "Stu-dio"
    { start: 4.1, len: 0.65, f0: 105, f1: 650, f2: 1300 }, // "test"
  ];

  for (const ev of speechEvents) {
    const startSample = Math.floor(ev.start * sampleRate);
    const lenSamples = Math.floor(ev.len * sampleRate);

    let phase = 0;
    for (let i = 0; i < lenSamples; i++) {
      const idx = startSample + i;
      if (idx >= totalSamples) break;

      const t = i / lenSamples;
      // Natural syllable amplitude envelope (fast attack, gentle decay)
      const env = Math.sin(Math.PI * t) * Math.min(1.0, (1 - t) * 1.5 + 0.2);

      // Pitch vibrato / intonation drift
      const currentPitch = ev.f0 + Math.sin(t * 12) * 1.8;
      phase += (2 * Math.PI * currentPitch) / sampleRate;

      // Vocal cord glottal pulse (sum of harmonics)
      let glottal = Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase);

      // Acoustic vowel formant simulation
      const formant1 = Math.sin((2 * Math.PI * ev.f1 * i) / sampleRate) * 0.4;
      const formant2 = Math.sin((2 * Math.PI * ev.f2 * i) / sampleRate) * 0.25;

      // Subtle vocal breath aspiration
      const breath = (Math.random() * 2 - 1) * 0.035;

      const voice = (glottal * 0.55 + formant1 + formant2 + breath) * env * 0.55;
      channelData[idx] += voice;
    }
  }

  return audioBuffer;
}
