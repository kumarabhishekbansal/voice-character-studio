import { FormantProcessor } from './FormantProcessor';
import { generateStudioReverbImpulse } from './ReverbImpulse';
import { PROCESSING_CHAIN_ORDER } from '../constants/presets';

export { PROCESSING_CHAIN_ORDER };

/**
 * Voice Effects Chain Architecture
 * Assembles the full natural DSP vocal processing pipeline inside an AudioContext / OfflineAudioContext
 */
export class VoiceEffectsChain {
  /**
   * Applies the complete audio DSP effects chain onto an input AudioBuffer
   * 
   * @param {AudioBuffer} inputBuffer - Pre-pitch-shifted AudioBuffer
   * @param {Object} settings - Complete voice settings
   * @returns {Promise<AudioBuffer>} Rendered output AudioBuffer
   */
  static async render(inputBuffer, settings) {
    const sampleRate = inputBuffer.sampleRate;
    const numChannels = inputBuffer.numberOfChannels;
    const length = inputBuffer.length;

    // Create an OfflineAudioContext for rapid, glitch-free local rendering
    const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate);

    // 1. Audio Source
    const sourceNode = offlineCtx.createBufferSource();
    sourceNode.buffer = inputBuffer;

    const nyquistSafe = (hz) => Math.max(20, Math.min(sampleRate * 0.48, hz));

    // 2. High-Pass Filter (user-configurable 20 - 300 Hz, default 45 Hz rumble filter)
    const rumbleFilter = offlineCtx.createBiquadFilter();
    rumbleFilter.type = 'highpass';
    rumbleFilter.frequency.value = nyquistSafe(settings.highPass ?? 45);
    rumbleFilter.Q.value = 0.707;

    // 3. Formant Shaping Network
    const formantNetwork = FormantProcessor.createFormantFilterNetwork(offlineCtx, {
      pitchSemitones: settings.pitch || 0,
      formant: settings.formant || 0,
    });

    // 4. Voice Character EQ (Bass, Presence, Treble) + Low-Pass Filter
    const bassEQ = offlineCtx.createBiquadFilter();
    bassEQ.type = 'lowshelf';
    bassEQ.frequency.value = nyquistSafe(125);
    bassEQ.gain.value = settings.bass || 0;

    const presenceEQ = offlineCtx.createBiquadFilter();
    presenceEQ.type = 'peaking';
    presenceEQ.frequency.value = nyquistSafe(3200);
    presenceEQ.Q.value = 1.2;
    presenceEQ.gain.value = settings.presence || 0;

    const trebleEQ = offlineCtx.createBiquadFilter();
    trebleEQ.type = 'highshelf';
    trebleEQ.frequency.value = nyquistSafe(7200);
    trebleEQ.gain.value = settings.treble || 0;

    const lowPassFilter = offlineCtx.createBiquadFilter();
    lowPassFilter.type = 'lowpass';
    lowPassFilter.frequency.value = nyquistSafe(settings.lowPass ?? 20000);
    lowPassFilter.Q.value = 0.707;

    // 5. De-Esser Band Filter
    // Attenuates excessive sibilance (6-8 kHz) if deEsser is enabled
    const deEsserFilter = offlineCtx.createBiquadFilter();
    deEsserFilter.type = 'peaking';
    deEsserFilter.frequency.value = nyquistSafe(6800);
    deEsserFilter.Q.value = 2.0;
    const deEsserAmount = (settings.deEsser || 0) / 100;
    deEsserFilter.gain.value = -deEsserAmount * 7.5; // Up to -7.5 dB dynamic sibilance dip

    // 6. Warmth & Harmonic Saturation (WaveShaper)
    const warmthAmount = (settings.warmth || 0) / 100;
    const satAmount = (settings.saturation || 0) / 100;
    const totalDrive = warmthAmount * 0.4 + satAmount * 0.6;

    const saturationNode = offlineCtx.createWaveShaper();
    saturationNode.oversample = '2x';
    saturationNode.curve = VoiceEffectsChain.createSaturationCurve(totalDrive);

    // 7. Dynamic Vocal Compressor
    const compAmount = (settings.compression || 0) / 100;
    const compressor = offlineCtx.createDynamicsCompressor();
    // Smooth, natural vocal compression curve
    compressor.threshold.value = -18 - compAmount * 18; // -18 dB to -36 dB
    compressor.knee.value = 8 + compAmount * 12;        // Soft knee
    compressor.ratio.value = 1.5 + compAmount * 3.5;    // 1.5:1 to 5.0:1
    compressor.attack.value = 0.012;                    // 12ms keeps consonants crisp
    compressor.release.value = 0.160;                   // 160ms smooth natural release

    // 8. Spatial FX Mixer: Dry Path vs Reverb & Delay
    const dryGain = offlineCtx.createGain();
    const reverbGain = offlineCtx.createGain();
    const delayGain = offlineCtx.createGain();

    const reverbPct = Math.max(0, Math.min(0.3, (settings.reverb || 0) / 100));
    const echoPct = Math.max(0, Math.min(0.3, (settings.echo || 0) / 100));

    dryGain.gain.value = 1.0;
    reverbGain.gain.value = reverbPct * 1.2;
    delayGain.gain.value = echoPct * 1.1;

    // Algorithmic Studio Reverb (Convolver)
    const convolver = offlineCtx.createConvolver();
    convolver.buffer = generateStudioReverbImpulse(offlineCtx, 1.2, 2.8);

