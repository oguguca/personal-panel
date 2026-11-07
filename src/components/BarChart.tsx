// Gráfico de barras simples em SVG (sem biblioteca).
// items: [{ key, label, value, title, segments? }], max: topo do eixo, goal: linha tracejada opcional.
// segments: [{ value, color, title }] empilha partes na mesma barra (value = soma).
export interface BarSegment {
  value: number;
  color: string;
  title?: string;
}

export interface BarItem {
  key: string;
  label: string;
  value: number;
  title?: string;
  missing?: boolean;
  segments?: BarSegment[];
}

interface Props {
  items: BarItem[];
  max?: number;
  goal?: number;
  color?: string;
  format?: (v: number) => string | number;
  height?: number;
}

export default function BarChart({ items, max, goal = 0, color = 'var(--primary)', format = (v) => v, height = 170 }: Props) {
  const W = 640;
  const H = height;
  const padL = 40, padR = 8, padT = 10, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const top = Math.max(max || 0, goal || 0, ...items.map((i) => i.value || 0), 1);
  const y = (v: number) => padT + innerH - (v / top) * innerH;
  const slot = innerW / items.length;
  const barW = Math.max(3, Math.min(36, slot * 0.62));
  const labelEvery = items.length > 14 ? Math.ceil(items.length / 10) : 1;
  const ticks = [0, top / 2, top];

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="grid-line" x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end">{format(Math.round(t))}</text>
        </g>
      ))}
      {items.map((it, i) => {
        const x = padL + slot * i + (slot - barW) / 2;
        const v = it.value || 0;
        const h = Math.max(v > 0 ? 2 : 0, y(0) - y(v));
        let acc = 0;
        return (
          <g key={it.key}>
            {it.segments ? (
              it.segments.map((s, si) => {
                const sh = y(0) - y(s.value || 0);
                acc += sh;
                // separador de 1px entre as partes empilhadas
                return (
                  <rect key={si} className="bar" x={x} y={y(0) - acc} width={barW} height={Math.max(0, sh - (si < it.segments!.length - 1 ? 1 : 0))} fill={s.color}>
                    <title>{s.title}</title>
                  </rect>
                );
              })
            ) : (
              <rect className="bar" x={x} y={y(0) - h} width={barW} height={h} rx={Math.min(4, barW / 2)} fill={it.missing ? 'var(--border)' : color}>
                <title>{it.title}</title>
              </rect>
            )}
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={H - 6} textAnchor="middle">{it.label}</text>
            )}
          </g>
        );
      })}
      {goal > 0 && <line className="goal-line" x1={padL} x2={W - padR} y1={y(goal)} y2={y(goal)} />}
    </svg>
  );
}
