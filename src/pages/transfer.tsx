'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QRDisplay from '@/components/QRDisplay';
import ProgressBar from '@/components/ProgressBar';
import { splitIntoChunks, createChunkPayload } from '@/services/chunkService';

type TransferSpeed = 150 | 250 | 350 | 500;

export default function TransferPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [transferId, setTransferId] = useState<string>('');
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<TransferSpeed>(250); // Default Fast (250ms = 4 FPS)
  const [loopCount, setLoopCount] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  // Interval reference for frame rotation
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Retrieve the file passed from the Send page
    const selectedFile = (window as any).frameShareSelectedFile as File;

    if (!selectedFile) {
      router.replace('/send');
      return;
    }

    setFile(selectedFile);

    // Import from fileService
    import('@/services/fileService').then(({ generateTransferId }) => {
      const newTransferId = generateTransferId();
      setTransferId(newTransferId);

      // Read the file as an ArrayBuffer
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          const chunkBase64Strings = splitIntoChunks(arrayBuffer);

          // Pre-calculate all JSON payloads
          const payloads = chunkBase64Strings.map((base64Data, index) =>
            createChunkPayload(
              newTransferId,
              selectedFile.name,
              selectedFile.type,
              index,
              chunkBase64Strings.length,
              base64Data,
            ),
          );

          setChunks(payloads);
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    });

    // Cleanup when component unmounts
    return () => {
      (window as any).frameShareSelectedFile = null;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router]);

  // Frame rotation logic
  useEffect(() => {
    if (isProcessing || chunks.length === 0 || !isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1;
        if (next >= chunks.length) {
          setLoopCount((l) => l + 1);
          return 0;
        }
        return next;
      });
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isProcessing, chunks.length, isPlaying, speed]);

  const handleCancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.push('/');
  };

  const handlePrevFrame = () => {
    setIsPlaying(false);
    setCurrentFrame((prev) => (prev > 0 ? prev - 1 : chunks.length - 1));
  };

  const handleNextFrame = () => {
    setIsPlaying(false);
    setCurrentFrame((prev) => (prev + 1) % chunks.length);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  if (isProcessing) {
    return (
      <div className="page-container centered-content">
        <div className="loading-card">
          <div className="spinner"></div>
          <h2>Encoding File to Frames...</h2>
          <p className="subtitle">Optimizing QR payload for maximum transfer speed</p>
        </div>
      </div>
    );
  }

  const fps = (1000 / speed).toFixed(1);
  const formattedId = transferId.replace(/(\d{3})(\d{3})/, '$1 $2');

  return (
    <div className={`page-container ${isExpanded ? 'fullscreen-mode' : ''}`}>
      <header className="header">
        <button className="back-btn" onClick={handleCancel}>
          ✕ Close Transfer
        </button>
        <h1>Broadcasting Frames</h1>
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
          <button 
            className="ctrl-btn" 
            onClick={handlePrevFrame}
            title="Previous Frame"
          >
            ◀
          </button>
          <button 
            className={`ctrl-btn play-btn ${isPlaying ? 'active' : 'paused'}`} 
            onClick={togglePlay}
            title={isPlaying ? 'Pause Rotation' : 'Resume Rotation'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button 
            className="ctrl-btn" 
            onClick={handleNextFrame}
            title="Next Frame"
          >
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
            label={`Broadcasting Frame ${currentFrame + 1} of ${chunks.length}`}
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
              <span className="meta-value">{isPlaying ? 'Streaming' : 'Paused'}</span>
            </div>
          </div>

          <p className="hint-text">
            💡 Keep this screen visible to the receiver phone. Frames loop continuously until complete.
          </p>
        </div>
      </main>
    </div>
  );
}
