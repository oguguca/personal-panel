// Copo que enche conforme a água bebida.
export default function WaterCup({ value, goal, size = 160 }) {
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0;
  const top = 18, bottom = 150;
  const level = bottom - (bottom - top) * ratio;
  const id = `cup-${size}`;
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 128 160" role="img" aria-label={`${Math.round(ratio * 100)}% da meta`}>
      <defs>
        <clipPath id={id}>
          <path d="M14 14 L114 14 L102 150 Q101 154 96 154 L32 154 Q27 154 26 150 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="0" width="128" height="160" fill="var(--water-soft)" />
        <g style={{ transform: `translateY(${level}px)`, transition: 'transform 0.6s ease' }}>
          <path
            className="cup-wave"
            d="M-20 4 Q 0 -4 20 4 T 60 4 T 100 4 T 140 4 T 180 4 V 200 H -20 Z"
            fill="var(--water)"
            opacity="0.9"
          />
        </g>
      </g>
      <path
        d="M14 14 L114 14 L102 150 Q101 154 96 154 L32 154 Q27 154 26 150 Z"
        fill="none"
        stroke="var(--water)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <text x="64" y="92" textAnchor="middle" fontSize="22" fontWeight="700" fill={ratio > 0.45 ? '#fff' : 'var(--water)'}>
        {Math.round(ratio * 100)}%
      </text>
    </svg>
  );
}
