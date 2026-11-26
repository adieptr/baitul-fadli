/** Ilustrasi masjid orisinal (SVG) — ringan, tajam di semua layar, tanpa foto stok. */
export function MosqueIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 480" className={className} role="img" aria-label="Ilustrasi Masjid Baitul Fadli">
      <defs>
        <linearGradient id="mi-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecfdf5" />
          <stop offset="1" stopColor="#fefce8" />
        </linearGradient>
        <linearGradient id="mi-dome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#059669" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <pattern id="mi-star" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20 4l4.6 8 9.2.1-4.7 7.9 4.7 8-9.2.1L20 36l-4.6-8-9.2-.1 4.7-7.9-4.7-8 9.2-.1z" fill="#047857" fillOpacity="0.05" />
        </pattern>
      </defs>
      <rect width="640" height="480" fill="url(#mi-sky)" />
      <rect width="640" height="480" fill="url(#mi-star)" />
      {/* matahari pagi & bulan sabit */}
      <circle cx="520" cy="110" r="46" fill="#fde68a" opacity="0.55" />
      <path d="M132 92a30 30 0 1 0 26 45 24 24 0 1 1-26-45z" fill="#d4a017" opacity="0.85" />
      {/* perbukitan */}
      <path d="M0 380c90-40 190-46 300-20s220 26 340-14v134H0z" fill="#d1fae5" />
      {/* menara kiri & kanan */}
      <g fill="#065f46">
        <rect x="128" y="190" width="30" height="190" rx="4" />
        <rect x="122" y="182" width="42" height="12" rx="3" />
        <path d="M143 128l17 54h-34z" />
        <rect x="482" y="190" width="30" height="190" rx="4" />
        <rect x="476" y="182" width="42" height="12" rx="3" />
        <path d="M497 128l17 54h-34z" />
      </g>
      <g fill="#d4a017">
        <circle cx="143" cy="122" r="5" />
        <circle cx="497" cy="122" r="5" />
      </g>
      {/* kubah utama */}
      <path d="M320 120c-14 34-58 52-86 76-24 21-34 46-34 70h240c0-24-10-49-34-70-28-24-72-42-86-76z" fill="url(#mi-dome)" />
      <rect x="317" y="92" width="6" height="30" rx="3" fill="#d4a017" />
      <path d="M326 72a14 14 0 1 0 10 22 11 11 0 1 1-10-22z" fill="#d4a017" />
      {/* badan masjid */}
      <rect x="188" y="262" width="264" height="16" rx="4" fill="#065f46" />
      <rect x="200" y="278" width="240" height="102" fill="#ffffff" />
      <rect x="200" y="278" width="240" height="102" fill="none" stroke="#a7f3d0" strokeWidth="2" />
      {/* lengkungan jendela & pintu */}
      <g fill="#047857">
        <path d="M232 340v-30a14 14 0 0 1 28 0v30z" opacity="0.85" />
        <path d="M380 340v-30a14 14 0 0 1 28 0v30z" opacity="0.85" />
        <path d="M296 380v-52a24 24 0 0 1 48 0v52z" />
      </g>
      {/* kubah kecil */}
      <path d="M206 262c0-20 12-34 28-38 16 4 28 18 28 38z" fill="#10b981" />
      <path d="M378 262c0-20 12-34 28-38 16 4 28 18 28 38z" fill="#10b981" />
      {/* tanah & pepohonan */}
      <rect x="0" y="380" width="640" height="100" fill="#a7f3d0" />
      <rect x="0" y="380" width="640" height="6" fill="#6ee7b7" />
      <g fill="#10b981">
        <circle cx="60" cy="360" r="28" />
        <circle cx="92" cy="368" r="20" />
        <circle cx="580" cy="360" r="28" />
        <circle cx="548" cy="368" r="20" />
      </g>
      <rect x="300" y="380" width="40" height="100" fill="#ecfdf5" opacity="0.8" />
    </svg>
  );
}
