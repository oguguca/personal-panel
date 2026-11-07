// Mapa do corpo (frente e costas) com grupos musculares clicáveis. Desenho próprio, estilizado.
import { MUSCLES } from '../data/exercises.js';

// Silhueta base (lado esquerdo; o direito é espelhado).
const BODY_SIDE = [
  'M64 66 Q48 70 46 100 L40 178 Q38 196 44 202 L52 202 Q57 190 58 176 L66 112 Z', // braço
  'M76 190 L100 196 L99 300 L95 384 L80 384 Q76 340 77 300 Q70 240 76 190 Z', // perna
];
const BODY_CENTER = [
  { el: 'ellipse', p: { cx: 100, cy: 32, rx: 17, ry: 21 } },
  { el: 'rect', p: { x: 92, y: 50, width: 16, height: 14 } },
  { el: 'path', p: { d: 'M70 64 Q100 58 130 64 L136 120 Q132 180 126 198 L74 198 Q68 180 64 120 Z' } },
];

// Músculos: side = desenha nos dois lados (espelhado); center = desenho único.
const FRONT = [
  { id: 'traps', side: { el: 'path', p: { d: 'M88 60 L99 63 L99 68 L76 69 Z' } } },
  { id: 'shoulders', side: { el: 'ellipse', p: { cx: 66, cy: 80, rx: 12, ry: 14 } } },
  { id: 'chest', side: { el: 'path', p: { d: 'M79 72 Q97 69 99 74 L99 104 Q88 110 77 102 Q72 88 79 72 Z' } } },
  { id: 'biceps', side: { el: 'ellipse', p: { cx: 56, cy: 116, rx: 7.5, ry: 18 } } },
  { id: 'forearms', side: { el: 'ellipse', p: { cx: 49, cy: 162, rx: 7, ry: 22, transform: 'rotate(8 49 162)' } } },
  { id: 'abs', center: { el: 'rect', p: { x: 89, y: 108, width: 22, height: 68, rx: 7 } } },
  { id: 'obliques', side: { el: 'path', p: { d: 'M77 110 Q85 112 86 116 L86 170 Q79 172 76 160 Q72 134 77 110 Z' } } },
  { id: 'adductors', side: { el: 'path', p: { d: 'M95 200 L99 201 L98 244 Q91 234 89 210 Z' } } },
  { id: 'quads', side: { el: 'path', p: { d: 'M78 198 Q86 200 88 206 Q92 240 93 284 Q86 292 80 284 Q72 240 78 198 Z' } } },
  { id: 'calves', side: { el: 'ellipse', p: { cx: 85, cy: 330, rx: 7.5, ry: 26 } } },
];

const BACK = [
  { id: 'traps', center: { el: 'path', p: { d: 'M100 58 L120 67 L109 98 L100 110 L91 98 L80 67 Z' } } },
  { id: 'shoulders', side: { el: 'ellipse', p: { cx: 66, cy: 80, rx: 12, ry: 14 } } },
  { id: 'lats', side: { el: 'path', p: { d: 'M77 88 Q86 92 92 104 L96 142 Q84 142 78 128 Q72 108 77 88 Z' } } },
  { id: 'lowerback', center: { el: 'rect', p: { x: 88, y: 142, width: 24, height: 38, rx: 7 } } },
  { id: 'triceps', side: { el: 'ellipse', p: { cx: 56, cy: 114, rx: 7.5, ry: 18 } } },
  { id: 'forearms', side: { el: 'ellipse', p: { cx: 49, cy: 162, rx: 7, ry: 22, transform: 'rotate(8 49 162)' } } },
  { id: 'glutes', side: { el: 'ellipse', p: { cx: 88, cy: 206, rx: 12.5, ry: 15 } } },
  { id: 'hamstrings', side: { el: 'path', p: { d: 'M78 224 Q88 225 95 229 Q96 260 92 286 Q84 292 80 284 Q74 250 78 224 Z' } } },
  { id: 'calves', side: { el: 'ellipse', p: { cx: 85, cy: 324, rx: 9.5, ry: 28 } } },
];

const MIRROR = 'translate(200 0) scale(-1 1)';

function Shape({ el: El, p, ...rest }) {
  return <El {...p} {...rest} />;
}

function Figure({ parts, x, label, selected, onToggle }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="silhouette">
        {BODY_CENTER.map((s, i) => <Shape key={i} {...s} />)}
        {BODY_SIDE.map((d, i) => <path key={i} d={d} />)}
        {BODY_SIDE.map((d, i) => <path key={`m${i}`} d={d} transform={MIRROR} />)}
      </g>
      {parts.map(({ id, side, center }) => {
        const on = selected.includes(id);
        const props = {
          className: `muscle ${on ? 'on' : ''}`,
          onClick: () => onToggle(id),
          onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle(id)),
          role: 'button',
          tabIndex: 0,
          'aria-pressed': on,
          'aria-label': MUSCLES[id],
        };
        return (
          <g key={id}>
            {center && <Shape {...center} {...props}><title>{MUSCLES[id]}</title></Shape>}
            {side && (
              <>
                <Shape {...side} {...props}><title>{MUSCLES[id]}</title></Shape>
                <g transform={MIRROR}>
                  <Shape {...side} {...props} tabIndex={-1}><title>{MUSCLES[id]}</title></Shape>
                </g>
              </>
            )}
          </g>
        );
      })}
      <text x="100" y="404" textAnchor="middle" className="body-label">{label}</text>
    </g>
  );
}

export default function BodyMap({ selected, onToggle }) {
  return (
    <svg className="body-map" viewBox="0 0 400 412" role="group" aria-label="Mapa muscular">
      <Figure parts={FRONT} x={0} label="Frente" selected={selected} onToggle={onToggle} />
      <Figure parts={BACK} x={200} label="Costas" selected={selected} onToggle={onToggle} />
    </svg>
  );
}
