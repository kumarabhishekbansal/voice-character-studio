import React from 'react';
import { Clock, Activity, Volume2, FileAudio, Layers, Cpu } from 'lucide-react';

export default function AudioAnalysisBadge({ analysis }) {
  if (!analysis) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: '10px',
      marginBottom: '20px'
    }}>
      {/* Duration */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Clock size={16} color="var(--accent-cyan)" />
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
            Duration
          </div>
          <div style={{ fontSize: '0.86rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
            {analysis.formattedDuration}
          </div>
        </div>
      </div>

      {/* Sample Rate */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Activity size={16} color="#34d399" />
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
            Sample Rate
          </div>
          <div style={{ fontSize: '0.86rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
            {(analysis.sampleRate / 1000).toFixed(1)} kHz
          </div>
        </div>
      </div>

      {/* Channels */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Layers size={16} color="var(--accent-amber)" />
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
            Channels
          </div>
          <div style={{ fontSize: '0.86rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
            {analysis.numberOfChannels === 1 ? 'Mono' : 'Stereo'}
          </div>
        </div>
      </div>

      {/* Peak Level */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Volume2 size={16} color="#a78bfa" />
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
            Peak Level
          </div>
          <div style={{ fontSize: '0.86rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
            {analysis.peakDb} dBFS
          </div>
        </div>
      </div>

      {/* RMS Loudness */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Cpu size={16} color="#38bdf8" />
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
            RMS Loudness
          </div>
          <div style={{ fontSize: '0.86rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
            {analysis.rmsDb} dBFS
          </div>
        </div>
      </div>

      {/* Format / RAM footprint */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <FileAudio size={16} color="#f43f5e" />
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', textTransform: 'uppercase', fontWeight: 600 }}>
            Format & RAM
          </div>
          <div style={{ fontSize: '0.86rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {analysis.fileSize}
          </div>
        </div>
      </div>
    </div>
  );
}
