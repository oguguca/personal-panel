// Personagem holográfico (estilo raio-x azul) com linhas apontando para cada atributo.
// Desenho próprio: reaproveita o contorno de src/data/body-paths.js.
import { ABS_LINES, DECOR_FRONT, FRONT, OUTLINE } from '../data/body-paths.js';

const MIRROR = 'translate(200 0) scale(-1 1)';
const W = 600;
const H = 480;
const FX = 200; // posição do corpo dentro do quadro
const FY = 25;
const BOX_W = 168;
const BOX_H = 60;

// Qual atributo "acende" cada músculo.
const MUSCLE_ATTR = {
  neck: 'forca', traps: 'forca', shoulders: 'forca', chest: 'forca', biceps: 'forca', triceps: 'forca', forearms: 'forca',
  abs: 'disc', obliques: 'disc',
  quads: 'resist', adductors: 'resist', calves: 'resist',
};

// Cor da aura muda conforme o nível geral (o corpo continua azul).
const STAGES = [
  { min: 0, aura: '#3b82f6' },
  { min: 5, aura: '#22d3ee' },
  { min: 10, aura: '#a78bfa' },
  { min: 15, aura: '#f472b6' },
  { min: 20, aura: '#facc15' },
];

const glowOf = (lv) => Math.min(1, 0.22 + lv * 0.055);

function layout(attrs, side) {
  const list = attrs.filter((a) => a.side === side).sort((a, b) => a.anchor[1] - b.anchor[1]);
  let prev = -Infinity;
  return list.map((a) => {
    const y = Math.min(H - BOX_H - 8, Math.max(a.anchor[1] + FY - 6, prev + BOX_H + 22, 10));
    prev = y;
    return { a, y };
  });
}

