/**
 * Audio Analyzer Utility
 * Computes exact technical metrics (Peak dBFS, RMS dBFS, Channels, Sample Rate)
 * and generates high-performance waveform peak envelopes.
 */
export class AudioAnalyzer {
  /**
   * Analyzes an AudioBuffer and associated File metadata
   * 
   * @param {AudioBuffer} buffer
   * @param {File} [file]
   * @returns {Object} Analysis metrics
   */
  static analyze(buffer, file = null) {
    const sampleRate = buffer.sampleRate;
    const numberOfChannels = buffer.numberOfChannels;
    const duration = buffer.duration;
    const length = buffer.length;

    let peak = 0;
    let sumSq = 0;

    // Scan samples across all channels
    for (let c = 0; c < numberOfChannels; c++) {
      const channelData = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const val = Math.abs(channelData[i]);
        if (val > peak) peak = val;
        sumSq += channelData[i] * channelData[i];
      }
    }

    const totalSamples = length * numberOfChannels;
    const rms = Math.sqrt(sumSq / (totalSamples || 1));

    // Convert to decibels (dBFS)
    const peakDb = peak > 1e-6 ? 20 * Math.log10(peak) : -96;
    const rmsDb = rms > 1e-6 ? 20 * Math.log10(rms) : -96;

    // Generate waveform peak summary for fast canvas visualizer
    const waveformPeaks = AudioAnalyzer.extractWaveformPeaks(buffer, 800);

    return {
      duration,
      formattedDuration: AudioAnalyzer.formatTime(duration),
      sampleRate,
      numberOfChannels,
      channelsLabel: numberOfChannels === 1 ? 'Mono (1 Ch)' : 'Stereo (2 Ch)',
      fileType: file ? file.type || AudioAnalyzer.guessTypeFromName(file.name) : 'AudioBuffer',
      fileName: file ? file.name : 'Recording',
      fileSize: file ? AudioAnalyzer.formatBytes(file.size) : `${Math.round((length * numberOfChannels * 4) / 1024)} KB (RAM)`,
      peakDb: Math.round(peakDb * 10) / 10,
      rmsDb: Math.round(rmsDb * 10) / 10,
      waveformPeaks,
    };
  }

  /**
   * Extracts downsampled min/max peaks for 60fps canvas rendering
   */
  static extractWaveformPeaks(buffer, numBars = 800) {
    const length = buffer.length;
    const step = Math.max(1, Math.floor(length / numBars));
    const ch0 = buffer.getChannelData(0);
    const hasCh1 = buffer.numberOfChannels > 1;
    const ch1 = hasCh1 ? buffer.getChannelData(1) : null;

    const peaks = new Float32Array(numBars);

    for (let bar = 0; bar < numBars; bar++) {
      const start = bar * step;
      const end = Math.min(start + step, length);
      let maxVal = 0;

      for (let i = start; i < end; i++) {
        let val = Math.abs(ch0[i]);
        if (hasCh1) {
          const v1 = Math.abs(ch1[i]);
          if (v1 > val) val = v1;
        }
        if (val > maxVal) maxVal = val;
      }
      peaks[bar] = Math.min(1.0, maxVal);
    }

    return peaks;
  }

  static formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  static guessTypeFromName(name) {
    const ext = name.split('.').pop().toLowerCase();
    switch (ext) {
      case 'wav': return 'audio/wav';
      case 'mp3': return 'audio/mp3';
      case 'm4a': return 'audio/m4a';
      case 'ogg': return 'audio/ogg';
      case 'flac': return 'audio/flac';
      case 'webm': return 'audio/webm';
      default: return 'audio/*';
    }
  }
}
