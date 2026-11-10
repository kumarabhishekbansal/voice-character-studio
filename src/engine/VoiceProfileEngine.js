import {
  sanitizeAudioSettings,
  sanitizeFilename,
  sanitizeTextScript,
  checkJsonSafety,
  validateBase64WavAudio,
  computeSha256Hex,
  MAX_UNIVERSAL_PROFILE_BYTES,
} from '../utils/security.js';
import {
  FILTER_DEFINITIONS,
  DEFAULT_VOICE_SETTINGS,
  PROCESSING_CHAIN_ORDER,
} from '../constants/presets.js';

/**
 * Voice Profile, Acoustic Analysis & Universal Identity Engine (v1.0 & v2.0)
 * Performs deep, honest acoustic measurements and builds portable Universal Voice Identity JSONs
 * reusable across both Speech-to-Speech and Text-to-Speech modes.
 */
export class VoiceProfileEngine {
  /**
   * Fast Radix-2 Cooley-Tukey FFT for spectral analysis
   */
  static fft(real, imag) {
    const n = real.length;
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        let tr = real[i]; real[i] = real[j]; real[j] = tr;
        let ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
      }
      let k = n >> 1;
      while (k <= j) {
        j -= k;
        k >>= 1;
      }
      j += k;
    }

    for (let l = 2; l <= n; l <<= 1) {
      const halfL = l >> 1;
      const angle = (-2 * Math.PI) / l;
      const wStepR = Math.cos(angle);
      const wStepI = Math.sin(angle);
      for (let i = 0; i < n; i += l) {
        let wR = 1;
        let wI = 0;
        for (let m = 0; m < halfL; m++) {
          const uR = real[i + m];
          const uI = imag[i + m];
          const vR = real[i + m + halfL] * wR - imag[i + m + halfL] * wI;
          const vI = real[i + m + halfL] * wI + imag[i + m + halfL] * wR;
          real[i + m] = uR + vR;
          imag[i + m] = uI + vI;
          real[i + m + halfL] = uR - vR;
          imag[i + m + halfL] = uI - vI;
          const nextWR = wR * wStepR - wI * wStepI;
          wI = wR * wStepI + wI * wStepR;
          wR = nextWR;
        }
      }
    }
  }

  /**
   * Converts frequency in Hz to closest musical note (e.g. 130.8 Hz -> C3)
   */
  static hzToNote(hz) {
    if (!hz || hz <= 0 || !Number.isFinite(hz)) return null;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const midi = Math.round(69 + 12 * Math.log2(hz / 440));
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = ((midi % 12) + 12) % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }

  /**
   * Formats duration into mm:ss.ms
   */
  static formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  }

  /**
   * Extracts downsampled min/max peaks for waveform visualizer
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

  /**
   * Performs complete acoustic and technical analysis on an AudioBuffer
   */
  static analyze(buffer, file = null) {
    const sampleRate = buffer.sampleRate;
    const numberOfChannels = buffer.numberOfChannels;
    const duration = buffer.duration;
    const length = buffer.length;

    const ch0 = buffer.getChannelData(0);
    const ch1 = numberOfChannels > 1 ? buffer.getChannelData(1) : null;

    let peak = 0;
    let sumSq = 0;
    let clippedSamplesCount = 0;

    for (let i = 0; i < length; i++) {
      const s0 = ch0[i];
      const absS0 = Math.abs(s0);
      if (absS0 > peak) peak = absS0;
      if (absS0 >= 0.999) clippedSamplesCount++;
      sumSq += s0 * s0;

      if (ch1) {
        const s1 = ch1[i];
        const absS1 = Math.abs(s1);
        if (absS1 > peak) peak = absS1;
        if (absS1 >= 0.999) clippedSamplesCount++;
        sumSq += s1 * s1;
      }
    }

    const totalSamples = length * numberOfChannels;
    const rms = Math.sqrt(sumSq / (totalSamples || 1));
    const peakDb = peak > 1e-6 ? 20 * Math.log10(peak) : -96;
    const rmsDb = rms > 1e-6 ? 20 * Math.log10(rms) : -96;

    // Block-based Energy, Noise Floor, Voice Activity & Dynamic Range
    const blockSize = Math.max(256, Math.floor(sampleRate * 0.05));
    const numBlocks = Math.floor(length / blockSize);
    const blockEnergiesDb = [];

    for (let b = 0; b < numBlocks; b++) {
      let bSum = 0;
      const start = b * blockSize;
      for (let i = 0; i < blockSize; i++) {
        const v = ch0[start + i];
        bSum += v * v;
      }
      const bRms = Math.sqrt(bSum / blockSize);
      const bDb = bRms > 1e-6 ? 20 * Math.log10(bRms) : -96;
      blockEnergiesDb.push(bDb);
    }

    let noiseFloorDb = -96;
    let silencePercent = 0;
    let voiceActivityPercent = 0;
    let dynamicRangeDb = 0;

    if (blockEnergiesDb.length > 0) {
      const sortedDbs = [...blockEnergiesDb].sort((a, b) => a - b);
      const noiseIndex = Math.min(sortedDbs.length - 1, Math.floor(sortedDbs.length * 0.08));
      noiseFloorDb = Math.round(sortedDbs[noiseIndex] * 10) / 10;

      const speechThreshold = Math.max(-50, noiseFloorDb + 10);
      let silentBlocks = 0;
      for (let i = 0; i < blockEnergiesDb.length; i++) {
        if (blockEnergiesDb[i] < speechThreshold) silentBlocks++;
      }

      silencePercent = Math.round((silentBlocks / blockEnergiesDb.length) * 100);
      voiceActivityPercent = 100 - silencePercent;

      const p90 = sortedDbs[Math.floor(sortedDbs.length * 0.9)] || peakDb;
      const p10 = sortedDbs[Math.floor(sortedDbs.length * 0.1)] || rmsDb;
      dynamicRangeDb = Math.max(0, Math.round((p90 - p10) * 10) / 10);
    }

    // Approximate Integrated LUFS (K-weighting pre-filter approximation)
    let approxLufs = null;
    if (rmsDb > -80) {
      let lufsSumSq = 0;
      let lufsCount = 0;
      const lufsGate = rmsDb - 10;

      for (let b = 0; b < numBlocks; b++) {
        if (blockEnergiesDb[b] >= lufsGate) {
          const start = b * blockSize;
          for (let i = 0; i < blockSize; i++) {
            const val = ch0[start + i];
            lufsSumSq += val * val;
            lufsCount++;
          }
        }
      }

      if (lufsCount > 0) {
        const gatedRms = Math.sqrt(lufsSumSq / lufsCount);
        const rawLufs = -0.691 + 20 * Math.log10(Math.max(1e-6, gatedRms));
        approxLufs = Math.round(rawLufs * 10) / 10;
      }
    }

    // Fundamental Frequency (F0) & Pitch Variation via Normalized Autocorrelation
    const minPeriod = Math.floor(sampleRate / 450);
    const maxPeriod = Math.floor(sampleRate / 65);
    const pitchFrameSize = 2048;
    const pitchHop = 1024;
    const detectedPitches = [];

    if (length >= pitchFrameSize) {
      const maxPitchFrames = Math.min(120, Math.floor((length - pitchFrameSize) / pitchHop));
      const stepFrames = Math.max(1, Math.floor(maxPitchFrames / 60));

      for (let f = 0; f < maxPitchFrames; f += stepFrames) {
        const offset = f * pitchHop;
        let fRms = 0;
        for (let i = 0; i < pitchFrameSize; i++) {
          fRms += ch0[offset + i] * ch0[offset + i];
        }
        fRms = Math.sqrt(fRms / pitchFrameSize);
        const fDb = fRms > 1e-6 ? 20 * Math.log10(fRms) : -96;

        if (fDb > -48 && (noiseFloorDb < -35 ? fDb > noiseFloorDb + 5 : true)) {
          let bestCorr = 0;
          const corrs = new Float32Array(maxPeriod - minPeriod + 1);

          for (let lag = minPeriod; lag <= maxPeriod; lag++) {
            let num = 0;
            let den1 = 0;
            let den2 = 0;
            const limit = pitchFrameSize - lag;

            for (let i = 0; i < limit; i++) {
              const a = ch0[offset + i];
              const b = ch0[offset + i + lag];
              num += a * b;
              den1 += a * a;
              den2 += b * b;
            }

            const denom = Math.sqrt(den1 * den2);
            const r = denom > 1e-6 ? num / denom : 0;
            corrs[lag - minPeriod] = r;
            if (r > bestCorr) bestCorr = r;
          }

          if (bestCorr > 0.52) {
            // Select first strong peak (within 94% of global max) to prevent octave subharmonic halving
            const threshold = Math.max(0.52, bestCorr * 0.94);
            let chosenLag = -1;
            for (let idx = 1; idx < corrs.length - 1; idx++) {
              if (corrs[idx] >= threshold && corrs[idx] >= corrs[idx - 1] && corrs[idx] >= corrs[idx + 1]) {
                chosenLag = minPeriod + idx;
                break;
              }
            }
            if (chosenLag > 0) {
              const freq = sampleRate / chosenLag;
              if (freq >= 65 && freq <= 450) {
                detectedPitches.push(freq);
              }
            }
          }
        }
      }
    }

    let averagePitchHz = null;
    let averagePitchNote = null;
    let pitchRange = null;
    let pitchVariationHz = null;

    if (detectedPitches.length >= 4) {
      detectedPitches.sort((a, b) => a - b);
      const medianF0 = detectedPitches[Math.floor(detectedPitches.length / 2)];
      const minF0 = detectedPitches[0];
      const maxF0 = detectedPitches[detectedPitches.length - 1];

      if (maxF0 / minF0 < 4.0) {
        averagePitchHz = Math.round(medianF0 * 10) / 10;
        averagePitchNote = VoiceProfileEngine.hzToNote(medianF0);
        pitchRange = `${Math.round(minF0)} Hz – ${Math.round(maxF0)} Hz`;

        // Calculate standard deviation of pitch for expressiveness indicator
        const mean = detectedPitches.reduce((acc, v) => acc + v, 0) / detectedPitches.length;
        const variance = detectedPitches.reduce((acc, v) => acc + (v - mean) ** 2, 0) / detectedPitches.length;
        pitchVariationHz = Math.round(Math.sqrt(variance) * 10) / 10;
      }
    }

    // Spectral Characteristics via FFT (Centroid, Energy Bands, Brightness/Warmth/Breathiness Estimates)
    const fftSize = 2048;
    let spectralCentroidHz = null;
    let lowEnergyPercent = 33;
    let midEnergyPercent = 52;
    let highEnergyPercent = 15;
    let sibilanceIndicator = 'Not reliably detected';
    let spectralFlatness = null;
    let breathinessIndicator = 'Not reliably detected';
    let timbreLabel = 'Not reliably detected';

    if (length >= fftSize) {
      const numWindows = Math.min(8, Math.floor(length / fftSize));
      const avgSpectrum = new Float32Array(fftSize / 2);
      let validWindows = 0;

      for (let w = 0; w < numWindows; w++) {
        const offset = Math.floor((w * (length - fftSize)) / Math.max(1, numWindows - 1));
        const real = new Float32Array(fftSize);
        const imag = new Float32Array(fftSize);

        for (let i = 0; i < fftSize; i++) {
          const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
          real[i] = ch0[offset + i] * hann;
        }

        VoiceProfileEngine.fft(real, imag);

        let winEnergy = 0;
        for (let k = 0; k < fftSize / 2; k++) {
          const p = real[k] * real[k] + imag[k] * imag[k];
          avgSpectrum[k] += p;
          winEnergy += p;
        }
        if (winEnergy > 1e-5) validWindows++;
      }

      if (validWindows > 0) {
        for (let k = 0; k < fftSize / 2; k++) {
          avgSpectrum[k] /= validWindows;
        }

        const binFreq = sampleRate / fftSize;
        let numCentroid = 0;
        let denCentroid = 0;

        let lowBand = 0;
        let midBand = 0;
        let highBand = 0;
        let sibilantEnergy = 0;
        let voiceCoreEnergy = 0;
        let logSum = 0;
        let linSum = 0;
        let flatBins = 0;

        for (let k = 1; k < fftSize / 2; k++) {
          const freq = k * binFreq;
          const power = Math.max(1e-12, avgSpectrum[k]);
          const mag = Math.sqrt(avgSpectrum[k]);

          numCentroid += freq * mag;
          denCentroid += mag;

          if (freq < 300) lowBand += power;
          else if (freq <= 3500) midBand += power;
          else highBand += power;

          if (freq >= 5500 && freq <= 9000) sibilantEnergy += power;
          else if (freq >= 1000 && freq <= 4000) voiceCoreEnergy += power;

          if (freq >= 1500 && freq <= 6000) {
            logSum += Math.log(power);
            linSum += power;
            flatBins++;
          }
        }

        if (denCentroid > 1e-6) {
          spectralCentroidHz = Math.round(numCentroid / denCentroid);
          if (spectralCentroidHz < 1450) timbreLabel = 'Warm / Dark Chest Resonance (Estimated)';
          else if (spectralCentroidHz < 2600) timbreLabel = 'Balanced Natural Vocal Midrange (Estimated)';
          else timbreLabel = 'Bright / Crisp Upper Articulation (Estimated)';
        }

        const totalBand = lowBand + midBand + highBand;
        if (totalBand > 1e-6) {
          lowEnergyPercent = Math.round((lowBand / totalBand) * 100);
          midEnergyPercent = Math.round((midBand / totalBand) * 100);
          highEnergyPercent = Math.max(0, 100 - lowEnergyPercent - midEnergyPercent);
        }

        const sibRatio = voiceCoreEnergy > 1e-6 ? sibilantEnergy / voiceCoreEnergy : 0;
        if (sibRatio > 0.45) sibilanceIndicator = 'High Sibilance (Harsh)';
        else if (sibRatio > 0.22) sibilanceIndicator = 'Moderate (Natural)';
        else sibilanceIndicator = 'Low (Soft)';

        // High-mid spectral flatness as conservative breathiness/air indicator
        if (flatBins > 0 && linSum > 1e-9) {
          const geoMean = Math.exp(logSum / flatBins);
          const arithMean = linSum / flatBins;
          spectralFlatness = Math.round((geoMean / arithMean) * 1000) / 1000;
          if (spectralFlatness > 0.22) breathinessIndicator = 'Airy / Breathy High Registers (Estimated)';
          else if (spectralFlatness > 0.08) breathinessIndicator = 'Moderate Breath / Natural Harmonic (Estimated)';
          else breathinessIndicator = 'Dense Harmonic Focus (Estimated)';
        }
      }
    }

    const originalFormat = file
      ? (file.name.split('.').pop() || 'WAV').toUpperCase()
      : 'WAV';

    const bitDepth = originalFormat === 'WAV'
      ? '16-bit / 24-bit PCM'
      : originalFormat === 'FLAC'
      ? 'Lossless FLAC'
      : originalFormat === 'MP3'
      ? 'MPEG Audio (16-bit equivalent)'
      : '32-bit float (decoded)';

    const waveformPeaks = VoiceProfileEngine.extractWaveformPeaks(buffer, 800);

    const detected = {
      duration: Math.round(duration * 100) / 100,
      formattedDuration: VoiceProfileEngine.formatTime(duration),
      sampleRate,
      numberOfChannels,
      channelsLabel: numberOfChannels === 1 ? 'Mono (1 Ch)' : 'Stereo (2 Ch)',
      originalFormat,
      bitDepth,
      peakDb: Math.round(peakDb * 10) / 10,
      rmsDb: Math.round(rmsDb * 10) / 10,
      lufs: approxLufs,
      dynamicRangeDb,
      noiseFloorDb,
      silencePercent,
      voiceActivityPercent,
      averagePitchHz,
      averagePitchNote,
      pitchRange,
      pitchVariationHz,
      spectralCentroidHz,
      lowEnergyPercent,
      midEnergyPercent,
      highEnergyPercent,
      sibilanceIndicator,
      spectralFlatness,
      breathinessIndicator,
      timbreLabel,
      clippingDetected: clippedSamplesCount > 0,
      clippedSamplesCount,
      waveformPeaks,
      fileName: file ? file.name : 'Voice_Recording.wav',
      fileSize: file ? VoiceProfileEngine.formatBytes(file.size) : `${Math.round((length * numberOfChannels * 4) / 1024)} KB (RAM)`,
    };

    const { recommendedSettings, recommendationReasons } = VoiceProfileEngine.calculateRecommendations(detected);

    return {
      detected,
      recommendedSettings,
      recommendationReasons,
    };
  }

  /**
   * Calculates balanced, natural initial recommendations based on detected measurements
   */
  static calculateRecommendations(detected) {
    const reasons = [];

    let pitch = 0;
    let rate = 1.0;
    let volume = 100;
    let highPass = 45;
    let lowPass = 20000;
    let formant = 0;
    let bass = 0;
    let presence = 0;
    let treble = 0;
    let warmth = 15;
    let compression = 20;
    let noiseReduction = 10;
    let deEsser = 15;
    let reverb = 4;
    let echo = 0;
    let saturation = 3;

    if (detected.noiseFloorDb > -44) {
      noiseReduction = 28;
      highPass = 75;
      reasons.push(`Audible background noise detected (${detected.noiseFloorDb} dBFS): +28% noise gate & 75 Hz high-pass recommended to clean room hum.`);
    } else if (detected.noiseFloorDb > -54) {
      noiseReduction = 18;
      highPass = 55;
      reasons.push(`Moderate ambient floor (${detected.noiseFloorDb} dBFS): 18% gentle noise reduction applied.`);
    } else {
      noiseReduction = 8;
      highPass = 45;
      reasons.push(`Clean acoustic environment (${detected.noiseFloorDb} dBFS): low 8% noise gate to preserve natural room breathing.`);
    }

    if (detected.dynamicRangeDb > 24 || detected.rmsDb < -26) {
      compression = 32;
      reasons.push(`Wide dynamic variance (${detected.dynamicRangeDb} dB): 32% studio leveling recommended for consistent voiceover.`);
    } else if (detected.dynamicRangeDb < 12) {
      compression = 12;
      reasons.push(`Pre-compressed voice dynamic range (${detected.dynamicRangeDb} dB): subtle 12% compression to avoid over-squashing.`);
    } else {
      compression = 22;
      reasons.push(`Healthy dynamic range (${detected.dynamicRangeDb} dB): natural 22% vocal compression.`);
    }

    if (detected.sibilanceIndicator?.includes('High')) {
      deEsser = 32;
      reasons.push('Elevated high-frequency sibilance (6–8 kHz): 32% de-esser to tame sharp consonants.');
    } else if (detected.sibilanceIndicator?.includes('Moderate')) {
      deEsser = 18;
    } else {
      deEsser = 10;
    }

    if (detected.lowEnergyPercent < 22 && detected.spectralCentroidHz && detected.spectralCentroidHz > 2500) {
      bass = 2.0;
      warmth = 22;
      reasons.push('Thin low-end acoustic response: +2.0 dB bass body and warmth added.');
    } else if (detected.lowEnergyPercent > 48) {
      bass = -1.5;
      presence = 1.5;
      highPass = Math.max(highPass, 85);
      reasons.push('Heavy proximity or low-frequency rumble: -1.5 dB bass cut and +1.5 dB presence for articulation.');
    }

    if (detected.spectralCentroidHz && detected.spectralCentroidHz < 1500) {
      treble = 1.5;
      presence = 1.2;
      reasons.push('Warm/dark voice response: +1.5 dB treble air to enhance vocal presence.');
    } else if (detected.spectralCentroidHz && detected.spectralCentroidHz > 3200) {
      treble = -1.0;
      lowPass = 15500;
      reasons.push('Excessive high-frequency brightness: -1.0 dB treble smoothing & gentle 15.5 kHz low-pass.');
    }

    if (detected.clippingDetected) {
      volume = 92;
      reasons.push(`Digital clipping detected (${detected.clippedSamplesCount} samples): master gain reduced to 92% to prevent distortion.`);
    } else if (detected.peakDb < -14) {
      volume = 120;
      reasons.push(`Quiet recording (Peak ${detected.peakDb} dBFS): master gain lifted to 120% for broadcast level.`);
    } else {
      volume = 100;
    }

    const recommendedSettings = sanitizeAudioSettings({
      pitch,
      rate,
      volume,
      highPass,
      lowPass,
      formant,
      bass,
      presence,
      treble,
      warmth,
      compression,
      noiseReduction,
      deEsser,
      reverb,
      echo,
      saturation,
    });

    return { recommendedSettings, recommendationReasons: reasons };
  }

  /**
   * Builds full Filter Descriptor dictionary capturing exact configured values, bounds, units & order
   */
  static buildFilterMap(currentSettings, recommendedSettings = null) {
    const safeCurrent = sanitizeAudioSettings(currentSettings);
    const safeRec = recommendedSettings ? sanitizeAudioSettings(recommendedSettings) : DEFAULT_VOICE_SETTINGS;
    const filters = {};

    for (const def of FILTER_DEFINITIONS) {
      const val = safeCurrent[def.key] ?? def.defaultValue;
      const isNeutral = Math.abs(val - def.defaultValue) < 0.001;
      const matchesRecommended = recommendedSettings
        ? Math.abs(val - (safeRec[def.key] ?? def.defaultValue)) < 0.001
        : false;

      let origin = 'default';
      if (!isNeutral || matchesRecommended) {
        origin = matchesRecommended && recommendedSettings ? 'recommended' : 'manual';
      }

      filters[def.key] = {
        name: def.name,
        enabled: !isNeutral || def.key === 'highPass' || def.key === 'lowPass' ? val !== def.defaultValue || def.key === 'highPass' : false,
        value: val,
        defaultValue: def.defaultValue,
        min: def.min,
        max: def.max,
        step: def.step,
        unit: def.unit,
        order: def.order,
        group: def.group,
        origin,
      };
    }

    return filters;
  }

  /**
   * Generates a complete Universal Voice Identity Profile v2.0 JSON string (Section 18D)
   */
  static generateUniversalProfileJson({
    profileName = 'AbhiVoice Profile',
    analysis = null,
    recommendedSettings = null,
    currentSettings = DEFAULT_VOICE_SETTINGS,
    referenceAudio = null,
    providerVoiceIds = {},
    ttsConfig = {},
    geminiConfigured = false,
  }) {
    const safeName = sanitizeFilename(profileName, 'My_Voice_Profile');
    const safeCurrent = sanitizeAudioSettings(currentSettings);
    const safeRec = recommendedSettings ? sanitizeAudioSettings(recommendedSettings) : null;
    const filters = VoiceProfileEngine.buildFilterMap(safeCurrent, safeRec);

    const hasRefAudio = Boolean(referenceAudio?.embedded && referenceAudio?.data);
    const hasGeminiReplication = Boolean(providerVoiceIds?.geminiVoiceKey || providerVoiceIds?.geminiVoiceId);

    let identityType = 'dsp-and-tts-config';
    if (hasRefAudio && hasGeminiReplication) identityType = 'reference-audio+gemini-replicated';
    else if (hasRefAudio) identityType = 'reference-audio';
    else if (hasGeminiReplication) identityType = 'gemini-replicated-key';

    const limitations = [];
    if (!hasRefAudio) {
      limitations.push('No original speech reference clip attached; speaker timbre identity cannot be cloned without uploading a reference sample.');
    }
    limitations.push('Google Gemini 3.8 Flash TTS supports speaker replication in Text-to-Speech mode (with speaker consent verification), but does NOT perform raw audio-to-audio Speech-to-Speech voice conversion.');
    limitations.push('Speech-to-Speech target-speaker conversion requires an optional Speech-to-Speech provider adapter (e.g., ELEVENLABS_API_KEY currently disabled). DSP filters alone only reshape EQ/pitch/dynamics.');
    limitations.push('Local Kokoro-82M IN-BROWSER engine uses built-in English speaker vectors and cannot clone custom reference audio.');

    const universal = {
      format: 'AbhiVoiceChanger-Universal-Voice-Profile',
      profileVersion: '2.0',
      presetVersion: '1.0', // Compatibility tag
      app: 'AbhiVoiceChanger',
      characterName: safeName,

      profile: {
        name: safeName,
        createdAt: new Date().toISOString(),
        schemaSpec: 'AbhiVoiceChanger Universal Voice Identity Schema v2.0',
      },

      voiceIdentity: {
        identityType,
        privacyNotice: hasRefAudio
          ? 'Contains raw 24kHz WAV Base64 speech reference audio. Keep this file private; Base64 is encoding, not encryption.'
          : 'No biometric voice audio embedded.',
        referenceAudio: hasRefAudio
          ? {
              embedded: true,
              encoding: 'base64',
              format: referenceAudio.format || 'wav',
              sampleRate: referenceAudio.sampleRate || 24000,
              channels: referenceAudio.channels || 1,
              duration: referenceAudio.duration ?? null,
              originalDuration: referenceAudio.originalDuration ?? null,
              wasTrimmedToSafeWindow: Boolean(referenceAudio.wasTrimmed),
              byteLength: referenceAudio.byteLength ?? null,
              sha256: referenceAudio.sha256 || null,
              data: referenceAudio.data,
            }
          : {
              embedded: false,
              encoding: 'base64',
              format: 'wav',
              sampleRate: 24000,
              channels: 1,
              duration: null,
              sha256: null,
              data: null,
            },
        providerVoiceIds: {
          geminiVoiceId: providerVoiceIds?.geminiVoiceId || null,
          geminiVoiceKey: providerVoiceIds?.geminiVoiceKey || null,
          geminiVoiceType: providerVoiceIds?.geminiVoiceType || null,
          geminiConsentVerified: Boolean(providerVoiceIds?.geminiConsentVerified),
          elevenlabsVoiceId: providerVoiceIds?.elevenlabsVoiceId || null,
        },
        speakerDescription: {
          measuredPitchCharacteristics: {
            averagePitchHz: analysis?.averagePitchHz ?? null,
            averagePitchNote: analysis?.averagePitchNote ?? null,
            pitchRange: analysis?.pitchRange ?? null,
            pitchVariationStdHz: analysis?.pitchVariationHz ?? null,
          },
          estimatedTimbreCharacteristics: {
            timbreCategory: analysis?.timbreLabel ?? 'Not reliably detected',
            breathinessEstimate: analysis?.breathinessIndicator ?? 'Not reliably detected',
            spectralFlatness: analysis?.spectralFlatness ?? null,
            sibilanceProfile: analysis?.sibilanceIndicator ?? 'Not reliably detected',
          },
          formantCharacteristics: {
            configuredFormantShiftSt: safeCurrent.formant,
            note: 'Biometric vocal tract formants are preserved in the embedded WAV audio; DSP sliders store additive resonance offsets.',
          },
          measuredSpectralCharacteristics: {
            spectralCentroidHz: analysis?.spectralCentroidHz ?? null,
            lowEnergyPercent: analysis?.lowEnergyPercent ?? null,
            midEnergyPercent: analysis?.midEnergyPercent ?? null,
            highEnergyPercent: analysis?.highEnergyPercent ?? null,
          },
        },
      },

      sourceAnalysis: analysis
        ? {
            duration: analysis.duration ?? null,
            sampleRate: analysis.sampleRate ?? null,
            channels: analysis.numberOfChannels ?? null,
            originalFormat: analysis.originalFormat ?? null,
            bitDepth: analysis.bitDepth ?? null,
            averagePitch: analysis.averagePitchHz ?? null,
            averagePitchNote: analysis.averagePitchNote ?? null,
            pitchRange: analysis.pitchRange ?? null,
            pitchVariationStdHz: analysis.pitchVariationHz ?? null,
            rms: analysis.rmsDb ?? null,
            peak: analysis.peakDb ?? null,
            loudness: analysis.lufs ?? null,
            noiseFloor: analysis.noiseFloorDb ?? null,
            dynamicRange: analysis.dynamicRangeDb ?? null,
            spectralCentroid: analysis.spectralCentroidHz ?? null,
            silencePercent: analysis.silencePercent ?? null,
            voiceActivityPercent: analysis.voiceActivityPercent ?? null,
            clippingDetected: Boolean(analysis.clippingDetected),
          }
        : null,

      recommendedSettings: safeRec || safeCurrent,
      currentSettings: safeCurrent,

      processingProfile: {
        processingChainOrder: PROCESSING_CHAIN_ORDER,
        filters,
      },

      textToSpeechProfile: {
        preferredEngine: ttsConfig?.engine || 'gemini',
        preferredModel: ttsConfig?.model || 'gemini-3.8-flash-tts',
        preferredVoiceId: ttsConfig?.voiceId || 'Kore',
        language: ttsConfig?.language || 'auto',
        accent: ttsConfig?.accent || 'default',
        defaultEmotion: ttsConfig?.emotion || 'neutral',
        emotionIntensity: ttsConfig?.intensity || 'moderate',
        speakingStyle: ttsConfig?.style || 'normal-conversation',
        speakingRate: Number(ttsConfig?.speed ?? 1.0),
        pitchPreference: Number(ttsConfig?.pitchPreference ?? 0),
        pauseSettings: {
          paragraphPauseMs: Number(ttsConfig?.paragraphPauseMs ?? 550),
          speakerSwitchPauseMs: Number(ttsConfig?.speakerSwitchPauseMs ?? 650),
        },
        pronunciationDictionary: Array.isArray(ttsConfig?.pronunciationDictionary)
          ? ttsConfig.pronunciationDictionary.slice(0, 100).map((item) => ({
              word: sanitizeTextScript(String(item.word || ''), 64),
              pronunciation: sanitizeTextScript(String(item.pronunciation || ''), 128),
            }))
          : [],
        speakers: Array.isArray(ttsConfig?.speakers)
          ? ttsConfig.speakers.slice(0, 12).map((sp) => ({
              id: sanitizeFilename(sp.id || 'speaker', 'speaker'),
              name: sanitizeFilename(sp.name || 'Speaker', 'Speaker'),
              voiceId: String(sp.voiceId || 'Kore').slice(0, 80),
            }))
          : [],
      },

      speechToSpeechProfile: {
        targetVoiceIdentity: hasRefAudio ? 'embedded-reference-audio' : 'dsp-chain-only',
        voiceConversionSupportedLocally: false,
        processingSettings: 'processingProfile',
      },

      engineCompatibility: {
        ttsSupported: true,
        speechToSpeechDspSupported: true,
        targetSpeakerConversionSupported: false,
        activeServerTtsEngine: geminiConfigured ? 'Google Gemini 3.8 Flash TTS' : 'Not configured (Local Kokoro-82M fallback active)',
        model: ttsConfig?.model || 'gemini-3.8-flash-tts',
        limitations,
      },
    };

    return JSON.stringify(universal, null, 2);
  }

  /**
   * Backward-compatible wrapper preserving generateProfileJson callers
   */
  static generateProfileJson(opts) {
    return VoiceProfileEngine.generateUniversalProfileJson({
      profileName: opts?.characterName || 'Voice',
      analysis: opts?.analysis,
      recommendedSettings: opts?.recommendedSettings,
      currentSettings: opts?.currentSettings,
      referenceAudio: opts?.referenceAudio || null,
      providerVoiceIds: opts?.providerVoiceIds || {},
      ttsConfig: opts?.ttsConfig || {},
      geminiConfigured: Boolean(opts?.geminiConfigured),
    });
  }

  /**
   * Validates & parses BOTH v1.0 legacy profiles AND v2.0 Universal Voice Identity Profiles asynchronously
   * (Verifies SHA-256 checksum & Base64 WAV binary signature).
   */
  static async validateAndParseUniversalProfileJson(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    if (jsonString.length > MAX_UNIVERSAL_PROFILE_BYTES) {
      return { success: false, error: 'Voice profile exceeds safe 5 MB limit.' };
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    // Security check: depth, array/key count, prototype pollution, external URL SSRF
    if (!checkJsonSafety(parsed)) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    const isV2 = parsed.format === 'AbhiVoiceChanger-Universal-Voice-Profile' ||
      (typeof parsed.profileVersion === 'string' && parsed.profileVersion.startsWith('2.'));
    const isV1 = typeof parsed.presetVersion === 'string' && parsed.presetVersion.startsWith('1.');

    if (!isV2 && !isV1) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    // Extract Filter Values cleanly from either v2.0 processingProfile.filters OR v1.0 currentSettings
    let rawFilterValues = {};
    let restoredFilterCount = 0;
    const restoredOrigins = {};

    if (parsed.processingProfile?.filters && typeof parsed.processingProfile.filters === 'object') {
      for (const [key, item] of Object.entries(parsed.processingProfile.filters)) {
        if (item && typeof item === 'object' && typeof item.value === 'number') {
          rawFilterValues[key] = item.value;
          restoredOrigins[key] = item.origin || 'manual';
          restoredFilterCount++;
        } else if (typeof item === 'number') {
          rawFilterValues[key] = item;
          restoredFilterCount++;
        }
      }
    }

    if (restoredFilterCount === 0) {
      const fallbackRaw = parsed.currentSettings || parsed.settings || parsed.recommendedSettings;
      if (!fallbackRaw || typeof fallbackRaw !== 'object' || Array.isArray(fallbackRaw)) {
        return { success: false, error: 'Invalid or unsupported voice profile.' };
      }
      rawFilterValues = fallbackRaw;
      restoredFilterCount = Object.keys(fallbackRaw).length;
    }

    const cleanSettings = sanitizeAudioSettings(rawFilterValues);
    const characterName = sanitizeFilename(
      parsed.profile?.name || parsed.characterName || 'Imported_Profile',
      'Voice'
    );

    // Validate & Verify Embedded Reference Audio (v2.0)
    let referenceAudio = null;
    let referenceBytes = null;
    let checksumStatus = 'none';

    const refObj = parsed.voiceIdentity?.referenceAudio;
    if (refObj && refObj.embedded && typeof refObj.data === 'string' && refObj.data.length > 0) {
      const audioCheck = validateBase64WavAudio(refObj.data);
      if (!audioCheck.valid) {
        return { success: false, error: `Invalid reference audio inside profile: ${audioCheck.error}` };
      }

      referenceBytes = audioCheck.bytes;
      const computedHash = await computeSha256Hex(referenceBytes);

      if (refObj.sha256 && typeof refObj.sha256 === 'string') {
        if (computedHash.toLowerCase() !== refObj.sha256.trim().toLowerCase()) {
          return {
            success: false,
            error: 'Reference audio checksum mismatch. The voice profile may be corrupted or tampered with.',
          };
        }
        checksumStatus = 'verified';
      } else {
        checksumStatus = 'unverified-no-hash';
      }

      referenceAudio = {
        embedded: true,
        encoding: 'base64',
        format: 'wav',
        sampleRate: Number(refObj.sampleRate) || 24000,
        channels: Number(refObj.channels) || 1,
        duration: typeof refObj.duration === 'number' ? refObj.duration : null,
        originalDuration: typeof refObj.originalDuration === 'number' ? refObj.originalDuration : null,
        wasTrimmed: Boolean(refObj.wasTrimmedToSafeWindow),
        byteLength: referenceBytes.byteLength,
        sha256: computedHash,
        data: refObj.data,
      };
    }

    // Safely validate TTS configuration block (Section 17N + 18F)
    const rawTts = parsed.textToSpeechProfile || parsed.textToSpeech || null;
    let restoredTtsConfig = null;
    if (rawTts && typeof rawTts === 'object' && !Array.isArray(rawTts)) {
      const clamp = (v, min, max, d) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d;
      };
      restoredTtsConfig = {
        engine: typeof rawTts.preferredEngine === 'string' ? rawTts.preferredEngine.slice(0, 32) : null,
        model: typeof rawTts.preferredModel === 'string' ? rawTts.preferredModel.slice(0, 64) : null,
        voiceId: typeof rawTts.preferredVoiceId === 'string' ? rawTts.preferredVoiceId.slice(0, 128) : null,
        language: typeof rawTts.language === 'string' ? rawTts.language.slice(0, 16) : null,
        accent: typeof rawTts.accent === 'string' ? rawTts.accent.slice(0, 32) : null,
        emotion: typeof rawTts.defaultEmotion === 'string' ? rawTts.defaultEmotion.slice(0, 32) : null,
        intensity: ['subtle', 'moderate', 'strong'].includes(rawTts.emotionIntensity) ? rawTts.emotionIntensity : 'moderate',
        style: typeof rawTts.speakingStyle === 'string' ? rawTts.speakingStyle.slice(0, 40) : null,
        speed: clamp(rawTts.speakingRate, 0.75, 1.35, 1.0),
        pitchPreference: clamp(rawTts.pitchPreference, -12, 12, 0),
        paragraphPauseMs: clamp(rawTts.pauseSettings?.paragraphPauseMs, 0, 3000, 550),
        speakerSwitchPauseMs: clamp(rawTts.pauseSettings?.speakerSwitchPauseMs, 0, 3000, 650),
        pronunciationDictionary: Array.isArray(rawTts.pronunciationDictionary)
          ? rawTts.pronunciationDictionary
              .slice(0, 100)
              .filter((p) => p && typeof p.word === 'string' && typeof p.pronunciation === 'string')
              .map((p) => ({
                word: sanitizeTextScript(p.word, 64),
                pronunciation: sanitizeTextScript(p.pronunciation, 128),
              }))
          : [],
        speakers: Array.isArray(rawTts.speakers)
          ? rawTts.speakers
              .slice(0, 12)
              .filter((s) => s && typeof s.name === 'string')
              .map((s) => ({
                id: sanitizeFilename(s.id || s.name, 'speaker'),
                name: sanitizeFilename(s.name, 'Speaker'),
                voiceId: typeof s.voiceId === 'string' ? s.voiceId.slice(0, 128) : 'Kore',
              }))
          : [],
      };
    }

    const providerIds = parsed.voiceIdentity?.providerVoiceIds || {};
    const safeProviderVoiceIds = {
      geminiVoiceId: typeof providerIds.geminiVoiceId === 'string' && providerIds.geminiVoiceId.startsWith('voice_')
        ? providerIds.geminiVoiceId.slice(0, 128)
        : null,
      geminiVoiceKey: typeof providerIds.geminiVoiceKey === 'string' && providerIds.geminiVoiceKey.startsWith('voicekey_')
        ? providerIds.geminiVoiceKey.slice(0, 1024)
        : null,
      geminiVoiceType: typeof providerIds.geminiVoiceType === 'string' ? providerIds.geminiVoiceType.slice(0, 32) : null,
      geminiConsentVerified: Boolean(providerIds.geminiConsentVerified),
      elevenlabsVoiceId: typeof providerIds.elevenlabsVoiceId === 'string' ? providerIds.elevenlabsVoiceId.slice(0, 128) : null,
    };

    const rawChain = parsed.processingProfile?.processingChainOrder;
    const restoredChainOrder = Array.isArray(rawChain)
      ? rawChain.filter((x) => typeof x === 'string' && PROCESSING_CHAIN_ORDER.includes(x))
      : PROCESSING_CHAIN_ORDER;

    return {
      success: true,
      data: {
        profileVersion: isV2 ? (parsed.profileVersion || '2.0') : (parsed.presetVersion || '1.0'),
        isUniversalV2: isV2,
        characterName,
        settings: cleanSettings,
        restoredOrigins,
        restoredFilterCount,
        restoredChainOrder,
        analysis: parsed.sourceAnalysis || parsed.analysis || null,
        recommendedSettings: parsed.recommendedSettings ? sanitizeAudioSettings(parsed.recommendedSettings) : null,
        referenceAudio,
        referenceBytes,
        checksumStatus,
        providerVoiceIds: safeProviderVoiceIds,
        ttsConfig: restoredTtsConfig,
        engineCompatibility: parsed.engineCompatibility || null,
      },
    };
  }

  /**
   * Synchronous quick check wrapper for simple v1 validation unit tests
   */
  static validateAndParseProfileJson(jsonString) {
    if (!jsonString || typeof jsonString !== 'string' || jsonString.length > MAX_UNIVERSAL_PROFILE_BYTES) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !checkJsonSafety(parsed)) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }
    const version = parsed.profileVersion || parsed.presetVersion;
    if (!version || typeof version !== 'string' || (!version.startsWith('1.') && !version.startsWith('2.'))) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }
    const rawSettings = parsed.currentSettings || parsed.settings || parsed.recommendedSettings;
    if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }
    return {
      success: true,
      data: {
        presetVersion: version,
        characterName: sanitizeFilename(parsed.characterName || parsed.profile?.name || 'Imported Character', 'Voice'),
        settings: sanitizeAudioSettings(rawSettings),
        analysis: parsed.sourceAnalysis || parsed.analysis || null,
        recommendedSettings: parsed.recommendedSettings ? sanitizeAudioSettings(parsed.recommendedSettings) : null,
      },
    };
  }

  static formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
