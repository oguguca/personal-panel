// Componentes pequenos reaproveitados pelas páginas.
import Icon from './Icon.jsx';

export function Progress({ value, max, variant = '' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`progress ${variant}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Check({ on, onClick, label }) {
  return (
    <button className={`check ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} aria-label={label} title={label}>
      <Icon name="check" size={14} strokeWidth={3} />
    </button>
  );
}

export function Switch({ label, hint, checked, onChange, disabled }) {
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

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

/** Formata valor com unidade. 'R$' vira prefixo com centavos quando houver. */
export function fmtValue(n, unit = '') {
  const num = Number(n) || 0;
  if (unit.trim() === 'R$') {
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: num % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  }
  const s = num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return unit ? `${s} ${unit}` : s;
}

export function pct(a, b) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}
