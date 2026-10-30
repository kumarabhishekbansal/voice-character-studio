import React from 'react';
import { Download, ToggleLeft, ToggleRight, FileAudio, CheckCircle2 } from 'lucide-react';

export default function ComparisonBar({
  onDownloadWav,
  onDownloadMp3,
  hasProcessedAudio,
  activeAB,
  onToggleAB,
  characterName,
  isExporting
}) {
  const safeName = (characterName || 'Voice').trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  return (
    <div className="studio-card" style={{ marginBottom: '24px', background: 'linear-gradient(180deg, var(--bg-surface) 0%, #111a28 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* A/B Quick Toggle Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
            A/B Audition:
          </span>
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-dark)',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid var(--border)'
          }}>
            <button
              type="button"
              onClick={() => onToggleAB('A')}
              style={{
                background: activeAB === 'A' ? 'var(--bg-surface-elevated)' : 'transparent',
                color: activeAB === 'A' ? '#00d2ff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              A &bull; Original Voice
            </button>
            <button
              type="button"
              onClick={() => onToggleAB('B')}
              disabled={!hasProcessedAudio}
              style={{
                background: activeAB === 'B' ? 'var(--bg-surface-elevated)' : 'transparent',
                color: activeAB === 'B' ? '#34d399' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: hasProcessedAudio ? 'pointer' : 'not-allowed',
                opacity: hasProcessedAudio ? 1 : 0.4,
                transition: 'all 0.15s ease',
              }}
            >
              B &bull; Processed Voice
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Download WAV */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={onDownloadWav}
            disabled={!hasProcessedAudio || isExporting}
            style={{ padding: '8px 18px', fontSize: '0.84rem' }}
            title={`Export 16-bit Broadcast WAV for ${safeName}`}
          >
            <Download size={15} />
            Download WAV
            <span style={{ fontSize: '0.7rem', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>
              ({safeName}_Processed.wav)
            </span>
          </button>

          {/* Download MP3 */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onDownloadMp3}
            disabled={!hasProcessedAudio || isExporting}
            style={{ padding: '8px 16px', fontSize: '0.84rem' }}
            title={`Export 192kbps MP3 for ${safeName}`}
          >
            <FileAudio size={15} color="var(--accent-amber)" />
            Download MP3
          </button>
        </div>
      </div>
    </div>
  );
}
