import React from 'react';
import { CHARACTER_PRESETS } from '../constants/presets';
import { Sparkles, Check } from 'lucide-react';

export default function PresetSelector({ activePresetId, onSelectPreset }) {
  return (
    <div className="studio-card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--accent-amber)" />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
            Natural Character Presets
          </h4>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
          Presets are starting points &bull; Manually adjustable
        </span>
      </div>

      <div className="presets-grid">
        {CHARACTER_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`preset-card ${isActive ? 'preset-card-active' : ''}`}
              onClick={() => onSelectPreset(preset)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-main)'
                }}>
                  {preset.name}
                </span>
                {isActive && <Check size={14} color="var(--accent-cyan)" />}
              </div>

              <span style={{
                fontSize: '0.68rem',
                color: 'var(--text-subtle)',
                lineHeight: '1.3',
                height: '32px',
                overflow: 'hidden'
              }}>
                {preset.description}
              </span>

              <div style={{ marginTop: 'auto' }}>
                <span style={{
                  fontSize: '0.64rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'var(--bg-dark)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  display: 'inline-block'
                }}>
                  {preset.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
