// Calendário: compromissos e corridas, com alertas que começam X dias antes e repetem a cada Y horas.
import { addDays, dateKey, parseKey, toMinutes } from './dates';
import type { CalEvent, DayKey, EventAlert } from './types';

const HOUR = 3600000;
const DAY = 24 * HOUR;
/** Sem hora marcada, o evento conta como às 9h (para contagem e alertas). */
export const DEFAULT_TIME = '09:00';

export const DAYS_BEFORE = [1, 2, 3, 4, 5, 7, 14];
export const EVERY_HOURS: { h: number; label: string }[] = [
  { h: 1, label: '1 hora' },
  { h: 3, label: '3 horas' },
  { h: 6, label: '6 horas' },
  { h: 12, label: '12 horas' },
  { h: 24, label: '1 dia' },
  { h: 48, label: '2 dias' },
];
export const RACE_DISTANCES = ['5', '10', '15', '21', '42'];
export const DEFAULT_ALERT: EventAlert = { daysBefore: 3, everyHours: 24 };

/** Momento do evento (ms). */
export function eventTime(ev: Pick<CalEvent, 'date' | 'time'>): number {
  const d = parseKey(ev.date);
  d.setMinutes(toMinutes(ev.time || DEFAULT_TIME));
  return d.getTime();
}

/** Próximo aviso (ms) ou null se não há mais avisos. */
export function nextAlert(ev: CalEvent, now: number): number | null {
  if (!ev.alert || ev.done) return null;
  const end = eventTime(ev);
  if (now >= end) return null;
  const start = end - ev.alert.daysBefore * DAY;
  const every = Math.max(1, ev.alert.everyHours) * HOUR;
  const last = ev.lastAlert && ev.lastAlert >= start ? ev.lastAlert : null;
  const next = last ? last + every : start;
  return next < end ? next : null;
}

/** Eventos que já devem avisar agora. */
export function dueAlerts(events: CalEvent[], now: number): CalEvent[] {
  return events.filter((ev) => {
    const n = nextAlert(ev, now);
    return n !== null && now >= n;
  });
}

/** "hoje às 07:00", "amanhã", "em 3 dias". */
export function whenText(ev: CalEvent, today: DayKey): string {
  const days = daysUntil(ev.date, today);
  const at = ev.time ? ` às ${ev.time}` : '';
  if (days < 0) return days === -1 ? 'foi ontem' : `foi há ${-days} dias`;
  if (days === 0) return `hoje${at}`;
  if (days === 1) return `amanhã${at}`;
  return `em ${days} dias`;
}

export function daysUntil(date: DayKey, today: DayKey): number {
  return Math.round((parseKey(date).getTime() - parseKey(today).getTime()) / DAY);
}

/** Texto da notificação. */
export function alertMessage(ev: CalEvent, now: number): { title: string; body: string } {
  const today = dateKey(new Date(now));
  const icon = ev.kind === 'corrida' ? '🏃' : '📅';
  const extra = [ev.kind === 'corrida' && ev.distance ? `${ev.distance} km` : '', ev.place || ''].filter(Boolean).join(' · ');
  const when = whenText(ev, today);
  return {
    title: `${icon} ${ev.title}`,
    body: `${when.charAt(0).toUpperCase()}${when.slice(1)}${extra ? ` · ${extra}` : ''}`,
  };
}

/** Explica o alerta em uma frase. */
export function describeAlert(ev: Pick<CalEvent, 'date' | 'time' | 'alert'>): string {
  if (!ev.alert) return 'Sem alerta';
  const start = new Date(eventTime(ev) - ev.alert.daysBefore * DAY);
  const every = EVERY_HOURS.find((e) => e.h === ev.alert!.everyHours)?.label || `${ev.alert.everyHours} horas`;
  const d = start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const h = start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `Avisos a cada ${every}, a partir de ${d} às ${h}, até a hora do evento`;
}

/** 42 dias (6 semanas, começando no domingo) que aparecem no mês. */
export function monthGrid(year: number, month: number): DayKey[] {
  const first = new Date(year, month, 1);
  const start = dateKey(new Date(year, month, 1 - first.getDay()));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** Eventos agrupados por dia, ordenados pela hora. */
export function eventsByDay(events: CalEvent[]): Record<DayKey, CalEvent[]> {
  const out: Record<DayKey, CalEvent[]> = {};
  for (const ev of [...events].sort((a, b) => eventTime(a) - eventTime(b))) (out[ev.date] ||= []).push(ev);
  return out;
}

/** Próximos eventos a partir de hoje (não concluídos). */
export function upcoming(events: CalEvent[], today: DayKey, n = 5): CalEvent[] {
  return events
    .filter((e) => e.date >= today && !e.done)
    .sort((a, b) => eventTime(a) - eventTime(b))
    .slice(0, n);
}

/** Tempo '52:30' ou '1:45:10' em segundos (null se inválido). */
export function parseDuration(txt: string | undefined): number | null {
  const parts = String(txt || '').trim().split(':').map((p) => Number(p));
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  const [h, m, s] = parts.length === 3 ? parts : [0, ...parts];
  if (m >= 60 || s >= 60) return null;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}

/** Ritmo em segundos por km. */
export function paceOf(ev: Pick<CalEvent, 'result' | 'distance'>): number | null {
  const secs = parseDuration(ev.result);
  const km = parseFloat(ev.distance || '');
  return secs && km > 0 ? secs / km : null;
}

/** 315 -> "5:15 /km" */
export function formatPace(secPerKm: number): string {
  const r = Math.round(secPerKm);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')} /km`;
}
