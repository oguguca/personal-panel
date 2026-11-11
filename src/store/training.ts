// Ciclo de treinos: sequência de 1 a 7 treinos + dias de descanso opcionais.
// O próximo treino é calculado pelo ÚLTIMO TREINO FEITO (não pelo dia da semana),
// então se a pessoa fizer o C na segunda, a sequência continua a partir do C.
import { addDays, weekday } from './dates';
import type { Data, DayKey, LoggedItem, SetLog, TrainingLog, Workout } from './types';

export type Suggestion =
  | { logged: TrainingLog; next: string | null; rest?: undefined; workoutId?: undefined }
  | { rest: true; next: string | null; logged?: undefined; workoutId?: undefined }
  | { workoutId: string | null; next: string | null; logged?: undefined; rest?: undefined };

export interface ForecastDay {
  key: DayKey;
  type: 'workout' | 'rest';
  workoutId?: string | null;
  done?: boolean;
}

export const MAX_ROTATION = 7;

export function trainingConfig(data: Data): { rotation: string[]; restDays: number[] } {
  const ids = new Set(data.workouts.map((w) => w.id));
  const t: Partial<Data['training']> = data.training || {};
  let rotation = (t.rotation || []).filter((id) => ids.has(id)).slice(0, MAX_ROTATION);
  if (!rotation.length) rotation = data.workouts.slice(0, MAX_ROTATION).map((w) => w.id);
  return { rotation, restDays: t.restDays || [] };
}

/** Registro do dia: { type: 'workout' | 'rest', workoutId?, name?, at } ou null. */
export const trainingOf = (data: Data, key: DayKey): TrainingLog | null => data.days[key]?.training || null;

/** Último treino feito (que esteja no ciclo) até a data `key` (inclusive, se includeKey). */
export function lastDone(data: Data, key: DayKey, includeKey = true): { key: DayKey; workoutId: string } | null {
  const { rotation } = trainingConfig(data);
  const keys = Object.keys(data.days)
    .filter((k) => (includeKey ? k <= key : k < key))
    .sort()
    .reverse();
  for (const k of keys) {
    const t = data.days[k].training;
    if (t?.type === 'workout' && t.workoutId && rotation.includes(t.workoutId)) return { key: k, workoutId: t.workoutId };
  }
  return null;
}

export function nextAfter(rotation: string[], workoutId: string | null | undefined): string | null {
  if (!rotation.length) return null;
  const i = workoutId ? rotation.indexOf(workoutId) : -1;
  return rotation[(i + 1) % rotation.length]; // i = -1 (nenhum) -> primeiro
}

/**
 * Onde o ciclo está: último treino da sequência (pointer) e treinos feitos ANTES da hora
 * por uma troca (ahead). Ex.: era Perna, academia lotada, fez Costas e trocou a ordem:
 * o próximo continua sendo Perna e, quando chegar a vez do Costas, ele é pulado.
 */
export interface CycleState {
  pointer: string | null | undefined;
  ahead: Set<string>;
}

/** Pula os treinos que já foram feitos adiantados. */
function resolve(rotation: string[], st: CycleState) {
  for (let i = 0; i < rotation.length && st.ahead.size; i++) {
    const c = nextAfter(rotation, st.pointer);
    if (!c || !st.ahead.has(c)) break;
    st.ahead.delete(c);
    st.pointer = c;
  }
}

/** Próximo treino a partir do estado (sem mudar o estado). */
export function peekNext(rotation: string[], st: CycleState): string | null {
  const copy = { pointer: st.pointer, ahead: new Set(st.ahead) };
  resolve(rotation, copy);
  return nextAfter(rotation, copy.pointer);
}

/** Aplica um registro de treino ao estado do ciclo. */
export function applyLog(rotation: string[], st: CycleState, log: Pick<TrainingLog, 'type' | 'workoutId' | 'swap'>) {
  const w = log.workoutId;
  if (log.type !== 'workout' || !w || !rotation.includes(w)) return;
  resolve(rotation, st);
  if (w === nextAfter(rotation, st.pointer)) {
    st.pointer = w; // fez o treino da vez
  } else if (log.swap) {
    st.ahead.add(w); // trocou a ordem: o da vez continua sendo o próximo
  } else {
    st.pointer = w; // seguiu a sequência a partir do treino feito
    st.ahead.clear();
  }
}

