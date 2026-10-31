import React from 'react';
import { FastForward, PlayCircle, Loader2 } from 'lucide-react';

export default function ActionToolbar({
  onPreview,
  onProcessFull,
  isProcessing,
  processingProgress,
  processingStage,
  hasAudio,
  isPreviewing,
  hasProcessedAudio
}) {
  return (
    <div className="studio-card action-toolbar-card" style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div className="action-buttons-group">
          {/* Fast Preview Button */}
          <button
            type="button"
            className="btn btn-secondary action-btn"
            onClick={onPreview}
            disabled={!hasAudio || isProcessing}
            style={{
              borderColor: 'var(--accent-amber)',
              color: 'var(--accent-amber)',
            }}
            title="Rapidly renders the first 7 seconds in under 200ms"
          >
            {isProcessing && isPreviewing ? (
              <Loader2 size={16} className="pulse-indicator" />
            ) : (
              <FastForward size={16} />
            )}
            Preview (Fast 7s)
          </button>

          {/* Process Full Audio Button */}
          <button
            type="button"
            className="btn btn-primary action-btn"
            onClick={onProcessFull}
            disabled={!hasAudio || isProcessing}
            style={{ fontWeight: 700 }}
          >
            {isProcessing && !isPreviewing ? (
              <Loader2 size={17} className="pulse-indicator" />
            ) : (
              <PlayCircle size={17} />
            )}
            Process Full Audio
          </button>
        </div>

        {/* Processing Progress Feedback */}
        {isProcessing && (
          <div className="action-progress-wrapper">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {processingStage}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600, marginLeft: '8px' }}>
                  {processingProgress}%
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--bg-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${processingProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00d2ff, #10b981)',
                  transition: 'width 0.15s ease-out',
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick status notice if ready */}
        {!isProcessing && hasProcessedAudio && (
          <span style={{
            fontSize: '0.74rem',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#34d399', flexShrink: 0 }} />
            Ready for audition & export
          </span>
        )}
      </div>
    </div>
  );
}
