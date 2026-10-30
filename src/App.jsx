import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AudioUploader from './components/AudioUploader';
import AudioAnalysisBadge from './components/AudioAnalysisBadge';
import WaveformPlayer from './components/WaveformPlayer';
import VoiceControls from './components/VoiceControls';
import PresetSelector from './components/PresetSelector';
import ActionToolbar from './components/ActionToolbar';
import ComparisonBar from './components/ComparisonBar';

import { audioEngine } from './engine/AudioEngine';
import { AudioAnalyzer } from './engine/AudioAnalyzer';
import { Exporters } from './engine/Exporters';
import { generateSpeechSample } from './utils/sampleAudio';
import { DEFAULT_VOICE_SETTINGS, CHARACTER_PRESETS } from './constants/presets';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function App() {
  // Session Audio State (STRICTLY IN-MEMORY: NO IndexedDB, NO LocalStorage)
  const [originalBuffer, setOriginalBuffer] = useState(null);
  const [originalAnalysis, setOriginalAnalysis] = useState(null);

  const [processedBuffer, setProcessedBuffer] = useState(null);
  const [processedAnalysis, setProcessedAnalysis] = useState(null);

  // Character Settings & Metadata
  const [characterName, setCharacterName] = useState('Villain');
  const [settings, setSettings] = useState(DEFAULT_VOICE_SETTINGS);
  const [activePresetId, setActivePresetId] = useState(null);

  // A/B Comparison state
  const [activeAB, setActiveAB] = useState('B');

  // Processing & Export State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // User notifications
  const [toast, setToast] = useState({
    message: 'Voice Character Studio initialized. Memory-only mode active.',
    type: 'info'
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Clean memory on window unload
  useEffect(() => {
    const handleUnload = () => {
      audioEngine.dispose();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      audioEngine.dispose();
    };
  }, []);

  // 1. Handle file upload
  const handleFileLoaded = async (file) => {
    try {
      showToast(`Loading "${file.name}" into session memory...`, 'info');
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await audioEngine.decodeAudio(arrayBuffer);
      const analysis = AudioAnalyzer.analyze(decoded, file);

      setOriginalBuffer(decoded);
      setOriginalAnalysis(analysis);

      // Reset any previous processed buffer to release memory immediately
      setProcessedBuffer(null);
      setProcessedAnalysis(null);
      setActiveAB('A');

      showToast(`Loaded ${analysis.formattedDuration} audio (${analysis.fileSize}) into RAM.`, 'success');
    } catch (err) {
      console.error('File load error:', err);
      showToast(err.message || 'Failed to decode audio file.', 'error');
    }
  };

  // 2. Load demo spoken sample
  const handleLoadDemoSpeech = () => {
    try {
      const ctx = audioEngine.getAudioContext();
      const demoBuffer = generateSpeechSample(ctx);
      const analysis = AudioAnalyzer.analyze(demoBuffer, {
        name: 'Demo_Speech_Phrase.wav',
        type: 'audio/wav',
        size: demoBuffer.length * 4,
      });

      setOriginalBuffer(demoBuffer);
      setOriginalAnalysis(analysis);
      setProcessedBuffer(null);
      setProcessedAnalysis(null);
      setActiveAB('A');

      showToast('Loaded demo dialogue phrase. Try applying presets below!', 'success');
    } catch (err) {
      console.error('Demo load error:', err);
      showToast('Failed to generate demo sample.', 'error');
    }
  };

  // 3. Clear audio from memory
  const handleClearAudio = () => {
    setOriginalBuffer(null);
    setOriginalAnalysis(null);
    setProcessedBuffer(null);
    setProcessedAnalysis(null);
    setActiveAB('A');
    showToast('Session memory cleared. Audio buffers released.', 'info');
  };

  // 4. Select preset
  const handleSelectPreset = (preset) => {
    setSettings({ ...preset.settings });
    setActivePresetId(preset.id);
    if (preset.characterName) {
      setCharacterName(preset.characterName);
    }
    showToast(`Applied preset: ${preset.name}. Click Preview to hear the change.`, 'info');
  };

  // 5. Reset settings
  const handleResetSettings = () => {
    setSettings(DEFAULT_VOICE_SETTINGS);
    setActivePresetId(null);
    showToast('Settings restored to natural neutral defaults.', 'info');
  };

  // 6. Fast Preview (Processes short ~7 second segment)
  const handlePreview = async () => {
    if (!originalBuffer) return;

    try {
      setIsProcessing(true);
      setIsPreviewing(true);
      setProcessingProgress(15);
      setProcessingStage('Slicing preview segment & shifting pitch...');

      const previewSlice = audioEngine.sliceBuffer(originalBuffer, 7.0);

      const result = await audioEngine.process(
        previewSlice,
        settings,
        (pct) => {
          setProcessingProgress(pct);
          if (pct < 70) {
            setProcessingStage(`Pitch & time stretching: ${pct}%...`);
          } else {
            setProcessingStage(`Vocal formant & acoustic DSP: ${pct}%...`);
          }
        },
        true
      );

      const analysis = AudioAnalyzer.analyze(result, {
        name: `${characterName}_Preview.wav`,
        type: 'audio/wav',
        size: result.length * result.numberOfChannels * 4,
      });

      setProcessedBuffer(result);
      setProcessedAnalysis(analysis);
      setActiveAB('B');
      showToast('Preview processed! Playing transformed voice.', 'success');
    } catch (err) {
      console.error('Preview error:', err);
      showToast(`Processing error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setIsPreviewing(false);
    }
  };

  // 7. Process Full Audio
  const handleProcessFull = async () => {
    if (!originalBuffer) return;

    try {
      setIsProcessing(true);
      setIsPreviewing(false);
      setProcessingProgress(5);
      setProcessingStage('Starting full WSOLA pitch processing...');

      const result = await audioEngine.process(
        originalBuffer,
        settings,
        (pct) => {
          setProcessingProgress(pct);
          if (pct < 75) {
            setProcessingStage(`Processing pitch & rate: ${pct}%...`);
          } else {
            setProcessingStage(`Rendering formant EQ, warmth & spatial FX: ${pct}%...`);
          }
        },
        false
      );

      const analysis = AudioAnalyzer.analyze(result, {
        name: `${characterName}_Processed.wav`,
        type: 'audio/wav',
        size: result.length * result.numberOfChannels * 4,
      });

      setProcessedBuffer(result);
      setProcessedAnalysis(analysis);
      setActiveAB('B');
      showToast(`Full recording processed successfully! Ready to export.`, 'success');
    } catch (err) {
      console.error('Full process error:', err);
      showToast(`Processing error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setIsPreviewing(false);
    }
  };

  // 8. Download WAV
  const handleDownloadWav = () => {
    if (!processedBuffer) return;
    setIsExporting(true);
    try {
      const safeName = (characterName || 'Voice').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeName}_Processed.wav`;
      const wavBlob = Exporters.audioBufferToWavBlob(processedBuffer);
      Exporters.triggerDownload(wavBlob, filename);
      showToast(`Downloaded: ${filename}`, 'success');
    } catch (err) {
      console.error('WAV export error:', err);
      showToast(`WAV export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 9. Download MP3
  const handleDownloadMp3 = () => {
    if (!processedBuffer) return;
    setIsExporting(true);
    try {
      const safeName = (characterName || 'Voice').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeName}_Processed.mp3`;
      const mp3Blob = Exporters.audioBufferToMp3Blob(processedBuffer, 192);
      Exporters.triggerDownload(mp3Blob, filename);
      showToast(`Downloaded: ${filename}`, 'success');
    } catch (err) {
      console.error('MP3 export error:', err);
      showToast(`MP3 export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar
        originalDuration={originalBuffer ? originalBuffer.duration : 0}
        isProcessing={isProcessing}
      />

      {/* Main Studio Viewport */}
      <main className="main-content">
        <Header
          characterName={characterName}
          onCharacterNameChange={setCharacterName}
          onResetSettings={handleResetSettings}
          onClearAudio={handleClearAudio}
          hasAudio={!!originalBuffer}
        />

        <div style={{ padding: '24px 28px', maxWidth: '1240px', width: '100%', margin: '0 auto' }}>
          {/* Toast Alert Banner */}
          {toast && (
            <div style={{
              background: toast.type === 'error'
                ? 'rgba(244, 63, 94, 0.15)'
                : toast.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(0, 210, 255, 0.12)',
              border: `1px solid ${
                toast.type === 'error'
                  ? 'rgba(244, 63, 94, 0.35)'
                  : toast.type === 'success'
                  ? 'rgba(16, 185, 129, 0.35)'
                  : 'rgba(0, 210, 255, 0.3)'
              }`,
              borderRadius: '8px',
              padding: '10px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.82rem',
              color: toast.type === 'error' ? '#fb7185' : toast.type === 'success' ? '#34d399' : '#38bdf8'
            }}>
              {toast.type === 'error' && <AlertTriangle size={16} />}
              {toast.type === 'success' && <CheckCircle size={16} />}
              {toast.type === 'info' && <Info size={16} />}
              <span>{toast.message}</span>
            </div>
          )}

          {/* Audio Uploader */}
          <AudioUploader
            onFileLoaded={handleFileLoaded}
            onLoadDemoSpeech={handleLoadDemoSpeech}
            isProcessing={isProcessing}
          />

          {/* Audio Analysis Stats */}
          {originalAnalysis && (
            <AudioAnalysisBadge analysis={originalAnalysis} />
          )}

          {/* Original Audio Waveform Player */}
          {originalBuffer && (
            <WaveformPlayer
              title="ORIGINAL AUDIO"
              subtitle="Unprocessed source voice"
              badgeText="Input Source"
              badgeType="cyan"
              audioBuffer={originalBuffer}
              waveformPeaks={originalAnalysis ? originalAnalysis.waveformPeaks : null}
              accentColor="#00d2ff"
              audioEngine={audioEngine}
            />
          )}

          {/* Character Presets */}
          <PresetSelector
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
          />

          {/* Voice Controls Sliders */}
          <VoiceControls
            settings={settings}
            onChange={setSettings}
          />

          {/* Action Toolbar: Preview & Process Full Audio */}
          <ActionToolbar
            onPreview={handlePreview}
            onProcessFull={handleProcessFull}
            isProcessing={isProcessing}
            processingProgress={processingProgress}
            processingStage={processingStage}
            hasAudio={!!originalBuffer}
            isPreviewing={isPreviewing}
            hasProcessedAudio={!!processedBuffer}
          />

          {/* Processed Audio Waveform Player */}
          {processedBuffer && (
            <WaveformPlayer
              title="PROCESSED AUDIO"
              subtitle={isPreviewing ? 'Preview Slice' : 'Full Rendered Dialogue'}
              badgeText={characterName || 'Processed Character'}
              badgeType="emerald"
              audioBuffer={processedBuffer}
              waveformPeaks={processedAnalysis ? processedAnalysis.waveformPeaks : null}
              accentColor="#10b981"
              audioEngine={audioEngine}
            />
          )}

          {/* Before / After Comparison Bar & Download WAV / MP3 */}
          <ComparisonBar
            onDownloadWav={handleDownloadWav}
            onDownloadMp3={handleDownloadMp3}
            hasProcessedAudio={!!processedBuffer}
            activeAB={activeAB}
            onToggleAB={setActiveAB}
            characterName={characterName}
            isExporting={isExporting}
          />
        </div>
      </main>
    </div>
  );
}