/** Estado do ciclo considerando os registros ANTES do dia `key`. */
export function cycleState(data: Data, key: DayKey): CycleState {
  const { rotation } = trainingConfig(data);
  const st: CycleState = { pointer: undefined, ahead: new Set() };
  for (const k of Object.keys(data.days).filter((x) => x < key).sort()) {
    const t = data.days[k].training;
    if (t) applyLog(rotation, st, t);
  }
  return st;
}

/** Treino que era a vez num dia (pelo que foi feito antes dele). */
export const dueOn = (data: Data, key: DayKey) => peekNext(trainingConfig(data).rotation, cycleState(data, key));

/**
 * Sugestão para hoje:
 *  { logged }                      -> já registrou algo hoje
 *  { rest: true, next }            -> dia de descanso (se treinar, o sugerido é `next`)
 *  { workoutId }                   -> treino sugerido
 */
export function suggestion(data: Data, today: DayKey): Suggestion {
  const { rotation, restDays } = trainingConfig(data);
  const logged = trainingOf(data, today);
  const st = cycleState(data, today);
  if (logged) {
    applyLog(rotation, st, logged);
    return { logged, next: peekNext(rotation, st) };
  }
  const next = peekNext(rotation, st);
  if (restDays.includes(weekday(today))) return { rest: true, next };
  return { workoutId: next, next };
}

/** Previsão dos próximos `n` dias: [{ key, type: 'workout'|'rest', workoutId, done }] */
export function forecast(data: Data, today: DayKey, n = 7): ForecastDay[] {
  const { rotation, restDays } = trainingConfig(data);
  const st = cycleState(data, today);
  const out: ForecastDay[] = [];
  for (let i = 0; i < n; i++) {
    const key = addDays(today, i);
    const logged = i === 0 ? trainingOf(data, key) : null;
    if (logged) {
      out.push({ key, type: logged.type, workoutId: logged.workoutId, done: true });
      applyLog(rotation, st, logged);
    } else if (restDays.includes(weekday(key))) {
      out.push({ key, type: 'rest' });
    } else {
      const next = peekNext(rotation, st);
      out.push({ key, type: next ? 'workout' : 'rest', workoutId: next });
      if (next) applyLog(rotation, st, { type: 'workout', workoutId: next });
    }
  }
  return out;
}

/** Letra do treino na sequência (A, B, C…) para mostrar de forma curta. */
export const slotLetter = (i: number) => 'ABCDEFG'[i] || String(i + 1);

/** O que a pessoa marcou no painel de check para um exercício. */
export interface ItemEntry {
  sets?: SetLog[];
  noWeight?: boolean;
  minutes?: number;
  km?: number;
}

/**
 * Registro de "treino feito" do dia. Guarda uma cópia das cargas:
 * é assim que a aba Evolução mede a força ao longo do tempo (mesmo se o treino mudar depois).
 * Com `entries`, guarda as séries reais (repetições e peso de cada uma) e o tempo do cardio.
 */
export function workoutLog(
  workout: Workout | undefined,
  workoutId: string,
  at = Date.now(),
  doneIds?: string[],
  entries?: Record<string, ItemEntry>,
  swap?: string,
): TrainingLog {
  const all = workout?.items || [];
  // doneIds = exercícios marcados no painel de check (sem a lista, conta o treino inteiro)
  const done = doneIds ? all.filter((it) => doneIds.includes(it.id)) : all;
  const items = done.map((it): LoggedItem => {
    const { exId, sets, reps, weight, minutes, distance } = it;
    const base: LoggedItem = { exId, sets, reps, weight, minutes };
    if (distance) base.distance = distance;
    const e = entries?.[it.id];
    if (!e) return base;
    if (e.minutes !== undefined) base.minutes = e.minutes;
    if (e.km !== undefined) base.distance = e.km || undefined;
    const real = (e.sets || []).filter((x) => x.reps > 0);
    if (real.length) {
      const noWeight = !!e.noWeight || real.every((x) => x.kg === null);
      const sets = real.map((x) => ({ reps: x.reps, kg: noWeight ? null : x.kg }));
      const kgs = sets.map((x) => x.kg).filter((k): k is number => k !== null && k > 0);
      base.done = sets;
      base.sets = sets.length;
      base.reps = String(Math.round(sets.reduce((sum, x) => sum + x.reps, 0) / sets.length));
      base.weight = kgs.length ? Math.max(...kgs) : undefined; // carga mais pesada do dia (evolução)
      if (noWeight) base.noWeight = true;
    }
    return base;
  });
  const log: TrainingLog = { type: 'workout', workoutId, name: workout?.name || 'Treino', at, items, planned: all.length };
  if (swap && swap !== workoutId) log.swap = swap;
  return log;
}
