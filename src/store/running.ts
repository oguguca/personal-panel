// Aba Corrida: pace, km por semana/mês, recordes pessoais, previsão de provas e quilometragem dos tênis.
// As provas do Calendário (corridas marcadas como feitas, com tempo) também entram nos recordes.
import { formatPace, parseDuration } from './calendar';
import { addDays, parseKey } from './dates';
import type { CalEvent, DayKey, Run, RunType, Shoe } from './types';

export const RUN_TYPES: Record<RunType, { label: string; icon: string }> = {
  leve: { label: 'Leve', icon: '🙂' },
  longo: { label: 'Longão', icon: '🛣️' },
  tiro: { label: 'Tiros', icon: '⚡' },
  ritmo: { label: 'Ritmo', icon: '🎯' },
  prova: { label: 'Prova', icon: '🏅' },
};
export const FEELS = ['😫', '😕', '😐', '🙂', '😄'];
export const QUICK_KM = [3, 5, 8, 10, 15, 21.1];
export const SHOE_LIMIT_KM = 700;

/** Distâncias oficiais para recordes e previsão. */
export const DISTANCES: { key: string; label: string; km: number }[] = [
  { key: '5k', label: '5 km', km: 5 },
  { key: '10k', label: '10 km', km: 10 },
  { key: '21k', label: 'Meia (21 km)', km: 21.0975 },
  { key: '42k', label: 'Maratona (42 km)', km: 42.195 },
];

/** Segundos por km. */
export const paceSec = (r: Pick<Run, 'km' | 'seconds'>) => (r.km > 0 && r.seconds > 0 ? r.seconds / r.km : 0);
export const runPace = (r: Pick<Run, 'km' | 'seconds'>) => (paceSec(r) ? formatPace(paceSec(r)) : '—');

/** 3150 -> "52:30"; 6310 -> "1:45:10" */
export function formatDurationSec(total: number): string {
  const t = Math.round(total);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}

