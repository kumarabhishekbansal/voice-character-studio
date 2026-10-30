/**
 * Vocal Tract Formant Processor & Compensator
 * 
 * Prevents the unnatural "chipmunk" or "monster" artifact when pitch is shifted.
 * Allows independent adjustment of vocal tract geometry (-10 to +10).
 */
export class FormantProcessor {
  /**
   * Builds the formant shaping filter network in an AudioContext/OfflineAudioContext
   * 
   * @param {BaseAudioContext} context
   * @param {Object} options - { pitchSemitones: number, formant: number }
   * @returns {{ input: AudioNode, output: AudioNode }}
   */
  static createFormantFilterNetwork(context, { pitchSemitones = 0, formant = 0 } = {}) {
    // Pitch compensation factor: counteracts ~55% of natural pitch-shift formant migration
    const compensation = -pitchSemitones * 0.55;
    // Effective semitone shift for vocal tract resonances
    const totalFormantShift = compensation + formant;

    // Resonant shift ratio
    const shiftRatio = Math.max(0.65, Math.min(1.65, Math.pow(2, totalFormantShift / 12)));

    // Formant 1: Lower pharyngeal / vowel body resonance (~650 Hz nominal)
    const f1 = context.createBiquadFilter();
    f1.type = 'peaking';
    f1.frequency.value = Math.max(250, Math.min(1200, 650 * shiftRatio));
    f1.Q.value = 1.5;
    // Gentle boost or cut based on whether formant is shifted
    f1.gain.value = Math.max(-6, Math.min(6, totalFormantShift * 0.45));

    // Formant 2: Oral cavity / vowel articulation (~1750 Hz nominal)
    const f2 = context.createBiquadFilter();
    f2.type = 'peaking';
    f2.frequency.value = Math.max(900, Math.min(3200, 1750 * shiftRatio));
    f2.Q.value = 1.8;
    f2.gain.value = Math.max(-6, Math.min(6, totalFormantShift * 0.6));

    // Formant 3: Vocal ring / speaker's formant (~2850 Hz nominal)
    const f3 = context.createBiquadFilter();
    f3.type = 'peaking';
    f3.frequency.value = Math.max(1800, Math.min(4500, 2850 * shiftRatio));
    f3.Q.value = 2.2;
    f3.gain.value = Math.max(-5, Math.min(5, totalFormantShift * 0.4));

    // Chest Cavity Resonance Filter (~220 Hz)
    // Helps maintain masculine warmth when shifting pitch or creates chest resonance
    const chest = context.createBiquadFilter();
    chest.type = 'peaking';
    chest.frequency.value = 220;
    chest.Q.value = 1.2;
    // If formant is negative, deepen chest resonance; if positive, lightly tighten low-end
    chest.gain.value = Math.max(-4, Math.min(5, -totalFormantShift * 0.35));

    // Anti-harshness upper shelf to tame high sibilance when pitching up
    const antiHarsh = context.createBiquadFilter();
    antiHarsh.type = 'highshelf';
    antiHarsh.frequency.value = 6500;
    if (pitchSemitones > 3 || totalFormantShift > 3) {
      antiHarsh.gain.value = -Math.min(4.5, (pitchSemitones + totalFormantShift) * 0.3);
    } else {
      antiHarsh.gain.value = 0;
    }

    // Connect filter cascade: chest -> f1 -> f2 -> f3 -> antiHarsh
    chest.connect(f1);
    f1.connect(f2);
    f2.connect(f3);
    f3.connect(antiHarsh);

    return {
      input: chest,
      output: antiHarsh,
    };
  }
}
