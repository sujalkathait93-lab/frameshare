'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CameraScanner from '@/components/CameraScanner';
import ProgressBar from '@/components/ProgressBar';
import Logo from '@/components/Logo';
import { parseChunkPayload, reassembleFile } from '@/services/chunkService';
import { formatFileSize } from '@/services/fileService';

type ReceiveMode = 'camera' | 'manual';

export default function ReceivePage() {
  const router = useRouter();

  // Mode Selection: Camera vs Manual PIN
  const [receiveMode, setReceiveMode] = useState<ReceiveMode>('camera');

  // App state
  const [cameraActive, setCameraActive] = useState(false);
  const [transferComplete, setTransferComplete] = useState(false);

  // Manual PIN input state
  const [manualPin, setManualPin] = useState('');
  const [manualPayload, setManualPayload] = useState('');

  // Transfer state
  const [transferId, setTransferId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [totalChunks, setTotalChunks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [reconstructedSize, setReconstructedSize] = useState<number>(0);

  // Memory store for chunks: Map<chunkNumber, chunkData>
  const chunksMapRef = useRef<Map<number, string>>(new Map());

  // State for UI rendering
  const [receivedCount, setReceivedCount] = useState(0);
  const [lastScannedChunk, setLastScannedChunk] = useState<number | null>(null);

  const handleScan = (qrData: string) => {
    if (transferComplete) return;

    const payload = parseChunkPayload(qrData);
    if (!payload) return;

    // First chunk received for this transfer
    if (!transferId) {
      setTransferId(payload.t);
      setFileName(payload.n);
      setFileType(payload.m);
      setTotalChunks(payload.l);
    } else if (payload.t !== transferId) {
      setError(`QR is from transfer PIN ${payload.t}, expected ${transferId}`);
      return;
    }

    // Store chunk if new
    if (!chunksMapRef.current.has(payload.c)) {
      chunksMapRef.current.set(payload.c, payload.d);
      setLastScannedChunk(payload.c + 1);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }

      const newCount = chunksMapRef.current.size;
      setReceivedCount(newCount);

      if (newCount === payload.l) {
        finishTransfer(payload.l, payload.m);
      }
    }
  };

  const handleManualFrameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPayload.trim()) return;

    handleScan(manualPayload.trim());
    setManualPayload('');
  };

  const finishTransfer = (total: number, mimeType: string) => {
    setCameraActive(false);

    try {
      const blob = reassembleFile(chunksMapRef.current, total, mimeType);
      setReconstructedSize(blob.size);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setTransferComplete(true);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 150]);
      }
    } catch (err) {
      setError('Failed to reconstruct file. Some pieces might be corrupted.');
    }
  };

  const handleReset = () => {
    setCameraActive(false);
    setTransferComplete(false);
    setTransferId(null);
    setFileName('');
    setTotalChunks(0);
    setReceivedCount(0);
    setError(null);
    setManualPin('');
    setManualPayload('');
    chunksMapRef.current.clear();
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  };

  const handleCancel = () => {
    handleReset();
    router.push('/');
  };

  useEffect(() => {
    return () => {
      chunksMapRef.current.clear();
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const formattedId = transferId
    ? transferId.replace(/(\d{3})(\d{3})/, '$1 $2')
    : null;

  const remainingChunks = totalChunks > 0 ? totalChunks - receivedCount : 0;

  return (
    <div className="page-container">
      <header className="header">
        <button className="back-btn" onClick={handleCancel}>
          {transferComplete ? '← Home' : '✕ Cancel'}
        </button>
        <div className="header-logo-title">
          <Logo size="sm" showText={false} />
          <h1>Receive <span className="italic-emphasis">File</span></h1>
        </div>
        <div className="header-spacer"></div>
      </header>

      <main className="main-content centered-content">
        {/* Mode Selector Tabs (Camera vs Manual PIN) */}
        {!transferComplete && (
          <div className="tab-switch-group">
            <button
              className={`tab-btn ${receiveMode === 'camera' ? 'active' : ''}`}
              onClick={() => setReceiveMode('camera')}
            >
              📷 Optical Camera
            </button>
            <button
              className={`tab-btn ${receiveMode === 'manual' ? 'active' : ''}`}
              onClick={() => {
                setReceiveMode('manual');
                setCameraActive(false);
              }}
            >
              🔢 Transfer PIN / Paste
            </button>
          </div>
        )}

        {/* 1. Camera Mode: Initial Prompt */}
        {receiveMode === 'camera' && !cameraActive && !transferComplete && (
          <div className="camera-prompt">
            <div className="scan-icon-circle">📷</div>
            <h2>Optical <span className="italic-emphasis">Scanner</span></h2>
            <p>Point your camera directly at the sender's broadcast screen.</p>
            <button
              className="btn btn-primary btn-large"
              onClick={() => setCameraActive(true)}
            >
              Start Camera Scanner
            </button>
            {error && <p className="error-message">{error}</p>}
          </div>
        )}

        {/* 1. Camera Mode: Active Scanner */}
        {receiveMode === 'camera' && cameraActive && !transferComplete && (
          <div className="scanner-layout">
            <CameraScanner active={cameraActive} onScan={handleScan} />

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
        {receiveMode === 'manual' && !transferComplete && (
          <div className="manual-pin-card">
            <div className="scan-icon-circle">🔢</div>
            <h2>Manual <span className="italic-emphasis">Collector</span></h2>
            <p>Enter the 6-digit Transfer PIN to verify or paste single frame JSON.</p>

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

        {/* 3. Transfer Complete State */}
        {transferComplete && downloadUrl && (
          <div className="transfer-complete centered-content">
            <div className="success-icon">✓</div>
            <h2>Transfer <span className="italic-emphasis">Complete!</span></h2>
            <p className="success-subtitle">File reassembled seamlessly from all {totalChunks} frames</p>

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
                onClick={handleReset}
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
