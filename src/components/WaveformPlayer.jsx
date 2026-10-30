import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';

export default function WaveformPlayer({
  title,
  subtitle,
  badgeText,
  badgeType = 'cyan', // cyan, emerald, amber
  audioBuffer,
  waveformPeaks,
  accentColor = '#00d2ff',
  audioEngine,
  onPlayStateChange,
}) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1.0);

  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const animFrameRef = useRef(null);

  const duration = audioBuffer ? audioBuffer.duration : 0;

  // Clean stop
  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignored
      }
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
    if (onPlayStateChange) onPlayStateChange(false);
  }, [onPlayStateChange]);

  // Handle Play / Pause
  const togglePlay = () => {
    if (!audioBuffer) return;

    if (isPlaying) {
      // Pause
      pauseOffsetRef.current = currentTime;
      stopAudio();
    } else {
      // Play
      const ctx = audioEngine.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // If at end, loop to beginning
      let startOffset = pauseOffsetRef.current;
      if (startOffset >= duration - 0.05) {
        startOffset = 0;
        pauseOffsetRef.current = 0;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = volume;
      gainNodeRef.current = gain;

      source.connect(gain);
      gain.connect(ctx.destination);

      source.onended = () => {
        // Natural end of playback
        if (sourceNodeRef.current === source) {
          stopAudio();
          pauseOffsetRef.current = 0;
          setCurrentTime(0);
        }
      };

      source.start(0, startOffset);
      startTimeRef.current = ctx.currentTime - startOffset;
      sourceNodeRef.current = source;

      setIsPlaying(true);
      if (onPlayStateChange) onPlayStateChange(true);

      // Animation loop for playhead
      const updatePlayhead = () => {
        if (!sourceNodeRef.current) return;
        const now = ctx.currentTime - startTimeRef.current;
        if (now <= duration) {
          setCurrentTime(now);
          animFrameRef.current = requestAnimationFrame(updatePlayhead);
        } else {
          setCurrentTime(duration);
          stopAudio();
        }
      };
      animFrameRef.current = requestAnimationFrame(updatePlayhead);
    }
  };

  // Seek via canvas click
  const handleCanvasClick = (e) => {
    if (!audioBuffer || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = pct * duration;

    pauseOffsetRef.current = newTime;
    setCurrentTime(newTime);

    if (isPlaying) {
      stopAudio();
      // Restart playback at new seek point
      setTimeout(() => {
        togglePlay();
      }, 20);
    }
  };

  // Volume change
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = val;
    }
  };

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!audioBuffer || !waveformPeaks || waveformPeaks.length === 0) {
      // Draw idle placeholder line
      ctx.strokeStyle = '#233148';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const numBars = waveformPeaks.length;
    const barWidth = width / numBars;
    const playheadRatio = duration > 0 ? currentTime / duration : 0;
    const playheadX = playheadRatio * width;

    // Draw background bars
    for (let i = 0; i < numBars; i++) {
      const x = i * barWidth;
      const peak = waveformPeaks[i];
      const barHeight = Math.max(2, peak * (height * 0.88));
      const y = (height - barHeight) / 2;

      // Color based on whether it is before or after playhead
      if (x <= playheadX) {
        ctx.fillStyle = accentColor;
      } else {
        ctx.fillStyle = '#2a3b54';
      }

      ctx.fillRect(x, y, Math.max(1.5, barWidth - 1), barHeight);
    }

    // Draw playhead vertical line
    if (duration > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }
  }, [audioBuffer, waveformPeaks, currentTime, duration, accentColor]);

  // Clean up on unmount or audioBuffer change
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [audioBuffer, stopAudio]);

  const formatSecs = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="studio-card" style={{ marginBottom: '16px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff' }}>
            {title}
          </h4>
          {badgeText && (
            <span className={`badge badge-${badgeType}`}>
              {badgeText}
            </span>
          )}
          {subtitle && (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
              {subtitle}
            </span>
          )}
        </div>

        {/* Time code */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{formatSecs(currentTime)}</span>
          <span style={{ margin: '0 4px', color: 'var(--text-subtle)' }}>/</span>
          <span>{formatSecs(duration)}</span>
        </div>
      </div>

      {/* Interactive Waveform Canvas */}
      <div style={{
        background: '#090d16',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        padding: '8px 12px',
        cursor: audioBuffer ? 'pointer' : 'default',
        position: 'relative'
      }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={90}
          style={{ width: '100%', height: '90px', display: 'block' }}
          onClick={handleCanvasClick}
        />
        {!audioBuffer && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-subtle)'
          }}>
            No audio loaded
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={togglePlay}
            disabled={!audioBuffer}
            style={{
              padding: '7px 16px',
              fontSize: '0.82rem',
              background: isPlaying ? 'linear-gradient(135deg, #f59e0b, #d97706)' : undefined
            }}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              stopAudio();
              pauseOffsetRef.current = 0;
              setCurrentTime(0);
            }}
            disabled={!audioBuffer || currentTime === 0}
            style={{ padding: '7px 12px' }}
            title="Rewind to start"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Volume Fader */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
          <Volume2 size={15} color="var(--text-subtle)" />
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            disabled={!audioBuffer}
            style={{ height: '4px' }}
            title={`Monitor Volume: ${Math.round(volume * 100)}%`}
          />
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-subtle)', width: '32px' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
