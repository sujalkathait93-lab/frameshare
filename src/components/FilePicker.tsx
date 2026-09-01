'use client';

import { useCallback, useRef, useState } from 'react';
import { validateFile, formatFileSize, getAcceptString } from '@/services/fileService';

interface FilePickerProps {
  onFileSelect: (file: File) => void;
}

export default function FilePicker({ onFileSelect }: FilePickerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const result = validateFile(file);
      if (!result.valid) {
        setError(result.error || 'Invalid file.');
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragActive(false), []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="file-picker-wrapper">
      <div
        className={`file-picker ${dragActive ? 'drag-active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <div className="file-picker-icon">📁</div>
        <p className="file-picker-text">
          {dragActive ? 'Drop your file here' : 'Drag & drop a file or tap to browse'}
        </p>
        <p className="file-picker-hint">TXT • JPG • JPEG • PNG — Max 20 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={getAcceptString()}
          onChange={handleChange}
          className="file-input-hidden"
        />
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
