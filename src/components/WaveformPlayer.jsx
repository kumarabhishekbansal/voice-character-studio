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
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 90 });

  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const animFrameRef = useRef(null);

  const duration = audioBuffer ? audioBuffer.duration : 0;

  // Responsive canvas size tracking via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const clientWidth = container.clientWidth || 800;
      // Subtract padding while ensuring it never exceeds clientWidth
      const targetWidth = Math.max(120, Math.floor(clientWidth - 16));
      setCanvasDimensions({
        width: targetWidth,
        height: 85,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
      pauseOffsetRef.current = currentTime;
      stopAudio();
    } else {
      const ctx = audioEngine.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

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
    const width = canvasDimensions.width;
    const height = canvasDimensions.height;

    // Set canvas internal resolution to match container
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    if (!audioBuffer || !waveformPeaks || waveformPeaks.length === 0) {
      ctx.strokeStyle = '#233148';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const numBars = Math.min(waveformPeaks.length, Math.floor(width / 2.5));
    const step = waveformPeaks.length / numBars;
    const barWidth = width / numBars;
    const playheadRatio = duration > 0 ? currentTime / duration : 0;
    const playheadX = playheadRatio * width;

    for (let i = 0; i < numBars; i++) {
      const x = i * barWidth;
      const peakIdx = Math.floor(i * step);
      const peak = waveformPeaks[peakIdx] || 0;
      const barHeight = Math.max(2, peak * (height * 0.88));
      const y = (height - barHeight) / 2;

      if (x <= playheadX) {
        ctx.fillStyle = accentColor;
      } else {
        ctx.fillStyle = '#26354a';
      }

      ctx.fillRect(x, y, Math.max(1.5, barWidth - 1), barHeight);
    }

    if (duration > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [audioBuffer, waveformPeaks, currentTime, duration, accentColor, canvasDimensions]);

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
    <div className="studio-card waveform-card" ref={containerRef} style={{ marginBottom: '16px' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
            {title}
          </h4>
          {badgeText && (
            <span className={`badge badge-${badgeType}`} style={{ fontSize: '0.7rem' }}>
              {badgeText}
            </span>
          )}
          {subtitle && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
              {subtitle}
            </span>
          )}
        </div>

        {/* Time code */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          marginLeft: 'auto'
        }}>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{formatSecs(currentTime)}</span>
          <span style={{ margin: '0 4px', color: 'var(--text-subtle)' }}>/</span>
          <span>{formatSecs(duration)}</span>
        </div>
      </div>

      {/* Interactive Waveform Canvas Container */}
      <div style={{
        background: '#090d16',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        padding: '8px 12px',
        cursor: audioBuffer ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        width: '100%'
      }}>
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          style={{ width: '100%', height: '85px', display: 'block' }}
          onClick={handleCanvasClick}
        />
        {!audioBuffer && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.78rem',
            color: 'var(--text-subtle)'
          }}>
            No audio loaded
          </div>
        )}
      </div>

      {/* Responsive Controls Bar */}
      <div className="waveform-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={togglePlay}
            disabled={!audioBuffer}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              minHeight: '38px',
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
            style={{ padding: '8px 12px', minHeight: '38px' }}
            title="Rewind to start"
            aria-label="Rewind to start"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Volume Fader */}
        <div className="waveform-volume">
          <Volume2 size={15} color="var(--text-subtle)" style={{ flexShrink: 0 }} />
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            disabled={!audioBuffer}
            style={{ height: '5px', flex: 1 }}
            title={`Monitor Volume: ${Math.round(volume * 100)}%`}
          />
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-subtle)', width: '32px', textAlign: 'right' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
