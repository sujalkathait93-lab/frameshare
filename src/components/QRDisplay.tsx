'use client';

import { useEffect, useRef, useState } from 'react';
import { renderQRToCanvas } from '@/services/qrService';

interface QRDisplayProps {
  data: string;
  size?: number;
  isExpanded?: boolean;
}

export default function QRDisplay({ data, size = 360, isExpanded = false }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    let active = true;
    const targetSize = isExpanded ? 480 : size;

    renderQRToCanvas(canvasRef.current, data, targetSize)
      .then(() => {
        if (active) setIsRendered(true);
      })
      .catch((err) => {
        console.error('Failed to render QR to canvas', err);
      });

    return () => {
      active = false;
    };
  }, [data, size, isExpanded]);

  return (
    <div className={`qr-display ${isExpanded ? 'qr-expanded' : ''}`}>
      <canvas
        ref={canvasRef}
        className="qr-canvas"
        style={{
          width: isExpanded ? 'min(90vw, 480px)' : `min(85vw, ${size}px)`,
          height: isExpanded ? 'min(90vw, 480px)' : `min(85vw, ${size}px)`,
        }}
      />
      {!isRendered && <div className="qr-placeholder">Generating QR…</div>}
    </div>
  );
}
