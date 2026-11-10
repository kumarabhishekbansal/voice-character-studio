import {
  computeSha256Hex,
  uint8ArrayToBase64,
} from '../utils/security';

/**
 * Audio Resampling, Segment Stitching, and Portable WAV Reference Artifact Utility
 */
export class AudioResampler {
  /**
   * Resamples an AudioBuffer to target sampleRate & channel count using OfflineAudioContext
   * 
   * @param {AudioBuffer} sourceBuffer
   * @param {number} [targetSampleRate=24000]
   * @param {number} [targetChannels=1]
   * @returns {Promise<AudioBuffer>}
   */
  static async resample(sourceBuffer, targetSampleRate = 24000, targetChannels = 1) {
    if (
      sourceBuffer.sampleRate === targetSampleRate &&
      sourceBuffer.numberOfChannels === targetChannels
    ) {
      return sourceBuffer;
    }

    const duration = sourceBuffer.duration;
    const targetFrames = Math.max(1, Math.ceil(duration * targetSampleRate));
    const offlineCtx = new OfflineAudioContext(targetChannels, targetFrames, targetSampleRate);
    const src = offlineCtx.createBufferSource();
    src.buffer = sourceBuffer;
    src.connect(offlineCtx.destination);
    src.start(0);
    return await offlineCtx.startRendering();
  }

  /**
   * Finds the highest-energy contiguous speech window up to `maxSeconds`
   * so embedded reference samples never capture dead silence at start/end.
   * 
   * @param {AudioBuffer} buffer
   * @param {number} maxSeconds
   * @returns {{ startOffsetSec: number, sliceDurationSec: number, wasTrimmed: boolean }}
   */
  static selectBestSpeechWindow(buffer, maxSeconds = 22) {
    const totalDuration = buffer.duration;
    if (totalDuration <= maxSeconds) {
      return { startOffsetSec: 0, sliceDurationSec: totalDuration, wasTrimmed: false };
    }

    const sampleRate = buffer.sampleRate;
    const ch0 = buffer.getChannelData(0);
    const windowFrames = Math.floor(maxSeconds * sampleRate);
    const hopFrames = Math.floor(1.0 * sampleRate); // Step 1s at a time
    let bestStartFrame = 0;
    let bestEnergy = -1;

    // Sample down inside each frame for ultra-fast scan
    const stride = Math.max(1, Math.floor(sampleRate / 200));
    for (let start = 0; start <= buffer.length - windowFrames; start += hopFrames) {
      let energy = 0;
      const end = start + windowFrames;
      for (let i = start; i < end; i += stride) {
        energy += ch0[i] * ch0[i];
      }
      if (energy > bestEnergy) {
        bestEnergy = energy;
        bestStartFrame = start;
      }
    }

    return {
      startOffsetSec: bestStartFrame / sampleRate,
      sliceDurationSec: maxSeconds,
      wasTrimmed: true,
    };
  }

