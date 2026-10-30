import React from 'react';
import { Mic2, Radio, ShieldCheck, Cpu, Video, Sparkles, DatabaseZap, HelpCircle } from 'lucide-react';

export default function Sidebar({ memoryUsage, originalDuration, isProcessing }) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00d2ff, #0077b6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(0, 210, 255, 0.35)'
          }}>
            <Mic2 size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Voice Studio
            </h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>
              Natural Character DSP
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation & Session Status */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Session In-Memory Status (Highlighting NO STORAGE) */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '10px',
          padding: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <DatabaseZap size={16} color="#34d399" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399' }}>
              Strict In-Memory Session
            </span>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Zero disk caching. Audio exists in active RAM only. No IndexedDB or localStorage used.
          </p>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--text-subtle)' }}>Disk Footprint:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 600 }}>0 KB (Clean)</span>
          </div>
          {originalDuration > 0 && (
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--text-subtle)' }}>Active Audio:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                {originalDuration.toFixed(1)}s loaded
              </span>
            </div>
          )}
        </div>

        {/* YouTube Workflow Steps */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-muted)' }}>
            <Video size={15} color="#f43f5e" />
            <span style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              YouTube Workflow
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { step: '1', title: 'Record Voice', desc: 'Read your character dialogue' },
              { step: '2', title: 'Upload & Analyze', desc: 'Instant waveform & acoustic metrics' },
              { step: '3', title: 'Preset & Formant', desc: 'Tune vocal tract geometry' },
              { step: '4', title: 'Fast Preview (7s)', desc: 'Instant feedback without waiting' },
              { step: '5', title: 'Process & Download', desc: 'WAV/MP3 for Premiere, CapCut, VN' },
            ].map((item) => (
              <div key={item.step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-cyan)',
                  flexShrink: 0,
                  marginTop: '1px'
                }}>
                  {item.step}
                </span>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-main)' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Natural DSP Architecture Spec */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '14px',
          marginTop: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Cpu size={15} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Natural DSP Engine
            </span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', lineHeight: '1.4' }}>
            WSOLA pitch transposer with decoupled tempo speed and formant compensation filters.
          </p>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isProcessing ? '#f59e0b' : '#10b981'
            }} className="pulse-indicator" />
            <span style={{ fontSize: '0.7rem', color: isProcessing ? '#f59e0b' : '#10b981', fontWeight: 500 }}>
              {isProcessing ? 'Processing Audio...' : 'DSP Core Idle'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
