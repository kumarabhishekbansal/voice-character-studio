import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { TTS_PRESETS } from '../../constants/ttsConfig';

export default function TtsPresetsBar({ activePresetId, onSelectPreset }) {
  return (
    <div className="studio-card" style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--accent-amber)" />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
            Expressive Narration & Character Presets
          </h4>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
          Editable starting points &bull; Never locked
        </span>
      </div>

      <div className="presets-grid">
        {TTS_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`preset-card ${isActive ? 'preset-card-active' : ''}`}
              onClick={() => onSelectPreset(preset)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: isActive ? '#a78bfa' : 'var(--text-main)',
                  textAlign: 'left',
                }}>
                  {preset.name}
                </span>
                {isActive && <Check size={14} color="#a78bfa" style={{ flexShrink: 0 }} />}
              </div>

              <span style={{
                fontSize: '0.68rem',
                color: 'var(--text-subtle)',
                lineHeight: '1.3',
                minHeight: '32px',
                overflow: 'hidden',
                textAlign: 'left',
              }}>
                {preset.desc}
              </span>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <span className="tts-mini-pill">{preset.emotion}</span>
                <span className="tts-mini-pill">{preset.intensity}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
