import { VoiceProfileEngine } from './VoiceProfileEngine';

/**
 * Audio Analyzer Utility
 * Computes deep acoustic measurements and recommended filter settings
 * via VoiceProfileEngine.
 */
export class AudioAnalyzer {
  /**
   * Analyzes an AudioBuffer and associated File metadata
   * 
   * @param {AudioBuffer} buffer
   * @param {File} [file]
   * @returns {Object} Complete analysis with detected metrics and recommendations
   */
  static analyze(buffer, file = null) {
    const result = VoiceProfileEngine.analyze(buffer, file);
    return {
      ...result.detected,
      recommendedSettings: result.recommendedSettings,
      recommendationReasons: result.recommendationReasons,
    };
  }

  static extractWaveformPeaks(buffer, numBars = 800) {
    return VoiceProfileEngine.extractWaveformPeaks(buffer, numBars);
  }

  static formatTime(seconds) {
    return VoiceProfileEngine.formatTime(seconds);
  }

  static formatBytes(bytes) {
    return VoiceProfileEngine.formatBytes(bytes);
  }
}
