// Emblema do rank (SVG próprio). Fica mais elaborado a cada rank:
// escudo → asas (Balestrin) → coroa (Stronda) → joia (Brandão) → raios (CBum) → fogo (Ganley).
import { useEffect, useId, useState } from 'react';
import { TIERS, tierSlug } from '../store/tiers';

// Imagem opcional por rank em public/ranks/<slug>.<ext>.
// Testa uma vez por rank (png, jpg, webp) e guarda o resultado: null = sem imagem.
const EXTS = ['png', 'jpg', 'webp'];
const found = new Map<string, Promise<string | null>>();
function findPortrait(slug: string): Promise<string | null> {
  if (!found.has(slug)) {
    const tryExt = (i: number): Promise<string | null> =>
      i >= EXTS.length
        ? Promise.resolve(null)
        : new Promise((ok) => {
            const url = `./ranks/${slug}.${EXTS[i]}`;
            const img = new Image();
            img.onload = () => ok(url);
            img.onerror = () => ok(tryExt(i + 1));
            img.src = url;
          });
    found.set(slug, tryExt(0));
  }
  return found.get(slug)!;
}

export function usePortrait(slug: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    findPortrait(slug).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [slug]);
  return url;
}

const ROMAN = ['★', 'I', 'II', 'III', 'IV', 'V'];
const SHIELD = 'M0,-40 L31,-29 L29,6 C26,25 12,35 0,42 C-12,35 -26,25 -29,6 L-31,-29 Z';
const WING = 'M20,-14 C38,-30 52,-26 60,-36 C60,-14 50,0 26,10 Z M22,2 C38,-4 48,0 56,-6 C52,10 40,20 24,20 Z';
const CROWN = 'M-17,-36 L-12,-52 L-5,-41 L0,-56 L5,-41 L12,-52 L17,-36 Z';
const GEM = 'M0,-14 L12,-2 L0,16 L-12,-2 Z';

// Asa de anjo (lado direito): penas penduradas ao longo de um arco que sobe para fora.
// Ponto no arco (Bézier quadrática): raiz (18,-6) → controle (46,-62) → ponta (92,-56).
const arm = (t: number): [number, number] => {
  const u = 1 - t;
  return [u * u * 18 + 2 * u * t * 46 + t * t * 92, u * u * -6 + 2 * u * t * -62 + t * t * -56];
};
// [t no arco, ângulo da pena (90 = para baixo), comprimento, largura]
const layer = (n: number, t0: number, t1: number, a0: number, a1: number, l0: number, l1: number, w: number) =>
  Array.from({ length: n }, (_, i) => {
    const k = i / (n - 1);
    return [t0 + (t1 - t0) * k, a0 + (a1 - a0) * k, l0 + (l1 - l0) * k, w] as const;
  });
const ANGEL_LAYERS = [
  layer(11, 0.1, 1, 100, 18, 40, 52, 7), // penas grandes (de trás)
  layer(9, 0.05, 0.85, 105, 40, 30, 36, 7),
  layer(8, 0.05, 0.75, 110, 60, 18, 20, 6.5),
];
const ARM = 'M18,-6 Q46,-62 92,-56';
const feather = (l: number, w: number) =>
  `M0,0 C${l * 0.25},${-w} ${l * 0.75},${-w * 0.8} ${l},0 C${l * 0.75},${w * 0.8} ${l * 0.25},${w} 0,0 Z`;
const SPARKLES: [number, number, number, number][] = [
  [-62, -40, 1, 0], [64, -46, 1.2, 0.6], [-70, 18, 0.8, 1.2], [70, 12, 0.9, 1.8],
  [-38, -70, 0.7, 0.9], [40, -72, 0.8, 1.5], [-50, 52, 0.7, 2.1], [52, 50, 0.8, 0.3],
];
const STAR = 'M0,-6 C0.8,-1.2 1.2,-0.8 6,0 C1.2,0.8 0.8,1.2 0,6 C-0.8,1.2 -1.2,0.8 -6,0 C-1.2,-0.8 -0.8,-1.2 0,-6 Z';

function AngelWing({ grad, glow }: { grad: string; glow: string }) {
  return (
    <g className="angel-wing" filter={glow}>
      {ANGEL_LAYERS.map((ly, li) => (
        <g key={li}>
          {ly.map(([t, ang, l, w], i) => {
            const [x, y] = arm(t);
            return <path key={i} d={feather(l, w)} transform={`translate(${x},${y}) rotate(${ang})`} fill={grad} stroke="#c9961a" strokeOpacity="0.8" strokeWidth="0.8" />;
          })}
        </g>
      ))}
      <path d={ARM} fill="none" stroke="#fffdf4" strokeWidth="7" strokeLinecap="round" />
      <path d={ARM} fill="none" stroke="#f5c542" strokeWidth="1.6" strokeLinecap="round" transform="translate(0,-3)" />
    </g>
  );
}

interface Props {
  tier: number;
  div?: number;
  size?: number;
  locked?: boolean;
  animate?: boolean;
  title?: string;
  /** não mostra a imagem dentro do escudo (quando ela já aparece em volta) */
  noPhoto?: boolean;
}