function Callout({ a, y, side, selected, onSelect }) {
  const ax = a.anchor[0] + FX;
  const ay = a.anchor[1] + FY;
  const bx = side === 'left' ? 8 : W - BOX_W - 8;
  const edge = side === 'left' ? bx + BOX_W : bx;
  const ly = y + BOX_H / 2;
  const elbow = side === 'left' ? edge + 18 : edge - 18;
  const active = a.today > 0;
  const pct = a.need ? a.into / a.need : 0;
  return (
    <g
      className={`holo-callout ${active ? 'active' : ''} ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(a.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(a.id))}
      aria-label={`${a.name}: nível ${a.level}, rank ${a.rank}`}
    >
      <polyline className="holo-line" points={`${ax},${ay} ${elbow},${ly} ${edge},${ly}`} />
      {active && <polyline className="holo-line flow" points={`${ax},${ay} ${elbow},${ly} ${edge},${ly}`} />}
      <circle className="holo-dot" cx={ax} cy={ay} r="3.2" />
      <circle className="holo-dot-ring" cx={ax} cy={ay} r="7" />
      <rect className="holo-box" x={bx} y={y} width={BOX_W} height={BOX_H} rx="8" />
      <text className="holo-name" x={bx + 10} y={y + 20}>{a.emoji} {a.name}</text>
      <text className="holo-rank" x={bx + BOX_W - 10} y={y + 21} textAnchor="end">{a.rank}</text>
      <text className="holo-sub" x={bx + 10} y={y + 37}>
        Nv {a.level} · {a.part}{active ? ` · +${a.today} hoje` : ''}
      </text>
      <rect className="holo-bar-bg" x={bx + 10} y={y + 45} width={BOX_W - 20} height="5" rx="2.5" />
      <rect className="holo-bar" x={bx + 10} y={y + 45} width={Math.max(2, (BOX_W - 20) * pct)} height="5" rx="2.5" />
    </g>
  );
}

export default function Hologram({ game, selected, onSelect }) {
  const by = Object.fromEntries(game.attrs.map((a) => [a.id, a]));
  const lv = (id) => by[id]?.level || 0;
  const total = game.total.level;
  const stage = [...STAGES].reverse().find((s) => total >= s.min);
  const rings = Math.min(4, 1 + Math.floor(total / 5));
  const particles = Math.min(26, 6 + total * 2);

  const muscleOpacity = (id) => {
    const mx = game.muscles[id] || 0;
    const base = glowOf(lv(MUSCLE_ATTR[id])) * 0.45;
    return Math.min(0.95, 0.1 + base + (0.5 * mx) / (mx + 40));
  };

  const left = layout(game.attrs, 'left');
  const right = layout(game.attrs, 'right');

  return (
    <svg className="holo" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Personagem nível ${total}`} style={{ '--aura': stage.aura }}>
      <defs>
        <pattern id="holo-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="#1e3a8a" strokeOpacity="0.35" strokeWidth="0.6" />
        </pattern>
        <linearGradient id="holo-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#93c5fd" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#3b82f6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1d4ed8" stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id="holo-aura">
          <stop offset="0" stopColor={stage.aura} stopOpacity="0.45" />
          <stop offset="1" stopColor={stage.aura} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="holo-spot">
          <stop offset="0" stopColor="#e0f2fe" stopOpacity="1" />
          <stop offset="0.5" stopColor="#38bdf8" stopOpacity="0.6" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <filter id="holo-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="holo-blur"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      <rect width={W} height={H} fill="#020617" />
      <rect width={W} height={H} fill="url(#holo-grid)" />

      {/* aura e anéis do chão: crescem com o nível */}
      <ellipse cx={FX + 100} cy={FY + 200} rx="150" ry="230" fill="url(#holo-aura)" className="holo-aura" />
      {Array.from({ length: rings }, (_, i) => (
        <ellipse key={i} className="holo-ring" cx={FX + 100} cy={FY + 426} rx={40 + i * 22} ry={8 + i * 4} style={{ animationDelay: `${i * 0.6}s` }} />
      ))}

      {/* partículas subindo */}
      {Array.from({ length: particles }, (_, i) => (
        <circle
          key={i}
          className="holo-particle"
          cx={FX + 30 + ((i * 53) % 140)}
          cy={FY + 420}
          r={1 + (i % 3) * 0.5}
          style={{ animationDelay: `${(i * 0.37) % 4}s`, animationDuration: `${3 + (i % 4)}s` }}
        />
      ))}

      <g transform={`translate(${FX} ${FY})`}>
        {/* brilho por trás do corpo */}
        <path d={`${OUTLINE} Z`} fill="#3b82f6" opacity="0.35" filter="url(#holo-blur)" />
        <path d={`${OUTLINE} Z`} fill="#3b82f6" opacity="0.35" filter="url(#holo-blur)" transform={MIRROR} />

        <g filter="url(#holo-glow)">
          <path className="holo-body" d={`${OUTLINE} Z`} />
          <path className="holo-body" d={`${OUTLINE} Z`} transform={MIRROR} />
          {FRONT.map((p, i) =>
            p.center ? (
              <path key={i} className="holo-muscle" d={p.center} style={{ fillOpacity: muscleOpacity(p.id) }} />
            ) : (
              <g key={i} style={{ fillOpacity: muscleOpacity(p.id) }}>
                <path className="holo-muscle" d={p.side} />
                <path className="holo-muscle" d={p.side} transform={MIRROR} />
              </g>
            )
          )}
          {ABS_LINES.map((d, i) => <path key={i} className="holo-detail" d={d} />)}
          {DECOR_FRONT.map((d, i) => (
            <g key={i}>
              <path className="holo-detail" d={d} />
              <path className="holo-detail" d={d} transform={MIRROR} />
            </g>
          ))}
          <path className="holo-outline" d={OUTLINE} />
          <path className="holo-outline" d={OUTLINE} transform={MIRROR} />

          {/* cérebro (Intelecto) */}
          <g opacity={glowOf(lv('int'))}>
            <ellipse cx="100" cy="23" rx="14" ry="11" fill="url(#holo-spot)" />
            <path className="holo-organ" d="M88 24 C87 16 94 12 100 13 C106 12 113 16 112 24 C113 30 107 34 100 33 C93 34 87 30 88 24 Z M100 13 V33 M91 20 C94 21 95 24 93 26 M109 20 C106 21 105 24 107 26 M95 30 C97 28 98 29 98 31 M105 30 C103 28 102 29 102 31" />
          </g>
          {/* fala (Idiomas): ondas saindo da boca */}
          <g opacity={glowOf(lv('lang'))}>
            <ellipse cx="100" cy="47" rx="6" ry="3" fill="url(#holo-spot)" />
            {lv('lang') > 0 && (
              <g className="holo-waves">
                <path d="M110 44 C113 46 113 48 110 50" />
                <path d="M114 41 C119 45 119 49 114 53" />
              </g>
            )}
          </g>
          {/* coração (Vitalidade) */}
          <g opacity={glowOf(lv('vit'))} className="holo-heart">
            <circle cx="114" cy="108" r="13" fill="url(#holo-spot)" />
            <path className="holo-organ" d="M114 116 C106 110 104 106 106 102 C108 99 112 100 114 103 C116 100 120 99 122 102 C124 106 122 110 114 116 Z" />
          </g>
          {/* núcleo (Disciplina) */}
          <circle cx="100" cy="172" r={10 + lv('disc') * 0.6} fill="url(#holo-spot)" opacity={glowOf(lv('disc')) * 0.8} className="holo-core" />
        </g>

        <rect className="holo-scan" x="20" y="0" width="160" height="3" rx="1.5" />
      </g>

      {left.map(({ a, y }) => <Callout key={a.id} a={a} y={y} side="left" selected={selected === a.id} onSelect={onSelect} />)}
      {right.map(({ a, y }) => <Callout key={a.id} a={a} y={y} side="right" selected={selected === a.id} onSelect={onSelect} />)}

      <text className="holo-level" x={W / 2} y={H - 8} textAnchor="middle">NÍVEL {total} · {game.total.title.toUpperCase()}</text>
    </svg>
  );
}