export const fmtKm = (km: number) => `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;

/** Segunda-feira da semana do dia. */
export function weekStart(key: DayKey): DayKey {
  const wd = parseKey(key).getDay(); // 0 = domingo
  return addDays(key, wd === 0 ? -6 : 1 - wd);
}

const sumKm = (runs: Run[]) => runs.reduce((s, r) => s + r.km, 0);
export const kmBetween = (runs: Run[], from: DayKey, to: DayKey) => sumKm(runs.filter((r) => r.date >= from && r.date <= to));
export const weekKm = (runs: Run[], today: DayKey) => kmBetween(runs, weekStart(today), addDays(weekStart(today), 6));
export const monthKm = (runs: Run[], today: DayKey) => sumKm(runs.filter((r) => r.date.slice(0, 7) === today.slice(0, 7)));

/** km por semana nas últimas `n` semanas (a mais antiga primeiro). */
export function weeklyKm(runs: Run[], today: DayKey, n = 8): { start: DayKey; km: number }[] {
  const last = weekStart(today);
  return Array.from({ length: n }, (_, i) => {
    const start = addDays(last, -7 * (n - 1 - i));
    return { start, km: kmBetween(runs, start, addDays(start, 6)) };
  });
}

/** Pace médio (s/km) dos últimos `days` dias. */
export function avgPace(runs: Run[], today: DayKey, days = 30): number {
  const from = addDays(today, -(days - 1));
  const recent = runs.filter((r) => r.date >= from && r.date <= today && r.seconds > 0);
  const km = sumKm(recent);
  return km ? recent.reduce((s, r) => s + r.seconds, 0) / km : 0;
}

/** Esforços (treinos + provas do calendário com tempo) para recordes. */
export interface Effort {
  date: DayKey;
  km: number;
  seconds: number;
  title: string;
  race: boolean;
}

export function effortsOf(runs: Run[], events: CalEvent[]): Effort[] {
  const fromRuns = runs.filter((r) => r.km > 0 && r.seconds > 0).map((r) => ({ date: r.date, km: r.km, seconds: r.seconds, title: RUN_TYPES[r.type].label, race: r.type === 'prova' }));
  const fromRaces = events
    .filter((e) => e.kind === 'corrida' && e.result && raceKm(e) > 0)
    .map((e) => ({ date: e.date, km: raceKm(e), seconds: parseDuration(e.result) || 0, title: e.title, race: true }))
    .filter((e) => e.seconds > 0);
  return [...fromRuns, ...fromRaces];
}

/** Conta como a distância oficial se ficar entre 98% e 103% dela (GPS nunca é exato). */
const matches = (km: number, target: number) => km >= target * 0.98 && km <= target * 1.03;

/** Melhor tempo em cada distância oficial (tempo ajustado para a distância exata). */
export function personalRecords(efforts: Effort[]): Record<string, (Effort & { time: number }) | null> {
  const out: Record<string, (Effort & { time: number }) | null> = {};
  for (const d of DISTANCES) {
    let best: (Effort & { time: number }) | null = null;
    for (const e of efforts) {
      if (!matches(e.km, d.km)) continue;
      const time = (e.seconds / e.km) * d.km;
      if (!best || time < best.time) best = { ...e, time };
    }
    out[d.key] = best;
  }
  return out;
}

/**
 * Previsão de tempo (fórmula de Riegel: t2 = t1 × (d2/d1)^1,06),
 * usando o melhor esforço de pelo menos 3 km dos últimos 120 dias.
 */
export function predictions(efforts: Effort[], today: DayKey): { base: Effort; times: Record<string, number> } | null {
  const from = addDays(today, -120);
  const pool = efforts.filter((e) => e.km >= 3 && e.date >= from && e.date <= today);
  if (!pool.length) return null;
  // melhor esforço = o que prevê a meia maratona mais rápida (compara distâncias diferentes de forma justa)
  const score = (e: Effort) => e.seconds * Math.pow(21.0975 / e.km, 1.06);
  const base = pool.reduce((a, b) => (score(b) < score(a) ? b : a));
  const times: Record<string, number> = {};
  for (const d of DISTANCES) times[d.key] = base.seconds * Math.pow(d.km / base.km, 1.06);
  return { base, times };
}

/** km rodados por um tênis (inclui o que ele já tinha antes). */
export const shoeKm = (shoe: Shoe, runs: Run[]) => (shoe.startKm || 0) + sumKm(runs.filter((r) => r.shoeId === shoe.id));

/** Sequência de semanas seguidas com pelo menos uma corrida (contando a atual se já correu). */
export function weekStreak(runs: Run[], today: DayKey): number {
  let start = weekStart(today);
  let n = 0;
  if (!kmBetween(runs, start, addDays(start, 6))) start = addDays(start, -7); // semana atual ainda pode ter corrida
  while (kmBetween(runs, start, addDays(start, 6)) > 0) {
    n++;
    start = addDays(start, -7);
  }
  return n;
}

/** Distância de prova limpa ("4km" -> 4). */
export const raceKm = (ev: Pick<CalEvent, 'distance'>) => parseFloat(String(ev.distance || '').replace(',', '.')) || 0;
export const fmtDist = (ev: Pick<CalEvent, 'distance'>) => (raceKm(ev) ? fmtKm(raceKm(ev)) : '');

/**
 * Tudo o que você correu: treinos da aba Corrida + provas já feitas do Calendário
 * (prova registrada também como treino do tipo "prova" no mesmo dia não conta duas vezes).
 */
export function activitiesOf(runs: Run[], events: CalEvent[], today: DayKey): Run[] {
  const raceDays = new Set(runs.filter((r) => r.type === 'prova').map((r) => r.date));
  const races: Run[] = events
    .filter((e) => e.kind === 'corrida' && (e.done || e.date < today) && e.date <= today && raceKm(e) > 0 && !raceDays.has(e.date))
    .map((e) => ({ id: `prova-${e.id}`, date: e.date, km: raceKm(e), seconds: parseDuration(e.result) || 0, type: 'prova' as const, notes: e.title }));
  return [...runs, ...races];
}

/** Pace de cada prova feita (para o gráfico de evolução), da mais antiga para a mais nova. */
export function racePaces(events: CalEvent[], today: DayKey): { ev: CalEvent; pace: number }[] {
  return events
    .filter((e) => e.kind === 'corrida' && e.date <= today && raceKm(e) > 0 && parseDuration(e.result))
    .map((e) => ({ ev: e, pace: parseDuration(e.result)! / raceKm(e) }))
    .sort((a, b) => a.ev.date.localeCompare(b.ev.date));
}

/** Previsão para qualquer distância a partir do melhor esforço (Riegel). */
export const predictFor = (base: Effort, km: number) => base.seconds * Math.pow(km / base.km, 1.06);
