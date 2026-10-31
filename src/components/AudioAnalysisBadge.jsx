import React from 'react';
import { Clock, Activity, Volume2, FileAudio, Layers, Cpu } from 'lucide-react';

export default function AudioAnalysisBadge({ analysis }) {
  if (!analysis) return null;

  return (
    <div className="analysis-grid" style={{ marginBottom: '20px' }}>
      {/* Duration */}
      <div className="analysis-item">
        <Clock size={16} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="analysis-label">Duration</div>
          <div className="analysis-value">{analysis.formattedDuration}</div>
        </div>
      </div>

      {/* Sample Rate */}
      <div className="analysis-item">
        <Activity size={16} color="#34d399" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="analysis-label">Sample Rate</div>
          <div className="analysis-value">{(analysis.sampleRate / 1000).toFixed(1)} kHz</div>
        </div>
      </div>

      {/* Channels */}
      <div className="analysis-item">
        <Layers size={16} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="analysis-label">Channels</div>
          <div className="analysis-value">{analysis.numberOfChannels === 1 ? 'Mono' : 'Stereo'}</div>
        </div>
      </div>

      {/* Peak Level */}
      <div className="analysis-item">
        <Volume2 size={16} color="#a78bfa" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="analysis-label">Peak Level</div>
          <div className="analysis-value">{analysis.peakDb} dBFS</div>
        </div>
      </div>

      {/* RMS Loudness */}
      <div className="analysis-item">
        <Cpu size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="analysis-label">RMS Loudness</div>
          <div className="analysis-value">{analysis.rmsDb} dBFS</div>
        </div>
      </div>

      {/* Format / RAM footprint */}
      <div className="analysis-item">
        <FileAudio size={16} color="#f43f5e" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="analysis-label">Format & RAM</div>
          <div className="analysis-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {analysis.fileSize}
          </div>
        </div>
      </div>
    </div>
  );
}
