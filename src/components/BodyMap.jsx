// Mapa muscular (frente e costas) com músculos clicáveis. Desenho próprio: src/data/body-paths.js.
import { useState } from 'react';
import { ABS_LINES, BACK, DECOR_BACK, DECOR_FRONT, FRONT, OUTLINE } from '../data/body-paths.js';
import { MUSCLES } from '../data/exercises.js';

const MIRROR = 'translate(200 0) scale(-1 1)';
const ALIASES = { glutes: ['abductors'] }; // abdutores (glúteo médio) acendem junto com os glúteos
const isOn = (id, selected) => selected.includes(id) || (ALIASES[id] || []).some((a) => selected.includes(a));
const labelOf = (id) => [MUSCLES[id], ...(ALIASES[id] || []).map((a) => MUSCLES[a])].join(' / ');

function Muscle({ id, d, mirror, selected, hover, setHover, onToggle, focusable }) {
  const on = isOn(id, selected);
  return (
    <path
      d={d}
      transform={mirror ? MIRROR : undefined}
      className={`muscle ${on ? 'on' : ''} ${hover === id ? 'hover' : ''}`}
      onClick={() => onToggle(id)}
      onMouseEnter={() => setHover(id)}
      onMouseLeave={() => setHover(null)}
      onFocus={() => setHover(id)}
      onBlur={() => setHover(null)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle(id))}
      role="button"
      tabIndex={focusable ? 0 : -1}
      aria-pressed={on}
      aria-label={labelOf(id)}
    >
      <title>{labelOf(id)}</title>
    </path>
  );
}

function Figure({ parts, decor, label, front, ...state }) {
  return (
    <figure className="body-fig">
      <svg viewBox="0 0 200 430" role="group" aria-label={`Músculos — ${label}`}>
        {/* corpo */}
        <path className="body-fill" d={`${OUTLINE} Z`} />
        <path className="body-fill" d={`${OUTLINE} Z`} transform={MIRROR} />
        {/* músculos */}
        {parts.map((p, i) =>
          p.center ? (
            <Muscle key={i} id={p.id} d={p.center} focusable {...state} />
          ) : (
            <g key={i}>
              <Muscle id={p.id} d={p.side} focusable {...state} />
              <Muscle id={p.id} d={p.side} mirror {...state} />
            </g>
          )
        )}
        {front && ABS_LINES.map((d, i) => <path key={i} className="body-line" d={d} />)}
        {decor.map((d, i) => (
          <g key={i}>
            <path className="body-line" d={d} />
            <path className="body-line" d={d} transform={MIRROR} />
          </g>
        ))}
        {/* contorno por cima de tudo */}
        <path className="body-outline" d={OUTLINE} />
        <path className="body-outline" d={OUTLINE} transform={MIRROR} />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export default function BodyMap({ selected, onToggle }) {
  const [hover, setHover] = useState(null);
  const state = { selected, hover, setHover, onToggle };
  return (
    <div className="body-map">
      <div className={`body-hint ${hover ? 'active' : ''}`}>
        {hover ? labelOf(hover) : selected.length ? `${selected.length} selecionado(s)` : 'Toque num músculo'}
      </div>
      <div className="body-figs">
        <Figure parts={FRONT} decor={DECOR_FRONT} label="Frente" front {...state} />
        <Figure parts={BACK} decor={DECOR_BACK} label="Costas" {...state} />
      </div>
    </div>
  );
}
