'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FilePicker from '@/components/FilePicker';

export default function SendPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleStartTransfer = () => {
    if (!selectedFile) return;

    // A hacky but effective way to pass the File object between Next.js pages
    // without using a global store or context for V1.
    // In a production app with Next.js app router, you'd likely use Zustand or Context.
    // However, since we're using pages router, this is the simplest way.
    (window as any).frameShareSelectedFile = selectedFile;
    router.push('/transfer');
  };

  return (
    <div className="page-container">
      <header className="header">
        <button className="back-btn" onClick={() => router.push('/')}>
          ← Back
        </button>
        <h1>Send File</h1>
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
