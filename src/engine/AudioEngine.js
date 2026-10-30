import { PitchTimeShifter } from './PitchTimeShifter';
import { VoiceEffectsChain } from './VoiceEffectsChain';

/**
 * Main Audio Processing Controller
 * Coordinates decoding, preview slicing, full processing pipeline, and progress.
 */
export class AudioEngine {
  constructor() {
    this.context = null;
  }

  getAudioContext() {
    if (!this.context || this.context.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioCtx();
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return this.context;
  }

  /**
   * Decodes an ArrayBuffer or File into an AudioBuffer
   */
  async decodeAudio(arrayBuffer) {
    const ctx = this.getAudioContext();
    try {
      // Use clone of arrayBuffer to prevent detachment errors
      const bufferCopy = arrayBuffer.slice(0);
      const audioBuffer = await ctx.decodeAudioData(bufferCopy);
      return audioBuffer;
    } catch (err) {
      console.error('Audio decode failure:', err);
      throw new Error('Unsupported or corrupted audio file format. Please upload a standard WAV, MP3, M4A, or FLAC file.');
    }
  }

  /**
   * Extracts a preview slice (up to maxSeconds) from an AudioBuffer
   */
  sliceBuffer(sourceBuffer, maxSeconds = 7.0) {
    const ctx = this.getAudioContext();
    const sampleRate = sourceBuffer.sampleRate;
    const numChannels = sourceBuffer.numberOfChannels;
    const sliceFrames = Math.min(sourceBuffer.length, Math.floor(sampleRate * maxSeconds));

    const sliced = ctx.createBuffer(numChannels, sliceFrames, sampleRate);
    for (let c = 0; c < numChannels; c++) {
      const srcChannel = sourceBuffer.getChannelData(c);
      const dstChannel = sliced.getChannelData(c);
      dstChannel.set(srcChannel.subarray(0, sliceFrames));
    }
    return sliced;
  }

  /**
   * Runs the complete voice character processing pipeline
   * 
   * @param {AudioBuffer} inputBuffer
   * @param {Object} settings
   * @param {Function} onProgress - Progress reporter (0 to 100)
   * @param {boolean} isPreview - Whether this is a fast preview slice
   * @returns {Promise<AudioBuffer>}
   */
  async process(inputBuffer, settings, onProgress = null, isPreview = false) {
    const ctx = this.getAudioContext();

    // Stage 1: Pitch Shifting & Time Stretching (SoundTouch WSOLA)
    if (onProgress) onProgress(10);

    const pitchShiftedBuffer = await PitchTimeShifter.processBuffer(
      inputBuffer,
      {
        pitchSemitones: settings.pitch || 0,
        rate: settings.rate || 1.0,
      },
      (ratio) => {
        if (onProgress) {
          // Pitch shifting represents 10% to 70% of total processing time
          const pct = 10 + Math.round(ratio * 60);
          onProgress(pct);
        }
      },
      ctx
    );

    if (onProgress) onProgress(75);

    // Stage 2: Vocal Formant Shaping, EQ, Saturation, Compression, Reverb, De-Esser, Gate
    const processedBuffer = await VoiceEffectsChain.render(pitchShiftedBuffer, settings);

    if (onProgress) onProgress(100);

    return processedBuffer;
  }

  /**
   * Cleanly closes and releases AudioContext resources
   */
  dispose() {
    if (this.context && this.context.state !== 'closed') {
      try {
        this.context.close();
      } catch (e) {
        // Ignored
      }
      this.context = null;
    }
  }
}

export const audioEngine = new AudioEngine();
