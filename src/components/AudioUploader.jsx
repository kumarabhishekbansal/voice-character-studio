import React, { useState, useRef } from 'react';
import { Upload, Mic, Disc3, Sparkles, AlertCircle } from 'lucide-react';
import { validateFileExtension, validateAudioMagicBytes, MAX_FILE_SIZE_BYTES } from '../utils/security';

export default function AudioUploader({ onFileLoaded, onLoadDemoSpeech, isProcessing }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file) => {
    setErrorMessage(null);

    // 1. Strict extension validation allowlist
    if (!validateFileExtension(file.name)) {
      setErrorMessage('Unsupported file format. Please upload an authentic audio file (.wav, .mp3, .m4a, .ogg, .flac, .webm, .aac).');
      return;
    }

    // 2. Safe file size limit (50 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage('File exceeds the 50MB limit. To ensure low RAM consumption and fast processing, please upload a shorter clip.');
      return;
    }

    // 3. Binary header magic byte inspection
    try {
      const headerSlice = await file.slice(0, 64).arrayBuffer();
      const isValidSignature = validateAudioMagicBytes(headerSlice);
      if (!isValidSignature) {
        setErrorMessage('Invalid audio file signature. Only authentic audio recordings (WAV, MP3, M4A, OGG, FLAC, WebM) are supported.');
        return;
      }
    } catch (err) {
      setErrorMessage('Could not verify audio file integrity. Please try another audio file.');
      return;
    }

    onFileLoaded(file);
  };

  // Microphone recording
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const recordedFile = new File([audioBlob], 'Mic_Recording.wav', { type: 'audio/wav' });
        onFileLoaded(recordedFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      setErrorMessage('Could not access microphone. Please check browser permissions or upload an audio file.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  return (
    <div className="studio-card" style={{ marginBottom: '20px' }}>
      {errorMessage && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#fb7185',
          fontSize: '0.82rem'
        }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div
        className="uploader-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? '2px dashed var(--accent-cyan)' : '2px dashed var(--border-light)',
          background: isDragging ? 'rgba(0, 210, 255, 0.05)' : 'var(--bg-dark)',
          borderRadius: '10px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onClick={() => !isRecording && fileInputRef.current.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac,.webm"
          style={{ display: 'none' }}
        />

        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'var(--bg-surface-elevated)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          border: '1px solid var(--border-light)'
        }}>
          <Upload size={22} color="var(--accent-cyan)" />
        </div>

        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
          Drag & Drop your Voice Recording here
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Supports WAV, MP3, M4A, FLAC, OGG &bull; Kept 100% in local memory
        </p>

        <div className="uploader-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn btn-primary uploader-btn"
            onClick={() => fileInputRef.current.click()}
            disabled={isProcessing || isRecording}
          >
            <Disc3 size={15} />
            Choose Audio File
          </button>

          {!isRecording ? (
            <button
              type="button"
              className="btn btn-secondary uploader-btn"
              onClick={startRecording}
              disabled={isProcessing}
            >
              <Mic size={15} color="#f43f5e" />
              Record Voice
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary uploader-btn"
              onClick={stopRecording}
              style={{ borderColor: '#f43f5e', color: '#f43f5e' }}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#f43f5e',
                display: 'inline-block'
              }} className="pulse-indicator" />
              Stop Recording ({recordingSeconds}s)
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary uploader-btn"
            onClick={onLoadDemoSpeech}
            disabled={isProcessing || isRecording}
            title="Generate procedural speech for rapid 1-click preset testing"
          >
            <Sparkles size={15} color="var(--accent-amber)" />
            Load Sample Speech
          </button>
        </div>
      </div>
    </div>
  );
}
