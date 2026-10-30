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
    <div className="studio-card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Fast Preview Button (Processes short 7s slice) */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onPreview}
            disabled={!hasAudio || isProcessing}
            style={{
              borderColor: 'var(--accent-amber)',
              color: 'var(--accent-amber)',
              padding: '10px 20px',
              fontSize: '0.88rem'
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
            className="btn btn-primary"
            onClick={onProcessFull}
            disabled={!hasAudio || isProcessing}
            style={{
              padding: '10px 24px',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '380px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{processingStage}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
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
          <span style={{ fontSize: '0.76rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#34d399' }} />
            Audio processed & ready for comparison or export
          </span>
        )}
      </div>
    </div>
  );
}
