import { SoundTouch, SimpleFilter, WebAudioBufferSource } from 'soundtouchjs';

/**
 * High-quality Time-Stretching and Pitch-Shifting Engine
 * Uses WSOLA (Waveform Similarity Overlap-Add) via SoundTouch
 * 
 * Preserves transients, consonants, and speech duration independently from pitch.
 */
export class PitchTimeShifter {
  /**
   * Process an AudioBuffer or audio slice offline
   * 
   * @param {AudioBuffer} inputBuffer - Source audio
   * @param {Object} options - { pitchSemitones: number, rate: number }
   * @param {Function} onProgress - Callback for progress (0 to 1)
   * @param {AudioContext|OfflineAudioContext} audioCtx - Context for creating return buffer
   * @returns {Promise<AudioBuffer>} Processed AudioBuffer
   */
  static async processBuffer(inputBuffer, options = {}, onProgress = null, audioCtx = null) {
    const { pitchSemitones = 0, rate = 1.0 } = options;

    // Fast-path bypass if both pitch and rate are neutral
    const isPitchNeutral = Math.abs(pitchSemitones) < 0.01;
    const isRateNeutral = Math.abs(rate - 1.0) < 0.01;

    if (isPitchNeutral && isRateNeutral) {
      if (onProgress) onProgress(1.0);
      return inputBuffer;
    }

    const sampleRate = inputBuffer.sampleRate;
    const numChannels = inputBuffer.numberOfChannels;
    const origFrames = inputBuffer.length;
    const isStereo = numChannels > 1;

    // Expected target length governed strictly by tempo rate
    const targetFrames = Math.max(1, Math.round(origFrames / rate));

    // Pad input to allow SoundTouch internal filter pipelines to completely flush
    const padFrames = Math.max(32768, Math.round(origFrames * 0.35));
    const paddedFrames = origFrames + padFrames;

    const leftIn = inputBuffer.getChannelData(0);
    const rightIn = isStereo ? inputBuffer.getChannelData(1) : leftIn;

    const paddedLeft = new Float32Array(paddedFrames);
    paddedLeft.set(leftIn);

    const paddedRight = isStereo ? new Float32Array(paddedFrames) : paddedLeft;
    if (isStereo) {
      paddedRight.set(rightIn);
    }

    // Wrap in a mock source compatible with SoundTouchJS
    const sourceMock = {
      numberOfChannels: isStereo ? 2 : 1,
      sampleRate: sampleRate,
      duration: paddedFrames / sampleRate,
      length: paddedFrames,
      getChannelData: (ch) => (ch === 0 ? paddedLeft : paddedRight),
    };

    const source = new WebAudioBufferSource(sourceMock);
    const soundtouch = new SoundTouch();

    soundtouch.pitchSemitones = pitchSemitones;
    soundtouch.tempo = rate;

    const filter = new SimpleFilter(source, soundtouch);

    const outLeft = new Float32Array(targetFrames);
    const outRight = isStereo ? new Float32Array(targetFrames) : null;

    const chunkSize = 4096;
    const chunkInterleaved = new Float32Array(chunkSize * 2);
    let framesCollected = 0;

    // Process in chunks with async yield so UI progress remains responsive
    let lastYield = performance.now();

    while (framesCollected < targetFrames) {
      const framesExtracted = filter.extract(chunkInterleaved, chunkSize);
      if (framesExtracted === 0) {
        break;
      }

      const copyCount = Math.min(framesExtracted, targetFrames - framesCollected);

      for (let i = 0; i < copyCount; i++) {
        outLeft[framesCollected + i] = chunkInterleaved[i * 2];
        if (isStereo) {
          outRight[framesCollected + i] = chunkInterleaved[i * 2 + 1];
        }
      }

      framesCollected += copyCount;

      // Report progress
      if (onProgress && targetFrames > 0) {
        onProgress(Math.min(1.0, framesCollected / targetFrames));
      }

      // Yield every 25ms to let the browser breathe and update UI
      if (performance.now() - lastYield > 25) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        lastYield = performance.now();
      }
    }

    // Create the destination AudioBuffer
    const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
    const outputBuffer = ctx.createBuffer(numChannels, targetFrames, sampleRate);

    outputBuffer.copyToChannel(outLeft, 0);
    if (isStereo && outRight) {
      outputBuffer.copyToChannel(outRight, 1);
    }

    if (onProgress) onProgress(1.0);
    return outputBuffer;
  }
}
