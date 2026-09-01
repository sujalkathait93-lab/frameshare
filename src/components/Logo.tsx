'use client';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const iconSizes = {
    sm: 36,
    md: 52,
    lg: 84,
  };

  const currentIconSize = iconSizes[size];

  return (
    <div className={`frameshare-logo logo-${size} ${className}`}>
      <svg
        viewBox="0 0 160 160"
        width={currentIconSize}
        height={currentIconSize}
        className="logo-icon-svg"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00A3FF" />
            <stop offset="100%" stopColor="#0052FF" />
          </linearGradient>
          <filter id="logoGlow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0052FF" floodOpacity="0.35" />
          </filter>
        </defs>

        <g filter="url(#logoGlow)">
          <rect x="10" y="10" width="140" height="140" rx="36" fill="url(#logoGrad)" />

          {/* Viewfinder Corners */}
          <path d="M 34 60 L 34 46 A 12 12 0 0 1 46 34 L 60 34" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 100 34 L 114 34 A 12 12 0 0 1 126 46 L 126 60" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 34 100 L 34 114 A 12 12 0 0 0 46 126 L 60 126" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 100 126 L 114 126 A 12 12 0 0 0 126 114 L 126 100" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

          {/* Optical Motion Lines */}
          <path d="M 18 72 L 36 72" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.95" />
          <path d="M 10 80 L 36 80" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.95" />
          <path d="M 22 88 L 36 88" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.95" />

          {/* Center White QR Background Card */}
          <rect x="46" y="46" width="68" height="68" rx="10" fill="#ffffff" />

          {/* Top-Left QR Finder */}
          <rect x="52" y="52" width="17" height="17" rx="3" fill="none" stroke="#0b132b" strokeWidth="2.5" />
          <rect x="56.5" y="56.5" width="8" height="8" rx="1.5" fill="#0b132b" />

          {/* Top-Right QR Finder */}
          <rect x="89" y="52" width="17" height="17" rx="3" fill="none" stroke="#0b132b" strokeWidth="2.5" />
          <rect x="93.5" y="56.5" width="8" height="8" rx="1.5" fill="#0b132b" />

          {/* Bottom-Left QR Finder */}
          <rect x="52" y="89" width="17" height="17" rx="3" fill="none" stroke="#0b132b" strokeWidth="2.5" />
          <rect x="56.5" y="93.5" width="8" height="8" rx="1.5" fill="#0b132b" />

          {/* QR Internal Matrix Dots */}
          <rect x="73" y="54" width="4" height="4" rx="1" fill="#0b132b" />
          <rect x="80" y="54" width="4" height="4" rx="1" fill="#0b132b" />
          <rect x="73" y="62" width="4" height="8" rx="1" fill="#0b132b" />
          <rect x="81" y="64" width="4" height="4" rx="1" fill="#0b132b" />

          <rect x="54" y="74" width="8" height="4" rx="1" fill="#0b132b" />
          <rect x="66" y="74" width="4" height="4" rx="1" fill="#0b132b" />

          {/* Central Optical Data Cell */}
          <rect x="74" y="74" width="10" height="10" rx="2" fill="#0052FF" />

          <rect x="88" y="74" width="8" height="4" rx="1" fill="#0b132b" />
          <rect x="98" y="74" width="4" height="8" rx="1" fill="#0b132b" />

          <rect x="74" y="88" width="4" height="8" rx="1" fill="#0b132b" />
          <rect x="82" y="88" width="8" height="4" rx="1" fill="#0b132b" />
          <rect x="82" y="96" width="16" height="8" rx="1.5" fill="#0b132b" />
          <rect x="94" y="86" width="8" height="6" rx="1.5" fill="#0b132b" />
        </g>
      </svg>

      {showText && (
        <span className="logo-text">
          <span className="logo-text-frame">Frame</span>
          <span className="logo-text-share">Share</span>
        </span>
      )}
    </div>
  );
}
