// Cálculos do perfil: idade, IMC, gasto basal (TMB) e gasto diário total.
import { parseKey } from './dates';
import type { Profile } from './types';

export interface Energy {
  bmr: number | null;
  tdee: number | null;
  factor?: number;
  missing: string[];
}

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentário', hint: 'pouco ou nenhum exercício' },
  { value: 1.375, label: 'Leve', hint: 'exercício 1–3 dias/semana' },
  { value: 1.55, label: 'Moderado', hint: 'exercício 3–5 dias/semana' },
  { value: 1.725, label: 'Intenso', hint: 'exercício 6–7 dias/semana' },
  { value: 1.9, label: 'Muito intenso', hint: 'treino pesado ou trabalho físico' },
];

const num = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Idade a partir da data de aniversário ('AAAA-MM-DD'); senão usa o campo idade. */
export function ageOf(profile: Profile, now = new Date()): number | null {
  if (profile.birthday) {
    const b = parseKey(profile.birthday);
    let a = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
    return a >= 0 && a < 130 ? a : null;
  }
  return num(profile.age);
}

export function isBirthday(profile: Profile, now = new Date()) {
  if (!profile.birthday) return false;
  const b = parseKey(profile.birthday);
  return b.getDate() === now.getDate() && b.getMonth() === now.getMonth();
}

export function bmi(profile: Profile) {
  const h = num(profile.height);
  const w = num(profile.weight);
  if (!h || !w) return null;
  return w / (h / 100) ** 2;
}

export function bmiLabel(v: number) {
  if (v < 18.5) return 'abaixo do peso';
  if (v < 25) return 'peso normal';
  if (v < 30) return 'sobrepeso';
  return 'obesidade';
}

/**
 * Gasto calórico pela fórmula de Mifflin-St Jeor.
 * Retorna { bmr, tdee, missing: [campos faltando] }.
 */
export function energy(profile: Profile): Energy {
  const h = num(profile.height);
  const w = num(profile.weight);
  const a = ageOf(profile);
  const missing: string[] = [];
  if (!h) missing.push('altura');
  if (!w) missing.push('peso');
  if (!a) missing.push('idade ou aniversário');
  if (!profile.sex) missing.push('sexo');
  if (missing.length) return { bmr: null, tdee: null, missing };
  const bmr = 10 * w! + 6.25 * h! - 5 * a! + (profile.sex === 'm' ? 5 : -161);
  const factor = Number(profile.activity) || 1.2;
  return { bmr: Math.round(bmr), tdee: Math.round(bmr * factor), factor, missing };
}
