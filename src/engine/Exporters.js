import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * Audio Exporters & Downloader
 * Generates broadcast-grade WAV (16-bit Linear PCM) and high-bitrate MP3
 * without any external server or persistent storage.
 */
export class Exporters {
  /**
   * Converts an AudioBuffer to standard 16-bit Linear PCM WAV Blob
   * 
   * @param {AudioBuffer} audioBuffer
   * @returns {Blob}
   */
  static audioBufferToWavBlob(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numFrames = audioBuffer.length;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numFrames * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // 1. RIFF Header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');

    // 2. fmt Sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);             // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);              // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true);    // NumChannels
    view.setUint32(24, sampleRate, true);     // SampleRate
    view.setUint32(28, byteRate, true);       // ByteRate
    view.setUint16(32, blockAlign, true);     // BlockAlign
    view.setUint16(34, 16, true);             // BitsPerSample (16-bit)

    // 3. data Sub-chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const left = audioBuffer.getChannelData(0);
    const right = numChannels > 1 ? audioBuffer.getChannelData(1) : null;

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
      // Left channel sample
      let sL = Math.max(-1, Math.min(1, left[i]));
      view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
      offset += 2;

      // Right channel sample (if stereo)
      if (numChannels > 1 && right) {
        let sR = Math.max(-1, Math.min(1, right[i]));
        view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Converts an AudioBuffer to 192 kbps MP3 Blob using LAME encoder
   * 
   * @param {AudioBuffer} audioBuffer
   * @param {number} [kbps=192]
   * @returns {Blob}
   */
  static audioBufferToMp3Blob(audioBuffer, kbps = 192) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);
    const mp3Chunks = [];

    const floatToInt16 = (floatArr) => {
      const int16 = new Int16Array(floatArr.length);
      for (let i = 0; i < floatArr.length; i++) {
        const s = Math.max(-1, Math.min(1, floatArr[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return int16;
    };

    const leftInt16 = floatToInt16(audioBuffer.getChannelData(0));
    const rightInt16 = numChannels > 1 ? floatToInt16(audioBuffer.getChannelData(1)) : undefined;

    const blockSize = 1152;
    for (let i = 0; i < leftInt16.length; i += blockSize) {
      const leftChunk = leftInt16.subarray(i, i + blockSize);
      const rightChunk = numChannels > 1 ? rightInt16.subarray(i, i + blockSize) : undefined;
      const mp3Buf = encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3Buf.length > 0) {
        mp3Chunks.push(mp3Buf);
      }
    }

    const flushed = encoder.flush();
    if (flushed.length > 0) {
      mp3Chunks.push(flushed);
    }

    return new Blob(mp3Chunks, { type: 'audio/mp3' });
  }

  /**
   * Triggers an in-browser direct download
   * 
   * @param {Blob} blob
   * @param {string} filename
   */
  static triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Release memory immediately after download starts
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  }
}
