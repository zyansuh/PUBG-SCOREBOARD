export function Battlefield() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#070b12]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_82%_68%,rgba(255,150,50,0.38),transparent_42%),radial-gradient(ellipse_at_12%_78%,rgba(70,80,40,0.28),transparent_46%),linear-gradient(180deg,#243246_0%,#121924_42%,#07090d_100%)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky-haze" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1c2838" />
            <stop offset="100%" stopColor="#0b1018" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sunset" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffd27a" stopOpacity="0.15" />
            <stop offset="55%" stopColor="#ff8a32" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ff8a32" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff1c4" />
            <stop offset="45%" stopColor="#ffb347" />
            <stop offset="100%" stopColor="#ff7a18" stopOpacity="0" />
          </radialGradient>
        </defs>
        <symbol id="chute" viewBox="0 0 90 120">
          <path d="M8 48 Q45 4 82 48 Q45 34 8 48" fill="#2c3648" />
          <path d="M18 48 Q45 14 72 48 Q45 36 18 48" fill="#46536b" />
          <path d="M30 48 Q45 22 60 48" fill="#1c2432" opacity="0.45" />
          <path d="M20 48 L45 96 L70 48" fill="none" stroke="#0d1118" strokeWidth="1.4" />
          <circle cx="45" cy="100" r="3.2" fill="#11161e" />
        </symbol>
        <rect width="1600" height="900" fill="url(#sky-haze)" opacity="0.35" />
        <ellipse cx="1280" cy="560" rx="220" ry="120" fill="url(#sun)" />
        <rect x="1040" y="430" width="560" height="220" fill="url(#sunset)" />

        <g opacity="0.9">
          <path d="M0 620 L180 560 L260 590 L390 500 L470 545 L560 470 L640 520 L760 430 L820 500 L900 470 L900 900 L0 900 Z" fill="#141910" />
          <path d="M40 640 L90 520 L110 560 L150 470 L175 530 L230 455 L250 590 Z" fill="#1c2414" />
          <path d="M118 500 V390 H136 V470 H168 V390 H186 V500 Z" fill="#2a2418" />
          <path d="M132 390 L152 348 L172 390 Z" fill="#3a3224" />
          <rect x="146" y="348" width="12" height="28" fill="#4a4030" />
          <rect x="70" y="560" width="36" height="28" fill="#241c14" />
          <rect x="200" y="575" width="48" height="24" fill="#2a2016" />
          <rect x="300" y="545" width="40" height="34" fill="#1a1612" />
        </g>

        <g opacity="0.85">
          <path d="M980 640 L1120 600 L1280 630 L1460 560 L1600 610 L1600 900 L980 900 Z" fill="#1a140e" />
          <g transform="translate(1360 600)" fill="#1b1a18">
            <rect x="0" y="18" width="54" height="22" rx="3" />
            <rect x="28" y="8" width="22" height="14" />
            <circle cx="12" cy="42" r="6" />
            <circle cx="40" cy="42" r="6" />
          </g>
        </g>

        <use href="#chute" x="150" y="70" width="90" height="120" opacity="0.85" />
        <use href="#chute" x="310" y="150" width="68" height="90" opacity="0.75" />
        <use href="#chute" x="1180" y="90" width="90" height="120" />
        <use href="#chute" x="1320" y="180" width="70" height="94" opacity="0.7" />
        <use href="#chute" x="1460" y="80" width="60" height="80" />

        <g transform="translate(1180 70) scale(1.15)" fill="#1a1f27" opacity="0.92">
          <path d="M10 48 L150 40 L210 46 L230 52 L150 58 L120 70 L96 58 L40 62 Z" />
          <path d="M150 42 L210 18 L214 28 L168 48 Z" />
          <path d="M78 50 L104 28 L112 34 L90 54 Z" />
          <path d="M40 56 L58 78 L70 74 L52 52 Z" />
          <rect x="24" y="46" width="18" height="8" fill="#2a313c" />
        </g>

        <g transform="translate(20 640)">
          <ellipse cx="150" cy="210" rx="170" ry="36" fill="#05070a" opacity="0.55" />
          <path d="M70 150 C40 90 80 40 130 48 C150 10 210 20 230 70 C280 40 330 90 300 150 C250 130 190 170 140 160 C110 180 80 170 70 150 Z" fill="#2a3038" />
          <path d="M120 78 C150 50 210 58 230 92 C200 70 150 74 120 78 Z" fill="#10141a" />
          <path d="M128 86 C160 68 206 74 220 98" fill="none" stroke="#8d97a6" strokeWidth="4" opacity="0.55" />
          <path d="M96 120 C70 150 90 190 140 176" fill="none" stroke="#11151b" strokeWidth="10" />
          <circle cx="214" cy="64" r="7" fill="#3c4654" />
        </g>

        <g transform="translate(1320 690)">
          <rect x="18" y="70" width="150" height="90" fill="#6a3a22" />
          <rect x="18" y="70" width="150" height="14" fill="#8a4e2c" />
          <path d="M8 78 L90 28 L176 74 L150 84 L90 48 L30 84 Z" fill="#1d4f8c" />
          <path d="M90 28 L176 74 L150 70 L90 40 Z" fill="#2f6cb8" />
          <path d="M34 92 H150 M34 114 H150 M34 136 H150" stroke="#4a2816" strokeWidth="3" />
        </g>

        <path d="M-40 -20 L280 40 L210 120 L-20 80 Z" fill="#F2A900" opacity="0.92" />
        <path d="M40 -30 L360 20 L300 90 L10 40 Z" fill="#FFC800" />
        <path d="M-80 760 L420 820 L360 900 L-80 900 Z" fill="#F2A900" />
        <path d="M1180 820 L1680 760 L1680 900 L1100 900 Z" fill="#E0A000" opacity="0.9" />
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.62),rgba(0,0,0,0.18)_58%,rgba(0,0,0,0.5))]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.45)_0.6px,transparent_0.6px)] [background-size:3px_3px]" />
    </div>
  );
}
