import React from 'react';
import { CHARACTER_PRESETS } from '../constants/presets';
import { Sparkles, Check } from 'lucide-react';

export default function PresetSelector({ activePresetId, onSelectPreset }) {
  return (
    <div className="studio-card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--accent-amber)" />
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff' }}>
            Natural Character Presets
          </h4>
        </div>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
          Presets are starting points &bull; Manually adjustable
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: '10px',
      }}>
        {CHARACTER_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              style={{
                background: isActive ? 'linear-gradient(135deg, rgba(0, 210, 255, 0.12), rgba(0, 119, 182, 0.2))' : 'var(--bg-surface-elevated)',
                border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px 10px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: isActive ? '0 0 12px rgba(0, 210, 255, 0.2)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '0.84rem',
                  fontWeight: 600,
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

              <div style={{ marginTop: '4px' }}>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'var(--bg-dark)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)'
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
