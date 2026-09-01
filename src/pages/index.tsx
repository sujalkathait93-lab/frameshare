import Link from 'next/link';

export default function Home() {
  return (
    <div className="page-container home-page">
      <main className="home-content">
        <div className="hero">
          <h1 className="logo">FrameShare</h1>
          <p className="tagline">Share Files, Frame by Frame.</p>
        </div>

        <div className="nav-actions">
          <Link href="/send" className="nav-card sender-card">
            <div className="nav-card-icon">📤</div>
            <h2>Send File</h2>
            <p>Select a file and display QR codes</p>
          </Link>

          <Link href="/receive" className="nav-card receiver-card">
            <div className="nav-card-icon">📥</div>
            <h2>Receive File</h2>
            <p>Scan QR codes to get a file</p>
          </Link>
        </div>
      </main>
      
      <footer className="footer">
        <p>100% Offline • No Servers • No Cables</p>
      </footer>
    </div>
  );
}
