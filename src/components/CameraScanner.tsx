'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface CameraScannerProps {
  onScan: (data: string) => void;
  active: boolean;
}

/**
 * Opens the rear camera, continuously scans for QR codes using jsQR,
 * and fires `onScan` with the decoded payload string for each frame.
 * 
 * Uses refs for the callback to avoid stale-closure bugs in the
 * requestAnimationFrame loop.
 */
export default function CameraScanner({ onScan, active }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState<string | null>(null);

  // Keep the callback ref current on every render
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Continuous QR scan loop
        const scan = () => {
          if (cancelled) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0);

              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });

              if (code && code.data) {
                onScanRef.current(code.data);
              }
            }
          }

          animFrameRef.current = requestAnimationFrame(scan);
        };

        animFrameRef.current = requestAnimationFrame(scan);
      } catch {
        if (!cancelled) {
          setError('Camera permission is required to receive a file.');
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [active]);

  if (error) {
    return <div className="error-message camera-error">{error}</div>;
  }

  return (
    <div className="camera-container">
      <video ref={videoRef} className="camera-video" playsInline muted />
      <canvas ref={canvasRef} className="camera-canvas" />
      <div className="camera-overlay">
        <div className="scan-region" />
      </div>
    </div>
  );
}
