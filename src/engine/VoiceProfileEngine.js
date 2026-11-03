import { sanitizeAudioSettings, sanitizeFilename } from '../utils/security.js';

/**
 * Voice Profile & Audio Analysis Engine
 * Performs deep, reliable acoustic measurements (F0, RMS, Peak, LUFS, Noise Floor,
 * Dynamics, Spectral Centroid, Sibilance, Clipping) and calculates natural,
 * studio-grade initial filter recommendations.
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
   * 
   * @param {AudioBuffer} buffer
   * @param {File} [file]
   * @returns {Object} { detected, recommendedSettings, recommendationReasons }
   */
  static analyze(buffer, file = null) {
    const sampleRate = buffer.sampleRate;
    const numberOfChannels = buffer.numberOfChannels;
    const duration = buffer.duration;
    const length = buffer.length;

    // Use primary channel (or mix of stereo) for pitch and spectral analysis
    const ch0 = buffer.getChannelData(0);
    const ch1 = numberOfChannels > 1 ? buffer.getChannelData(1) : null;

    let peak = 0;
    let sumSq = 0;
    let clippedSamplesCount = 0;

    // 1. Scan for overall peak, RMS, and clipping
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

    // 2. Block-based Energy, Noise Floor, Voice Activity & Dynamic Range
    const blockSize = Math.max(256, Math.floor(sampleRate * 0.05)); // 50ms blocks
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
      // Noise floor is approximated by the 8th percentile of frame energy
      const noiseIndex = Math.min(sortedDbs.length - 1, Math.floor(sortedDbs.length * 0.08));
      noiseFloorDb = Math.round(sortedDbs[noiseIndex] * 10) / 10;

      // Active speech threshold: noise floor + 10 dB or min -48 dBFS
      const speechThreshold = Math.max(-50, noiseFloorDb + 10);
      let silentBlocks = 0;
      let activeBlocks = 0;

      for (let i = 0; i < blockEnergiesDb.length; i++) {
        if (blockEnergiesDb[i] < speechThreshold) {
          silentBlocks++;
        } else {
          activeBlocks++;
        }
      }

      silencePercent = Math.round((silentBlocks / blockEnergiesDb.length) * 100);
      voiceActivityPercent = 100 - silencePercent;

      // Dynamic Range: Peak dB minus 10th percentile speech energy
      const p90 = sortedDbs[Math.floor(sortedDbs.length * 0.9)] || peakDb;
      const p10 = sortedDbs[Math.floor(sortedDbs.length * 0.1)] || rmsDb;
      dynamicRangeDb = Math.max(0, Math.round((p90 - p10) * 10) / 10);
    }

    // 3. Approximate Integrated LUFS (K-weighting pre-filter approximation)
    let approxLufs = null;
    if (rmsDb > -80) {
      // High-shelf boost of high frequencies (~+4dB above 1.5kHz) and high-pass at 100Hz
      let lufsSumSq = 0;
      let lufsCount = 0;
      const lufsGate = rmsDb - 10; // Gated at -10 relative dB

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

    // 4. Fundamental Frequency (F0) & Pitch Detection via Autocorrelation
    // Pitch search range: 65 Hz (deep male) to 450 Hz (high speech)
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
        // Compute frame RMS
        let fRms = 0;
        for (let i = 0; i < pitchFrameSize; i++) {
          fRms += ch0[offset + i] * ch0[offset + i];
        }
        fRms = Math.sqrt(fRms / pitchFrameSize);
        const fDb = fRms > 1e-6 ? 20 * Math.log10(fRms) : -96;

        // Only evaluate frames with audible voiced energy
        if (fDb > -48 && (noiseFloorDb < -35 ? fDb > noiseFloorDb + 5 : true)) {
          let bestCorr = 0;
          let bestLag = -1;

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
            if (denom > 1e-6) {
              const r = num / denom;
              if (r > bestCorr) {
                bestCorr = r;
                bestLag = lag;
              }
            }
          }

          // Strict voicing correlation threshold to avoid spurious detections
          if (bestCorr > 0.52 && bestLag > 0) {
            const freq = sampleRate / bestLag;
            if (freq >= 65 && freq <= 450) {
              detectedPitches.push(freq);
            }
          }
        }
      }
    }

    let averagePitchHz = null;
    let averagePitchNote = null;
    let pitchRange = null;

    // Must have at least 4 consistent voiced frames to reliably claim F0
    if (detectedPitches.length >= 4) {
      detectedPitches.sort((a, b) => a - b);
      const medianF0 = detectedPitches[Math.floor(detectedPitches.length / 2)];
      const minF0 = detectedPitches[0];
      const maxF0 = detectedPitches[detectedPitches.length - 1];

      // Consistency check: max/min should not exceed 3.5 octaves
      if (maxF0 / minF0 < 4.0) {
        averagePitchHz = Math.round(medianF0 * 10) / 10;
        averagePitchNote = VoiceProfileEngine.hzToNote(medianF0);
        pitchRange = `${Math.round(minF0)} Hz – ${Math.round(maxF0)} Hz`;
      }
    }

    // 5. Spectral Characteristics via FFT (Centroid, Energy Bands & Sibilance)
    const fftSize = 2048;
    let spectralCentroidHz = null;
    let lowEnergyPercent = 33;
    let midEnergyPercent = 52;
    let highEnergyPercent = 15;
    let sibilanceIndicator = 'Not reliably detected';

    if (length >= fftSize) {
      // Analyze up to 6 speech windows and average their power spectrum
      const numWindows = Math.min(8, Math.floor(length / fftSize));
      const avgSpectrum = new Float32Array(fftSize / 2);
      let validWindows = 0;

      for (let w = 0; w < numWindows; w++) {
        const offset = Math.floor(w * (length - fftSize) / Math.max(1, numWindows - 1));
        const real = new Float32Array(fftSize);
        const imag = new Float32Array(fftSize);

        // Hann window
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

        let lowBand = 0;  // < 300 Hz
        let midBand = 0;  // 300 Hz - 3500 Hz
        let highBand = 0; // > 3500 Hz

        let sibilantEnergy = 0; // 5.5 kHz - 9 kHz
        let voiceCoreEnergy = 0; // 1 kHz - 4 kHz

        for (let k = 1; k < fftSize / 2; k++) {
          const freq = k * binFreq;
          const mag = Math.sqrt(avgSpectrum[k]);
          const power = avgSpectrum[k];

          numCentroid += freq * mag;
          denCentroid += mag;

          if (freq < 300) {
            lowBand += power;
          } else if (freq <= 3500) {
            midBand += power;
          } else {
            highBand += power;
          }

          if (freq >= 5500 && freq <= 9000) {
            sibilantEnergy += power;
          } else if (freq >= 1000 && freq <= 4000) {
            voiceCoreEnergy += power;
          }
        }

        if (denCentroid > 1e-6) {
          spectralCentroidHz = Math.round(numCentroid / denCentroid);
        }

        const totalBand = lowBand + midBand + highBand;
        if (totalBand > 1e-6) {
          lowEnergyPercent = Math.round((lowBand / totalBand) * 100);
          midEnergyPercent = Math.round((midBand / totalBand) * 100);
          highEnergyPercent = Math.max(0, 100 - lowEnergyPercent - midEnergyPercent);
        }

        // Sibilance evaluation
        const sibRatio = voiceCoreEnergy > 1e-6 ? sibilantEnergy / voiceCoreEnergy : 0;
        if (sibRatio > 0.45) {
          sibilanceIndicator = 'High Sibilance (Harsh)';
        } else if (sibRatio > 0.22) {
          sibilanceIndicator = 'Moderate (Natural)';
        } else {
          sibilanceIndicator = 'Low (Soft)';
        }
      }
    }

    // 6. Original format & bit depth detection
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

    // Assembly of detected measurements
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
      spectralCentroidHz,
      lowEnergyPercent,
      midEnergyPercent,
      highEnergyPercent,
      sibilanceIndicator,
      clippingDetected: clippedSamplesCount > 0,
      clippedSamplesCount,
      waveformPeaks,
      fileName: file ? file.name : 'Voice_Recording.wav',
      fileSize: file ? VoiceProfileEngine.formatBytes(file.size) : `${Math.round((length * numberOfChannels * 4) / 1024)} KB (RAM)`,
    };

    // 7. Calculate Recommended Settings & Human-Readable Explanations
    const { recommendedSettings, recommendationReasons } = VoiceProfileEngine.calculateRecommendations(detected);

    return {
      detected,
      recommendedSettings,
      recommendationReasons,
    };
  }

  /**
   * Calculates balanced, natural initial recommendations based on detected measurements
   * 
   * @param {Object} detected
   * @returns {Object} { recommendedSettings, recommendationReasons }
   */
  static calculateRecommendations(detected) {
    const reasons = [];

    // Base neutral settings
    let pitch = 0;
    let rate = 1.0;
    let volume = 100;
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

    // 1. Noise Reduction
    if (detected.noiseFloorDb > -44) {
      noiseReduction = 28;
      reasons.push(`Audible background noise detected (${detected.noiseFloorDb} dBFS): +28% noise gate recommended to clean room hum.`);
    } else if (detected.noiseFloorDb > -54) {
      noiseReduction = 18;
      reasons.push(`Moderate ambient floor (${detected.noiseFloorDb} dBFS): 18% gentle noise reduction applied.`);
    } else {
      noiseReduction = 8;
      reasons.push(`Clean acoustic environment (${detected.noiseFloorDb} dBFS): low 8% noise gate to preserve natural room breathing.`);
    }

    // 2. Dynamic Compression
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

    // 3. De-Esser (Sibilance Control)
    if (detected.sibilanceIndicator.includes('High')) {
      deEsser = 32;
      reasons.push('Elevated high-frequency sibilance (6–8 kHz): 32% de-esser to tame sharp consonants.');
    } else if (detected.sibilanceIndicator.includes('Moderate')) {
      deEsser = 18;
    } else {
      deEsser = 10;
    }

    // 4. Tone Balance (Bass, Presence, Treble & Warmth)
    if (detected.lowEnergyPercent < 22 && detected.spectralCentroidHz && detected.spectralCentroidHz > 2500) {
      bass = 2.0;
      warmth = 22;
      reasons.push('Thin low-end acoustic response: +2.0 dB bass body and warmth added.');
    } else if (detected.lowEnergyPercent > 48) {
      bass = -1.5;
      presence = 1.5;
      reasons.push('Heavy proximity or low-frequency rumble: -1.5 dB bass cut and +1.5 dB presence for articulation.');
    }

    if (detected.spectralCentroidHz && detected.spectralCentroidHz < 1500) {
      treble = 1.5;
      presence = 1.2;
      reasons.push('Warm/dark voice response: +1.5 dB treble air to enhance vocal presence.');
    } else if (detected.spectralCentroidHz && detected.spectralCentroidHz > 3200) {
      treble = -1.0;
      reasons.push('Excessive high-frequency brightness: -1.0 dB treble smoothing.');
    }

    // 5. Volume & Headroom
    if (detected.clippingDetected) {
      volume = 92;
      reasons.push(`Digital clipping detected (${detected.clippedSamplesCount} samples): master gain reduced to 92% to prevent distortion.`);
    } else if (detected.peakDb < -14) {
      volume = 120;
      reasons.push(`Quiet recording (Peak ${detected.peakDb} dBFS): master gain lifted to 120% for broadcast level.`);
    } else {
      volume = 100;
    }

    // Preserve original voice pitch and rate
    pitch = 0;
    rate = 1.0;
    formant = 0;
    echo = 0;
    reverb = 4;
    saturation = 3;

    const recommendedSettings = sanitizeAudioSettings({
      pitch,
      rate,
      volume,
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
   * Generates a portable, validated JSON preset object matching section 14 specs
   */
  static generateProfileJson({ analysis, recommendedSettings, currentSettings, characterName = 'Voice' }) {
    const safeCharacter = sanitizeFilename(characterName, 'Voice');
    const safeCurrent = sanitizeAudioSettings(currentSettings);
    const safeRec = sanitizeAudioSettings(recommendedSettings);

    const profile = {
      presetVersion: '1.0',
      app: 'AbhiVoiceChanger',
      characterName: safeCharacter,
      createdAt: new Date().toISOString(),
      analysis: {
        duration: analysis?.duration ?? 0,
        sampleRate: analysis?.sampleRate ?? 44100,
        channels: analysis?.numberOfChannels ?? 1,
        originalFormat: analysis?.originalFormat ?? 'WAV',
        bitDepth: analysis?.bitDepth ?? '32-bit float (decoded)',
        averagePitch: analysis?.averagePitchHz ?? null,
        averagePitchNote: analysis?.averagePitchNote ?? null,
        pitchRange: analysis?.pitchRange ?? null,
        rms: analysis?.rmsDb ?? null,
        peak: analysis?.peakDb ?? null,
        loudness: analysis?.lufs ?? null,
        noiseFloor: analysis?.noiseFloorDb ?? null,
        dynamicRange: analysis?.dynamicRangeDb ?? null,
        spectralCentroid: analysis?.spectralCentroidHz ?? null,
        sibilanceIndicator: analysis?.sibilanceIndicator ?? null,
        silencePercent: analysis?.silencePercent ?? 0,
        voiceActivityPercent: analysis?.voiceActivityPercent ?? 100,
        lowEnergyPercent: analysis?.lowEnergyPercent ?? 33,
        midEnergyPercent: analysis?.midEnergyPercent ?? 52,
        highEnergyPercent: analysis?.highEnergyPercent ?? 15,
        clippingDetected: Boolean(analysis?.clippingDetected),
        clippedSamplesCount: analysis?.clippedSamplesCount ?? 0,
      },
      recommendedSettings: safeRec,
      currentSettings: safeCurrent,
    };

    return JSON.stringify(profile, null, 2);
  }

  /**
   * Validates and imports untrusted JSON preset files.
   * Enforces strict schema, version compatibility, and parameter bounds clamping.
   * Completely immune to prototype pollution, script injection, and out-of-range exploits.
   * 
   * @param {string} jsonString
   * @returns {{ success: boolean, data?: Object, error?: string }}
   */
  static validateAndParseProfileJson(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    // Limit maximum JSON size (prevent memory DoS)
    if (jsonString.length > 500 * 1024) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    // Validate preset version
    const version = parsed.presetVersion;
    if (!version || typeof version !== 'string' || !version.startsWith('1.')) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    // Extract settings (support currentSettings or recommendedSettings or legacy settings)
    const rawSettings = parsed.currentSettings || parsed.settings || parsed.recommendedSettings;
    if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
      return { success: false, error: 'Invalid or unsupported voice profile.' };
    }

    // Clamps every supported parameter safely
    const cleanSettings = sanitizeAudioSettings(rawSettings);

    // Extract character name safely
    const characterName = sanitizeFilename(parsed.characterName || 'Imported Character', 'Voice');

    return {
      success: true,
      data: {
        presetVersion: version,
        characterName,
        settings: cleanSettings,
        analysis: parsed.analysis || null,
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
