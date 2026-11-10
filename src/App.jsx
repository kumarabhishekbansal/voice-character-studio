import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import AudioUploader from './components/AudioUploader';
import VoiceProfilePanel from './components/VoiceProfilePanel';
import UniversalProfileSummaryCard from './components/UniversalProfileSummaryCard';
import WaveformPlayer from './components/WaveformPlayer';
import VoiceControls from './components/VoiceControls';
import PresetSelector from './components/PresetSelector';
import ActionToolbar from './components/ActionToolbar';
import ComparisonBar from './components/ComparisonBar';
import TtsStudio from './components/tts/TtsStudio';

import { audioEngine } from './engine/AudioEngine';
import { AudioAnalyzer } from './engine/AudioAnalyzer';
import { AudioResampler } from './engine/AudioResampler';
import { VoiceProfileEngine } from './engine/VoiceProfileEngine';
import { ttsEngine } from './engine/TtsEngine';
import { Exporters } from './engine/Exporters';
import { generateSpeechSample } from './utils/sampleAudio';
import { DEFAULT_VOICE_SETTINGS } from './constants/presets';
import { sanitizeFilename } from './utils/security';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function App() {
  // Navigation Mode: 'voice-changer' (Speech-to-Speech) | 'tts' (Text to Speech)
  const [activeMode, setActiveMode] = useState('voice-changer');

  // Server Provider Status (Gemini & Optional ElevenLabs)
  const [serverStatus, setServerStatus] = useState({
    geminiConfigured: false,
    elevenlabsConfigured: false,
  });

  // Session Audio State (STRICTLY IN-MEMORY: NO IndexedDB, NO LocalStorage)
  const [originalBuffer, setOriginalBuffer] = useState(null);
  const [originalAnalysis, setOriginalAnalysis] = useState(null);
  const [recommendedSettings, setRecommendedSettings] = useState(null);

  const [processedBuffer, setProcessedBuffer] = useState(null);
  const [processedAnalysis, setProcessedAnalysis] = useState(null);

  // Universal Voice Identity State (Shared across Voice Changer & Text to Speech)
  const [characterName, setCharacterNameState] = useState('Abhi Character');
  const [settings, setSettingsState] = useState(DEFAULT_VOICE_SETTINGS);
  const [activePresetId, setActivePresetId] = useState(null);

  const [referenceAudio, setReferenceAudio] = useState(null); // 24kHz mono Base64 WAV + SHA-256
  const [providerVoiceIds, setProviderVoiceIds] = useState({});
  const [importedSummary, setImportedSummary] = useState(null);
  const [hasUnsavedProfileChanges, setHasUnsavedProfileChanges] = useState(false);

  // Shared TTS Config (synchronized into Universal Voice Profile v2.0 live)
  const [ttsConfig, setTtsConfigState] = useState({
    engine: 'kokoro', // Switches to 'gemini' automatically on mount if GEMINI_API_KEY is detected on server
    model: 'gemini-3.8-flash-tts',
    voiceId: 'af_heart',
    language: 'en-US',
    accent: 'default',
    defaultEmotion: 'neutral',
    emotionIntensity: 'moderate',
    speakingStyle: 'normal-conversation',
    speed: 1.0,
    pitchPreference: 0,
    paragraphPauseMs: 550,
    speakerSwitchPauseMs: 650,
    pronunciationDictionary: [],
    speakers: [
      { id: 'narrator', name: 'Narrator', voiceId: 'af_heart' },
    ],
  });

  // Mobile Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // A/B Comparison state
  const [activeAB, setActiveAB] = useState('B');

  // Processing & Export State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Toast Notifications
  const [toast, setToast] = useState({
    message: 'AbhiVoiceChanger ready. Strictly in-memory session active.',
    type: 'info',
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Wrapper setters to mark live profile unsaved changes cleanly
  const setCharacterName = (val) => {
    setCharacterNameState(val);
    setHasUnsavedProfileChanges(true);
  };

  const setSettings = (next) => {
    setSettingsState(next);
    setHasUnsavedProfileChanges(true);
  };

  const setTtsConfig = (next) => {
    setTtsConfigState(next);
    setHasUnsavedProfileChanges(true);
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Check server TTS capabilities & select appropriate initial default engine
  useEffect(() => {
    ttsEngine.fetchServerStatus().then((status) => {
      setServerStatus(status);
      if (status?.geminiConfigured) {
        setTtsConfigState((prev) => ({
          ...prev,
          engine: 'gemini',
          language: 'auto',
          voiceId: 'Kore',
          speakers: [{ id: 'narrator', name: 'Narrator', voiceId: 'Kore' }],
        }));
      }
    });
  }, []);

  // Clean memory on window unload
  useEffect(() => {
    const handleUnload = () => {
      audioEngine.dispose();
      ttsEngine.abort();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      audioEngine.dispose();
      ttsEngine.abort();
    };
  }, []);

  // Prepare portable reference audio in background safely when audio is loaded
  const preparePortableReference = async (decodedBuffer) => {
    try {
      const refArtifact = await AudioResampler.preparePortableReferenceWav(decodedBuffer, 22);
      setReferenceAudio(refArtifact);
      setHasUnsavedProfileChanges(true);
    } catch {
      // Non-fatal fallback
    }
  };

  // 1. Handle file upload & automatic voice analysis (Voice Changer mode)
  const handleFileLoaded = async (file) => {
    audioEngine.abortCurrentJob();
    try {
      const safeDisplay = sanitizeFilename(file.name.replace(/\.[^/.]+$/, ''), 'Audio');
      showToast(`Analyzing "${safeDisplay}" in session memory...`, 'info');
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await audioEngine.decodeAudio(arrayBuffer);
      const profile = VoiceProfileEngine.analyze(decoded, file);

      setOriginalBuffer(decoded);
      setOriginalAnalysis(profile.detected);
      setRecommendedSettings(profile.recommendedSettings);

      // Automatically apply clean initial recommended settings
      setSettings(profile.recommendedSettings);
      setActivePresetId(null);
      setProcessedBuffer(null);
      setProcessedAnalysis(null);
      setActiveAB('A');

      // Generate portable 24kHz WAV reference + SHA-256 checksum
      await preparePortableReference(decoded);

      showToast(`Analyzed ${profile.detected.formattedDuration} audio & prepared Universal Reference WAV!`, 'success');
    } catch (err) {
      console.error('File load error:', err);
      showToast(err.message || 'Failed to decode audio file.', 'error');
    }
  };

  // Reference audio upload triggered directly from TTS Replication Wizard
  const handleUploadReferenceFromTts = async (file) => {
    try {
      const buf = await file.arrayBuffer();
      const decoded = await audioEngine.decodeAudio(buf);
      await preparePortableReference(decoded);
      showToast(`Reference speaker clip prepared (${Math.min(22, decoded.duration).toFixed(1)}s 24kHz WAV, SHA-256 hashed).`, 'success');
    } catch (err) {
      showToast(err.message || 'Could not decode reference audio file.', 'error');
    }
  };

  // 2. Load demo spoken sample with automatic acoustic analysis
  const handleLoadDemoSpeech = async () => {
    try {
      const ctx = audioEngine.getAudioContext();
      const demoBuffer = generateSpeechSample(ctx);
      const profile = VoiceProfileEngine.analyze(demoBuffer, {
        name: 'Demo_Speech_Phrase.wav',
        type: 'audio/wav',
        size: demoBuffer.length * 4,
      });

      setOriginalBuffer(demoBuffer);
      setOriginalAnalysis(profile.detected);
      setRecommendedSettings(profile.recommendedSettings);
      setSettings(profile.recommendedSettings);
      setActivePresetId(null);
      setProcessedBuffer(null);
      setProcessedAnalysis(null);
      setActiveAB('A');

      await preparePortableReference(demoBuffer);
      showToast('Loaded demo phrase with automatic voice analysis & Universal Profile reference!', 'success');
    } catch (err) {
      console.error('Demo load error:', err);
      showToast('Failed to generate demo sample.', 'error');
    }
  };

  // 3. Clear audio from memory
  const handleClearAudio = () => {
    audioEngine.abortCurrentJob();
    ttsEngine.abort();
    setOriginalBuffer(null);
    setOriginalAnalysis(null);
    setRecommendedSettings(null);
    setProcessedBuffer(null);
    setProcessedAnalysis(null);
    setReferenceAudio(null);
    setImportedSummary(null);
    setActiveAB('A');
    showToast('Session memory cleared. Audio buffers & reference identity released.', 'info');
  };

  // 4. Apply / Reset to Recommended Settings
  const handleApplyRecommended = () => {
    if (recommendedSettings) {
      audioEngine.abortCurrentJob();
      setSettings({ ...recommendedSettings });
      setActivePresetId(null);
      showToast('Restored automatically recommended voice settings.', 'info');
    }
  };

  // 5. Fast Preview of Recommended Settings
  const handlePreviewRecommended = async () => {
    if (!originalBuffer || !recommendedSettings) return;

    try {
      setIsProcessing(true);
      setIsPreviewing(true);
      setProcessingProgress(15);
      setProcessingStage('Slicing preview segment & applying recommended DSP...');

      const previewSlice = audioEngine.sliceBuffer(originalBuffer, 7.0);
      const result = await audioEngine.process(
        previewSlice,
        recommendedSettings,
        (pct) => {
          setProcessingProgress(pct);
          setProcessingStage(`Rendering recommended voice: ${pct}%...`);
        },
        true
      );

      const safeCharacterName = sanitizeFilename(characterName, 'Recommended');
      const analysis = AudioAnalyzer.analyze(result, {
        name: `${safeCharacterName}_Recommended_Preview.wav`,
        type: 'audio/wav',
        size: result.length * result.numberOfChannels * 4,
      });

      setProcessedBuffer(result);
      setProcessedAnalysis(analysis);
      setActiveAB('B');
      showToast('Previewing recommended voice profile!', 'success');
    } catch (err) {
      if (err.message?.includes('cancelled')) showToast('Processing cancelled.', 'info');
      else showToast(`Processing error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setIsPreviewing(false);
    }
  };

  // Estimated Universal JSON byte size for UI preview before download
  const estimatedJsonSizeBytes = useMemo(() => {
    const baseBytes = 4200;
    const refB64Len = referenceAudio?.data ? referenceAudio.data.length : 0;
    return baseBytes + refB64Len;
  }, [referenceAudio]);

  // 6. Download Universal Voice Profile v2.0 JSON (shared across both modes!)
  const handleDownloadProfileJson = (isUniversalFilename = true) => {
    try {
      const jsonStr = VoiceProfileEngine.generateUniversalProfileJson({
        profileName: characterName,
        analysis: originalAnalysis,
        recommendedSettings: recommendedSettings || settings,
        currentSettings: settings,
        referenceAudio,
        providerVoiceIds,
        ttsConfig,
        geminiConfigured: serverStatus.geminiConfigured,
      });

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const safeName = sanitizeFilename(characterName, 'AbhiVoiceChanger');
      const filename = isUniversalFilename
        ? `${safeName}_UniversalVoiceProfile.json`
        : `${safeName}_VoiceProfile.json`;

      Exporters.triggerDownload(blob, filename);
      setHasUnsavedProfileChanges(false);
      showToast(`Downloaded ${filename} locally (${(blob.size / 1024).toFixed(1)} KB).`, 'success');
    } catch (err) {
      console.error('JSON export error:', err);
      showToast('Failed to export Universal Voice Profile JSON.', 'error');
    }
  };

  // 7. Import Universal v2.0 OR Legacy v1.0 JSON Profile into active mode
  const handleImportProfileJson = async (file) => {
    try {
      if (!file) return;
      const text = await file.text();
      const res = await VoiceProfileEngine.validateAndParseUniversalProfileJson(text);
      if (!res.success) {
        showToast(res.error || 'Invalid or unsupported voice profile.', 'error');
        return;
      }

      const imported = res.data;
      setSettingsState(imported.settings);
      if (imported.characterName) setCharacterNameState(imported.characterName);
      if (imported.recommendedSettings) setRecommendedSettings(imported.recommendedSettings);
      if (imported.analysis && !originalAnalysis) setOriginalAnalysis(imported.analysis);
      if (imported.referenceAudio) setReferenceAudio(imported.referenceAudio);
      if (imported.providerVoiceIds) setProviderVoiceIds(imported.providerVoiceIds);

      if (imported.ttsConfig) {
        setTtsConfigState((prev) => {
          const next = {
            ...prev,
            ...Object.fromEntries(Object.entries(imported.ttsConfig).filter(([, v]) => v !== null)),
          };
          // Keep Kokoro honesty: if server lacks GEMINI_API_KEY and user hasn't set Gemini, keep safe engine switch notice
          if (!serverStatus.geminiConfigured && next.engine === 'gemini') {
            next.engine = 'kokoro';
            if (!['en-US', 'en-GB'].includes(next.language)) next.language = 'en-US';
          }
          return next;
        });
      }

      setImportedSummary({
        characterName: imported.characterName,
        profileVersion: imported.profileVersion,
        isUniversalV2: imported.isUniversalV2,
        restoredFilterCount: imported.restoredFilterCount,
        referenceAudio: Boolean(imported.referenceAudio),
        checksumStatus: imported.checksumStatus,
      });

      setHasUnsavedProfileChanges(false);
      setActivePresetId(null);
      showToast(
        imported.referenceAudio
          ? `Voice profile imported successfully (${imported.restoredFilterCount} filters + SHA-256 Verified Reference WAV)!`
          : `Voice profile imported successfully (${imported.restoredFilterCount} filters restored).`,
        'success'
      );
    } catch {
      showToast('Invalid or unsupported voice profile.', 'error');
    }
  };

  // 8. Select Character Preset (Voice Changer mode)
  const handleSelectPreset = (preset) => {
    setSettings({ ...DEFAULT_VOICE_SETTINGS, ...preset.settings });
    setActivePresetId(preset.id);
    if (preset.characterName) setCharacterName(preset.characterName);
    showToast(`Applied preset: ${preset.name}. Click Preview to hear the change.`, 'info');
  };

  // 9. Reset DSP Settings (Neutral Defaults)
  const handleResetSettings = () => {
    audioEngine.abortCurrentJob();
    setSettings(DEFAULT_VOICE_SETTINGS);
    setActivePresetId(null);
    showToast('All 16 audio filters restored to neutral defaults.', 'info');
  };

  // 10. Fast Preview (Processes short ~7 second segment)
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
          setProcessingStage(pct < 70 ? `Pitch & time stretching: ${pct}%...` : `Vocal formant & acoustic DSP: ${pct}%...`);
        },
        true
      );

      const safeCharacterName = sanitizeFilename(characterName, 'Character');
      const analysis = AudioAnalyzer.analyze(result, {
        name: `${safeCharacterName}_Preview.wav`,
        type: 'audio/wav',
        size: result.length * result.numberOfChannels * 4,
      });

      setProcessedBuffer(result);
      setProcessedAnalysis(analysis);
      setActiveAB('B');
      showToast('Preview processed! Playing transformed voice.', 'success');
    } catch (err) {
      if (err.message?.includes('cancelled')) showToast('Processing cancelled.', 'info');
      else showToast(`Processing error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setIsPreviewing(false);
    }
  };

  // 11. Process Full Audio
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
          setProcessingStage(pct < 75 ? `Processing pitch & rate: ${pct}%...` : `Rendering 16-stage DSP FX: ${pct}%...`);
        },
        false
      );

      const safeCharacterName = sanitizeFilename(characterName, 'Character');
      const analysis = AudioAnalyzer.analyze(result, {
        name: `${safeCharacterName}_Processed.wav`,
        type: 'audio/wav',
        size: result.length * result.numberOfChannels * 4,
      });

      setProcessedBuffer(result);
      setProcessedAnalysis(analysis);
      setActiveAB('B');
      showToast('Full recording processed successfully! Ready to export.', 'success');
    } catch (err) {
      if (err.message?.includes('cancelled')) showToast('Processing cancelled.', 'info');
      else showToast(`Processing error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setIsPreviewing(false);
    }
  };

  // 12. Download WAV / MP3
  const handleDownloadWav = () => {
    if (!processedBuffer) return;
    setIsExporting(true);
    try {
      const safeName = sanitizeFilename(characterName, 'Voice');
      const filename = `${safeName}_Processed.wav`;
      const wavBlob = Exporters.audioBufferToWavBlob(processedBuffer);
      Exporters.triggerDownload(wavBlob, filename);
      showToast(`Downloaded: ${filename}`, 'success');
    } catch (err) {
      showToast(`WAV export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadMp3 = () => {
    if (!processedBuffer) return;
    setIsExporting(true);
    try {
      const safeName = sanitizeFilename(characterName, 'Voice');
      const filename = `${safeName}_Processed.mp3`;
      const mp3Blob = Exporters.audioBufferToMp3Blob(processedBuffer, 192);
      Exporters.triggerDownload(mp3Blob, filename);
      showToast(`Downloaded: ${filename}`, 'success');
    } catch (err) {
      showToast(`MP3 export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app-container">
      {/* Left Sidebar / Off-canvas drawer */}
      <Sidebar
        activeMode={activeMode}
        onModeChange={setActiveMode}
        originalDuration={originalBuffer ? originalBuffer.duration : 0}
        hasUniversalIdentity={Boolean(referenceAudio?.data)}
        isProcessing={isProcessing}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Studio Viewport */}
      <main className="main-content">
        <Header
          activeMode={activeMode}
          onModeChange={setActiveMode}
          characterName={characterName}
          onCharacterNameChange={setCharacterName}
          onResetSettings={handleResetSettings}
          onClearAudio={handleClearAudio}
          hasAudio={Boolean(originalBuffer || referenceAudio)}
          hasUnsavedProfileChanges={hasUnsavedProfileChanges}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <div className="studio-main-container">
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
              padding: '10px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.8rem',
              color: toast.type === 'error' ? '#fb7185' : toast.type === 'success' ? '#34d399' : '#38bdf8'
            }}>
              {toast.type === 'error' && <AlertTriangle size={16} style={{ flexShrink: 0 }} />}
              {toast.type === 'success' && <CheckCircle size={16} style={{ flexShrink: 0 }} />}
              {toast.type === 'info' && <Info size={16} style={{ flexShrink: 0 }} />}
              <span>{toast.message}</span>
            </div>
          )}

          {activeMode === 'voice-changer' ? (
            <>
              {/* Audio Uploader */}
              <AudioUploader
                onFileLoaded={handleFileLoaded}
                onLoadDemoSpeech={handleLoadDemoSpeech}
                isProcessing={isProcessing}
              />

              {/* Universal Voice Identity Profile v2.0 Cross-Mode Card */}
              <UniversalProfileSummaryCard
                mode="voice-changer"
                profileName={characterName}
                referenceAudio={referenceAudio}
                importedSummary={importedSummary}
                providerVoiceIds={providerVoiceIds}
                hasUnsavedChanges={hasUnsavedProfileChanges}
                estimatedJsonSizeBytes={estimatedJsonSizeBytes}
                audioEngine={audioEngine}
                onDownloadUniversalJson={() => handleDownloadProfileJson(true)}
                onImportUniversalJson={handleImportProfileJson}
              />

              {/* Automatic Voice Analysis & Recommended Initial Settings */}
              <VoiceProfilePanel
                analysis={originalAnalysis}
                recommendedSettings={recommendedSettings}
                currentSettings={settings}
                characterName={characterName}
                onApplyRecommended={handleApplyRecommended}
                onPreviewRecommended={handlePreviewRecommended}
                onDownloadProfileJson={() => handleDownloadProfileJson(false)}
                onImportProfileJson={handleImportProfileJson}
                isProcessing={isProcessing}
                isPreviewing={isPreviewing}
              />

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

              {/* 16 Shared Audio Controls Sliders */}
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
            </>
          ) : (
            <TtsStudio
              audioEngine={audioEngine}
              serverStatus={serverStatus}
              settings={settings}
              onSettingsChange={setSettings}
              onResetDspFilters={handleResetSettings}
              characterName={characterName}
              referenceAudio={referenceAudio}
              providerVoiceIds={providerVoiceIds}
              importedSummary={importedSummary}
              hasUnsavedChanges={hasUnsavedProfileChanges}
              estimatedJsonSizeBytes={estimatedJsonSizeBytes}
              ttsConfig={ttsConfig}
              onTtsConfigChange={setTtsConfig}
              onDownloadUniversalJson={() => handleDownloadProfileJson(true)}
              onImportUniversalJson={handleImportProfileJson}
              onUploadReferenceFile={handleUploadReferenceFromTts}
              onVoiceReplicated={(rep) => {
                setProviderVoiceIds((prev) => ({ ...prev, ...rep }));
                setHasUnsavedProfileChanges(true);
              }}
              onToast={showToast}
            />
          )}
        </div>

        {/* Professional Footer */}
        <Footer />
      </main>
    </div>
  );
}
