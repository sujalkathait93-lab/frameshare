'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QRDisplay from '@/components/QRDisplay';
import ProgressBar from '@/components/ProgressBar';
import Logo from '@/components/Logo';
import { splitIntoChunks, createChunkPayload } from '@/services/chunkService';
import { generateTransferId, formatFileSize } from '@/services/fileService';

type TransferSpeed = 150 | 250 | 350 | 500;
type TransferStatus = 'INITIALIZING' | 'TRANSFERRING' | 'PAUSED' | 'VERIFYING' | 'COMPLETED' | 'CANCELLED';

export default function TransferPage() {
  const router = useRouter();

  // Local File in memory (never uploaded to any server)
  const [file, setFile] = useState<File | null>(null);
  const [transferId, setTransferId] = useState<string>('');
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('INITIALIZING');
  const [speed, setSpeed] = useState<TransferSpeed>(250);
  const [loopCount, setLoopCount] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  // References to prevent memory leaks and race conditions
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isProcessingLockRef = useRef<boolean>(false);

  /**
   * Initializes or restarts a completely fresh transfer session.
   * Resets all progress to 0% and creates a new transfer PIN.
   */
  const startTransferSession = useCallback((targetFile: File) => {
    // 1. Session Processing Lock
    if (isProcessingLockRef.current) return;
    isProcessingLockRef.current = true;

    // 2. Abort previous session if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 3. Create fresh AbortController & State
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const newTransferId = generateTransferId();
    setTransferId(newTransferId);
    setCurrentFrame(0);
    setLoopCount(1);
    setTransferStatus('INITIALIZING');

    // 4. Read and slice file in browser memory
    const reader = new FileReader();
    reader.onload = (e) => {
      if (abortController.signal.aborted) return;

      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        const chunkBase64Strings = splitIntoChunks(arrayBuffer);

        if (abortController.signal.aborted) return;

        const payloads = chunkBase64Strings.map((base64Data, index) =>
          createChunkPayload(
            newTransferId,
            targetFile.name,
            targetFile.type,
            index,
            chunkBase64Strings.length,
            base64Data,
          ),
        );

        if (!abortController.signal.aborted) {
          setChunks(payloads);
          setTransferStatus('TRANSFERRING');
        }
      }
      isProcessingLockRef.current = false;
    };

    reader.onerror = () => {
      isProcessingLockRef.current = false;
      setTransferStatus('CANCELLED');
    };

    reader.readAsArrayBuffer(targetFile);
  }, []);

  // Initial Load from Send Page
  useEffect(() => {
    const selectedFile = (window as any).frameShareSelectedFile as File;
    if (!selectedFile) {
      router.replace('/send');
      return;
    }

    setFile(selectedFile);
    startTransferSession(selectedFile);

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router, startTransferSession]);

  // Optical Broadcast Frame Rotation
  useEffect(() => {
    if (transferStatus !== 'TRANSFERRING' || chunks.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => {
        if (transferStatus !== 'TRANSFERRING') return prev;

        const next = prev + 1;
        // 100% STOP GUARANTEE: Terminate chunk loop at the final chunk.
        if (next >= chunks.length) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // The final chunk must be the final chunk. 
          // Schedule state transition to COMPLETED cleanly outside the render cycle.
          setTimeout(() => setTransferStatus('COMPLETED'), 0);
          return prev;
        }
        return next;
      });
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [transferStatus, chunks.length, speed]);

  // Immediate 100% Cancellation Logic
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTransferStatus('CANCELLED');
  };

  // Mark Completed / Finish Transmission
  const handleComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTransferStatus('COMPLETED');
  };

  // Reuse the Same Local File Object with a completely fresh session
  const handleSendAgain = () => {
    if (file) {
      startTransferSession(file);
    }
  };

  const handleChooseAnotherFile = () => {
    handleCancel();
    (window as any).frameShareSelectedFile = null;
    router.push('/send');
  };

  const togglePlay = () => {
    setTransferStatus((prev) => (prev === 'TRANSFERRING' ? 'PAUSED' : 'TRANSFERRING'));
  };

  const handlePrevFrame = () => {
    setTransferStatus('PAUSED');
    setCurrentFrame((prev) => (prev > 0 ? prev - 1 : chunks.length - 1));
  };

  const handleNextFrame = () => {
    setTransferStatus('PAUSED');
    setCurrentFrame((prev) => (prev + 1) % chunks.length);
  };

  const fps = (1000 / speed).toFixed(1);
  const formattedId = transferId.replace(/(\d{3})(\d{3})/, '$1 $2');

  // 1. Initializing State
  if (transferStatus === 'INITIALIZING') {
    return (
      <div className="page-container centered-content">
        <div className="loading-card">
          <div className="spinner"></div>
          <h2>Preparing <span className="italic-emphasis">Optical Frames...</span></h2>
          <p className="subtitle">Slicing file into high-density binary chunks</p>
        </div>
      </div>
    );
  }

  // 2. Cancelled State (With Send Again / Reuse option)
  if (transferStatus === 'CANCELLED') {
    return (
      <div className="page-container centered-content">
        <div className="loading-card" style={{ borderColor: 'var(--accent-terracotta)' }}>
          <div className="scan-icon-circle" style={{ color: 'var(--accent-terracotta)' }}>✕</div>
          <h2>Transfer <span className="italic-emphasis">Cancelled</span></h2>
          <p className="subtitle" style={{ marginBottom: '2rem' }}>
            All active frame processing stopped. No file data was stored.
          </p>

          <div className="action-buttons full-width">
            <button className="btn btn-primary btn-large" onClick={handleSendAgain}>
              🔁 Send Again (New Session)
            </button>
            <button className="btn btn-secondary" onClick={handleChooseAnotherFile}>
              📁 Choose Another File
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Completed State (With Send Again / Reuse option)
  if (transferStatus === 'COMPLETED') {
    return (
      <div className="page-container centered-content">
        <div className="loading-card">
          <div className="success-icon">✓</div>
          <h2>Broadcast <span className="italic-emphasis">Completed!</span></h2>
          <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
            Chunk loop terminated at 100%. All frames dispatched.
          </p>

          <div className="file-info-card success-card" style={{ margin: '0 auto 2rem' }}>
            <span className="file-icon">📄</span>
            <div className="file-details">
              <p className="file-name font-serif">{file?.name}</p>
              <p className="file-size">{file ? formatFileSize(file.size) : ''}</p>
            </div>
          </div>

          <div className="action-buttons full-width">
            <button className="btn btn-primary btn-large" onClick={handleSendAgain}>
              🔁 Send Again (New Session)
            </button>
            <button className="btn btn-secondary" onClick={handleChooseAnotherFile}>
              📁 Choose Another File
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Active Transferring / Paused State
  return (
    <div className={`page-container ${isExpanded ? 'fullscreen-mode' : ''}`}>
      <header className="header">
        <button className="back-btn" onClick={handleCancel}>
          ✕ Cancel Transfer
        </button>
        <div className="header-logo-title">
          <Logo size="sm" showText={false} />
          <h1>Broadcasting <span className="italic-emphasis">Frames</span></h1>
        </div>
        <div className="header-spacer"></div>
      </header>

      <main className="main-content qr-transfer-screen">
        {/* Top Info Bar */}
        <div className="transfer-header-badge">
          <span className="badge badge-pin">
            Transfer PIN: <strong>{formattedId}</strong>
          </span>
          <span className="badge badge-loop">
            Loop #{loopCount}
          </span>
        </div>

        {/* QR Code Container */}
        <div className={`qr-container ${isExpanded ? 'qr-container-expanded' : ''}`}>
          <QRDisplay data={chunks[currentFrame]} isExpanded={isExpanded} />

          <button
            className="expand-toggle-btn"
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Shrink View' : 'Full Frame QR'}
          >
            {isExpanded ? '⤢ Standard Size' : '⤢ Expand QR'}
          </button>
        </div>

        {/* Playback & Frame Controls */}
        <div className="playback-controls">
          <button className="ctrl-btn" onClick={handlePrevFrame} title="Previous Frame">
            ◀
          </button>
          <button
            className={`ctrl-btn play-btn ${transferStatus === 'TRANSFERRING' ? 'active' : 'paused'}`}
            onClick={togglePlay}
            title={transferStatus === 'TRANSFERRING' ? 'Pause Rotation' : 'Resume Rotation'}
          >
            {transferStatus === 'TRANSFERRING' ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="ctrl-btn" onClick={handleNextFrame} title="Next Frame">
            ▶
          </button>
        </div>

        {/* Speed Selector */}
        <div className="speed-selector-group">
          <span className="speed-label">Speed:</span>
          <div className="speed-options">
            <button
              className={`speed-btn ${speed === 500 ? 'active' : ''}`}
              onClick={() => setSpeed(500)}
            >
              Slow (2 FPS)
            </button>
            <button
              className={`speed-btn ${speed === 350 ? 'active' : ''}`}
              onClick={() => setSpeed(350)}
            >
              Normal (3 FPS)
            </button>
            <button
              className={`speed-btn ${speed === 250 ? 'active' : ''}`}
              onClick={() => setSpeed(250)}
            >
              Fast (4 FPS)
            </button>
            <button
              className={`speed-btn ${speed === 150 ? 'active' : ''}`}
              onClick={() => setSpeed(150)}
            >
              ⚡ Turbo (6.6 FPS)
            </button>
          </div>
        </div>

        {/* Progress and Stats */}
        <div className="transfer-info">
          <ProgressBar
            current={currentFrame + 1}
            total={chunks.length}
            label={`Frame ${currentFrame + 1} of ${chunks.length}`}
          />

          <div className="transfer-meta-grid">
            <div className="meta-item">
              <span className="meta-label">File</span>
              <span className="meta-value">{file?.name}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Rate</span>
              <span className="meta-value">{fps} frames/sec</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Status</span>
              <span className="meta-value">{transferStatus}</span>
            </div>
          </div>

          <div className="action-buttons" style={{ marginTop: '1.25rem' }}>
            <button className="btn btn-secondary" onClick={handleComplete}>
              ✓ Finish Transmission
            </button>
          </div>

          <p className="hint-text">
            💡 Frames stream continuously until the receiver scans all chunks. Zero data is stored on any server.
          </p>
        </div>
      </main>
    </div>
  );
}
