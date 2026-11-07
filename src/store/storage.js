// Persistência local (localStorage) + exportar/importar backup em JSON.
import { defaultData, defaultSettings } from './model.js';

const KEY = 'painel-pessoal:data';

function normalize(raw) {
  const base = defaultData();
  if (!raw || typeof raw !== 'object') return base;
  // Migração (uma vez): meta única de água -> mínimo 4 L / ideal 6 L; botões rápidos maiores.
  if (raw.settings && raw.settings.waterIdeal === undefined) {
    raw = { ...raw, settings: { ...raw.settings, waterGoal: Math.max(raw.settings.waterGoal || 0, 4000), waterIdeal: 6000 } };
    if (String(raw.settings.waterQuick) === '200,300,500') raw.settings.waterQuick = [300, 500, 1000];
  }
  return {
    ...base,
    ...raw,
    settings: {
      ...defaultSettings(),
      ...(raw.settings || {}),
      profile: { ...defaultSettings().profile, ...(raw.settings?.profile || {}) },
    },
    recurring: Array.isArray(raw.recurring) ? raw.recurring : [],
    dailyGoals: Array.isArray(raw.dailyGoals) ? raw.dailyGoals : [],
    longGoals: Array.isArray(raw.longGoals) ? raw.longGoals : [],
    days: raw.days && typeof raw.days === 'object' ? raw.days : {},
    customFoods: Array.isArray(raw.customFoods) ? raw.customFoods : [],
    workouts: Array.isArray(raw.workouts) ? raw.workouts : [],
    foodUsage: raw.foodUsage && typeof raw.foodUsage === 'object' ? raw.foodUsage : {},
  };
}

export function loadData() {
  try {
    const txt = localStorage.getItem(KEY);
    return normalize(txt ? JSON.parse(txt) : null);
  } catch (err) {
    console.error('Não foi possível ler os dados salvos:', err);
    return defaultData();
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Não foi possível salvar os dados:', err);
  }
}

export function exportJSON(data) {
  return JSON.stringify({ app: 'painel-pessoal', exportedAt: new Date().toISOString(), data }, null, 2);
}

/** Lê um backup. Lança erro com mensagem amigável se o arquivo for inválido. */
export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  const data = obj?.app === 'painel-pessoal' ? obj.data : obj;
  if (!data || typeof data !== 'object' || !data.settings || !data.days) {
    throw new Error('Este arquivo não parece ser um backup do Painel Pessoal.');
  }
  return normalize(data);
}
