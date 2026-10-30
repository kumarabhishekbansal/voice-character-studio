/**
 * Generates an algorithmic studio plate reverb impulse response
 * tailored for natural vocal presence and depth.
 * 
 * 100% offline, procedural, zero-latency, no network or disk dependencies.
 */
export function generateStudioReverbImpulse(context, durationSeconds = 1.2, decay = 2.4) {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * durationSeconds);
  const impulseBuffer = context.createBuffer(2, length, sampleRate);
  const left = impulseBuffer.getChannelData(0);
  const right = impulseBuffer.getChannelData(1);

  // Pre-delay of ~18ms to keep vocal transients distinct
  const preDelaySamples = Math.floor(sampleRate * 0.018);

  // Early reflection tap delays in seconds
  const earlyTaps = [
    { t: 0.024, gain: 0.35, pan: -0.4 },
    { t: 0.038, gain: 0.28, pan: 0.5 },
    { t: 0.052, gain: 0.22, pan: -0.3 },
    { t: 0.068, gain: 0.16, pan: 0.3 },
  ];

  // Inject early reflections
  for (const tap of earlyTaps) {
    const tapIdx = Math.floor(tap.t * sampleRate);
    if (tapIdx < length) {
      left[tapIdx] += tap.gain * (1 - tap.pan);
      right[tapIdx] += tap.gain * (1 + tap.pan);
    }
  }

  // Generate dense diffuse tail with exponential decay and high-frequency absorption
  let prevSampleL = 0;
  let prevSampleR = 0;

  for (let i = preDelaySamples; i < length; i++) {
    const t = (i - preDelaySamples) / sampleRate;
    const envelope = Math.exp(-t * decay);
    // Simulating acoustic high-frequency wall absorption
    const damping = Math.exp(-t * 4.5);

    // Decorrelated pseudo-random noise for stereo spaciousness
    const noiseL = Math.random() * 2 - 1;
    const noiseR = Math.random() * 2 - 1;

    // Gentle one-pole low-pass filtering to warm up the reverb tail
    const rawL = noiseL * envelope;
    const rawR = noiseR * envelope;

    const filteredL = 0.6 * rawL + 0.4 * prevSampleL;
    const filteredR = 0.6 * rawR + 0.4 * prevSampleR;

    prevSampleL = filteredL;
    prevSampleR = filteredR;

    left[i] += (filteredL * 0.7 + rawL * 0.3 * damping) * 0.8;
    right[i] += (filteredR * 0.7 + rawR * 0.3 * damping) * 0.8;
  }

  return impulseBuffer;
}
