// Ciclo de treinos: sequência de 1 a 7 treinos + dias de descanso opcionais.
// O próximo treino é calculado pelo ÚLTIMO TREINO FEITO (não pelo dia da semana),
// então se a pessoa fizer o C na segunda, a sequência continua a partir do C.
import { addDays, weekday } from './dates.js';

export const MAX_ROTATION = 7;

export function trainingConfig(data) {
  const ids = new Set(data.workouts.map((w) => w.id));
  const t = data.training || {};
  let rotation = (t.rotation || []).filter((id) => ids.has(id)).slice(0, MAX_ROTATION);
  if (!rotation.length) rotation = data.workouts.slice(0, MAX_ROTATION).map((w) => w.id);
  return { rotation, restDays: t.restDays || [] };
}

/** Registro do dia: { type: 'workout' | 'rest', workoutId?, name?, at } ou null. */
export const trainingOf = (data, key) => data.days[key]?.training || null;

/** Último treino feito (que esteja no ciclo) até a data `key` (inclusive, se includeKey). */
export function lastDone(data, key, includeKey = true) {
  const { rotation } = trainingConfig(data);
  const keys = Object.keys(data.days)
    .filter((k) => (includeKey ? k <= key : k < key))
    .sort()
    .reverse();
  for (const k of keys) {
    const t = data.days[k].training;
    if (t?.type === 'workout' && rotation.includes(t.workoutId)) return { key: k, workoutId: t.workoutId };
  }
  return null;
}

export function nextAfter(rotation, workoutId) {
  if (!rotation.length) return null;
  const i = rotation.indexOf(workoutId);
  return rotation[(i + 1) % rotation.length]; // i = -1 (nenhum) -> primeiro
}

/**
 * Sugestão para hoje:
 *  { logged }                      -> já registrou algo hoje
 *  { rest: true, next }            -> dia de descanso (se treinar, o sugerido é `next`)
 *  { workoutId }                   -> treino sugerido
 */
export function suggestion(data, today) {
  const { rotation, restDays } = trainingConfig(data);
  const logged = trainingOf(data, today);
  const prev = lastDone(data, today, false);
  const next = nextAfter(rotation, prev?.workoutId);
  if (logged) return { logged, next };
  if (restDays.includes(weekday(today))) return { rest: true, next };
  return { workoutId: next, next };
}

/** Previsão dos próximos `n` dias: [{ key, type: 'workout'|'rest', workoutId, done }] */
export function forecast(data, today, n = 7) {
  const { rotation, restDays } = trainingConfig(data);
  let pointer = lastDone(data, today, false)?.workoutId;
  const out = [];
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
export const slotLetter = (i) => 'ABCDEFG'[i] || String(i + 1);
