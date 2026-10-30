# Voice Character Studio

A localhost web application designed for YouTube voiceover and character dialogue workflows. It allows creators to record or upload voice dialogue and transform it into natural, believable characters (e.g., Narrator, Deep Male, Villain, Female, Cartoon, Old Man, Young Male) using local digital signal processing (DSP) with decoupled pitch/rate and formant preservation.

---

## 🚀 Key Features

1. **Strictly In-Memory Session (NO STORAGE SYSTEM)**
   - **Zero disk footprint**: Audio is never written to disk, IndexedDB, LocalStorage, or persistent caches.
   - Once downloaded, the user owns the file. Closing or refreshing the tab purges all memory cleanly.
   - Prevents RAM leaks with automatic buffer cleanup.

2. **Natural Human Voice Quality (Top Priority)**
   - **WSOLA Pitch Shifter**: Pitch changes (-12 to +12 semitones) without altering speaking speed.
   - **Independent Tempo / Rate Control**: 0.75x to 1.25x without affecting pitch.
   - **Formant Preservation & Shaping**: Dynamically compensates for vocal tract migration to eliminate "chipmunk" or "monster" artifacts.

3. **Complete Vocal DSP Pipeline**
   - **Dynamic Noise Reduction Gate**: Soft-knee downward expander that silences background room noise and laptop fan hum between words.
   - **Character EQ**: 3-Band musical EQ (Bass at 120Hz, Presence at 3.2kHz, Treble at 7.2kHz).
   - **De-Esser**: Suppresses harsh sibilant spikes (6–8 kHz) often worsened by pitch changes.
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

5. **Fast Preview & Full Processing**
   - **Fast Preview**: Processes a short 7-second slice in ~150ms for instantaneous feedback while tweaking sliders.
   - **Process Full Audio**: Processes the complete dialogue file with live percentage progress tracking.

6. **Instant A/B Comparison**
   - Toggle instantly between **A &bull; Original Voice** and **B &bull; Processed Voice**.

7. **Multi-Format Export**
   - **WAV**: 16-bit Broadcast PCM WAV (lossless, ready for Premiere Pro, DaVinci Resolve, CapCut, VN, Clipchamp).
   - **MP3**: High-bitrate 192kbps MP3 via client-side LAME encoder.
   - Filename format: `${CharacterName}_Processed.wav` / `.mp3`.

---

## 🛠️ How to Run

### Option 1: Double-click batch file
Double-click `start_studio.bat` inside `E:\Antigravity projects\voice changer app`.

### Option 2: Command line


Open your browser at:
`http://localhost:5173`

---

## 🎙️ YouTube Workflow
1. Read and record your character line or upload your voice recording.
2. Select a character preset (e.g. `Villain` or `Narrator`).
3. Tweak the sliders (Pitch, Formant, Bass, Reverb) to your taste.
4. Click **Preview (Fast 7s)** to hear the transformation instantly.
5. Click **Process Full Audio**.
6. Compare with the **A/B toggle**.
7. Click **Download WAV** or **Download MP3** and drop it straight into your video editor!
