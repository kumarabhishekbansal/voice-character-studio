import React, { useState, useRef } from 'react';
import {
  Languages,
  Users,
  Plus,
  Trash2,
  Wand2,
  Volume2,
  Scissors,
  ArrowUp,
  ArrowDown,
  Merge,
  BookOpen,
  Play,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';
import {
  TTS_ENGINES,
  TTS_EMOTIONS,
  EMOTION_INTENSITIES,
  SPEAKING_STYLES,
  TTS_LANGUAGES,
  TTS_ACCENTS,
  INLINE_VOCAL_CUES,
  GEMINI_PREBUILT_VOICES,
  KOKORO_VOICES,
} from '../../constants/ttsConfig';
import { EmotionAnalyzer } from '../../engine/EmotionAnalyzer';
import { sanitizeFilename } from '../../utils/security';

export default function TtsScriptEditor({
  engine,
  onEngineChange,
  model,
  onModelChange,
  language,
  onLanguageChange,
  accent,
  onAccentChange,
  geminiConfigured,
  cloudConsentAccepted,
  onCloudConsentChange,
  rawScript,
  onRawScriptChange,
  segments,
  onSegmentsChange,
  speakers,
  onSpeakersChange,
  extendedVoices = [],
  replicatedVoice,
  autoDetectEnabled,
  onAutoDetectToggle,
  paragraphPauseMs,
  onParagraphPauseChange,
  speakerSwitchPauseMs,
  onSpeakerSwitchPauseChange,
  pronunciationDict,
  onPronunciationDictChange,
  onPreviewVoice,
  onPreviewSegment,
  isGenerating,
  isPreviewingAudio,
  lastApiError,
}) {
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newPron, setNewPron] = useState('');
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const scriptAreaRef = useRef(null);

  const isGemini = engine === 'gemini';
  const isKokoro = engine === 'kokoro';
  const isFallback = engine === 'browser-fallback';

  // Build available voice options strictly matching the selected engine's genuine capabilities
  const buildVoiceOptions = () => {
    if (isKokoro) {
      return KOKORO_VOICES
        .filter((v) => genderFilter === 'all' || v.gender.toLowerCase() === genderFilter)
        .map((v) => ({
          id: v.id,
          label: `${v.name} — ${v.gender} • ${v.tone}`,
        }));
    }

    const baseList = GEMINI_PREBUILT_VOICES
      .filter((v) => genderFilter === 'all' || v.gender.toLowerCase() === genderFilter)
      .map((v) => ({
        id: v.id,
        label: `${v.name} — ${v.gender} • ${v.tone}`,
      }));

    if (replicatedVoice?.geminiVoiceKey || replicatedVoice?.geminiVoiceId) {
      const token = replicatedVoice.geminiVoiceKey || replicatedVoice.geminiVoiceId;
      baseList.unshift({
        id: token,
        label: `★ Replicated Voice (${replicatedVoice.displayName || 'Custom Speaker'})`,
      });
    }

    for (const ev of extendedVoices) {
      if (!baseList.some((x) => x.id === ev.id)) {
        baseList.push({
          id: ev.id,
          label: `${ev.displayName} (${ev.languageCode || 'Multi'} • ${ev.gender || ''})`,
        });
      }
    }

    return baseList;
  };

  const voiceOptions = buildVoiceOptions();

  // Stats
  const totalWords = segments.reduce((acc, s) => acc + (s.text.trim() ? s.text.trim().split(/\s+/).length : 0), 0);
  const totalChars = segments.reduce((acc, s) => acc + s.text.length, 0);

  // Split bulk raw script into multi-segment cards
  const handleSplitBulkScript = () => {
    if (!rawScript.trim()) return;
    const newSegs = EmotionAnalyzer.splitScriptIntoSegments(
      rawScript,
      {
        autoDetect: autoDetectEnabled,
        pauseAfterMs: paragraphPauseMs,
      },
      speakers
    );
    if (newSegs.length > 0) {
      onSegmentsChange(newSegs);
    }
  };

  // Run Auto Emotion Recommendation across all segments
  const handleRunAutoRecommendations = () => {
    const updated = segments.map((seg) => {
      const rec = EmotionAnalyzer.recommendEmotion(seg.text);
      return {
        ...seg,
        recommendation: rec,
        ...(autoDetectEnabled
          ? {
              emotion: rec.primaryEmotion,
              intensity: rec.suggestedIntensity,
              style: rec.suggestedStyle,
            }
          : {}),
      };
    });
    onSegmentsChange(updated);
  };

  // Insert inline tag or emphasize selection inside raw script OR specific segment
  const insertIntoRawScript = (snippet, transformSelected = null) => {
    const el = scriptAreaRef.current;
    if (!el) {
      onRawScriptChange((rawScript || '') + (rawScript ? ' ' : '') + snippet);
      return;
    }
    const start = el.selectionStart ?? rawScript.length;
    const end = el.selectionEnd ?? rawScript.length;
    const selected = rawScript.slice(start, end);

    let nextText;
    if (transformSelected && selected.length > 0) {
      nextText = rawScript.slice(0, start) + transformSelected(selected) + rawScript.slice(end);
    } else {
      nextText = rawScript.slice(0, start) + snippet + rawScript.slice(end);
    }
    onRawScriptChange(nextText);
  };

  const updateSegment = (segId, patch) => {
    onSegmentsChange(
      segments.map((s) => (s.id === segId ? { ...s, ...patch } : s))
    );
  };

  const addEmptySegment = () => {
    onSegmentsChange([
      ...segments,
      {
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        speakerId: speakers[0]?.id || 'narrator',
        text: '',
        emotion: 'neutral',
        intensity: 'moderate',
        style: 'normal-conversation',
        speed: 1.0,
        pitchPreference: 0,
        pauseAfterMs: paragraphPauseMs,
        recommendation: null,
      },
    ]);
  };

  const splitSegment = (index) => {
    const seg = segments[index];
    if (!seg || seg.text.trim().length < 8) return;
    const sentences = seg.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [];
    let partA, partB;
    if (sentences.length >= 2) {
      const mid = Math.ceil(sentences.length / 2);
      partA = sentences.slice(0, mid).join(' ');
      partB = sentences.slice(mid).join(' ');
    } else {
      const half = Math.floor(seg.text.length / 2);
      const splitIdx = seg.text.indexOf(' ', half);
      const cut = splitIdx > 0 ? splitIdx : half;
      partA = seg.text.slice(0, cut).trim();
      partB = seg.text.slice(cut).trim();
    }
    if (!partB) return;

    const next = [...segments];
    next.splice(
      index,
      1,
      { ...seg, text: partA },
      {
        ...seg,
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: partB,
        recommendation: EmotionAnalyzer.recommendEmotion(partB),
      }
    );
    onSegmentsChange(next);
  };

  const combineWithNext = (index) => {
    if (index >= segments.length - 1) return;
    const next = [...segments];
    const a = next[index];
    const b = next[index + 1];
    next[index] = {
      ...a,
      text: `${a.text.trim()} ${b.text.trim()}`.trim(),
      recommendation: EmotionAnalyzer.recommendEmotion(`${a.text} ${b.text}`),
    };
    next.splice(index + 1, 1);
    onSegmentsChange(next);
  };

  const moveSegment = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= segments.length) return;
    const next = [...segments];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onSegmentsChange(next);
  };

  const removeSegment = (index) => {
    if (segments.length <= 1) return;
    onSegmentsChange(segments.filter((_, i) => i !== index));
  };

  const handleAddSpeaker = () => {
    const clean = sanitizeFilename(newSpeakerName, '').replace(/_/g, ' ').trim();
    if (!clean) return;
    if (speakers.length >= 10) return;
    onSpeakersChange([
      ...speakers,
      {
        id: `spk_${Date.now()}`,
        name: clean,
        voiceId: voiceOptions[0]?.id || (isKokoro ? 'af_heart' : 'Puck'),
      },
    ]);
    setNewSpeakerName('');
  };

  const handleAddPronunciation = () => {
    if (!newWord.trim() || !newPron.trim()) return;
    onPronunciationDictChange([
      ...pronunciationDict,
      { word: newWord.trim().slice(0, 64), pronunciation: newPron.trim().slice(0, 128) },
    ]);
    setNewWord('');
    setNewPron('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
      {/* 1. ENGINE, LANGUAGE, ACCENT & PRIVACY CONSENT */}
      <div className="studio-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={17} color="#a78bfa" />
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff' }}>
              Speech Synthesis Engine & Language
            </h4>
          </div>
          <span className="badge" style={{
            fontSize: '0.66rem',
            background: isGemini
              ? geminiConfigured ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)'
              : 'rgba(0, 210, 255, 0.14)',
            color: isGemini
              ? geminiConfigured ? '#34d399' : '#fbbf24'
              : '#38bdf8',
            border: '1px solid currentColor',
          }}>
            {isGemini
              ? geminiConfigured ? 'Gemini API Key Active on Server' : 'GEMINI_API_KEY Not Set on Vercel'
              : isKokoro
              ? '100% Free In-Browser Neural (Zero API Key)'
              : 'OS Fallback Preview Only'}
          </span>
        </div>

        {/* Engine, Model, Language, Accent Selectors */}
        <div className="tts-config-grid">
          <div className="tts-field">
            <label>Synthesis Engine Provider</label>
            <select
              className="tts-select"
              value={engine}
              onChange={(e) => onEngineChange(e.target.value)}
            >
              <option value="gemini">Google Gemini 3.8 TTS (Expressive 18 Emotions & Hindi)</option>
              <option value="kokoro">Kokoro-82M (Local Browser Neural • Free Offline English)</option>
              <option value="elevenlabs" disabled>ElevenLabs Adapter (Disabled — Future Optional Key)</option>
              <option value="browser-fallback">Browser Web Speech Fallback (Live Preview Only)</option>
            </select>
          </div>

          {isGemini && (
            <div className="tts-field">
              <label>Gemini Speech Model</label>
              <select
                className="tts-select"
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
              >
                {TTS_ENGINES.gemini.models.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="tts-field">
            <label>Language</label>
            <select
              className="tts-select"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
            >
              {TTS_LANGUAGES.map((l) => {
                const disabledInKokoro = isKokoro && l.geminiOnly;
                return (
                  <option key={l.id} value={l.id} disabled={disabledInKokoro}>
                    {l.label}{disabledInKokoro ? ' (Requires Gemini Key)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="tts-field">
            <label>Accent / Delivery Tone</label>
            <select
              className="tts-select"
              value={accent}
              onChange={(e) => onAccentChange(e.target.value)}
              disabled={!isGemini}
            >
              {TTS_ACCENTS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Missing Key OR Quota Notice OR Kokoro Capabilities Honesty Banner */}
        {isGemini && !geminiConfigured && (
          <div className="tts-alert tts-alert-amber" style={{ marginTop: '12px' }}>
            <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong>Server Configuration Needed for Cloud Gemini 3.8 TTS:</strong>{' '}
              <code>GEMINI_API_KEY</code> is not set in Vercel Project Settings &rarr; Environment Variables.
              Add a free-tier Google AI Studio API key on Vercel (never in frontend code or GitHub), OR switch immediately to our free in-browser local neural engine:
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                  onClick={() => onEngineChange('kokoro')}
                >
                  Use Local Kokoro-82M Neural (100% Free Now)
                </button>
              </div>
            </div>
          </div>
        )}

        {lastApiError && (
          <div className="tts-alert tts-alert-rose" style={{ marginTop: '12px' }}>
            <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong>Synthesis Notice:</strong> {lastApiError}
              {isGemini && (
                <div style={{ marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                    onClick={() => onEngineChange('kokoro')}
                  >
                    Switch to Local Kokoro-82M Offline Mode
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isKokoro && (
          <div className="tts-alert tts-alert-cyan" style={{ marginTop: '12px' }}>
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Local Neural Mode (Kokoro-82M ONNX):</strong> Runs 100% privately in your browser (downloads ~86 MB ONNX model cleanly from HuggingFace once). Produces genuine downloadable 24kHz WAV speech.
              <em> Honest Limitation:</em> Local Kokoro v1.0 supports English (US/UK) + speaking speed cleanly; the 18 neural emotions, Hindi/Hinglish, and custom voice replication require Cloud Gemini 3.8 TTS.
            </span>
          </div>
        )}

        {isFallback && (
          <div className="tts-alert tts-alert-amber" style={{ marginTop: '12px' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Fallback Live Preview Mode (<code>window.speechSynthesis</code>):</strong> Uses your OS built-in voice for live listening only. Does NOT produce natural emotional AI acting, cannot apply the 16 DSP filters, and cannot export WAV/MP3 files.
            </span>
          </div>
        )}

        {/* Explicit Script Transmission Privacy Consent for Cloud Gemini */}
        {isGemini && (
          <label style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '10px 12px',
            background: 'rgba(13, 19, 31, 0.75)',
            border: `1px solid ${cloudConsentAccepted ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-light)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
          }}>
            <input
              type="checkbox"
              checked={cloudConsentAccepted}
              onChange={(e) => onCloudConsentChange(e.target.checked)}
              style={{ marginTop: '2px', accentColor: '#10b981' }}
            />
            <span>
              <strong>External API Privacy Consent:</strong> I understand that clicking Generate sends my entered script text securely through AbhiVoiceChanger&apos;s Vercel API route to Google Gemini (API Free Tier terms apply: Google may use prompts/audio to improve products; generated audio is never saved in an AbhiVoiceChanger database).
            </span>
          </label>
        )}
      </div>

      {/* 2. SPEAKERS / CHARACTER ROSTER */}
      <div className="studio-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--accent-cyan)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
              Characters & Voices
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              className="tts-select"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              style={{ fontSize: '0.74rem', padding: '4px 8px' }}
              aria-label="Filter voices by gender"
            >
              <option value="all">All Genders</option>
              <option value="female">Female Voices</option>
              <option value="male">Male Voices</option>
            </select>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                className="tts-input"
                placeholder="New character (e.g. Ghost)"
                value={newSpeakerName}
                onChange={(e) => setNewSpeakerName(e.target.value.slice(0, 24))}
                style={{ width: '165px', fontSize: '0.76rem' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddSpeaker}
                disabled={!newSpeakerName.trim()}
                style={{ padding: '5px 10px', fontSize: '0.76rem' }}
              >
                <Plus size={14} /> Add Speaker
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '10px' }}>
          {speakers.map((sp, idx) => (
            <div key={sp.id} className="speaker-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                  {sp.name}
                </span>
                {speakers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onSpeakersChange(speakers.filter((x) => x.id !== sp.id))}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '2px' }}
                    title="Remove character"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select
                  className="tts-select"
                  value={sp.voiceId}
                  onChange={(e) => {
                    const val = e.target.value;
                    onSpeakersChange(speakers.map((x) => (x.id === sp.id ? { ...x, voiceId: val } : x)));
                  }}
                  style={{ flex: 1, fontSize: '0.76rem' }}
                >
                  {voiceOptions.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isGenerating || isPreviewingAudio}
                  onClick={() => onPreviewVoice(sp)}
                  style={{ padding: '6px 10px', fontSize: '0.74rem', flexShrink: 0 }}
                  title="Preview this character's voice"
                >
                  <Volume2 size={14} color="var(--accent-cyan)" />
                  <span>Preview</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SCRIPT COMPOSER + INLINE VOCAL CUES + SEGMENT TIMELINE */}
      <div className="studio-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Languages size={17} color="#34d399" />
            <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff' }}>
              Script & Multi-Segment Emotion Timeline
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
            <span>
              Total: <strong style={{ color: 'var(--text-main)' }}>{totalWords}</strong> words &bull;{' '}
              <strong style={{ color: 'var(--text-main)' }}>{totalChars}</strong> / 15,000 chars
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: autoDetectEnabled ? '#34d399' : 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={autoDetectEnabled}
                onChange={(e) => onAutoDetectToggle(e.target.checked)}
                style={{ accentColor: '#10b981' }}
              />
              Auto Detect Emotion
            </label>
          </div>
        </div>

        {/* Quick Raw Script Drafting & Auto-Split Tool */}
        <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
              Draft Full Script (Optional Auto-Split into Segments)
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary tts-cue-btn"
                onClick={() => insertIntoRawScript('', (sel) => sel.toUpperCase())}
                title="Capitalize selected word(s) for natural Gemini vocal stress"
              >
                Emphasize Selection
              </button>
              {INLINE_VOCAL_CUES.slice(0, 6).map((cue) => (
                <button
                  key={cue.id}
                  type="button"
                  className="btn btn-secondary tts-cue-btn"
                  disabled={!isGemini && cue.group === 'cue'}
                  onClick={() => insertIntoRawScript(` ${cue.tag} `)}
                  title={isGemini ? `Insert ${cue.tag}` : `${cue.tag} requires Gemini 3.8 TTS`}
                >
                  {cue.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            ref={scriptAreaRef}
            className="tts-textarea"
            rows={4}
            value={rawScript}
            onChange={(e) => onRawScriptChange(e.target.value.slice(0, 15000))}
            placeholder={`Write dialogue or multi-paragraph narration here...\nExample:\nNarrator: That night, everything seemed normal.\nFriend: Wait... did you hear someone screaming behind us!`}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPronunciation(!showPronunciation)}
              style={{ fontSize: '0.76rem', padding: '6px 12px' }}
            >
              <BookOpen size={14} color="var(--accent-amber)" />
              <span>Pauses & Pronunciation Dictionary ({pronunciationDict.length})</span>
              {showPronunciation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRunAutoRecommendations}
                style={{ fontSize: '0.76rem', padding: '6px 12px' }}
                title="Analyze context of every segment and recommend appropriate emotions"
              >
                <Wand2 size={14} color="#a78bfa" />
                <span>Recommend Emotions</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSplitBulkScript}
                disabled={!rawScript.trim()}
                style={{ fontSize: '0.76rem', padding: '6px 12px' }}
              >
                <Scissors size={14} />
                <span>Split Draft into Segments</span>
              </button>
            </div>
          </div>

          {/* Collapsible Pauses & Custom Pronunciation Dictionary */}
          {showPronunciation && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px' }}>
                <div className="tts-field">
                  <label>Default Pause Between Paragraphs ({paragraphPauseMs} ms)</label>
                  <input
                    type="range"
                    min="0"
                    max="3000"
                    step="50"
                    value={paragraphPauseMs}
                    onChange={(e) => onParagraphPauseChange(Number(e.target.value))}
                  />
                </div>
                <div className="tts-field">
                  <label>Pause Between Speakers ({speakerSwitchPauseMs} ms)</label>
                  <input
                    type="range"
                    min="0"
                    max="2500"
                    step="50"
                    value={speakerSwitchPauseMs}
                    onChange={(e) => onSpeakerSwitchPauseChange(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                  Custom Pronunciation Dictionary (Non-destructive; applies phonetic hint only at synthesis)
                </span>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', marginTop: '2px', marginBottom: '8px' }}>
                  Note: Uses intuitive phonetic respelling (e.g. <code>Abhi &rarr; Uh-bhee</code>, <code>API &rarr; A-P-I</code>). Raw IPA tags are not directly supported by Gemini 3.8 or Kokoro.
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="tts-input"
                    placeholder="Word / Name (e.g. Abhi)"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    style={{ flex: '1 1 140px', fontSize: '0.76rem' }}
                  />
                  <input
                    type="text"
                    className="tts-input"
                    placeholder="Spoken Respelling (e.g. Uh-bhee)"
                    value={newPron}
                    onChange={(e) => setNewPron(e.target.value)}
                    style={{ flex: '1 1 160px', fontSize: '0.76rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddPronunciation}
                    style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                  >
                    <Plus size={14} /> Add Rule
                  </button>
                </div>

                {pronunciationDict.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {pronunciationDict.map((p, i) => (
                      <span key={i} className="rec-chip" style={{ width: 'auto', gap: '8px' }}>
                        <span><strong>{p.word}</strong> &rarr; {p.pronunciation}</span>
                        <button
                          type="button"
                          onClick={() => onPronunciationDictChange(pronunciationDict.filter((_, idx) => idx !== i))}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Segment-by-Segment Controllable Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {segments.map((seg, index) => {
            const rec = seg.recommendation || EmotionAnalyzer.recommendEmotion(seg.text);
            return (
              <div key={seg.id} className="tts-segment-card">
                <div className="tts-segment-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                      Segment {index + 1}
                    </span>

                    <select
                      className="tts-select"
                      value={seg.speakerId}
                      onChange={(e) => updateSegment(seg.id, { speakerId: e.target.value })}
                      style={{ fontSize: '0.76rem', padding: '3px 8px' }}
                      aria-label={`Speaker for segment ${index + 1}`}
                    >
                      {speakers.map((sp) => (
                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                      ))}
                    </select>

                    {/* Advisory Auto-Emotion Pill */}
                    {rec && rec.primaryEmotion !== seg.emotion && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => updateSegment(seg.id, {
                          emotion: rec.primaryEmotion,
                          style: rec.suggestedStyle,
                          intensity: rec.suggestedIntensity,
                        })}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          borderColor: 'rgba(167, 139, 250, 0.4)',
                          color: '#c4b5fd',
                        }}
                        title={rec.reason}
                      >
                        <Sparkles size={11} /> Suggested: {rec.primaryEmotion} ({rec.alternateEmotion}) — Apply
                      </button>
                    )}
                  </div>

                  {/* Segment Manipulation Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary tts-icon-btn"
                      disabled={isGenerating || isPreviewingAudio || !seg.text.trim()}
                      onClick={() => onPreviewSegment(seg, index)}
                      title="Preview just this segment"
                    >
                      <Play size={12} color="#34d399" /> <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary tts-icon-btn"
                      onClick={() => splitSegment(index)}
                      title="Split segment in two"
                    >
                      <Scissors size={12} />
                    </button>
                    {index < segments.length - 1 && (
                      <button
                        type="button"
                        className="btn btn-secondary tts-icon-btn"
                        onClick={() => combineWithNext(index)}
                        title="Merge with next segment"
                      >
                        <Merge size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary tts-icon-btn"
                      disabled={index === 0}
                      onClick={() => moveSegment(index, -1)}
                      title="Move up"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary tts-icon-btn"
                      disabled={index === segments.length - 1}
                      onClick={() => moveSegment(index, 1)}
                      title="Move down"
                    >
                      <ArrowDown size={12} />
                    </button>
                    {segments.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-secondary tts-icon-btn"
                        onClick={() => removeSegment(index)}
                        style={{ color: 'var(--accent-rose)' }}
                        title="Delete segment"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Segment Textarea */}
                <textarea
                  className="tts-textarea"
                  rows={2}
                  value={seg.text}
                  onChange={(e) => {
                    const txt = e.target.value.slice(0, 5000);
                    const nextRec = autoDetectEnabled ? EmotionAnalyzer.recommendEmotion(txt) : seg.recommendation;
                    updateSegment(seg.id, { text: txt, recommendation: nextRec });
                  }}
                  placeholder="Enter dialogue or narration line for this segment..."
                  style={{ marginTop: '8px', marginBottom: '10px' }}
                />

                {/* Per-Segment Expressive Controls */}
                <div className="tts-segment-controls-grid">
                  {/* Emotion Selector (18 Options) */}
                  <div className="tts-field">
                    <label>Emotion {!isGemini && '(Gemini Only)'}</label>
                    <select
                      className="tts-select"
                      value={seg.emotion}
                      disabled={!isGemini}
                      onChange={(e) => updateSegment(seg.id, { emotion: e.target.value })}
                    >
                      {TTS_EMOTIONS.map((em) => (
                        <option key={em.id} value={em.id}>{em.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Emotion Intensity */}
                  <div className="tts-field">
                    <label>Intensity {!isGemini && '(Gemini Only)'}</label>
                    <select
                      className="tts-select"
                      value={seg.intensity}
                      disabled={!isGemini}
                      onChange={(e) => updateSegment(seg.id, { intensity: e.target.value })}
                    >
                      {EMOTION_INTENSITIES.map((it) => (
                        <option key={it.id} value={it.id}>{it.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Separate Speaking Style */}
                  <div className="tts-field">
                    <label>Speaking Style {!isGemini && '(Gemini Only)'}</label>
                    <select
                      className="tts-select"
                      value={seg.style}
                      disabled={!isGemini}
                      onChange={(e) => updateSegment(seg.id, { style: e.target.value })}
                    >
                      {SPEAKING_STYLES.map((st) => (
                        <option key={st.id} value={st.id}>{st.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Speed */}
                  <div className="tts-field">
                    <label>Speed ({seg.speed.toFixed(2)}x)</label>
                    <input
                      type="range"
                      min="0.75"
                      max="1.25"
                      step="0.05"
                      value={seg.speed}
                      onChange={(e) => updateSegment(seg.id, { speed: Number(e.target.value) })}
                    />
                  </div>

                  {/* Pitch Preference */}
                  <div className="tts-field">
                    <label>Pitch Hint ({seg.pitchPreference > 0 ? `+${seg.pitchPreference}` : seg.pitchPreference})</label>
                    <input
                      type="range"
                      min="-6"
                      max="6"
                      step="1"
                      value={seg.pitchPreference}
                      disabled={!isGemini}
                      onChange={(e) => updateSegment(seg.id, { pitchPreference: Number(e.target.value) })}
                    />
                  </div>

                  {/* Pause After Segment */}
                  <div className="tts-field">
                    <label>Pause After ({seg.pauseAfterMs} ms)</label>
                    <input
                      type="range"
                      min="0"
                      max="3000"
                      step="50"
                      value={seg.pauseAfterMs}
                      onChange={(e) => updateSegment(seg.id, { pauseAfterMs: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={addEmptySegment}
            style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: '0.8rem' }}
          >
            <Plus size={15} /> Add New Segment
          </button>
        </div>
      </div>
    </div>
  );
}