export default function RankEmblem({ tier, div = 0, size = 96, locked = false, animate = true, title, noPhoto = false }: Props) {
  const id = useId().replace(/:/g, '');
  const [light, base, dark] = TIERS[tier].colors;
  const g = (n: string) => `url(#${n}${id})`;
  const rays = tier >= 7;
  const wings = tier >= 3;
  const crown = tier >= 5 && tier < TIERS.length - 1;
  const gem = tier >= 6;
  const legend = tier === TIERS.length - 1;
  const slug = tierSlug(TIERS[tier].name);
  const found = usePortrait(slug);
  const photo = noPhoto ? null : found;

  return (
    <svg
      className={`emblem ${locked ? 'locked' : ''} ${animate && !locked ? 'anim' : ''}`}
      width={size}
      height={legend ? Math.round((size * 180) / 244) : size}
      viewBox={legend ? '-122 -104 244 180' : '-64 -64 128 128'}
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
        <clipPath id={`p${id}`}><circle cy="-2" r="29" /></clipPath>
        <linearGradient id={`w${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#fff6dc" />
          <stop offset="1" stopColor="#f5c542" />
        </linearGradient>
        <filter id={`g${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g className="emblem-art">
      {!locked && <circle r={legend ? 80 : 62} fill={g('a')} className="emblem-aura" />}

      {legend && (
        <g className="angel-beams" opacity="0.3">
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d="M-4,-30 L0,-84 L4,-30 Z" fill="#ffe7a3" transform={`rotate(${i * 22.5})`} />
          ))}
        </g>
      )}

      {rays && !legend && (
        <g className="emblem-rays" opacity="0.8">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M-3,-40 L0,-62 L3,-40 Z" fill={light} transform={`rotate(${i * 30})`} />
          ))}
        </g>
      )}

      {legend && (
        <>
          <g className="angel-side right"><g transform="translate(18,-6) scale(0.82) translate(-18,6)"><AngelWing grad={g('w')} glow={g('g')} /></g></g>
          <g transform="scale(-1,1)"><g className="angel-side left"><g transform="translate(18,-6) scale(0.82) translate(-18,6)"><AngelWing grad={g('w')} glow={g('g')} /></g></g></g>
        </>
      )}

      {wings && !legend && (
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

      {legend && (
        <g className="angel-halo" filter={g('g')}>
          <ellipse cy="-58" rx="25" ry="7" fill="none" stroke="#ffd25e" strokeWidth="4.5" />
          <ellipse cy="-58" rx="25" ry="7" fill="none" stroke="#fffbe8" strokeWidth="1.6" />
        </g>
      )}
      </g>

      {photo ? (
        <>
        <g className="emblem-photo">
          <circle cy="-2" r="31.5" fill={dark} stroke={legend ? '#ffd25e' : light} strokeWidth="3" />
          <image
            href={photo}
            x="-29" y="-31" width="58" height="58"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#p${id})`}
          />
        </g>
          <rect x="-14" y="29" width="28" height="14" rx="4" fill={dark} stroke={legend ? '#ffd25e' : light} strokeWidth="1.2" />
          <text y="39.8" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" style={{ fontFamily: 'Georgia, serif' }}>{ROMAN[div]}</text>
        </>
      ) : (
        <g className="emblem-art">
          {gem ? (
            <path d={GEM} fill={light} stroke={dark} strokeWidth="1.5" className="emblem-gem" />
          ) : (
            <circle r="13" fill={dark} fillOpacity="0.35" stroke={light} strokeOpacity="0.6" />
          )}
          <text y={gem ? 4 : 5} textAnchor="middle" fontSize={div === 3 ? 12 : 14} fontWeight="900" fill={gem ? dark : '#fff'} style={{ fontFamily: 'Georgia, serif' }}>
            {ROMAN[div]}
          </text>
        </g>
      )}

      {legend && !locked && (
        <g className="angel-fx">
          {SPARKLES.map(([x, y, k, d], i) => (
            <path key={i} d={STAR} fill="#fff8d6" transform={`translate(${x},${y}) scale(${k})`} style={{ animationDelay: `${d}s` }} className="angel-sparkle" />
          ))}
          {[-46, -18, 24, 50].map((x, i) => (
            <path key={i} d={feather(10, 2.4)} fill="#fffaf0" transform={`translate(${x},-20) rotate(${70 + i * 25})`} className="angel-feather" style={{ animationDelay: `${i * 0.9}s` }} />
          ))}
        </g>
      )}
    </svg>
  );
}

/**
 * Arte do rank: se o rank tem imagem, mostra a imagem GRANDE em um card
 * (com o emblema pequeno no canto). No topo (Ganley), o card fica entre as asas de anjo.
 * Sem imagem, mostra só o emblema.
 */
export function RankArt({ tier, div = 0, size = 120, locked = false, animate = true }: Omit<Props, 'title' | 'noPhoto'>) {
  const photo = usePortrait(tierSlug(TIERS[tier].name));
  if (!photo) return <RankEmblem tier={tier} div={div} size={size} locked={locked} animate={animate} />;
  const [light, base, dark] = TIERS[tier].colors;
  const style = { '--t-light': light, '--t-base': base, '--t-dark': dark } as React.CSSProperties;
  const card = (w: number) => (
    <div className={`rank-card ${locked ? 'locked' : ''}`} style={{ ...style, width: w, height: w }}>
      <img src={photo} alt={TIERS[tier].name} />
      <span className="rank-card-badge">
        <RankEmblem tier={tier} div={div} size={Math.round(w * 0.34)} locked={locked} animate={false} noPhoto />
      </span>
    </div>
  );
  if (tier !== TIERS.length - 1) return card(size);
  // Ganley: card no meio do emblema de anjo (asas, auréola, raios e brilhos).
  const S = size * 2.4;
  return (
    <div className="angel-card" style={{ width: S, height: Math.round((S * 180) / 244) }}>
      <RankEmblem tier={tier} div={div} size={S} locked={locked} animate={animate} noPhoto />
      <div className="angel-card-photo">{card(Math.round(S * 0.4))}</div>
    </div>
  );
}
