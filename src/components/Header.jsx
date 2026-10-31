import React from 'react';
import { RotateCcw, Trash2, Tag, Menu, X, Sparkles } from 'lucide-react';

export default function Header({
  characterName,
  onCharacterNameChange,
  onResetSettings,
  onClearAudio,
  hasAudio,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) {
  return (
    <header className="top-header">
      <div className="header-inner">
        {/* Left Side: Mobile Menu Button & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation drawer"
            title="Open workflow sidebar"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                Abhi<span style={{ color: 'var(--accent-cyan)' }}>VoiceChanger</span>
              </h1>
              <span className="badge badge-cyan header-badge">YouTube Studio</span>
            </div>
            <span className="header-subtitle">
              Natural Human Voice & Character Transformation
            </span>
          </div>
        </div>

        {/* Center: Character Name Input */}
        <div className="header-character-box">
          <Tag size={15} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <label style={{
              fontSize: '0.64rem',
              color: 'var(--text-subtle)',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.04em'
            }}>
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
                fontSize: '0.86rem',
                fontWeight: 600,
                width: '100%',
                padding: '2px 0',
                textOverflow: 'ellipsis'
              }}
            />
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="header-actions">
          <button
            onClick={onResetSettings}
            className="btn btn-secondary header-btn"
            title="Restore natural neutral settings"
          >
            <RotateCcw size={14} />
            <span className="btn-label">Reset Settings</span>
          </button>

          {hasAudio && (
            <button
              onClick={onClearAudio}
              className="btn btn-secondary header-btn"
              title="Clear active audio from memory"
              style={{ color: 'var(--accent-rose)' }}
            >
              <Trash2 size={14} />
              <span className="btn-label">Clear Audio</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
