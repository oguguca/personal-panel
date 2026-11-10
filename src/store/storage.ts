// Persistência local (localStorage) + exportar/importar backup em JSON.
import { defaultData, defaultSettings } from './model';
import type { Data } from './types';

const KEY = 'painel-pessoal:data';

// raw vem de JSON (formato ainda não garantido), por isso any.
function normalize(raw: any): Data {
  const base = defaultData();
  if (!raw || typeof raw !== 'object') return base;
  // Migração (uma vez): meta única de água -> mínimo 4 L / ideal 6 L; botões rápidos maiores.
  if (raw.settings && raw.settings.waterIdeal === undefined) {
    raw = { ...raw, settings: { ...raw.settings, waterGoal: Math.max(raw.settings.waterGoal || 0, 4000), waterIdeal: 6000 } };
    if (String(raw.settings.waterQuick) === '200,300,500') raw.settings.waterQuick = [300, 500, 1000];
  }
  // Migração: o atributo Idiomas foi removido; tarefas de idioma passam a contar como Intelecto.
  const fixAttr = (t: any) => { if (t && t.attr === 'lang') t.attr = 'int'; };
  if (Array.isArray(raw.recurring)) raw.recurring.forEach(fixAttr);
  if (raw.days && typeof raw.days === 'object') for (const d of Object.values<any>(raw.days)) (d?.tasks || []).forEach(fixAttr);
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
    training: {
      rotation: Array.isArray(raw.training?.rotation) ? raw.training.rotation : [],
      restDays: Array.isArray(raw.training?.restDays) ? raw.training.restDays : [],
    },
    foodUsage: raw.foodUsage && typeof raw.foodUsage === 'object' ? raw.foodUsage : {},
    events: Array.isArray(raw.events) ? raw.events : [],
  };
}

export function loadData(): Data {
  try {
    const txt = localStorage.getItem(KEY);
    return normalize(txt ? JSON.parse(txt) : null);
  } catch (err) {
    console.error('Não foi possível ler os dados salvos:', err);
    return defaultData();
  }
}

export function saveData(data: Data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Não foi possível salvar os dados:', err);
  }
}

export function exportJSON(data: Data) {
  return JSON.stringify({ app: 'painel-pessoal', exportedAt: new Date().toISOString(), data }, null, 2);
}

/** Lê um backup. Lança erro com mensagem amigável se o arquivo for inválido. */
export function parseBackup(text: string): Data {
  let obj: any;
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
