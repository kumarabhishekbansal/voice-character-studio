import React from 'react';
import {
  Mic2,
  Cpu,
  Video,
  DatabaseZap,
  X,
  Mic,
  AudioLines,
  Fingerprint,
} from 'lucide-react';

export default function Sidebar({
  activeMode = 'voice-changer',
  onModeChange,
  originalDuration,
  hasUniversalIdentity,
  isProcessing,
  isOpen,
  onClose,
}) {
  const voiceChangerSteps = [
    { step: '1', title: 'Record or Upload Voice', desc: 'Authentic speech audio in RAM' },
    { step: '2', title: 'Auto Profile & Reference', desc: 'Measure F0, noise floor & timbre' },
    { step: '3', title: 'Character & 16 Filters', desc: 'Formants, EQ, dynamics & spatial FX' },
    { step: '4', title: 'Fast Preview & Process', desc: 'Non-destructive A/B comparison' },
    { step: '5', title: 'Export Audio & Universal JSON', desc: 'WAV/MP3 + reusable Voice Profile' },
  ];

  const ttsSteps = [
    { step: '1', title: 'Select AI Engine', desc: 'Gemini 3.8 TTS or Local Kokoro-82M' },
    { step: '2', title: 'Write Script & Speakers', desc: 'Split paragraphs & assign characters' },
    { step: '3', title: 'Emotions, Styles & Pauses', desc: 'Segment-level acting + pronunciation' },
    { step: '4', title: 'Generate Natural Speech', desc: 'Seamless multi-turn synthesis' },
    { step: '5', title: 'Apply Shared DSP & Export', desc: '16 studio filters -> WAV/MP3' },
  ];

  const steps = activeMode === 'tts' ? ttsSteps : voiceChangerSteps;

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Brand Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00d2ff, #0077b6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 210, 255, 0.35)',
              flexShrink: 0
            }}>
              <Mic2 size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '0.98rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Abhi<span style={{ color: 'var(--accent-cyan)' }}>Voice</span>
              </h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>
                Voice & AI Speech Studio
              </span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Content inside Sidebar */}
        <div style={{
          padding: '16px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto'
        }}>
          {/* Mode Quick Switch inside Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Studio Workspace
            </span>
            <button
              type="button"
              className={`sidebar-nav-btn ${activeMode === 'voice-changer' ? 'sidebar-nav-active' : ''}`}
              onClick={() => {
                onModeChange('voice-changer');
                onClose();
              }}
            >
              <Mic size={15} />
              <span>Voice Changer</span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-btn ${activeMode === 'tts' ? 'sidebar-nav-active-tts' : ''}`}
              onClick={() => {
                onModeChange('tts');
                onClose();
              }}
            >
              <AudioLines size={15} />
              <span>Text to Speech</span>
            </button>
          </div>

          {/* Session In-Memory Status */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            padding: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <DatabaseZap size={15} color="#34d399" />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#34d399' }}>
                Strict In-Memory Session
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Zero persistent database or audio history. Refreshing purges active RAM buffers cleanly.
            </p>
            {originalDuration > 0 && (
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Active Audio:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                  {originalDuration.toFixed(1)}s in RAM
                </span>
              </div>
            )}
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--text-subtle)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Fingerprint size={12} color="#38bdf8" /> Identity:
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: hasUniversalIdentity ? '#38bdf8' : 'var(--text-subtle)' }}>
                {hasUniversalIdentity ? 'Ref Loaded' : 'None'}
              </span>
            </div>
          </div>

          {/* Dynamic Mode Workflow Steps */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--text-muted)' }}>
              <Video size={14} color="#f43f5e" />
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                {activeMode === 'tts' ? 'AI Speech Workflow' : 'Voice Changer Workflow'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {steps.map((item) => (
                <div key={item.step} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                  <span style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.66rem',
                    fontFamily: 'var(--font-mono)',
                    color: activeMode === 'tts' ? '#a78bfa' : 'var(--accent-cyan)',
                    flexShrink: 0,
                    marginTop: '1px'
                  }}>
                    {item.step}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 500, color: 'var(--text-main)' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shared DSP Engine Spec */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '12px',
            marginTop: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <Cpu size={14} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Shared 16-Filter DSP Core
              </span>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', lineHeight: '1.4' }}>
              WSOLA pitch/tempo, High/Low-Pass, 3-band EQ, Formants, Warmth, De-Esser, Compression & Gate shared by both modes.
            </p>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isProcessing ? '#f59e0b' : '#10b981'
              }} className="pulse-indicator" />
              <span style={{ fontSize: '0.68rem', color: isProcessing ? '#f59e0b' : '#10b981', fontWeight: 500 }}>
                {isProcessing ? 'Processing Audio...' : 'DSP Core Idle'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
