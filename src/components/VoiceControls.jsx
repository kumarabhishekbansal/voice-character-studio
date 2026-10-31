import React from 'react';
import { Sliders, Waves, Shield } from 'lucide-react';

export default function VoiceControls({ settings, onChange, onResetParam }) {
  const update = (key, val) => {
    onChange({ ...settings, [key]: val });
  };

  const renderSlider = (key, label, min, max, step, unit = '', defaultValue = 0) => {
    const val = settings[key] !== undefined ? settings[key] : defaultValue;
    const isNeutral = Math.abs(val - defaultValue) < 0.001;

    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </span>
            {!isNeutral && (
              <button
                type="button"
                onClick={() => update(key, defaultValue)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  padding: '2px 4px',
                  borderRadius: '4px',
                }}
                title="Reset to default"
                aria-label={`Reset ${label} to default`}
              >
                ↺
              </button>
            )}
          </div>

          <span style={{
            fontSize: '0.76rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: isNeutral ? 'var(--text-subtle)' : '#38bdf8',
            flexShrink: 0,
            marginLeft: '8px'
          }}>
            {val > 0 && (unit === 'dB' || unit === 'st') ? `+${val}` : val}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>

        <div style={{ position: 'relative', width: '100%', padding: '4px 0' }}>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={val}
            onChange={(e) => update(key, parseFloat(e.target.value))}
            style={{ width: '100%' }}
            aria-label={label}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="controls-grid" style={{ marginBottom: '20px' }}>
      {/* 1. Basic Pitch & Rate Controls */}
      <div className="studio-card control-group-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <Sliders size={16} color="var(--accent-cyan)" />
          <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
            Basic Controls
          </h4>
          <span className="badge badge-cyan" style={{ marginLeft: 'auto', fontSize: '0.64rem' }}>
            Pitch / Speed Decoupled
          </span>
        </div>

        {renderSlider('pitch', 'Pitch Shift', -12, 12, 0.5, 'st', 0)}
        {renderSlider('rate', 'Speaking Rate (Tempo)', 0.75, 1.25, 0.01, 'x', 1.0)}
        {renderSlider('volume', 'Master Volume', 0, 150, 5, '%', 100)}

        <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '6px', lineHeight: '1.4' }}>
          Pitch shifts without altering speaking speed.
        </p>
      </div>

      {/* 2. Character Formants & EQ */}
      <div className="studio-card control-group-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <Waves size={16} color="var(--accent-amber)" />
          <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
            Character & Formants
          </h4>
          <span className="badge badge-amber" style={{ marginLeft: 'auto', fontSize: '0.64rem' }}>
            Vocal Tract Geometry
          </span>
        </div>

        {renderSlider('formant', 'Vocal Formant', -10, 10, 0.5, '', 0)}
        {renderSlider('bass', 'Bass (Body)', -12, 12, 0.5, 'dB', 0)}
        {renderSlider('presence', 'Presence (Clarity)', -12, 12, 0.5, 'dB', 0)}
        {renderSlider('treble', 'Treble (Air)', -12, 12, 0.5, 'dB', 0)}
        {renderSlider('warmth', 'Warmth (Even Harmonics)', 0, 100, 5, '%', 15)}
      </div>

      {/* 3. Dynamics & Acoustic Space */}
      <div className="studio-card control-group-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
          <Shield size={16} color="#34d399" />
          <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
            Dynamics & Effects
          </h4>
          <span className="badge badge-emerald" style={{ marginLeft: 'auto', fontSize: '0.64rem' }}>
            Natural Acoustics
          </span>
        </div>

        {renderSlider('compression', 'Vocal Compression', 0, 100, 5, '%', 20)}
        {renderSlider('deEsser', 'De-Esser (Tame Sibilants)', 0, 100, 5, '%', 15)}
        {renderSlider('noiseReduction', 'Noise Reduction (Gate)', 0, 100, 5, '%', 10)}
        {renderSlider('reverb', 'Studio Reverb', 0, 30, 1, '%', 4)}
        {renderSlider('echo', 'Echo / Delay', 0, 30, 1, '%', 0)}
        {renderSlider('saturation', 'Saturation (Drive)', 0, 20, 1, '%', 3)}
      </div>
    </div>
  );
}
