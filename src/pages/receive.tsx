'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CameraScanner from '@/components/CameraScanner';
import ProgressBar from '@/components/ProgressBar';
import Logo from '@/components/Logo';
import { parseChunkPayload, reassembleFile } from '@/services/chunkService';
import { formatFileSize } from '@/services/fileService';

export default function ReceivePage() {
  const router = useRouter();

  // App state
  const [cameraActive, setCameraActive] = useState(false);
  const [transferComplete, setTransferComplete] = useState(false);

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
      // Chunk belongs to another transfer ID
      setError(`QR is from transfer PIN ${payload.t}, expected ${transferId}`);
      return;
    }

    // Store chunk if new
    if (!chunksMapRef.current.has(payload.c)) {
      chunksMapRef.current.set(payload.c, payload.d);
      setLastScannedChunk(payload.c + 1);

      // Light haptic feedback if supported
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

  const finishTransfer = (total: number, mimeType: string) => {
    setCameraActive(false);

    try {
      const blob = reassembleFile(chunksMapRef.current, total, mimeType);
      setReconstructedSize(blob.size);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setTransferComplete(true);

      // Haptic celebration
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
    chunksMapRef.current.clear();
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  };

  const handleCancel = () => {
    handleReset();
    router.push('/');
  };

  // Cleanup on unmount
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
          <h1>Receive File</h1>
        </div>
        <div className="header-spacer"></div>
      </header>

      <main className="main-content">
        {/* Initial Prompt */}
        {!cameraActive && !transferComplete && (
          <div className="camera-prompt centered-content">
            <div className="scan-icon-circle">📷</div>
            <h2>Ready to Scan</h2>
            <p>Point your camera directly at the sender's QR code screen.</p>
            <button
              className="btn btn-primary btn-large"
              onClick={() => setCameraActive(true)}
            >
              Start Camera Scanner
            </button>
            {error && <p className="error-message">{error}</p>}
          </div>
        )}

        {/* Live Camera Scanner */}
        {cameraActive && !transferComplete && (
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
                        ? 'Assembling…'
                        : `${remainingChunks} chunks remaining`}
                    </span>
                  </div>

                  <p className="receiving-title">
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
                  <p>Searching for FrameShare QR code…</p>
                  <p className="subtitle">Hold your phone steady in front of the sender</p>
                  {error && <p className="error-message">{error}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete State */}
        {transferComplete && downloadUrl && (
          <div className="transfer-complete centered-content">
            <div className="success-icon">✓</div>
            <h2>Transfer Complete!</h2>
            <p className="success-subtitle">File reassembled successfully from all {totalChunks} frames</p>

            <div className="file-info-card success-card">
              <span className="file-icon">📄</span>
              <div className="file-details">
                <p className="file-name">{fileName}</p>
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
