// Modelo de dados, valores padrão e regras do dia (virada, recorrentes, resumo).
import { addDays, weekday } from './dates.js';
import { dayNutrition } from './foods.js';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function defaultSettings() {
  return {
    userName: '',
    theme: 'system', // 'light' | 'dark' | 'system'
    notificationsOn: true,
    waterGoal: 2000,
    waterQuick: [200, 300, 500],
    waterReminderOn: true,
    waterReminderMinutes: 60,
    waterActiveStart: '07:00',
    waterActiveEnd: '22:00',
    carryOverTasks: true,
    recordGoalMin: 60,
    kcalGoal: 2000,
    recordQuick: [5, 10, 15, 30],
    meals: [
      { id: 'cafe', name: 'Café da manhã', time: '08:00' },
      { id: 'almoco', name: 'Almoço', time: '12:30' },
      { id: 'lanche', name: 'Lanche', time: '16:00' },
      { id: 'jantar', name: 'Jantar', time: '20:00' },
    ],
  };
}

export function defaultData() {
  return {
    version: 1,
    settings: defaultSettings(),
    recurring: [], // { id, title, days: [0..6] }
    dailyGoals: [], // { id, title, type: 'check' | 'count', target, unit, step }
    longGoals: [], // { id, title, current, target, unit }
    days: {}, // 'AAAA-MM-DD' -> Day
    lastDay: null,
    customFoods: [], // { id, name, kcal (por 100 g) }
    foodUsage: {}, // chave do alimento -> { count, grams, last }
  };
}

/** Day: { tasks, water, goals, meals, recording, summary, init } */
export function emptyDay() {
  return { tasks: [], water: [], goals: {}, meals: {}, recording: [], summary: null, init: false };
}

export function recordTotal(day) {
  return (day?.recording || []).reduce((s, r) => s + r.min, 0);
}

export function getDay(data, key) {
  if (!data.days[key]) data.days[key] = emptyDay();
  return data.days[key];
}

/**
 * Prepara o dia (chamado na abertura do app e na virada da meia-noite):
 * - passa tarefas não feitas do último dia aberto (se a opção estiver ligada)
 * - cria as tarefas recorrentes do dia da semana
 */
export function ensureDay(data, key) {
  const day = getDay(data, key);
  if (!day.recording) day.recording = []; // dias salvos antes da gravação existir
  if (day.init) return day;

  const fresh = [];

  // Recorrentes do dia
  const wd = weekday(key);
  for (const r of data.recurring) {
    if (r.days.includes(wd) && !day.tasks.some((t) => t.recurringId === r.id)) {
      fresh.push({ id: uid(), title: r.title, done: false, recurringId: r.id });
    }
  }

  // Tarefas não feitas do último dia aberto
  const prevKey = data.lastDay;
  if (data.settings.carryOverTasks && prevKey && prevKey < key && data.days[prevKey]) {
    for (const t of data.days[prevKey].tasks) {
      if (!t.done && !t.recurringId && !t.movedTo) {
        t.movedTo = key;
        fresh.push({ id: uid(), title: t.title, done: false, carried: true });
      }
    }
  }

  day.tasks = [...fresh, ...day.tasks];
  day.init = true;
  if (!data.lastDay || key > data.lastDay) data.lastDay = key;
  return day;
}

export function goalDone(goal, value) {
  if (goal.type === 'check') return (value || 0) >= 1;
  return (value || 0) >= (goal.target || 1);
}

export function waterTotal(day) {
  return (day?.water || []).reduce((s, w) => s + w.ml, 0);
}

/** Resumo congelado do dia, usado pelo histórico e pelos gráficos. */
export function computeSummary(data, key) {
  const day = data.days[key];
  // tarefas que passaram adiante contam como "não feitas" naquele dia
  const tasks = day.tasks;
  const meals = data.settings.meals;
  return {
    water: waterTotal(day),
    waterGoal: data.settings.waterGoal,
    kcal: dayNutrition(day).kcal,
    kcalGoal: data.settings.kcalGoal,
    record: recordTotal(day),
    recordGoal: data.settings.recordGoalMin,
    tasksDone: tasks.filter((t) => t.done).length,
    tasksTotal: tasks.length,
    goalsDone: data.dailyGoals.filter((g) => goalDone(g, day.goals[g.id])).length,
    goalsTotal: data.dailyGoals.length,
    mealsDone: meals.filter((m) => day.meals[m.id]?.done).length,
    mealsTotal: meals.length,
    // fotografia dos nomes para o histórico continuar legível se algo for apagado
    goalNames: Object.fromEntries(data.dailyGoals.map((g) => [g.id, g.title])),
    mealNames: Object.fromEntries(meals.map((m) => [m.id, m.name])),
  };
}

export function tomorrowOf(key) {
  return addDays(key, 1);
}