  /**
   * Encodes a mono AudioBuffer into 16-bit Linear PCM WAV Uint8Array
   */
  static audioBufferTo16BitWavBytes(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numFrames = audioBuffer.length;
    const blockAlign = numChannels * 2;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numFrames * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeAscii = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeAscii(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(8, 'WAVE');
    writeAscii(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeAscii(36, 'data');
    view.setUint32(40, dataSize, true);

    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = numChannels > 1 ? audioBuffer.getChannelData(1) : null;
    let offset = 44;

    for (let i = 0; i < numFrames; i++) {
      const sL = Math.max(-1, Math.min(1, ch0[i]));
      view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
      offset += 2;
      if (ch1) {
        const sR = Math.max(-1, Math.min(1, ch1[i]));
        view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Uint8Array(buffer);
  }

  /**
   * Builds a portable 24kHz mono WAV reference artifact + SHA-256 digest from an uploaded AudioBuffer
   * 
   * @param {AudioBuffer} sourceBuffer
   * @param {number} [maxSeconds=22]
   */
  static async preparePortableReferenceWav(sourceBuffer, maxSeconds = 22) {
    if (!sourceBuffer) return null;

    const { startOffsetSec, sliceDurationSec, wasTrimmed } = AudioResampler.selectBestSpeechWindow(
      sourceBuffer,
      maxSeconds
    );

    const targetRate = 24000;
    const startFrame = Math.floor(startOffsetSec * sourceBuffer.sampleRate);
    const sliceFrames = Math.min(
      sourceBuffer.length - startFrame,
      Math.max(1, Math.floor(sliceDurationSec * sourceBuffer.sampleRate))
    );

    // Slice using OfflineAudioContext while downmixing to 24kHz Mono
    const targetOutputFrames = Math.max(1, Math.ceil((sliceFrames / sourceBuffer.sampleRate) * targetRate));
    const offline = new OfflineAudioContext(1, targetOutputFrames, targetRate);

    // Build sliced temp buffer cleanly
    const tempBuf = offline.createBuffer(
      sourceBuffer.numberOfChannels,
      sliceFrames,
      sourceBuffer.sampleRate
    );
    for (let c = 0; c < sourceBuffer.numberOfChannels; c++) {
      const srcData = sourceBuffer.getChannelData(c);
      tempBuf.getChannelData(c).set(srcData.subarray(startFrame, startFrame + sliceFrames));
    }

    const srcNode = offline.createBufferSource();
    srcNode.buffer = tempBuf;
    srcNode.connect(offline.destination);
    srcNode.start(0);
    const mono24k = await offline.startRendering();

    const wavBytes = AudioResampler.audioBufferTo16BitWavBytes(mono24k);
    const sha256 = await computeSha256Hex(wavBytes);
    const base64 = uint8ArrayToBase64(wavBytes);

    return {
      embedded: true,
      encoding: 'base64',
      format: 'wav',
      sampleRate: targetRate,
      channels: 1,
      duration: Math.round(mono24k.duration * 100) / 100,
      originalDuration: Math.round(sourceBuffer.duration * 100) / 100,
      wasTrimmed,
      byteLength: wavBytes.byteLength,
      sha256,
      data: base64,
    };
  }

  /**
   * Wraps raw mono Float32Array samples into 16-bit WAV Uint8Array (e.g. from Kokoro-82M)
   */
  static float32ToWavBytes(samples, sampleRate = 24000) {
    const numFrames = samples.length;
    const dataSize = numFrames * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeAscii = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeAscii(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(8, 'WAVE');
    writeAscii(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeAscii(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return new Uint8Array(buffer);
  }

  /**
   * Seamlessly stitches multiple TTS segment AudioBuffers with clean micro-fades and requested pauses
   * 
   * @param {Array<{ audioBuffer: AudioBuffer, pauseAfterMs?: number }>} items
   * @param {AudioContext} audioCtx
   * @returns {Promise<AudioBuffer>}
   */
  static async concatenateSegments(items, audioCtx) {
    if (!items || items.length === 0) {
      throw new Error('No synthesized audio segments to combine.');
    }

    const targetRate = items[0].audioBuffer.sampleRate || 24000;
    const targetChannels = Math.max(...items.map((x) => x.audioBuffer.numberOfChannels));

    // Resample any mismatched segments & compute total frames
    const normalized = [];
    let totalFrames = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const buf = await AudioResampler.resample(item.audioBuffer, targetRate, targetChannels);
      const pauseMs = idx < items.length - 1 ? Math.max(0, Math.min(5000, item.pauseAfterMs || 0)) : 0;
      const pauseFrames = Math.round((pauseMs / 1000) * targetRate);
      normalized.push({ buf, pauseFrames });
      totalFrames += buf.length + pauseFrames;
    }

    const outBuffer = audioCtx.createBuffer(targetChannels, Math.max(1, totalFrames), targetRate);
    const fadeSamples = Math.min(96, Math.floor(0.004 * targetRate)); // 4ms anti-click fade

    let cursor = 0;
    for (const { buf, pauseFrames } of normalized) {
      for (let c = 0; c < targetChannels; c++) {
        const dst = outBuffer.getChannelData(c);
        const src = buf.getChannelData(Math.min(c, buf.numberOfChannels - 1));
        dst.set(src, cursor);

        // Apply tiny edge fade to prevent pops across stitched turns
        const segLen = src.length;
        const f = Math.min(fadeSamples, Math.floor(segLen / 4));
        for (let k = 0; k < f; k++) {
          const gain = k / f;
          dst[cursor + k] *= gain;
          dst[cursor + segLen - 1 - k] *= gain;
        }
      }
      cursor += buf.length + pauseFrames;
    }

    return outBuffer;
  }
}
