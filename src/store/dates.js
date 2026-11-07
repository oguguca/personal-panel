// Utilitários de data. As "chaves de dia" são strings 'AAAA-MM-DD' no horário local.

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** 0 = domingo ... 6 = sábado */
export function weekday(key) {
  return parseKey(key).getDay();
}

export const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const WEEKDAYS_NAME = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatLong(key) {
  const s = parseKey(key).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatMedium(key) {
  const s = parseKey(key).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatShort(key) {
  const d = parseKey(key);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** '08:30' -> 510 */
export function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function nowMinutes(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

/** 95 -> '1h35', 40 -> '40 min' */
export function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}
