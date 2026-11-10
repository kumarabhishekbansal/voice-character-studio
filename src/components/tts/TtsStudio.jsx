import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  Loader2,
  Download,
  Sliders,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import UniversalProfileSummaryCard from '../UniversalProfileSummaryCard';
import TtsPresetsBar from './TtsPresetsBar';
import TtsVoiceReplicationModal from './TtsVoiceReplicationModal';
import TtsScriptEditor from './TtsScriptEditor';
import WaveformPlayer from '../WaveformPlayer';
import VoiceControls from '../VoiceControls';
import ActionToolbar from '../ActionToolbar';
import ComparisonBar from '../ComparisonBar';

import { ttsEngine } from '../../engine/TtsEngine';
import { AudioAnalyzer } from '../../engine/AudioAnalyzer';
import { Exporters } from '../../engine/Exporters';
import { EmotionAnalyzer } from '../../engine/EmotionAnalyzer';
import { DEFAULT_VOICE_SETTINGS } from '../../constants/presets';
import { KOKORO_VOICES, GEMINI_PREBUILT_VOICES } from '../../constants/ttsConfig';
import { sanitizeFilename } from '../../utils/security';

export default function TtsStudio({
  audioEngine,
  serverStatus,
  settings,
  onSettingsChange,
  onResetDspFilters,
  characterName,
  referenceAudio,
  providerVoiceIds,
  importedSummary,
  hasUnsavedChanges,
  estimatedJsonSizeBytes,
  ttsConfig,
  onTtsConfigChange,
  onDownloadUniversalJson,
  onImportUniversalJson,
  onUploadReferenceFile,
  onVoiceReplicated,
  onToast,
}) {
  const geminiConfigured = Boolean(serverStatus?.geminiConfigured);

  // Extended voice catalog fetched optionally from Gemini /api/voices
  const [extendedVoices, setExtendedVoices] = useState([]);

  // User must explicitly acknowledge sending text to external Gemini API before generation
  const [cloudConsentAccepted, setCloudConsentAccepted] = useState(false);

  // Script & Segment state (in-memory only, excluded from profile export)
  const [rawScript, setRawScript] = useState(
    'That night, everything seemed calm and peaceful.\n\nSuddenly, I heard someone screaming behind me!'
  );
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [activeTtsPresetId, setActiveTtsPresetId] = useState(null);

  const [segments, setSegments] = useState([
    {
      id: 'seg_init_1',
      speakerId: ttsConfig.speakers?.[0]?.id || 'narrator',
      text: 'That night, everything seemed calm and peaceful.',
      emotion: 'calm',
      intensity: 'subtle',
      style: 'storytelling',
      speed: 1.0,
      pitchPreference: 0,
      pauseAfterMs: 550,
      recommendation: EmotionAnalyzer.recommendEmotion('That night, everything seemed calm and peaceful.'),
    },
    {
      id: 'seg_init_2',
      speakerId: ttsConfig.speakers?.[0]?.id || 'narrator',
      text: 'Suddenly, I heard someone screaming behind me!',
      emotion: 'fearful',
      intensity: 'moderate',
      style: 'dramatic',
      speed: 1.0,
      pitchPreference: 0,
      pauseAfterMs: 550,
      recommendation: EmotionAnalyzer.recommendEmotion('Suddenly, I heard someone screaming behind me!'),
    },
  ]);

  // Generation progress & results
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ pct: 0, stage: '' });
  const [lastApiError, setLastApiError] = useState(null);

  // Generated Stage 1 Original Speech vs Stage 2 Filtered Speech
  const [generatedBuffer, setGeneratedBuffer] = useState(null);
  const [generatedAnalysis, setGeneratedAnalysis] = useState(null);
  const [segmentOutputs, setSegmentOutputs] = useState([]);

  const [processedBuffer, setProcessedBuffer] = useState(null);
  const [processedAnalysis, setProcessedAnalysis] = useState(null);
  const [isProcessingDsp, setIsProcessingDsp] = useState(false);
  const [isPreviewingDsp, setIsPreviewingDsp] = useState(false);
  const [dspProgress, setDspProgress] = useState(0);
  const [dspStage, setDspStage] = useState('');
  const [activeAB, setActiveAB] = useState('A');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch extended Gemini voices once if GEMINI_API_KEY is configured on server
  useEffect(() => {
    if (geminiConfigured) {
      ttsEngine.fetchGeminiVoices().then((res) => {
        if (res?.voices?.length > 0) setExtendedVoices(res.voices);
      });
    }
  }, [geminiConfigured]);

  // Switch engine cleanly and align default voice IDs so voices are never mismatched
  const handleEngineChange = (nextEngine) => {
    setLastApiError(null);
    const currentSpeakers = ttsConfig.speakers || [{ id: 'narrator', name: 'Narrator', voiceId: 'Kore' }];
    const alignedSpeakers = currentSpeakers.map((sp) => {
      if (nextEngine === 'kokoro') {
        const isValidK = KOKORO_VOICES.some((v) => v.id === sp.voiceId);
        return { ...sp, voiceId: isValidK ? sp.voiceId : 'af_heart' };
      }
      const isValidG = GEMINI_PREBUILT_VOICES.some((v) => v.id === sp.voiceId) ||
        String(sp.voiceId).startsWith('voice');
      return { ...sp, voiceId: isValidG ? sp.voiceId : 'Kore' };
    });

    const nextLanguage = nextEngine === 'kokoro' && !['en-US', 'en-GB'].includes(ttsConfig.language)
      ? 'en-US'
      : ttsConfig.language;

    onTtsConfigChange({
      ...ttsConfig,
      engine: nextEngine,
      language: nextLanguage,
      speakers: alignedSpeakers,
      voiceId: alignedSpeakers[0]?.voiceId || (nextEngine === 'kokoro' ? 'af_heart' : 'Kore'),
    });
  };

  // Apply editable TTS Preset (and sync suggested DSP filter baseline)
  const handleSelectTtsPreset = (preset) => {
    setActiveTtsPresetId(preset.id);
    const engine = ttsConfig.engine;
    const recVoice = engine === 'kokoro' ? preset.recommendedKokoroVoice : preset.recommendedGeminiVoice;

    // Update segments' default emotion/style/speed while keeping text intact
    setSegments((prev) =>
      prev.map((s) => ({
        ...s,
        emotion: preset.emotion,
        intensity: preset.intensity,
        style: preset.style,
        speed: preset.speed,
      }))
    );

    const updatedSpeakers = (ttsConfig.speakers || []).map((sp, i) =>
      i === 0 && !String(sp.voiceId).startsWith('voice') ? { ...sp, voiceId: recVoice } : sp
    );

    onTtsConfigChange({
      ...ttsConfig,
      defaultEmotion: preset.emotion,
      emotionIntensity: preset.intensity,
      speakingStyle: preset.style,
      speed: preset.speed,
      voiceId: updatedSpeakers[0]?.voiceId || recVoice,
      speakers: updatedSpeakers,
    });

    if (preset.filterOverrides) {
      onSettingsChange({
        ...DEFAULT_VOICE_SETTINGS,
        ...preset.filterOverrides,
      });
    }

    onToast(`Applied "${preset.name}" preset (editable across all segments & DSP filters).`, 'info');
  };

  // When a Gemini Replicated Voice completes, bind it automatically to primary Speaker 1!
  const handleVoiceReplicatedSuccess = (repInfo) => {
    onVoiceReplicated(repInfo);
    const voiceToken = repInfo.geminiVoiceKey || repInfo.geminiVoiceId;
    if (voiceToken) {
      const nextSpeakers = (ttsConfig.speakers || []).map((sp, i) =>
        i === 0 ? { ...sp, voiceId: voiceToken } : sp
      );
      onTtsConfigChange({
        ...ttsConfig,
        engine: 'gemini',
        voiceId: voiceToken,
        speakers: nextSpeakers,
      });
    }
  };

  // Preview a single speaker voice cleanly
  const handlePreviewVoice = async (speakerObj) => {
    if (ttsConfig.engine === 'browser-fallback') {
      try {
        ttsEngine.playBrowserFallback(
          `Hello! I am ${speakerObj.name}. This is a live fallback preview.`,
          { speed: 1.0, lang: ttsConfig.language }
        );
        onToast(`Playing OS fallback preview for ${speakerObj.name}.`, 'info');
      } catch (err) {
        onToast(err.message, 'error');
      }
      return;
    }

    if (ttsConfig.engine === 'gemini' && !cloudConsentAccepted) {
      onToast('Please accept External API Privacy Consent above before sending preview text to Gemini.', 'error');
      return;
    }

    setLastApiError(null);
    setIsGenerating(true);
    setGenProgress({ pct: 20, stage: `Synthesizing voice preview for ${speakerObj.name}...` });
    try {
      const ctx = audioEngine.getAudioContext();
      const res = await ttsEngine.generateScript({
        engine: ttsConfig.engine,
        model: ttsConfig.model,
        segments: [
          {
            id: 'voice_preview',
            speakerId: speakerObj.id,
            text: ttsConfig.language === 'hi-IN'
              ? `नमस्ते! मैं ${speakerObj.name} हूँ, यह मेरी आवाज़ का प्रीव्यू है।`
              : `Hi, I'm ${speakerObj.name}. This is a preview of my natural speaking voice.`,
            emotion: ttsConfig.defaultEmotion || 'neutral',
            intensity: ttsConfig.emotionIntensity || 'moderate',
            style: ttsConfig.speakingStyle || 'normal-conversation',
            speed: ttsConfig.speed || 1.0,
          },
        ],
        speakers: [speakerObj],
        language: ttsConfig.language,
        accent: ttsConfig.accent,
        audioCtx: ctx,
        onModelProgress: ({ stage, pct }) => setGenProgress({ pct, stage }),
      });

      const analysis = AudioAnalyzer.analyze(res.combinedBuffer, {
        name: `${speakerObj.name}_Voice_Preview.wav`,
        size: res.combinedBuffer.length * 4,
      });
      setGeneratedBuffer(res.combinedBuffer);
      setGeneratedAnalysis(analysis);
      setSegmentOutputs(res.segments);
      setProcessedBuffer(null);
      setProcessedAnalysis(null);
      setActiveAB('A');
      onToast(`Voice preview ready for ${speakerObj.name}! Press Play below.`, 'success');
    } catch (err) {
      setLastApiError(err.message);
      onToast(err.message || 'Voice preview failed.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Preview single segment
  const handlePreviewSegment = async (seg, index) => {
    await runGeneration([seg], `segment ${index + 1}`);
  };

  // Generate complete timeline
  const handleGenerateComplete = async () => {
    await runGeneration(segments, 'complete script');
  };

  const runGeneration = async (targetSegments, label) => {
    if (ttsConfig.engine === 'browser-fallback') {
      const joined = targetSegments.map((s) => s.text).join('. ');
      try {
        ttsEngine.playBrowserFallback(joined, {
          speed: targetSegments[0]?.speed || 1.0,
          lang: ttsConfig.language,
        });
        onToast('Playing OS Web Speech fallback live preview (cannot export WAV/MP3).', 'info');
      } catch (err) {
        onToast(err.message, 'error');
      }
      return;
    }

    if (ttsConfig.engine === 'gemini' && !cloudConsentAccepted) {
      onToast('Please check the External API Privacy Consent box before sending text to Google Gemini.', 'error');
      return;
    }

    setLastApiError(null);
    setIsGenerating(true);
    setGenProgress({ pct: 5, stage: `Preparing ${label} synthesis...` });

    try {
      const ctx = audioEngine.getAudioContext();
      const result = await ttsEngine.generateScript({
        engine: ttsConfig.engine,
        model: ttsConfig.model,
        segments: targetSegments,
        speakers: ttsConfig.speakers || [],
        pronunciationDictionary: ttsConfig.pronunciationDictionary || [],
        language: ttsConfig.language,
        accent: ttsConfig.accent,
        paragraphPauseMs: ttsConfig.paragraphPauseMs ?? 550,
        speakerSwitchPauseMs: ttsConfig.speakerSwitchPauseMs ?? 650,
        audioCtx: ctx,
        onProgress: ({ pct, stage }) => setGenProgress({ pct, stage }),
        onModelProgress: ({ pct, stage }) => setGenProgress({ pct, stage }),
      });

      const analysis = AudioAnalyzer.analyze(result.combinedBuffer, {
        name: `${sanitizeFilename(characterName, 'TTS')}_Original_Generated.wav`,
        size: result.combinedBuffer.length * 4,
      });

      setGeneratedBuffer(result.combinedBuffer);
      setGeneratedAnalysis(analysis);
      setSegmentOutputs(result.segments);
      setProcessedBuffer(null);
      setProcessedAnalysis(null);
      setActiveAB('A');
      onToast(`Generated ${analysis.formattedDuration} natural speech! Now apply DSP filters or download WAV/MP3.`, 'success');
    } catch (err) {
      if (err.message?.includes('cancelled') || err.name === 'AbortError') {
        onToast('Speech generation cancelled.', 'info');
      } else {
        setLastApiError(err.message);
        onToast(err.message || 'Speech generation failed.', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply the EXACT SAME AbhiVoiceChanger 16-Filter DSP Pipeline onto Generated Speech!
  const handleDspProcess = async (isPreviewSlice = false) => {
    if (!generatedBuffer) return;
    setIsProcessingDsp(true);
    setIsPreviewingDsp(isPreviewSlice);
    setDspProgress(10);
    setDspStage(isPreviewSlice ? 'Previewing DSP filters on first 7s...' : 'Applying 16-stage DSP pipeline to generated speech...');

    try {
      const input = isPreviewSlice ? audioEngine.sliceBuffer(generatedBuffer, 7.0) : generatedBuffer;
      const result = await audioEngine.process(
        input,
        settings,
        (pct) => {
          setDspProgress(pct);
          setDspStage(`Rendering AbhiVoiceChanger DSP: ${pct}%...`);
        },
        isPreviewSlice
      );

      const analysis = AudioAnalyzer.analyze(result, {
        name: `${sanitizeFilename(characterName, 'TTS')}_Processed.wav`,
        size: result.length * result.numberOfChannels * 4,
      });
      setProcessedBuffer(result);
      setProcessedAnalysis(analysis);
      setActiveAB('B');
      onToast('DSP filters applied to generated speech cleanly!', 'success');
    } catch (err) {
      onToast(err.message || 'DSP filtering failed.', 'error');
    } finally {
      setIsProcessingDsp(false);
      setIsPreviewingDsp(false);
    }
  };

  // Export Generated Original OR Processed WAV/MP3 (prefers Processed if rendered, else Original Generated!)
  const exportSourceBuffer = processedBuffer || generatedBuffer;

  const handleDownloadWav = () => {
    if (!exportSourceBuffer) return;
    setIsExporting(true);
    try {
      const safe = sanitizeFilename(characterName, 'AbhiVoice_TTS');
      const suffix = processedBuffer ? 'Processed' : 'Generated';
      const filename = `${safe}_${suffix}.wav`;
      const blob = Exporters.audioBufferToWavBlob(exportSourceBuffer);
      Exporters.triggerDownload(blob, filename);
      onToast(`Downloaded ${filename}`, 'success');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadMp3 = () => {
    if (!exportSourceBuffer) return;
    setIsExporting(true);
    try {
      const safe = sanitizeFilename(characterName, 'AbhiVoice_TTS');
      const suffix = processedBuffer ? 'Processed' : 'Generated';
      const filename = `${safe}_${suffix}.mp3`;
      const blob = Exporters.audioBufferToMp3Blob(exportSourceBuffer, 192);
      Exporters.triggerDownload(blob, filename);
      onToast(`Downloaded ${filename}`, 'success');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSegmentWav = (segOut) => {
    const blob = Exporters.audioBufferToWavBlob(segOut.audioBuffer);
    const filename = `${sanitizeFilename(characterName, 'TTS')}_Seg${segOut.index}_${sanitizeFilename(segOut.speakerName, 'Spk')}.wav`;
    Exporters.triggerDownload(blob, filename);
    onToast(`Downloaded ${filename}`, 'success');
  };

  return (
    <div>
      {/* 1. Shared Universal Voice Identity Profile Import / Export Card */}
      <UniversalProfileSummaryCard
        mode="tts"
        profileName={characterName}
        referenceAudio={referenceAudio}
        importedSummary={importedSummary}
        providerVoiceIds={providerVoiceIds}
        hasUnsavedChanges={hasUnsavedChanges}
        estimatedJsonSizeBytes={estimatedJsonSizeBytes}
        audioEngine={audioEngine}
        onDownloadUniversalJson={onDownloadUniversalJson}
        onImportUniversalJson={onImportUniversalJson}
      />

      {/* 2. Editable TTS Presets */}
      <TtsPresetsBar
        activePresetId={activeTtsPresetId}
        onSelectPreset={handleSelectTtsPreset}
      />

      {/* 3. Gemini Voice Replication Wizard (with mandatory Consent Clip) */}
      <TtsVoiceReplicationModal
        geminiConfigured={geminiConfigured}
        referenceAudio={referenceAudio}
        providerVoiceIds={providerVoiceIds}
        audioEngine={audioEngine}
        onUploadReferenceFile={onUploadReferenceFile}
        onVoiceReplicated={handleVoiceReplicatedSuccess}
        onToast={onToast}
      />

      {/* 4. Engine, Speakers, Pauses, Pronunciations & Segment Timeline Editor */}
      <TtsScriptEditor
        engine={ttsConfig.engine}
        onEngineChange={handleEngineChange}
        model={ttsConfig.model}
        onModelChange={(m) => onTtsConfigChange({ ...ttsConfig, model: m })}
        language={ttsConfig.language}
        onLanguageChange={(l) => onTtsConfigChange({ ...ttsConfig, language: l })}
        accent={ttsConfig.accent}
        onAccentChange={(a) => onTtsConfigChange({ ...ttsConfig, accent: a })}
        geminiConfigured={geminiConfigured}
        cloudConsentAccepted={cloudConsentAccepted}
        onCloudConsentChange={setCloudConsentAccepted}
        rawScript={rawScript}
        onRawScriptChange={setRawScript}
        segments={segments}
        onSegmentsChange={(nextSegs) => {
          setSegments(nextSegs);
          if (nextSegs[0]) {
            onTtsConfigChange({
              ...ttsConfig,
              defaultEmotion: nextSegs[0].emotion,
              emotionIntensity: nextSegs[0].intensity,
              speakingStyle: nextSegs[0].style,
              speed: nextSegs[0].speed,
            });
          }
        }}
        speakers={ttsConfig.speakers || []}
        onSpeakersChange={(spks) =>
          onTtsConfigChange({
            ...ttsConfig,
            speakers: spks,
            voiceId: spks[0]?.voiceId || ttsConfig.voiceId,
          })
        }
        extendedVoices={extendedVoices}
        replicatedVoice={providerVoiceIds}
        autoDetectEnabled={autoDetectEnabled}
        onAutoDetectToggle={setAutoDetectEnabled}
        paragraphPauseMs={ttsConfig.paragraphPauseMs ?? 550}
        onParagraphPauseChange={(v) => onTtsConfigChange({ ...ttsConfig, paragraphPauseMs: v })}
        speakerSwitchPauseMs={ttsConfig.speakerSwitchPauseMs ?? 650}
        onSpeakerSwitchPauseChange={(v) => onTtsConfigChange({ ...ttsConfig, speakerSwitchPauseMs: v })}
        pronunciationDict={ttsConfig.pronunciationDictionary || []}
        onPronunciationDictChange={(d) => onTtsConfigChange({ ...ttsConfig, pronunciationDictionary: d })}
        onPreviewVoice={handlePreviewVoice}
        onPreviewSegment={handlePreviewSegment}
        isGenerating={isGenerating}
        isPreviewingAudio={isProcessingDsp}
        lastApiError={lastApiError}
      />

      {/* 5. Generate Complete Speech Action Bar */}
      <div className="studio-card" style={{ marginBottom: '20px', borderColor: 'rgba(139, 92, 246, 0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary action-btn"
              onClick={handleGenerateComplete}
              disabled={isGenerating}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                fontWeight: 700,
                minHeight: '42px',
              }}
            >
              {isGenerating ? <Loader2 size={17} className="pulse-indicator" /> : <Sparkles size={17} />}
              <span>{isGenerating ? 'Generating Speech...' : 'Generate Complete Speech'}</span>
            </button>

            {isGenerating && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => ttsEngine.abort()}
                style={{ color: 'var(--accent-rose)', borderColor: 'var(--accent-rose)', minHeight: '42px' }}
              >
                <Square size={14} /> Cancel
              </button>
            )}
          </div>

          {isGenerating && (
            <div className="action-progress-wrapper">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{genProgress.stage}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#a78bfa', fontWeight: 600 }}>
                    {genProgress.pct}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${genProgress.pct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #00d2ff)',
                    transition: 'width 0.15s ease',
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. GENERATED ORIGINAL SPEECH PLAYER + INDIVIDUAL SEGMENT DOWNLOADS */}
      {generatedBuffer && (
        <div style={{ marginBottom: '20px' }}>
          <WaveformPlayer
            title="GENERATED ORIGINAL SPEECH"
            subtitle="Raw neural TTS synthesis before post-processing DSP"
            badgeText={ttsConfig.engine === 'kokoro' ? 'Kokoro-82M Neural' : 'Gemini 3.8 TTS'}
            badgeType="cyan"
            audioBuffer={generatedBuffer}
            waveformPeaks={generatedAnalysis ? generatedAnalysis.waveformPeaks : null}
            accentColor="#00d2ff"
            audioEngine={audioEngine}
          />

          {segmentOutputs.length > 1 && (
            <div className="studio-card" style={{ marginTop: '-8px', padding: '12px 16px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Individual Segment WAV Downloads
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {segmentOutputs.map((segOut) => (
                  <button
                    key={segOut.id}
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleDownloadSegmentWav(segOut)}
                    style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                  >
                    <Download size={12} color="#34d399" />
                    <span>Seg {segOut.index} ({segOut.speakerName})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. REUSE SHARED 16-FILTER ABHIVOICECHANGER DSP PIPELINE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={16} color="var(--accent-cyan)" />
          <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff' }}>
            Post-Processing Audio Filters (Shared 16-Stage Studio DSP)
          </h4>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onResetDspFilters}
          style={{ padding: '5px 12px', fontSize: '0.74rem' }}
        >
          <RotateCcw size={13} /> Reset Filters
        </button>
      </div>

      <VoiceControls settings={settings} onChange={onSettingsChange} />

      <ActionToolbar
        onPreview={() => handleDspProcess(true)}
        onProcessFull={() => handleDspProcess(false)}
        isProcessing={isProcessingDsp}
        processingProgress={dspProgress}
        processingStage={dspStage}
        hasAudio={Boolean(generatedBuffer)}
        isPreviewing={isPreviewingDsp}
        hasProcessedAudio={Boolean(processedBuffer)}
      />

      {/* 8. PROCESSED SPEECH PLAYER */}
      {processedBuffer && (
        <WaveformPlayer
          title="PROCESSED SPEECH"
          subtitle={isPreviewingDsp ? 'Filtered 7s Preview' : 'Final Mastered Speech Output'}
          badgeText={`${characterName || 'Voice'} • Filtered`}
          badgeType="emerald"
          audioBuffer={processedBuffer}
          waveformPeaks={processedAnalysis ? processedAnalysis.waveformPeaks : null}
          accentColor="#10b981"
          audioEngine={audioEngine}
        />
      )}

      {/* 9. ORIGINAL GENERATED VS PROCESSED COMPARISON + WAV/MP3 DOWNLOAD */}
      <ComparisonBar
        onDownloadWav={handleDownloadWav}
        onDownloadMp3={handleDownloadMp3}
        hasProcessedAudio={Boolean(exportSourceBuffer)}
        activeAB={activeAB}
        onToggleAB={setActiveAB}
        characterName={characterName}
        isExporting={isExporting}
      />
    </div>
  );
}
