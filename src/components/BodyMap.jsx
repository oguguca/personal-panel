// Mapa muscular anatômico (frente e costas) com músculos clicáveis.
// Desenho: polígonos do react-body-highlighter 2.0.5 (MIT, (c) 2020 GV79) — ver src/data/body-map.json.
import { useState } from 'react';
import BODY from '../data/body-map.json' with { type: 'json' };
import { MUSCLES } from '../data/exercises.js';

// Regiões do desenho que também representam outros grupos da lista.
const ALIASES = { lats: ['midback'], glutes: ['abductors'] };
const isOn = (id, selected) => selected.includes(id) || (ALIASES[id] || []).some((a) => selected.includes(a));
const labelOf = (id) => [MUSCLES[id], ...(ALIASES[id] || []).map((a) => MUSCLES[a])].join(' / ');

function Figure({ parts, label, selected, hover, setHover, onToggle }) {
  return (
    <figure className="body-fig">
      <svg viewBox={BODY.viewBox} role="group" aria-label={`Músculos — ${label}`}>
        {parts.map(({ id, polys }, i) =>
          id ? (
            <g
              key={i}
              className={`muscle ${isOn(id, selected) ? 'on' : ''} ${hover === id ? 'hover' : ''}`}
              onClick={() => onToggle(id)}
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle(id))}
              onFocus={() => setHover(id)}
              onBlur={() => setHover(null)}
              role="button"
              tabIndex={0}
              aria-pressed={isOn(id, selected)}
              aria-label={labelOf(id)}
            >
              <title>{labelOf(id)}</title>
              {polys.map((p, j) => <polygon key={j} points={p} />)}
            </g>
          ) : (
            <g key={i} className="body-part">
              {polys.map((p, j) => <polygon key={j} points={p} />)}
            </g>
          )
        )}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export default function BodyMap({ selected, onToggle }) {
  const [hover, setHover] = useState(null);
  return (
    <div className="body-map">
      <div className={`body-hint ${hover ? 'active' : ''}`}>
        {hover ? labelOf(hover) : selected.length ? `${selected.length} selecionado(s)` : 'Toque num músculo'}
      </div>
      <div className="body-figs">
        <Figure parts={BODY.front} label="Frente" selected={selected} hover={hover} setHover={setHover} onToggle={onToggle} />
        <Figure parts={BODY.back} label="Costas" selected={selected} hover={hover} setHover={setHover} onToggle={onToggle} />
      </div>
    </div>
  );
}
