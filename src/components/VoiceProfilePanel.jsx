import React, { useRef } from 'react';
import {
  Activity,
  Volume2,
  ShieldCheck,
  Download,
  Upload,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  AlertTriangle,
  Waves,
  CheckCircle2,
  Clock,
  Layers,
  FileAudio,
} from 'lucide-react';

export default function VoiceProfilePanel({
  analysis,
  recommendedSettings,
  currentSettings,
  characterName,
  onApplyRecommended,
  onPreviewRecommended,
  onDownloadProfileJson,
  onImportProfileJson,
  isProcessing,
  isPreviewing,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportProfileJson(e.target.files[0]);
      e.target.value = ''; // Reset input so same file can be reloaded if needed
    }
  };

  if (!analysis) {
    return (
      <div className="studio-card" style={{
        marginBottom: '20px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <Sparkles size={16} color="var(--accent-cyan)" />
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>
              Automatic Voice Analysis & JSON Preset System
            </span>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', margin: 0 }}>
              Upload your voice to measure F0 pitch, noise floor, loudness & generate clean settings.
            </p>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          style={{ display: 'none' }}
        />

        <button
          type="button"
          className="btn btn-secondary profile-action-btn"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          title="Import a previously saved AbhiVoiceChanger JSON voice profile"
        >
          <Upload size={14} color="var(--accent-cyan)" />
          <span>Import Voice Profile (.json)</span>
        </button>
      </div>
    );
  }

  const detected = analysis;
  const rec = recommendedSettings || detected.recommendedSettings || {};
  const reasons = detected.recommendationReasons || [];

  return (
    <div className="studio-card voice-profile-card" style={{ marginBottom: '22px' }}>
      {/* Panel Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '14px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(0, 210, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(0, 210, 255, 0.25)',
          }}>
            <Sparkles size={18} color="var(--accent-cyan)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                Smart Voice Profile & Automatic Analysis
              </h3>
              <span className="badge badge-cyan" style={{ fontSize: '0.64rem' }}>
                Preset v1.0
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
              Original recording analyzed in memory &bull; Non-destructive baseline suggestions
            </p>
          </div>
        </div>

        {/* JSON Preset Import / Export Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="btn btn-secondary profile-action-btn"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="Import a previously saved AbhiVoiceChanger JSON voice profile"
          >
            <Upload size={14} color="var(--accent-cyan)" />
            <span>Import Profile (.json)</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary profile-action-btn"
            onClick={onDownloadProfileJson}
            title="Download current voice analysis & settings as portable JSON"
          >
            <Download size={14} color="#34d399" />
            <span>Download Profile (.json)</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: DETECTED VOICE ANALYSIS */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Activity size={15} color="var(--accent-cyan)" />
          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            1. Detected Voice Analysis (Original Recording)
          </h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginLeft: 'auto' }}>
            Direct Acoustic Measurements
          </span>
        </div>

        <div className="analysis-metrics-grid">
          {/* Pitch / F0 */}
          <div className="metric-card">
            <span className="metric-label">Avg Fundamental Pitch (F0)</span>
            <div className="metric-val-row">
              <span className="metric-val" style={{ color: detected.averagePitchHz ? 'var(--accent-cyan)' : 'var(--text-subtle)' }}>
                {detected.averagePitchHz ? `${detected.averagePitchHz} Hz` : 'Not reliably detected'}
              </span>
              {detected.averagePitchNote && (
                <span className="badge badge-cyan" style={{ fontSize: '0.66rem' }}>
                  {detected.averagePitchNote}
                </span>
              )}
            </div>
            <span className="metric-sub">
              {detected.pitchRange
                ? `Range: ${detected.pitchRange}${detected.pitchVariationHz ? ` (±${detected.pitchVariationHz} Hz)` : ''}`
                : 'Non-tonal or unvoiced recording'}
            </span>
          </div>

          {/* RMS & Peak Level */}
          <div className="metric-card">
            <span className="metric-label">RMS & Peak Levels</span>
            <div className="metric-val-row">
              <span className="metric-val" style={{ color: '#38bdf8' }}>
                {detected.rmsDb} dBFS
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                Peak: {detected.peakDb} dBFS
              </span>
            </div>
            <span className="metric-sub">
              {detected.lufs ? `Integrated Loudness: ~${detected.lufs} LUFS` : 'Loudness: Not reliably detected'}
            </span>
          </div>

          {/* Noise Floor */}
          <div className="metric-card">
            <span className="metric-label">Noise Floor Estimate</span>
            <div className="metric-val-row">
              <span className="metric-val" style={{
                color: detected.noiseFloorDb < -52 ? '#34d399' : detected.noiseFloorDb < -44 ? 'var(--accent-amber)' : 'var(--accent-rose)'
              }}>
                {detected.noiseFloorDb} dBFS
              </span>
              <span className="badge" style={{
                fontSize: '0.64rem',
                background: detected.noiseFloorDb < -52 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: detected.noiseFloorDb < -52 ? '#34d399' : '#f59e0b',
                border: '1px solid currentColor'
              }}>
                {detected.noiseFloorDb < -52 ? 'Low Noise' : detected.noiseFloorDb < -44 ? 'Moderate Noise' : 'Audible Noise'}
              </span>
            </div>
            <span className="metric-sub">
              Silence: {detected.silencePercent}% &bull; Speech: {detected.voiceActivityPercent}%
            </span>
          </div>

          {/* Dynamic Range */}
          <div className="metric-card">
            <span className="metric-label">Dynamic Range</span>
            <div className="metric-val-row">
              <span className="metric-val" style={{ color: '#a78bfa' }}>
                {detected.dynamicRangeDb} dB
              </span>
            </div>
            <span className="metric-sub">
              {detected.dynamicRangeDb > 20 ? 'Wide dialogue variance' : 'Controlled / compressed dynamic'}
            </span>
          </div>

          {/* Spectral Balance & Brightness */}
          <div className="metric-card">
            <span className="metric-label">Spectral Brightness (Centroid)</span>
            <div className="metric-val-row">
              <span className="metric-val" style={{ color: 'var(--accent-amber)' }}>
                {detected.spectralCentroidHz ? `${detected.spectralCentroidHz.toLocaleString()} Hz` : 'Not reliably detected'}
              </span>
            </div>
            <span className="metric-sub">
              Low: {detected.lowEnergyPercent}% &bull; Mid: {detected.midEnergyPercent}% &bull; High: {detected.highEnergyPercent}%
            </span>
          </div>

          {/* Sibilance / Harshness */}
          <div className="metric-card">
            <span className="metric-label">Sibilance & High Frequencies</span>
            <div className="metric-val-row">
              <span className="metric-val" style={{
                color: detected.sibilanceIndicator.includes('High') ? 'var(--accent-rose)' : '#34d399',
                fontSize: '0.84rem'
              }}>
                {detected.sibilanceIndicator}
              </span>
            </div>
            <span className="metric-sub">
              Energy ratio across 5.5 kHz – 9.0 kHz
            </span>
          </div>

          {/* Clipping Check */}
          <div className="metric-card">
            <span className="metric-label">Digital Clipping Status</span>
            <div className="metric-val-row">
              {!detected.clippingDetected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#34d399' }}>
                  <CheckCircle2 size={16} />
                  <span className="metric-val" style={{ color: '#34d399' }}>Clean (0 clipped)</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-rose)' }}>
                  <AlertTriangle size={16} />
                  <span className="metric-val" style={{ color: 'var(--accent-rose)' }}>
                    {detected.clippedSamplesCount} clipped samples
                  </span>
                </div>
              )}
            </div>
            <span className="metric-sub">
              {detected.clippingDetected ? 'Recommend lowering input gain' : 'Zero digital overs detected'}
            </span>
          </div>

          {/* File & Technical Meta */}
          <div className="metric-card">
            <span className="metric-label">Format & Hardware Info</span>
            <div className="metric-val-row">
              <span className="metric-val" style={{ color: '#f1f5f9', fontSize: '0.82rem' }}>
                {(detected.sampleRate / 1000).toFixed(1)} kHz &bull; {detected.channelsLabel}
              </span>
            </div>
            <span className="metric-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {detected.bitDepth} &bull; {detected.formattedDuration}
            </span>
          </div>

          {/* Estimated Timbre & Breathiness */}
          <div className="metric-card">
            <span className="metric-label">Timbre & Breathiness (Estimated)</span>
            <div className="metric-val-row">
              <span className="metric-val" style={{ color: '#c084fc', fontSize: '0.78rem' }}>
                {detected.timbreLabel || 'Not reliably detected'}
              </span>
            </div>
            <span className="metric-sub">
              {detected.breathinessIndicator || 'Harmonic balance unavailable'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: RECOMMENDED SETTINGS */}
      <div style={{
        background: 'rgba(13, 19, 31, 0.7)',
        borderRadius: '10px',
        padding: '16px',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={15} color="#34d399" />
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              2. Recommended Initial Filter Settings
            </h4>
          </div>

          {/* Preview & Reset to Recommended Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary profile-action-btn"
              onClick={onApplyRecommended}
              title="Apply calculated recommended values to the sliders below"
            >
              <RotateCcw size={13} color="#34d399" />
              <span>Reset to Recommended</span>
            </button>

            <button
              type="button"
              className="btn btn-primary profile-action-btn"
              onClick={onPreviewRecommended}
              disabled={isProcessing}
              style={{
                background: isPreviewing ? 'linear-gradient(135deg, #f59e0b, #d97706)' : undefined,
                minHeight: '34px',
                padding: '6px 14px'
              }}
              title="Render and hear the recommended settings on a fast 7s slice"
            >
              <Play size={13} />
              <span>{isPreviewing ? 'Previewing...' : 'Preview Recommended'}</span>
            </button>
          </div>
        </div>

        {/* Recommended Values Summary Grid */}
        <div className="recommended-chips-grid" style={{ marginBottom: '14px' }}>
          <div className="rec-chip">
            <span className="rec-chip-label">Noise Reduction:</span>
            <span className="rec-chip-val">{rec.noiseReduction ?? 10}%</span>
          </div>
          <div className="rec-chip">
            <span className="rec-chip-label">Compression:</span>
            <span className="rec-chip-val">{rec.compression ?? 20}%</span>
          </div>
          <div className="rec-chip">
            <span className="rec-chip-label">De-Esser:</span>
            <span className="rec-chip-val">{rec.deEsser ?? 15}%</span>
          </div>
          <div className="rec-chip">
            <span className="rec-chip-label">Master Volume:</span>
            <span className="rec-chip-val">{rec.volume ?? 100}%</span>
          </div>
          <div className="rec-chip">
            <span className="rec-chip-label">High-Pass:</span>
            <span className="rec-chip-val">{rec.highPass ?? 45} Hz</span>
          </div>
          <div className="rec-chip">
            <span className="rec-chip-label">Low-Pass:</span>
            <span className="rec-chip-val">{(rec.lowPass ?? 20000) >= 19500 ? 'Bypass (20k)' : `${rec.lowPass} Hz`}</span>
          </div>
          <div className="rec-chip">
            <span className="rec-chip-label">Bass / Pres / Treb:</span>
            <span className="rec-chip-val">
              {rec.bass ?? 0} / {rec.presence ?? 0} / {rec.treble ?? 0} dB
            </span>
          </div>
          <div className="rec-chip">
            <span className="rec-chip-label">Warmth:</span>
            <span className="rec-chip-val">{rec.warmth ?? 15}%</span>
          </div>
          <div className="rec-chip">
            <span className="rec-chip-label">Reverb:</span>
            <span className="rec-chip-val">{rec.reverb ?? 4}%</span>
          </div>
          <div className="rec-chip">
            <span className="rec-chip-label">Pitch / Speed:</span>
            <span className="rec-chip-val">Preserved (0 st / 1.0x)</span>
          </div>
        </div>

        {/* Reasons Bullet Points */}
        {reasons.length > 0 && (
          <div style={{
            background: 'rgba(20, 28, 44, 0.6)',
            borderRadius: '6px',
            padding: '10px 12px',
            border: '1px solid rgba(50, 67, 95, 0.5)'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Why these settings were suggested:
            </span>
            <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {reasons.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '10px', fontStyle: 'italic' }}>
          Suggestions are calculated to naturally clean, de-noise, and balance your voice without distortion. You can adjust every slider below manually at any time.
        </p>
      </div>
    </div>
  );
}
