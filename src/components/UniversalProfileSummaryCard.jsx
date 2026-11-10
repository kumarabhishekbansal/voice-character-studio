import React, { useState, useRef } from 'react';
import {
  Fingerprint,
  ShieldCheck,
  AlertTriangle,
  Play,
  Square,
  Download,
  Upload,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { base64ToUint8Array } from '../utils/security';

export default function UniversalProfileSummaryCard({
  mode = 'voice-changer',
  profileName,
  referenceAudio,
  importedSummary,
  providerVoiceIds,
  hasUnsavedChanges,
  estimatedJsonSizeBytes,
  audioEngine,
  onDownloadUniversalJson,
  onImportUniversalJson,
}) {
  const fileInputRef = useRef(null);
  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const sourceNodeRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportUniversalJson(e.target.files[0]);
      e.target.value = '';
    }
  };

  const togglePlayReference = async () => {
    if (isPlayingRef) {
      try {
        sourceNodeRef.current?.stop();
      } catch {
        // ignored
      }
      setIsPlayingRef(false);
      return;
    }

    if (!referenceAudio?.data) return;

    try {
      const bytes = base64ToUint8Array(referenceAudio.data);
      const decoded = await audioEngine.decodeAudio(bytes.buffer.slice(0));
      const ctx = audioEngine.getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(ctx.destination);
      src.onended = () => setIsPlayingRef(false);
      sourceNodeRef.current = src;
      src.start(0);
      setIsPlayingRef(true);
    } catch {
      setIsPlayingRef(false);
    }
  };

  const hasRef = Boolean(referenceAudio?.embedded && referenceAudio?.data);
  const hasGeminiKey = Boolean(providerVoiceIds?.geminiVoiceKey || providerVoiceIds?.geminiVoiceId);
  const estimatedKb = estimatedJsonSizeBytes ? `${(estimatedJsonSizeBytes / 1024).toFixed(0)} KB` : hasRef ? '~1.0 MB' : '~6 KB';

  return (
    <div className="studio-card universal-identity-card" style={{ marginBottom: '20px' }}>
      {/* Top Row: Identity Badge + Live Sync + Import/Download Universal JSON */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'rgba(139, 92, 246, 0.14)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Fingerprint size={17} color="#a78bfa" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                Universal Voice Identity Profile (v2.0)
              </h4>
              <span className="badge" style={{
                fontSize: '0.62rem',
                background: hasUnsavedChanges ? 'rgba(245, 158, 11, 0.14)' : 'rgba(16, 185, 129, 0.14)',
                color: hasUnsavedChanges ? '#fbbf24' : '#34d399',
                border: '1px solid currentColor',
              }}>
                {hasUnsavedChanges ? 'Live State Modified (Unsaved)' : 'Synchronized'}
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
              Portable JSON carrying reference WAV + all 16 DSP filters + processing chain + TTS settings across both modes.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="btn btn-secondary profile-action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Import Universal v2.0 or Legacy v1.0 JSON profile into current mode"
          >
            <Upload size={14} color="#a78bfa" />
            <span>Import Universal Voice Profile</span>
          </button>
          <button
            type="button"
            className="btn btn-primary profile-action-btn"
            onClick={onDownloadUniversalJson}
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            title={`Download portable Universal Voice Profile (${estimatedKb})`}
          >
            <Download size={14} />
            <span>Download Universal Voice Profile (.json &bull; {estimatedKb})</span>
          </button>
        </div>
      </div>

      {/* Reference Audio Status & Biometric Privacy Warning */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
        gap: '10px',
        marginTop: '12px',
      }}>
        {/* Embedded Reference Audio Card */}
        <div style={{
          background: 'var(--bg-dark)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
              Embedded Speaker Reference
            </span>
            {hasRef && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={togglePlayReference}
                style={{ padding: '2px 8px', fontSize: '0.68rem', minHeight: '24px' }}
              >
                {isPlayingRef ? <Square size={10} /> : <Play size={10} />}
                <span>{isPlayingRef ? 'Stop' : 'Audition Ref'}</span>
              </button>
            )}
          </div>

          {hasRef ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <CheckCircle2 size={14} color="#34d399" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f1f5f9', fontFamily: 'var(--font-mono)' }}>
                  {referenceAudio.duration}s WAV (24kHz Mono)
                </span>
                {referenceAudio.sha256 && (
                  <span className="badge badge-emerald" style={{ fontSize: '0.6rem' }} title={`SHA-256: ${referenceAudio.sha256}`}>
                    <ShieldCheck size={10} /> SHA-256 {importedSummary?.checksumStatus === 'verified' ? 'Verified' : referenceAudio.sha256.slice(0, 10)}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', lineHeight: 1.35 }}>
                Privacy Notice: JSON embeds raw Base64 voice audio ({Math.round((referenceAudio.byteLength || 0) / 1024)} KB). Anyone with the file can extract & hear this clip.
              </span>
            </>
          ) : (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
              No reference speech audio attached yet. Upload/record audio in Voice Changer or import a v2.0 profile with embedded audio.
            </span>
          )}
        </div>

        {/* Cross-Mode Identity Compatibility Card */}
        <div style={{
          background: 'var(--bg-dark)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
            Cross-Mode Compatibility ({mode === 'tts' ? 'Text to Speech' : 'Speech-to-Speech'})
          </span>

          {mode === 'voice-changer' ? (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#34d399', fontWeight: 600 }}>
                <CheckCircle2 size={13} /> 16 DSP Filters & Chain Order Active
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', color: '#fbbf24', marginTop: '4px' }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Target-speaker AI voice conversion is disabled (optional <code>ELEVENLABS_API_KEY</code> not set). DSP filters reshape pitch/formants only; switch to <strong>Text to Speech</strong> to clone this reference via Gemini Voice Replication.
                </span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#34d399', fontWeight: 600 }}>
                <CheckCircle2 size={13} /> Shared 16 Filters & TTS Config Restored
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', color: hasGeminiKey ? '#34d399' : '#38bdf8', marginTop: '4px' }}>
                <Info size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  {hasGeminiKey
                    ? `Gemini replicated identity attached (${providerVoiceIds.geminiVoiceId || 'stateless voicekey'}). Requires GEMINI_API_KEY active.`
                    : hasRef
                    ? 'Reference audio restored! Use the Gemini Voice Replication panel below (with spoken consent clip) to synthesize text in this speaker’s voice.'
                    : 'Using standard TTS voice selection + restored DSP post-processing.'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Banner when a Profile Was Just Imported */}
      {importedSummary && (
        <div style={{
          marginTop: '10px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '0.74rem',
          color: '#c7d2fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <span>
            Imported <strong>{importedSummary.characterName || profileName}</strong> ({importedSummary.isUniversalV2 ? `Universal v${importedSummary.profileVersion}` : `Legacy v${importedSummary.profileVersion}`}) &bull;{' '}
            <strong>{importedSummary.restoredFilterCount}</strong> filters + chain order restored &bull;{' '}
            Ref Audio: <strong>{importedSummary.checksumStatus === 'verified' ? 'SHA-256 Verified' : importedSummary.referenceAudio ? 'Restored' : 'None'}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
