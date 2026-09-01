'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FilePicker from '@/components/FilePicker';
import Logo from '@/components/Logo';

export default function SendPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleStartTransfer = () => {
    if (!selectedFile) return;

    (window as any).frameShareSelectedFile = selectedFile;
    router.push('/transfer');
  };

  return (
    <div className="page-container">
      <header className="header">
        <button className="back-btn" onClick={() => router.push('/')}>
          ← Back
        </button>
        <div className="header-logo-title">
          <Logo size="sm" showText={false} />
          <h1>Send File</h1>
        </div>
        <div className="header-spacer"></div>
      </header>

      <main className="main-content">
        {!selectedFile ? (
          <FilePicker onFileSelect={setSelectedFile} />
        ) : (
          <div className="file-confirmation">
            <div className="file-info-card">
              <span className="file-icon">📄</span>
              <div className="file-details">
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="action-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedFile(null)}
              >
                Change File
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStartTransfer}
              >
                Start Transfer 
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
