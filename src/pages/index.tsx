'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Home() {
  return (
    <div className="page-container home-page">
      <main className="home-content">
        <div className="hero">
          <div className="hero-logo-wrapper">
            <Logo size="lg" />
          </div>
          <p className="tagline">Share Files, <span className="italic-emphasis">Frame by Frame</span>.</p>
          <div className="protocol-badge">
            <span>🌿 100% Offline Optical Air-Gap Transfer</span>
          </div>
        </div>

        <div className="nav-actions">
          <Link href="/send" className="nav-card sender-card">
            <div className="nav-card-icon">📤</div>
            <h2>Send <span className="italic-emphasis">File</span></h2>
            <p>Select a file and broadcast a high-speed optical QR stream</p>
          </Link>

          <Link href="/receive" className="nav-card receiver-card">
            <div className="nav-card-icon">📥</div>
            <h2>Receive <span className="italic-emphasis">File</span></h2>
            <p>Scan incoming frames via camera or collect with Transfer PIN</p>
          </Link>
        </div>
      </main>

      <footer className="footer">
        <p>100% Offline • No Internet • No Wi-Fi • No Bluetooth • Air-Gapped</p>
      </footer>
    </div>
  );
}
