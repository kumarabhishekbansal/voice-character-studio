import React from 'react';
import { Heart, ShieldCheck, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      marginTop: 'auto',
      borderTop: '1px solid var(--border)',
      background: 'rgba(10, 15, 24, 0.95)',
      padding: '24px 20px',
      color: 'var(--text-muted)',
      fontSize: '0.82rem',
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        textAlign: 'center',
      }}>
        {/* Creator Signature - Prominent & Professional */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 'fit-content'
        }}>
          <span style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
            Created with passion by
          </span>
          <span style={{
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: '#ffffff',
            fontSize: '0.95rem',
            background: 'linear-gradient(135deg, #00d2ff 0%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase',
          }}>
            Made by ABHI BANSAL
          </span>
        </div>

        {/* Product & Privacy Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          fontSize: '0.76rem',
          color: 'var(--text-subtle)'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <ShieldCheck size={14} color="#34d399" />
            100% In-Memory Audio Privacy
          </span>
          <span style={{ opacity: 0.4 }}>&bull;</span>
          <span>Zero Cloud Uploads</span>
          <span style={{ opacity: 0.4 }}>&bull;</span>
          <span>YouTube Studio Ready</span>
        </div>

        {/* Brand & Year */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          justifyContent: 'center',
          fontSize: '0.74rem',
          color: 'var(--text-subtle)'
        }}>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>AbhiVoiceChanger</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
