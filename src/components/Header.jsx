import React from 'react';
import { RotateCcw, Trash2, Tag, Wand2 } from 'lucide-react';

export default function Header({ characterName, onCharacterNameChange, onResetSettings, onClearAudio, hasAudio }) {
  return (
    <header className="top-header">
      {/* Title & Character Name Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
              Voice Character Studio
            </h2>
            <span className="badge badge-cyan">YouTube Workflow</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
            High-Naturalness Formant-Preserving Audio Transformer
          </span>
        </div>

        {/* Character Name Input Field */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-surface-elevated)',
          padding: '6px 14px',
          borderRadius: '8px',
          border: '1px solid var(--border-light)',
          maxWidth: '320px',
          width: '100%'
        }}>
          <Tag size={15} color="var(--accent-cyan)" />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label style={{ fontSize: '0.66rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
              Current Character Name
            </label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => onCharacterNameChange(e.target.value)}
              placeholder="e.g. Villain, Narrator, Abhi"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 600,
                width: '100%',
                padding: '1px 0'
              }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onResetSettings}
          className="btn btn-secondary"
          title="Restore natural neutral settings"
          style={{ fontSize: '0.8rem', padding: '7px 14px' }}
        >
          <RotateCcw size={14} />
          Reset Settings
        </button>

        {hasAudio && (
          <button
            onClick={onClearAudio}
            className="btn btn-secondary"
            title="Clear active audio from memory"
            style={{ fontSize: '0.8rem', padding: '7px 14px', color: 'var(--accent-rose)' }}
          >
            <Trash2 size={14} />
            Clear Audio
          </button>
        )}
      </div>
    </header>
  );
}
