'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CameraScanner from '@/components/CameraScanner';
import ProgressBar from '@/components/ProgressBar';
import Logo from '@/components/Logo';
import { parseChunkPayload, reassembleFile } from '@/services/chunkService';
import { formatFileSize } from '@/services/fileService';

type ReceiveMode = 'camera' | 'manual';
type ReceiverStatus = 'IDLE' | 'CONNECTING' | 'TRANSFERRING' | 'VERIFYING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export default function ReceivePage() {
  const router = useRouter();

  // Mode Selection: Optical Camera vs Manual PIN
  const [receiveMode, setReceiveMode] = useState<ReceiveMode>('camera');
  const [receiverStatus, setReceiverStatus] = useState<ReceiverStatus>('IDLE');

  // Manual PIN input state
  const [manualPin, setManualPin] = useState('');
  const [manualPayload, setManualPayload] = useState('');

  // Transfer metadata (Session Specific)
  const [transferId, setTransferId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [totalChunks, setTotalChunks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [reconstructedSize, setReconstructedSize] = useState<number>(0);

  // In-memory store for binary chunks: Map<chunkNumber, base64Data>
  const chunksMapRef = useRef<Map<number, string>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Real-time progress states
  const [receivedCount, setReceivedCount] = useState(0);
  const [lastScannedChunk, setLastScannedChunk] = useState<number | null>(null);

  /**
   * Finishes the transfer when 100% is reached.
   * Stops all camera scanning and reassembles the local binary Blob.
   */
  const finishTransfer = useCallback((total: number, mimeType: string) => {
    // 1. Race condition guard
    if (abortControllerRef.current?.signal.aborted) return;

    // 2. Transition to VERIFYING (No more chunks accepted)
    setReceiverStatus('VERIFYING');

    try {
      // 3. Reconstruct the local file in browser memory
      const blob = reassembleFile(chunksMapRef.current, total, mimeType);
      setReconstructedSize(blob.size);

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      // 4. Transition to COMPLETED
      setReceiverStatus('COMPLETED');

      // 5. Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 150]);
      }
    } catch (err) {
      setError('Failed to reconstruct file. Some pieces might be corrupted.');
      setReceiverStatus('FAILED');
    }
  }, []);

  /**
   * Handles incoming decoded QR payload strings.
   * Enforces session isolation, duplicate filtering, and 100% stop.
   */
  const handleScan = useCallback((qrData: string) => {
    // 1. Never process chunks after COMPLETED, CANCELLED, or FAILED
    if (receiverStatus === 'COMPLETED' || receiverStatus === 'CANCELLED' || receiverStatus === 'FAILED' || receiverStatus === 'VERIFYING') {
      return;
    }

    if (abortControllerRef.current?.signal.aborted) {
      return;
    }

    const payload = parseChunkPayload(qrData);
    if (!payload) return;

    // 2. First chunk received: Initialize session parameters
    if (!transferId) {
      setTransferId(payload.t);
      setFileName(payload.n);
      setFileType(payload.m);
      setTotalChunks(payload.l);
      setReceiverStatus('TRANSFERRING');
    } 
    // 3. Old Session Protection: Reject chunks from another transfer ID
    else if (payload.t !== transferId) {
      setError(`Ignored frame from PIN ${payload.t} (Expected ${transferId})`);
      return;
    }

    // 4. Store unique chunk in memory
    if (!chunksMapRef.current.has(payload.c)) {
      chunksMapRef.current.set(payload.c, payload.d);
      setLastScannedChunk(payload.c + 1);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }

      const newCount = chunksMapRef.current.size;
      setReceivedCount(newCount);

      // 5. FINAL CHUNK (100% REACHED) -> STOP LOOP IMMEDIATELY
      if (newCount === payload.l) {
        finishTransfer(payload.l, payload.m);
      }
    }
  }, [transferId, receiverStatus, finishTransfer]);

  const handleManualFrameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPayload.trim()) return;

    handleScan(manualPayload.trim());
    setManualPayload('');
  };

  /**
   * Completely cancels the transfer immediately.
   * Stops camera streams, clears memory chunks, and transitions to CANCELLED.
   */
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    chunksMapRef.current.clear();
    setReceiverStatus('CANCELLED');
  };

  /**
   * Starts a fresh receiving session from 0%.
   */
  const handleReceiveAgain = () => {
    chunksMapRef.current.clear();
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);

    setDownloadUrl(null);
    setTransferId(null);
    setFileName('');
    setTotalChunks(0);
    setReceivedCount(0);
    setLastScannedChunk(null);
    setError(null);
    setManualPin('');
    setManualPayload('');

    abortControllerRef.current = new AbortController();
    setReceiverStatus('IDLE');
  };

  const handleBackToHome = () => {
    handleCancel();
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    router.push('/');
  };

  // Cleanup on unmount
  useEffect(() => {
    abortControllerRef.current = new AbortController();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      chunksMapRef.current.clear();
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const formattedId = transferId
    ? transferId.replace(/(\d{3})(\d{3})/, '$1 $2')
    : null;

  const remainingChunks = totalChunks > 0 ? totalChunks - receivedCount : 0;
  const isCameraScanning = receiveMode === 'camera' && (receiverStatus === 'CONNECTING' || receiverStatus === 'TRANSFERRING');

  return (
    <div className="page-container">
      <header className="header">
        <button className="back-btn" onClick={receiverStatus === 'COMPLETED' ? handleBackToHome : handleCancel}>
          {receiverStatus === 'COMPLETED' ? '← Home' : '✕ Cancel'}
        </button>
        <div className="header-logo-title">
          <Logo size="sm" showText={false} />
          <h1>Receive <span className="italic-emphasis">File</span></h1>
        </div>
        <div className="header-spacer"></div>
      </header>

      <main className="main-content centered-content">
        {/* Mode Selector Tabs */}
        {receiverStatus !== 'COMPLETED' && receiverStatus !== 'CANCELLED' && (
          <div className="tab-switch-group">
            <button
              className={`tab-btn ${receiveMode === 'camera' ? 'active' : ''}`}
              onClick={() => {
                setReceiveMode('camera');
                if (receiverStatus === 'IDLE') setReceiverStatus('CONNECTING');
              }}
            >
              📷 Optical Camera
            </button>
            <button
              className={`tab-btn ${receiveMode === 'manual' ? 'active' : ''}`}
              onClick={() => setReceiveMode('manual')}
            >
              🔢 Transfer PIN / Paste
            </button>
          </div>
        )}

        {/* 1. Camera Mode: Initial Prompt */}
        {receiveMode === 'camera' && receiverStatus === 'IDLE' && (
          <div className="camera-prompt">
            <div className="scan-icon-circle">📷</div>
            <h2>Optical <span className="italic-emphasis">Scanner</span></h2>
            <p>Point your camera directly at the sender's broadcast screen.</p>
            <button
              className="btn btn-primary btn-large"
              onClick={() => setReceiverStatus('CONNECTING')}
            >
              Start Camera Scanner
            </button>
            {error && <p className="error-message">{error}</p>}
          </div>
        )}

        {/* 1. Camera Mode: Active Scanner */}
        {isCameraScanning && (
          <div className="scanner-layout">
            <CameraScanner active={isCameraScanning} onScan={handleScan} />

            <div className="transfer-info receiver-info">
              {transferId ? (
                <>
                  <div className="receiver-header">
                    <span className="badge badge-pin">
                      PIN: <strong>{formattedId}</strong>
                    </span>
                    <span className="badge badge-rate">
                      {remainingChunks === 0
                        ? 'Reassembling…'
                        : `${remainingChunks} chunks remaining`}
                    </span>
                  </div>

                  <p className="receiving-title font-serif">
                    Receiving: <strong>{fileName}</strong>
                  </p>

                  <ProgressBar
                    current={receivedCount}
                    total={totalChunks}
                    label={`Collected ${receivedCount} of ${totalChunks} frames`}
                  />

                  {lastScannedChunk !== null && (
                    <p className="live-frame-pill">
                      Captured Frame #{lastScannedChunk}
                    </p>
                  )}

                  {error && <p className="error-message">{error}</p>}
                </>
              ) : (
                <div className="waiting-state">
                  <div className="pulsing-dot"></div>
                  <p className="font-serif">Searching for FrameShare stream…</p>
                  <p className="subtitle">Aim camera steadily at the sender's screen</p>
                  {error && <p className="error-message">{error}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Manual PIN / Input Mode */}
        {receiveMode === 'manual' && receiverStatus !== 'COMPLETED' && receiverStatus !== 'CANCELLED' && (
          <div className="manual-pin-card">
            <div className="scan-icon-circle">🔢</div>
            <h2>Manual <span className="italic-emphasis">Collector</span></h2>
            <p>Enter the 6-digit Transfer PIN or paste single frame JSON.</p>

            <input
              type="text"
              className="pin-input-field"
              placeholder="582 914"
              maxLength={7}
              value={manualPin}
              onChange={(e) => setManualPin(e.target.value)}
            />

            <form onSubmit={handleManualFrameSubmit} style={{ width: '100%', marginTop: '1rem' }}>
              <input
                type="text"
                className="pin-input-field"
                style={{ fontSize: '0.9rem', maxWidth: '100%', letterSpacing: 'normal' }}
                placeholder='Paste raw frame payload {"app":"FS", ...}'
                value={manualPayload}
                onChange={(e) => setManualPayload(e.target.value)}
              />
              <div className="action-buttons">
                <button type="submit" className="btn btn-primary">
                  Add Frame Chunk
                </button>
              </div>
            </form>

            {transferId && (
              <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <ProgressBar
                  current={receivedCount}
                  total={totalChunks}
                  label={`Collected ${receivedCount} of ${totalChunks} frames`}
                />
              </div>
            )}

            {error && <p className="error-message">{error}</p>}
          </div>
        )}

        {/* 3. Cancelled State (With Receive Again option) */}
        {receiverStatus === 'CANCELLED' && (
          <div className="loading-card" style={{ borderColor: 'var(--accent-terracotta)' }}>
            <div className="scan-icon-circle" style={{ color: 'var(--accent-terracotta)' }}>✕</div>
            <h2>Receiver <span className="italic-emphasis">Cancelled</span></h2>
            <p className="subtitle" style={{ marginBottom: '2rem' }}>
              Scanning stopped immediately. All partial chunk memory was cleared.
            </p>

            <div className="action-buttons full-width">
              <button className="btn btn-primary btn-large" onClick={handleReceiveAgain}>
                🔁 Receive Again (New Session)
              </button>
              <button className="btn btn-secondary" onClick={handleBackToHome}>
                ← Back to Home
              </button>
            </div>
          </div>
        )}

        {/* 4. Verifying State */}
        {receiverStatus === 'VERIFYING' && (
          <div className="loading-card">
            <div className="spinner"></div>
            <h2>Verifying <span className="italic-emphasis">100% Chunks...</span></h2>
            <p className="subtitle">All frames received. Reconstructing local file Blob.</p>
          </div>
        )}

        {/* 5. Transfer Complete State */}
        {receiverStatus === 'COMPLETED' && downloadUrl && (
          <div className="transfer-complete centered-content">
            <div className="success-icon">✓</div>
            <h2>Transfer <span className="italic-emphasis">Complete!</span></h2>
            <p className="success-subtitle">100% of chunks collected. Zero data stored on server.</p>

            <div className="file-info-card success-card">
              <span className="file-icon">🌿</span>
              <div className="file-details">
                <p className="file-name font-serif">{fileName}</p>
                <p className="file-size">{formatFileSize(reconstructedSize)}</p>
              </div>
            </div>

            <div className="action-buttons full-width">
              <a
                href={downloadUrl}
                download={fileName}
                className="btn btn-primary btn-large download-btn"
              >
                💾 Save / Download File
              </a>
              <button
                className="btn btn-secondary btn-large"
                onClick={handleReceiveAgain}
              >
                📥 Receive Another File
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
