// Ciclo de treinos: sequência de 1 a 7 treinos + dias de descanso opcionais.
// O próximo treino é calculado pelo ÚLTIMO TREINO FEITO (não pelo dia da semana),
// então se a pessoa fizer o C na segunda, a sequência continua a partir do C.
import { addDays, weekday } from './dates';
import type { Data, DayKey, TrainingLog, Workout } from './types';

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
 * Sugestão para hoje:
 *  { logged }                      -> já registrou algo hoje
 *  { rest: true, next }            -> dia de descanso (se treinar, o sugerido é `next`)
 *  { workoutId }                   -> treino sugerido
 */
export function suggestion(data: Data, today: DayKey): Suggestion {
  const { rotation, restDays } = trainingConfig(data);
  const logged = trainingOf(data, today);
  const prev = lastDone(data, today, false);
  const next = nextAfter(rotation, prev?.workoutId);
  if (logged) return { logged, next };
  if (restDays.includes(weekday(today))) return { rest: true, next };
  return { workoutId: next, next };
}

/** Previsão dos próximos `n` dias: [{ key, type: 'workout'|'rest', workoutId, done }] */
export function forecast(data: Data, today: DayKey, n = 7): ForecastDay[] {
  const { rotation, restDays } = trainingConfig(data);
  let pointer: string | null | undefined = lastDone(data, today, false)?.workoutId;
  const out: ForecastDay[] = [];
  for (let i = 0; i < n; i++) {
    const key = addDays(today, i);
    const logged = i === 0 ? trainingOf(data, key) : null;
    if (logged) {
      out.push({ key, type: logged.type, workoutId: logged.workoutId, done: true });
      if (logged.type === 'workout') pointer = logged.workoutId;
    } else if (restDays.includes(weekday(key))) {
      out.push({ key, type: 'rest' });
    } else {
      pointer = nextAfter(rotation, pointer);
      out.push({ key, type: pointer ? 'workout' : 'rest', workoutId: pointer });
    }
  }
  return out;
}

/** Letra do treino na sequência (A, B, C…) para mostrar de forma curta. */
export const slotLetter = (i: number) => 'ABCDEFG'[i] || String(i + 1);

/**
 * Registro de "treino feito" do dia. Guarda uma cópia das cargas:
 * é assim que a aba Evolução mede a força ao longo do tempo (mesmo se o treino mudar depois).
 */
export function workoutLog(workout: Workout | undefined, workoutId: string, at = Date.now()): TrainingLog {
  const items = (workout?.items || []).map(({ exId, sets, reps, weight, minutes }) => ({ exId, sets, reps, weight, minutes }));
  return { type: 'workout', workoutId, name: workout?.name || 'Treino', at, items };
}