    // Echo / Delay with warm damping filter
    const delayNode = offlineCtx.createDelay(0.5);
    delayNode.delayTime.value = 0.160; // 160 ms tempo-free vocal reflection
    const delayFeedback = offlineCtx.createGain();
    delayFeedback.gain.value = 0.22;
    const delayTone = offlineCtx.createBiquadFilter();
    delayTone.type = 'lowpass';
    delayTone.frequency.value = 2400; // Warm tape-delay damping

    // Delay loop
    delayNode.connect(delayTone);
    delayTone.connect(delayFeedback);
    delayFeedback.connect(delayNode);

    // 9. Master Volume & Limiter
    const masterGain = offlineCtx.createGain();
    const userVol = (settings.volume !== undefined ? settings.volume : 100) / 100;
    masterGain.gain.value = userVol;

    // Safety Brickwall Limiter to avoid digital 0 dBFS clipping
    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.value = -0.5;
    limiter.knee.value = 0.0;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.050;

    // 10. Wire the Complete Audio Graph
    // source -> rumble -> formant.input ... formant.output
    sourceNode.connect(rumbleFilter);
    rumbleFilter.connect(formantNetwork.input);

    // formant.output -> bassEQ -> presenceEQ -> trebleEQ -> lowPassFilter -> deEsser -> saturation -> compressor
    formantNetwork.output.connect(bassEQ);
    bassEQ.connect(presenceEQ);
    presenceEQ.connect(trebleEQ);
    trebleEQ.connect(lowPassFilter);
    lowPassFilter.connect(deEsserFilter);
    deEsserFilter.connect(saturationNode);
    saturationNode.connect(compressor);

    // Split after compressor to Dry, Reverb, and Delay
    compressor.connect(dryGain);
    compressor.connect(convolver);
    compressor.connect(delayNode);

    convolver.connect(reverbGain);
    delayTone.connect(delayGain);

    // Sum to masterGain
    dryGain.connect(masterGain);
    reverbGain.connect(masterGain);
    delayGain.connect(masterGain);

    // MasterGain -> Limiter -> offlineCtx.destination
    masterGain.connect(limiter);
    limiter.connect(offlineCtx.destination);

    // Start playback & render
    sourceNode.start(0);
    const renderedBuffer = await offlineCtx.startRendering();

    // 11. Noise Reduction Post-Pass (if requested)
    const nrAmount = (settings.noiseReduction || 0) / 100;
    if (nrAmount > 0.05) {
      VoiceEffectsChain.applyGentleNoiseGate(renderedBuffer, nrAmount);
    }

    return renderedBuffer;
  }

  /**
   * Generates a smooth, warm saturation transfer curve
   * Mixes gentle odd harmonics (soft clipping) with subtle even harmonics (warmth)
   */
  static createSaturationCurve(drive) {
    const nSamples = 4096;
    const curve = new Float32Array(nSamples);
    if (drive <= 0.005) {
      for (let i = 0; i < nSamples; i++) {
        curve[i] = (i * 2) / nSamples - 1;
      }
      return curve;
    }

    const k = 1.0 + drive * 3.5;
    for (let i = 0; i < nSamples; i++) {
      const x = (i * 2) / nSamples - 1;
      // Hyperbolic tangent soft clipping
      const tanhPart = Math.tanh(k * x) / Math.tanh(k);
      // Subtle even harmonic warmth
      const evenPart = 0.12 * drive * (x * x - Math.abs(x));
      curve[i] = tanhPart + evenPart;
    }
    return curve;
  }

  /**
   * Dynamic downward noise expansion gate to quiet ambient laptop fan / room hiss
   * Preserves natural speech decays with smooth attack/release envelopes.
   */
  static applyGentleNoiseGate(buffer, amount) {
    const thresholdDb = -48 + amount * 16; // -48 dB to -32 dB
    const thresholdLinear = Math.pow(10, thresholdDb / 20);
    const maxReductionDb = -18 * amount;  // up to -18 dB of attenuation
    const minGain = Math.pow(10, maxReductionDb / 20);

    const numChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    const attackCoeff = Math.exp(-1 / (0.008 * sampleRate)); // 8ms attack
    const releaseCoeff = Math.exp(-1 / (0.080 * sampleRate)); // 80ms release

    const windowSize = Math.floor(sampleRate * 0.010); // 10ms RMS window

    for (let ch = 0; ch < numChannels; ch++) {
      const data = buffer.getChannelData(ch);
      let envelope = 0;
      let currentGain = 1.0;

      for (let i = 0; i < length; i += windowSize) {
        // Calculate block RMS
        let sumSq = 0;
        const blockEnd = Math.min(i + windowSize, length);
        const count = blockEnd - i;

        for (let j = i; j < blockEnd; j++) {
          sumSq += data[j] * data[j];
        }
        const rms = Math.sqrt(sumSq / count);

        // Smooth envelope follower
        if (rms > envelope) {
          envelope = attackCoeff * envelope + (1 - attackCoeff) * rms;
        } else {
          envelope = releaseCoeff * envelope + (1 - releaseCoeff) * rms;
        }

        // Determine target gain
        let targetGain = 1.0;
        if (envelope < thresholdLinear) {
          const ratio = envelope / (thresholdLinear + 1e-6);
          targetGain = minGain + (1.0 - minGain) * Math.pow(ratio, 1.5);
        }

        // Apply gain smoothly across the block
        const gainStep = (targetGain - currentGain) / count;
        for (let j = i; j < blockEnd; j++) {
          currentGain += gainStep;
          data[j] *= currentGain;
        }
      }
    }
  }
}
