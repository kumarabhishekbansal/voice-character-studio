import React, { useState, useRef } from 'react';
import {
  Mic,
  Upload,
  Fingerprint,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GEMINI_CONSENT_PHRASES } from '../../constants/ttsConfig';
import { AudioResampler } from '../../engine/AudioResampler';
import { ttsEngine } from '../../engine/TtsEngine';

export default function TtsVoiceReplicationModal({
  geminiConfigured,
  referenceAudio,
  providerVoiceIds,
  audioEngine,
  onUploadReferenceFile,
  onVoiceReplicated,
  onToast,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState('en-IN');
  const [displayName, setDisplayName] = useState('Abhi Custom Voice');
  const [storeStateful, setStoreStateful] = useState(false); // Zero server persistence default (voicekey_...)
  const [consentAudioB64, setConsentAudioB64] = useState(null);
  const [consentDuration, setConsentDuration] = useState(0);
  const [isRecordingConsent, setIsRecordingConsent] = useState(false);
  const [isReplicating, setIsReplicating] = useState(false);

  const consentInputRef = useRef(null);
  const refInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const consentObj = GEMINI_CONSENT_PHRASES.find((c) => c.locale === selectedLocale) || GEMINI_CONSENT_PHRASES[0];
  const hasActiveKey = Boolean(providerVoiceIds?.geminiVoiceKey || providerVoiceIds?.geminiVoiceId);

  const handleConsentFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const buf = await file.arrayBuffer();
      const decoded = await audioEngine.decodeAudio(buf);
      const prepared = await AudioResampler.preparePortableReferenceWav(decoded, 18);
      setConsentAudioB64(prepared.data);
      setConsentDuration(prepared.duration);
      onToast(`Loaded ${prepared.duration}s spoken consent clip (24kHz WAV).`, 'success');
    } catch (err) {
      onToast(err.message || 'Could not decode consent audio file.', 'error');
    }
  };

  const toggleRecordConsent = async () => {
    if (isRecordingConsent) {
      mediaRecorderRef.current?.stop();
      setIsRecordingConsent(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const arrBuf = await blob.arrayBuffer();
          const decoded = await audioEngine.decodeAudio(arrBuf);
          const prepared = await AudioResampler.preparePortableReferenceWav(decoded, 18);
          setConsentAudioB64(prepared.data);
          setConsentDuration(prepared.duration);
          onToast(`Captured ${prepared.duration}s consent audio!`, 'success');
        } catch (err) {
          onToast('Failed to process recorded consent clip.', 'error');
        }
      };

      mr.start();
      setIsRecordingConsent(true);
    } catch {
      onToast('Microphone permission denied. Upload a short consent WAV/MP3 instead.', 'error');
    }
  };

  const handleReplicate = async () => {
    if (!geminiConfigured) {
      onToast('Configure GEMINI_API_KEY in Vercel Environment Variables first.', 'error');
      return;
    }
    if (!referenceAudio?.data) {
      onToast('Please attach or import a clean 10-25s speaker reference audio first.', 'error');
      return;
    }
    if (!consentAudioB64) {
      onToast('Google Gemini requires the speaker to record/upload the verbatim consent statement first.', 'error');
      return;
    }

    setIsReplicating(true);
    try {
      const res = await ttsEngine.gemini.replicateVoice({
        sourceAudioB64: referenceAudio.data,
        consentAudioB64,
        displayName,
        store: storeStateful,
      });

      const voiceToken = res.key || res.id;
      if (!voiceToken) {
        throw new Error('Provider did not return a valid replicated voice key/ID.');
      }

      onVoiceReplicated({
        geminiVoiceId: res.id || null,
        geminiVoiceKey: res.key || null,
        geminiVoiceType: 'replicated',
        geminiConsentVerified: true,
        displayName: res.displayName || displayName,
      });

      onToast(
        storeStateful
          ? `Created persistent Gemini voice (${res.id}) and synced to Universal Profile!`
          : `Created stateless 7-day voice key (${res.key.slice(0, 14)}...) & synced to Universal Profile!`,
        'success'
      );
    } catch (err) {
      onToast(err.message || 'Voice replication failed.', 'error');
    } finally {
      setIsReplicating(false);
    }
  };

  return (
    <div className="studio-card" style={{ marginBottom: '20px', borderColor: hasActiveKey ? 'rgba(16, 185, 129, 0.35)' : 'rgba(139, 92, 246, 0.3)' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: 0,
          gap: '10px',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Fingerprint size={17} color="#a78bfa" />
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              Gemini Voice Replication (Target Speaker Restoration)
            </span>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', margin: '2px 0 0 0' }}>
              {hasActiveKey
                ? 'Active replicated voice identity attached to current TTS workspace.'
                : referenceAudio?.data
                ? 'Embedded reference WAV ready! Add speaker consent clip to activate cloned voice in Gemini 3.8 TTS.'
                : 'Optional: Upload or import a reference speaker sample + spoken consent to replicate a custom voice.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {hasActiveKey && <span className="badge badge-emerald" style={{ fontSize: '0.64rem' }}>Replicated Voice Ready</span>}
          {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </button>

      {isOpen && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!geminiConfigured && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '0.76rem',
              color: '#fbbf24',
              display: 'flex',
              gap: '8px',
            }}>
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                Voice Replication requires Google Gemini <code>GEMINI_API_KEY</code> configured in Vercel Environment Variables. Local Kokoro-82M cannot replicate custom audio.
              </span>
            </div>
          )}

          {/* Step 1: Reference Sample */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                Step 1: Speaker Reference Clip (10–25s clean speech)
              </span>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.76rem', color: referenceAudio?.data ? '#34d399' : 'var(--text-muted)' }}>
                  {referenceAudio?.data
                    ? `Ready (${referenceAudio.duration}s • 24kHz WAV)`
                    : 'No reference audio loaded yet'}
                </span>
                <input
                  type="file"
                  ref={refInputRef}
                  accept="audio/*,.wav,.mp3,.m4a,.flac"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) onUploadReferenceFile(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => refInputRef.current?.click()}
                  style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                >
                  <Upload size={13} /> Upload Ref Audio
                </button>
              </div>
            </div>

            {/* Step 2: Mandatory Verbatim Consent Recording */}
            <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                Step 2: Mandatory Speaker Consent Clip (Same Voice/Mic)
              </span>
              <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={selectedLocale}
                  onChange={(e) => setSelectedLocale(e.target.value)}
                  className="tts-select"
                  style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                >
                  {GEMINI_CONSENT_PHRASES.map((p) => (
                    <option key={p.locale} value={p.locale}>{p.language}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={toggleRecordConsent}
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.74rem',
                    borderColor: isRecordingConsent ? '#f43f5e' : undefined,
                    color: isRecordingConsent ? '#f43f5e' : undefined,
                  }}
                >
                  <Mic size={13} /> {isRecordingConsent ? 'Stop Recording' : 'Record Consent'}
                </button>
                <input
                  type="file"
                  ref={consentInputRef}
                  accept="audio/*,.wav,.mp3,.m4a,.flac"
                  style={{ display: 'none' }}
                  onChange={handleConsentFile}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => consentInputRef.current?.click()}
                  style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                >
                  <Upload size={13} /> Upload
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '6px', fontStyle: 'italic', lineHeight: 1.4 }}>
                &ldquo;{consentObj.phrase}&rdquo;
              </p>
              {consentAudioB64 && (
                <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Consent clip captured ({consentDuration}s 24kHz WAV)
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Name, Storage Mode & Replicate Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 32))}
                placeholder="Speaker Voice Name"
                className="tts-input"
                style={{ width: '190px', fontSize: '0.78rem' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!storeStateful}
                  onChange={(e) => setStoreStateful(!e.target.checked)}
                />
                Stateless Key (<code>store=false</code> • 7-day key, zero Google voice storage)
              </label>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              disabled={!geminiConfigured || !referenceAudio?.data || !consentAudioB64 || isReplicating}
              onClick={handleReplicate}
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {isReplicating ? <Loader2 size={14} className="pulse-indicator" /> : <Fingerprint size={14} />}
              <span>{isReplicating ? 'Verifying Consent & Replicating...' : 'Replicate Speaker Voice'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
