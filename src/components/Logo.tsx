// Marca do Parpi Day: um sol nascendo no horizonte (o dia começando). Uma cor só, sem degradê.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill="var(--primary)" />
      <g stroke="var(--logo-ink)" strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M32 13v6M15.5 21.5l4.2 4.2M48.5 21.5l-4.2 4.2M9 46h46" />
      </g>
      <path d="M20 41a12 12 0 0 1 24 0z" fill="var(--logo-ink)" />
    </svg>
  );
}

export default function Logo() {
  return (
    <div className="brand" aria-label="Parpi Day">
      <LogoMark />
      <span className="brand-word">
        Parpi<span>Day</span>
      </span>
    </div>
  );
}
