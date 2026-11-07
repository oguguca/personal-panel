// Emblema do rank (SVG próprio). Fica mais elaborado a cada rank:
// escudo → asas (Jorlan) → coroa (Stronda) → joia (Brandão) → raios (CBum) → fogo (Ganley).
import { useId, useState } from 'react';
import { TIERS, tierSlug } from '../store/tiers';

// Imagem opcional por rank em public/ranks/<slug>.<ext>. Lembra quais não existem.
const EXTS = ['png', 'jpg', 'webp'];
const missing = new Map<string, number>();

const ROMAN = ['★', 'I', 'II', 'III'];
const SHIELD = 'M0,-40 L31,-29 L29,6 C26,25 12,35 0,42 C-12,35 -26,25 -29,6 L-31,-29 Z';
const WING = 'M20,-14 C38,-30 52,-26 60,-36 C60,-14 50,0 26,10 Z M22,2 C38,-4 48,0 56,-6 C52,10 40,20 24,20 Z';
const CROWN = 'M-17,-36 L-12,-52 L-5,-41 L0,-56 L5,-41 L12,-52 L17,-36 Z';
const GEM = 'M0,-14 L12,-2 L0,16 L-12,-2 Z';

interface Props {
  tier: number;
  div?: number;
  size?: number;
  locked?: boolean;
  animate?: boolean;
  title?: string;
}

export default function RankEmblem({ tier, div = 0, size = 96, locked = false, animate = true, title }: Props) {
  const id = useId().replace(/:/g, '');
  const [light, base, dark] = TIERS[tier].colors;
  const g = (n: string) => `url(#${n}${id})`;
  const rays = tier >= 7;
  const wings = tier >= 3;
  const crown = tier >= 5;
  const gem = tier >= 6;
  const legend = tier === TIERS.length - 1;
  const slug = tierSlug(TIERS[tier].name);
  const [ext, setExt] = useState(() => missing.get(slug) ?? 0);
  const photo = !locked && ext < EXTS.length;
  const nextExt = () => {
    missing.set(slug, ext + 1);
    setExt(ext + 1);
  };

  return (
    <svg
      className={`emblem ${locked ? 'locked' : ''} ${animate && !locked ? 'anim' : ''}`}
      width={size}
      height={size}
      viewBox="-64 -64 128 128"
      role="img"
      aria-label={title || TIERS[tier].name}
    >
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.45" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`e${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={dark} />
          <stop offset="1" stopColor={light} />
        </linearGradient>
        <radialGradient id={`a${id}`}>
          <stop offset="0.35" stopColor={base} stopOpacity="0.55" />
          <stop offset="1" stopColor={base} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`c${id}`}><path d={SHIELD} /></clipPath>
        <clipPath id={`p${id}`}><circle cy="-4" r="22" /></clipPath>
      </defs>

      {!locked && <circle r="62" fill={g('a')} className="emblem-aura" />}

      {rays && (
        <g className="emblem-rays" opacity="0.8">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M-3,-40 L0,-62 L3,-40 Z" fill={light} transform={`rotate(${i * 30})`} />
          ))}
        </g>
      )}

      {legend && (
        <g className="emblem-flame" fill="#ffb347" opacity="0.85">
          <path d="M-22,30 C-40,10 -30,-20 -14,-34 C-18,-14 -6,-8 0,-26 C6,-8 18,-14 14,-34 C30,-20 40,10 22,30 Z" />
        </g>
      )}

      {wings && (
        <g fill={g('e')} stroke={dark} strokeWidth="1.5" strokeLinejoin="round">
          <path d={WING} />
          <path d={WING} transform="scale(-1,1)" />
        </g>
      )}

      {crown && <path d={CROWN} fill={g('m')} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />}

      <path d={SHIELD} fill={g('m')} stroke={legend ? '#ffd166' : dark} strokeWidth={legend ? 3 : 2} strokeLinejoin="round" />
      <path d={SHIELD} transform="scale(0.78) translate(0,2)" fill="none" stroke={light} strokeOpacity="0.7" strokeWidth="1.6" />
      {tier >= 1 && <path d="M0,-40 L0,42" stroke={light} strokeOpacity="0.25" strokeWidth="1" />}

      <g clipPath={`url(#c${id})`}>
        <rect className="emblem-shine" x="-70" y="-60" width="18" height="130" fill="#fff" opacity="0.35" transform="skewX(-20)" />
      </g>

      {photo ? (
        <>
          <circle cy="-4" r="24" fill={dark} stroke={light} strokeWidth="2.5" />
          <image
            href={`./ranks/${slug}.${EXTS[ext]}`}
            x="-22" y="-26" width="44" height="44"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#p${id})`}
            onError={nextExt}
          />
          <rect x="-15" y="21" width="30" height="15" rx="4" fill={dark} stroke={light} strokeWidth="1.2" />
          <text y="32.5" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" style={{ fontFamily: 'Georgia, serif' }}>{ROMAN[div]}</text>
        </>
      ) : (
        <>
          {gem ? (
            <path d={GEM} fill={light} stroke={dark} strokeWidth="1.5" className="emblem-gem" />
          ) : (
            <circle r="13" fill={dark} fillOpacity="0.35" stroke={light} strokeOpacity="0.6" />
          )}
          <text y={gem ? 4 : 5} textAnchor="middle" fontSize={div === 3 ? 12 : 14} fontWeight="900" fill={gem ? dark : '#fff'} style={{ fontFamily: 'Georgia, serif' }}>
            {ROMAN[div]}
          </text>
        </>
      )}
    </svg>
  );
}
