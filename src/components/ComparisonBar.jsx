import React from 'react';
import { Download, FileAudio } from 'lucide-react';

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
    <div className="studio-card comparison-card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        {/* A/B Quick Toggle Switch */}
        <div className="comparison-toggle-group">
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            A/B Audition:
          </span>
          <div className="ab-toggle-container">
            <button
              type="button"
              onClick={() => onToggleAB('A')}
              className={`ab-btn ${activeAB === 'A' ? 'ab-btn-active-a' : ''}`}
            >
              A &bull; Original
            </button>
            <button
              type="button"
              onClick={() => onToggleAB('B')}
              disabled={!hasProcessedAudio}
              className={`ab-btn ${activeAB === 'B' ? 'ab-btn-active-b' : ''}`}
            >
              B &bull; Processed
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="comparison-export-group">
          {/* Download WAV */}
          <button
            type="button"
            className="btn btn-primary export-btn"
            onClick={onDownloadWav}
            disabled={!hasProcessedAudio || isExporting}
            title={`Export 16-bit Broadcast WAV for ${safeName}`}
          >
            <Download size={15} />
            <span>Download WAV</span>
            <span className="export-filename-badge">
              ({safeName}.wav)
            </span>
          </button>

          {/* Download MP3 */}
          <button
            type="button"
            className="btn btn-secondary export-btn"
            onClick={onDownloadMp3}
            disabled={!hasProcessedAudio || isExporting}
            title={`Export 192kbps MP3 for ${safeName}`}
          >
            <FileAudio size={15} color="var(--accent-amber)" />
            <span>Download MP3</span>
          </button>
        </div>
      </div>
    </div>
  );
}
