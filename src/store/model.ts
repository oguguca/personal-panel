// Modelo de dados, valores padrão e regras do dia (virada, recorrentes, resumo).
import { addDays, weekday } from './dates';
import { dayNutrition } from './foods';
import type { DailyGoal, Data, Day, DayKey, MealState, Settings, Summary } from './types';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function defaultSettings(): Settings {
  return {
    userName: '',
    theme: 'system', // 'light' | 'dark' | 'system'
    notificationsOn: true,
    waterGoal: 4000, // mínimo do dia (conta como "meta batida")
    waterIdeal: 6000, // ideal do dia (barra/copo enchem até aqui)
    waterQuick: [300, 500, 1000],
    waterReminderOn: true,
    waterReminderMinutes: 60,
    waterActiveStart: '07:00',
    waterActiveEnd: '22:00',
    carryOverTasks: true,
    recordGoalMin: 60,
    kcalGoal: 2000,
    profile: { height: '', weight: '', age: '', birthday: '', sex: '', activity: 1.375 },
    recordQuick: [5, 10, 15, 30],
    meals: [
      { id: 'cafe', name: 'Café da manhã', time: '08:00' },
      { id: 'almoco', name: 'Almoço', time: '12:30' },
      { id: 'lanche', name: 'Lanche', time: '16:00' },
      { id: 'jantar', name: 'Jantar', time: '20:00' },
    ],
  };
}

export function defaultData(): Data {
  return {
    version: 1,
    settings: defaultSettings(),
    recurring: [], // { id, title, days: [0..6], attr? }
    dailyGoals: [], // { id, title, type: 'check' | 'count', target, unit, step }
    longGoals: [], // { id, title, current, target, unit }
    days: {}, // 'AAAA-MM-DD' -> Day
    lastDay: null,
    customFoods: [], // { id, name, kcal (por 100 g) }
    foodUsage: {}, // chave do alimento -> { count, grams, last }
    workouts: [], // { id, name, items: [{ id, exId, sets, reps, weight } | { id, exId, minutes, distance }] }
    training: { rotation: [], restDays: [] }, // ciclo (ordem dos treinos) e dias de descanso da semana
    events: [], // calendário: compromissos e corridas
    running: { runs: [], shoes: [], monthGoalKm: 0 }, // aba Corrida
  };
}

/** Day: { tasks, water, goals, meals, recording, summary, init } */
export function emptyDay(): Day {
  return { tasks: [], water: [], goals: {}, meals: {}, recording: [], summary: null, init: false };
}

export function recordTotal(day: Day | undefined): number {
  return (day?.recording || []).reduce((s, r) => s + r.min, 0);
}

export function getDay(data: Data, key: DayKey): Day {
  if (!data.days[key]) data.days[key] = emptyDay();
  return data.days[key];
}

/**
 * Prepara o dia (chamado na abertura do app e na virada da meia-noite):
 * - passa tarefas não feitas do último dia aberto (se a opção estiver ligada)
 * - cria as tarefas recorrentes do dia da semana
 */
export function ensureDay(data: Data, key: DayKey): Day {
  const day = getDay(data, key);
  if (!day.recording) day.recording = []; // dias salvos antes da gravação existir
  if (day.init) return day;

  const fresh: Day['tasks'] = [];

  // Recorrentes do dia
  const wd = weekday(key);
  for (const r of data.recurring) {
    if (r.days.includes(wd) && !day.tasks.some((t) => t.recurringId === r.id)) {
      fresh.push({ id: uid(), title: r.title, done: false, recurringId: r.id, attr: r.attr || null });
    }
  }

  // Tarefas não feitas do último dia aberto
  const prevKey = data.lastDay;
  if (data.settings.carryOverTasks && prevKey && prevKey < key && data.days[prevKey]) {
    for (const t of data.days[prevKey].tasks) {
      if (!t.done && !t.recurringId && !t.movedTo) {
        t.movedTo = key;
        fresh.push({ id: uid(), title: t.title, done: false, carried: true, attr: t.attr || null });
      }
    }
  }

  day.tasks = [...fresh, ...day.tasks];
  day.init = true;
  if (!data.lastDay || key > data.lastDay) data.lastDay = key;
  return day;
}

/**
 * Refeições do dia: as dos horários sugeridos (Configurações) + as registradas na hora
 * (day.meals[id].adhoc). Ordenadas pelo horário real (se feita) ou sugerido.
 * Retorna [{ id, name, time (sugerido ou null), st, adhoc }]
 */
export interface MealEntry {
  id: string;
  name: string;
  time: string | null; // sugerido (null = registrada na hora)
  st: MealState;
  adhoc: boolean;
}

export function mealList(settings: Settings, day: Day | undefined): MealEntry[] {
  const meals = day?.meals || {};
  const ids = new Set(settings.meals.map((m) => m.id));
  const fixed = settings.meals.map((m) => ({ id: m.id, name: m.name, time: m.time, st: meals[m.id] || {}, adhoc: false }));
  const extra = Object.entries(meals)
    .filter(([id, st]) => !ids.has(id) && st.adhoc)
    .map(([id, st]) => ({ id, name: st.name || 'Refeição', time: null, st, adhoc: true }));
  const min = (x: MealEntry) => {
    if (x.st.done && x.st.doneAt) {
      const d = new Date(x.st.doneAt);
      return d.getHours() * 60 + d.getMinutes();
    }
    const [h, m] = String(x.time || '23:59').split(':').map(Number);
    return h * 60 + m;
  };
  return [...fixed, ...extra].sort((a, b) => min(a) - min(b));
}

export function goalDone(goal: DailyGoal, value: number | undefined): boolean {
  if (goal.type === 'check') return (value || 0) >= 1;
  return (value || 0) >= (goal.target || 1);
}

export function waterTotal(day: Day | undefined): number {
  return (day?.water || []).reduce((s, w) => s + w.ml, 0);
}

/** Resumo congelado do dia, usado pelo histórico e pelos gráficos. */
export function computeSummary(data: Data, key: DayKey): Summary {
  const day = data.days[key];
  // tarefas que passaram adiante contam como "não feitas" naquele dia
  const tasks = day.tasks;
  const meals = mealList(data.settings, day);
  return {
    water: waterTotal(day),
    waterGoal: data.settings.waterGoal,
    waterIdeal: data.settings.waterIdeal,
    kcal: dayNutrition(day).kcal,
    kcalGoal: data.settings.kcalGoal,
    record: recordTotal(day),
    recordGoal: data.settings.recordGoalMin,
    tasksDone: tasks.filter((t) => t.done).length,
    tasksTotal: tasks.length,
    goalsDone: data.dailyGoals.filter((g) => goalDone(g, day.goals[g.id])).length,
    goalsTotal: data.dailyGoals.length,
    mealsDone: meals.filter((m) => m.st.done).length,
    mealsTotal: meals.length,
    // fotografia dos nomes para o histórico continuar legível se algo for apagado
    goalNames: Object.fromEntries(data.dailyGoals.map((g) => [g.id, g.title])),
    mealNames: Object.fromEntries(meals.map((m) => [m.id, m.name])),
  };
}

export function tomorrowOf(key: DayKey) {
  return addDays(key, 1);
}
