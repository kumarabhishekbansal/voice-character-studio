# AbhiVoiceChanger

A professional web application designed for YouTube video voiceover and character dialogue workflows. It allows creators to record or upload voice dialogue and transform it into natural, believable characters (e.g., Narrator, Deep Male, Villain, Female, Cartoon, Old Man, Young Male) using local digital signal processing (DSP) with decoupled pitch/rate and vocal formant preservation.

**Live Website:** [https://abhivoicechanger.vercel.app](https://abhivoicechanger.vercel.app)

**Made by ABHI BANSAL**

---

## 🚀 Key Features

1. **Strictly In-Memory Session (Zero Persistent Storage)**
   - **Zero disk footprint**: Audio is never written to disk, IndexedDB, LocalStorage, or persistent caches.
   - 100% in-memory processing. Once downloaded, the user owns the file. Closing or refreshing the tab purges all audio memory cleanly.

2. **Natural Human Voice Quality (Top Priority)**
   - **WSOLA Pitch Shifter**: Pitch changes (-12 to +12 semitones) without altering speaking speed.
   - **Independent Tempo / Rate Control**: 0.75x to 1.25x without affecting pitch.
   - **Formant Preservation & Shaping**: Dynamically compensates for vocal tract migration to eliminate "chipmunk" or "monster" artifacts.

3. **Smart Voice Profile & Automatic Analysis Engine**
   - **Detected Acoustic Measurements**: Measures fundamental frequency (F0), musical note, pitch range, RMS dBFS, Peak dBFS, approximate LUFS, noise floor, dynamic range, spectral centroid brightness, sibilance, and digital clipping without guessing ("Not reliably detected" when uncertain).
   - **Recommended Filter Settings**: Automatically suggests baseline non-aggressive filter parameters (Noise Gate, Vocal Compression, Tone EQ, De-Esser, Volume) tailored to the recording to naturally clean and balance dialogue.
   - **Portable JSON Presets (.json)**: 1-click Download & Import of JSON voice profiles with strict schema validation, type verification, and parameter bounds clamping. Live synchronized with all slider tweaks.

4. **Complete Vocal DSP Pipeline**
   - **Dynamic Noise Reduction Gate**: Silences background room noise and laptop fan hum.
   - **Character EQ**: 3-Band musical EQ (Bass at 120Hz, Presence at 3.2kHz, Treble at 7.2kHz).
   - **De-Esser**: Suppresses harsh sibilant spikes (6–8 kHz).
   - **Analog Warmth & Saturation**: WaveShaper with even harmonic generation for broadcast presence.
   - **Vocal Compression**: Smooth dynamic leveling with transparent 12ms attack and soft knee.
   - **Algorithmic Studio Reverb & Dark Delay**: Tailored acoustic ambience without external impulse files.

4. **Character Presets (Starting Points)**
   - **Natural Male** (warm & balanced)
   - **Deep Male** (resonant baritone)
   - **Young Male** (crisp & agile)
   - **Female** (higher pitch with feminine formant compensation)
   - **Narrator** (authoritative, controlled broadcast voice)
   - **Villain** (deep, dark, ominous chest resonance)
   - **Old Character** (softened highs, subtle rasp)
   - **Cartoon** (exaggerated animation character)
   - **Robot** (stylized sci-fi reflection)

5. **Fully Responsive Across All Devices**
   - Optimized for Desktop (1920×1080), Laptop (1366×768), Tablet (768×1024), Mobile (390×844), and Small Mobile (320×568).
   - Off-canvas drawer menu on tablet & mobile devices.
   - Dynamic auto-resizing waveform visualizer.

6. **Fast Preview & Full Processing**
   - **Fast Preview**: Processes a short 7-second slice in under 200ms for instantaneous feedback while tweaking sliders.
   - **Process Full Audio**: Processes the complete dialogue file with live percentage progress tracking.

7. **Instant A/B Comparison**
   - Toggle instantly between **A &bull; Original Voice** and **B &bull; Processed Voice**.

8. **Multi-Format Export**
   - **WAV**: 16-bit Broadcast PCM WAV (lossless, ready for Premiere Pro, DaVinci Resolve, CapCut, VN, Clipchamp).
   - **MP3**: High-bitrate 192kbps MP3 via client-side LAME encoder.
   - Filename format: `${CharacterName}_Processed.wav` / `.mp3`.

---

## 🛠️ How to Run Locally

### Option 1: Double-click batch file
Double-click `start_studio.bat` inside the project directory.

### Option 2: Command line
```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🎙️ YouTube Workflow
1. Read and record your character line or upload your voice recording.
2. Select a character preset (e.g. `Villain` or `Narrator`).
3. Tweak the sliders (Pitch, Formant, Bass, Reverb) to your taste.
4. Click **Preview (Fast 7s)** to hear the transformation instantly.
5. Click **Process Full Audio**.
6. Compare with the **A/B toggle**.
7. Click **Download WAV** or **Download MP3** and drop it straight into your video editor!
