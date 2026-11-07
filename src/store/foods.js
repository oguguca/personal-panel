// Banco de alimentos: Tabela TACO (por 100 g) + alimentos cadastrados por você.
import taco from '../data/taco.json' with { type: 'json' };

export const norm = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const TACO_FOODS = taco.foods.map(([id, name, kcal, p, c, g, cat]) => ({
  key: `t${id}`,
  name,
  kcal, // por 100 g
  p, c, g,
  cat: taco.categories[cat] || '',
  n: norm(name),
}));

/** Lista completa: TACO + alimentos próprios ({ id, name, kcal por 100 g }). */
export function allFoods(customFoods = []) {
  const mine = customFoods.map((f) => ({
    key: `c${f.id}`,
    name: f.name,
    kcal: f.kcal,
    p: f.p || 0, c: f.c || 0, g: f.g || 0,
    cat: 'Meus alimentos',
    n: norm(f.name),
    custom: true,
  }));
  return [...mine, ...TACO_FOODS];
}

/** Busca por palavras (sem acento, em qualquer ordem). Prioriza o que você mais usa. */
export function searchFoods(query, foods, usage = {}, limit = 15) {
  const words = norm(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  const hits = [];
  for (const f of foods) {
    if (!words.every((w) => f.n.includes(w))) continue;
    let score = (usage[f.key]?.count || 0) * 10;
    if (f.n.startsWith(words[0])) score += 20;
    if (f.n.split(' ').includes(words[0])) score += 5;
    // Prioriza o alimento pronto para comer (arroz cozido antes de arroz cru).
    if (/\b(cozid[oa]s?|grelhad[oa]s?|assad[oa]s?|refogad[oa]s?)\b/.test(f.n)) score += 4;
    if (/\bcrus?\b/.test(f.n)) score -= 3; // "cru" (grãos/carnes); "crua" de fruta fica neutro
    if (f.custom) score += 15;
    score -= f.n.length / 40;
    hits.push({ f, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit).map((h) => h.f);
}

/** Alimentos mais usados, para atalho rápido. */
export function frequentFoods(foods, usage = {}, limit = 8) {
  const byKey = new Map(foods.map((f) => [f.key, f]));
  return Object.entries(usage)
    .sort((a, b) => b[1].count - a[1].count || b[1].last - a[1].last)
    .map(([k]) => byKey.get(k))
    .filter(Boolean)
    .slice(0, limit);
}

const r1 = (n) => Math.round(n * 10) / 10;

/** Item de refeição já calculado para a porção (valores congelados). */
export function makeItem(food, grams, id) {
  const f = grams / 100;
  return {
    id,
    key: food.key,
    name: food.name,
    grams,
    kcal: Math.round(food.kcal * f),
    p: r1(food.p * f),
    c: r1(food.c * f),
    g: r1(food.g * f),
  };
}

export function sumItems(items = []) {
  return items.reduce(
    (s, i) => ({ kcal: s.kcal + (i.kcal || 0), p: s.p + (i.p || 0), c: s.c + (i.c || 0), g: s.g + (i.g || 0) }),
    { kcal: 0, p: 0, c: 0, g: 0 }
  );
}

/** Total do dia somando todas as refeições. */
export function dayNutrition(day) {
  return sumItems(Object.values(day?.meals || {}).flatMap((m) => m.items || []));
}

export const fmtKcal = (n) => `${Math.round(n).toLocaleString('pt-BR')} kcal`;
