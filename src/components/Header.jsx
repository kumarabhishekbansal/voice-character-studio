import React from 'react';
import { RotateCcw, Trash2, Tag, Menu, X, AudioLines, Mic } from 'lucide-react';

export default function Header({
  activeMode = 'voice-changer',
  onModeChange,
  characterName,
  onCharacterNameChange,
  onResetSettings,
  onClearAudio,
  hasAudio,
  hasUnsavedProfileChanges,
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
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                Abhi<span style={{ color: 'var(--accent-cyan)' }}>VoiceChanger</span>
              </h1>
              <span className="badge badge-cyan header-badge">YouTube Studio</span>
              {hasUnsavedProfileChanges && (
                <span
                  className="badge"
                  style={{
                    background: 'rgba(245, 158, 11, 0.14)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    fontSize: '0.62rem'
                  }}
                  title="Settings changed since last JSON export"
                >
                  Profile Unsaved
                </span>
              )}
            </div>
            <span className="header-subtitle">
              Natural Voice Transformation & Expressive AI TTS
            </span>
          </div>
        </div>

        {/* Mode Switcher: Voice Changer vs Text to Speech */}
        <nav className="mode-switcher-nav" aria-label="Application Mode">
          <button
            type="button"
            className={`mode-tab-btn ${activeMode === 'voice-changer' ? 'mode-tab-active' : ''}`}
            onClick={() => onModeChange('voice-changer')}
          >
            <Mic size={14} />
            <span>Voice Changer</span>
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${activeMode === 'tts' ? 'mode-tab-active-tts' : ''}`}
            onClick={() => onModeChange('tts')}
          >
            <AudioLines size={14} />
            <span>Text to Speech</span>
          </button>
        </nav>

        {/* Center/Right: Profile Name + Quick Action Buttons */}
        <div className="header-right-cluster">
          <div className="header-character-box">
            <Tag size={14} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <label style={{
                fontSize: '0.62rem',
                color: 'var(--text-subtle)',
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}>
                Profile / Character
              </label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => onCharacterNameChange(e.target.value)}
                placeholder="e.g. Villain, Narrator"
                maxLength={32}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  width: '100%',
                  padding: '1px 0',
                  textOverflow: 'ellipsis'
                }}
              />
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              onClick={onResetSettings}
              className="btn btn-secondary header-btn"
              title="Restore all audio filters to neutral defaults"
            >
              <RotateCcw size={14} />
              <span className="btn-label">Reset All</span>
            </button>

            {hasAudio && (
              <button
                type="button"
                onClick={onClearAudio}
                className="btn btn-secondary header-btn"
                title="Clear active audio from RAM"
                style={{ color: 'var(--accent-rose)' }}
              >
                <Trash2 size={14} />
                <span className="btn-label">Clear Audio</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
