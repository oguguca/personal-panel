// Componentes pequenos reaproveitados pelas páginas.
import type { ReactNode } from 'react';
import Icon from './Icon';

/** Barra de progresso. mark: valor onde desenhar uma marca (ex.: mínimo de água). */
export function Progress({ value, max, variant = '', mark }: { value: number; max: number; variant?: string; mark?: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const markPct = mark && max > 0 ? Math.min(100, (mark / max) * 100) : null;
  return (
    <div className={`progress ${variant} ${markPct ? 'has-mark' : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
      {markPct !== null && <span className="progress-mark" style={{ left: `${markPct}%` }} title="mínimo" />}
    </div>
  );
}

/** 300 -> "300 ml", 4000 -> "4 L", 2500 -> "2,5 L" */
export function fmtMl(ml: unknown): string {
  const n = Math.round(Number(ml) || 0);
  if (Math.abs(n) < 1000) return `${n} ml`;
  return `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`;
}

export function Check({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button className={`check ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} aria-label={label} title={label}>
      <Icon name="check" size={14} strokeWidth={3} />
    </button>
  );
}

export function Switch({ label, hint, checked, onChange, disabled }: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="switch">
      <span>
        {label}
        {hint && <div className="muted small">{hint}</div>}
      </span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** Formata valor com unidade. 'R$' vira prefixo com centavos quando houver. */
export function fmtValue(n: unknown, unit = ''): string {
  const num = Number(n) || 0;
  if (unit.trim() === 'R$') {
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: num % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  }
  const s = num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return unit ? `${s} ${unit}` : s;
}

export function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}
