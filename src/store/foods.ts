// Banco de alimentos: Tabela TACO (por 100 g) + alimentos cadastrados por você.
import taco from '../data/taco.json' with { type: 'json' };
import type { CustomFood, Day, Food, FoodItem, FoodUsage, Macros, Unit } from './types';

// Formato compacto do JSON: [id, nome, kcal, proteína, carboidrato, gordura, índice da categoria]
type TacoRow = [number, string, number, number, number, number, number];

export const norm = (s: unknown): string =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const TACO_FOODS: Food[] = (taco.foods as TacoRow[]).map(([id, name, kcal, p, c, g, cat]) => ({
  key: `t${id}`,
  name,
  kcal, // por 100 g
  p, c, g,
  cat: taco.categories[cat] || '',
  n: norm(name),
}));

// Suplementos de marca (valores por 100 g, calculados da porção do rótulo; variam um pouco por sabor).
// [chave, nome, kcal, proteína, carboidrato, gordura, unidade, plural, gramas da unidade]
const BRAND_ROWS: [string, string, number, number, number, number, string, string, number][] = [
  // Max Titanium 100% Whey: porção 40 g = 155 kcal, 20 g proteína, 12 g carbo, 3 g gordura
  ['max-100-whey', 'Whey protein, Max Titanium 100% Whey', 388, 50, 30, 7.5, 'dose (40 g)', 'doses (40 g)', 40],
  // Growth Whey Protein Concentrado 80%: porção 30 g = 122 kcal, 23 g proteína, 4 g carbo, 1,6 g gordura
  ['growth-whey-80', 'Whey protein, Growth Concentrado 80%', 407, 76.7, 13.3, 5.3, 'scoop (30 g)', 'scoops (30 g)', 30],
  // Black Skull Whey 100% HD: porção 30 g = 125 kcal, 21 g proteína, 5,9 g carbo, 1,9 g gordura
  ['blackskull-100-hd', 'Whey protein, Black Skull 100% HD', 417, 70, 19.7, 6.3, 'scoop (30 g)', 'scoops (30 g)', 30],
];
const BRAND_FOODS: Food[] = BRAND_ROWS.map(([key, name, kcal, p, c, g, label, plural, grams]) => ({
  key: `b-${key}`,
  name,
  kcal, p, c, g,
  cat: 'Suplementos',
  n: norm(name),
  unit: { label, plural, g: grams },
}));

/** Lista completa: TACO + alimentos próprios ({ id, name, kcal por 100 g }). */
export function allFoods(customFoods: CustomFood[] = []): Food[] {
  const mine = customFoods.map((f): Food => ({
    key: `c${f.id}`,
    name: f.name,
    kcal: f.kcal,
    p: f.p || 0, c: f.c || 0, g: f.g || 0,
    cat: 'Meus alimentos',
    n: norm(f.name),
    custom: true,
    unit: f.unit || null, // { label, plural, g } quando cadastrado por unidade
  }));
  return [...mine, ...BRAND_FOODS, ...TACO_FOODS];
}

/** Busca por palavras (sem acento, em qualquer ordem). Prioriza o que você mais usa. */
export function searchFoods(query: string, foods: Food[], usage: Record<string, FoodUsage> = {}, limit = 15): Food[] {
  const words = norm(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  const hits: { f: Food; score: number }[] = [];
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
export function frequentFoods(foods: Food[], usage: Record<string, FoodUsage> = {}, limit = 8): Food[] {
  const byKey = new Map(foods.map((f) => [f.key, f]));
  return Object.entries(usage)
    .sort((a, b) => b[1].count - a[1].count || b[1].last - a[1].last)
    .map(([k]) => byKey.get(k))
    .filter((f): f is Food => !!f)
    .slice(0, limit);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

// Peso aproximado de 1 unidade (g) para alimentos que se contam. [regex no nome normalizado, singular, plural, gramas]
// Valores médios de medidas caseiras; o usuário pode ajustar ("1 ovo ≈ 50 g") e o app lembra.
const UNIT_RULES: [RegExp, string, string, number][] = [
  [/^ovo de galinha inteiro/, 'ovo', 'ovos', 50],
  [/^ovo de galinha clara/, 'clara', 'claras', 30],
  [/^ovo de galinha gema/, 'gema', 'gemas', 17],
  [/^ovo de codorna/, 'ovo', 'ovos', 10],
  [/^pao trigo frances/, 'pão', 'pães', 50],
  [/^pao trigo sovado/, 'pão', 'pães', 50],
  [/^pao .*forma|^pao de soja/, 'fatia', 'fatias', 25],
  [/^torrada/, 'torrada', 'torradas', 15],
  [/^pao de queijo/, 'pão de queijo', 'pães de queijo', 25],
  [/^biscoito salgado cream cracker/, 'biscoito', 'biscoitos', 6],
  [/^biscoito doce maisena/, 'biscoito', 'biscoitos', 5],
  [/^biscoito doce recheado/, 'biscoito', 'biscoitos', 12],
  [/^banana ouro/, 'banana', 'bananas', 40],
  [/^banana da terra/, 'banana', 'bananas', 150],
  [/^banana (figo|maca|nanica|pacova|prata)/, 'banana', 'bananas', 80],
  [/^maca .*crua/, 'maçã', 'maçãs', 130],
  [/^laranja .*crua/, 'laranja', 'laranjas', 150],
  [/^mexerica .*crua/, 'mexerica', 'mexericas', 110],
  [/^tangerina .*crua/, 'tangerina', 'tangerinas', 110],
  [/^kiwi/, 'kiwi', 'kiwis', 70],
  [/^pessego aurora/, 'pêssego', 'pêssegos', 110],
  [/^goiaba .*crua/, 'goiaba', 'goiabas', 150],
  [/^ameixa crua/, 'ameixa', 'ameixas', 40],
  [/^figo cru/, 'figo', 'figos', 50],
  [/^caqui/, 'caqui', 'caquis', 150],
  [/^coxinha/, 'coxinha', 'coxinhas', 80],
  [/^empada/, 'empada', 'empadas', 50],
  [/^pastel de (carne|queijo) frito/, 'pastel', 'pastéis', 80],
  [/^quibe (assado|frito)/, 'quibe', 'quibes', 70],
  [/^hamburguer/, 'hambúrguer', 'hambúrgueres', 90],
  [/^tapioca/, 'tapioca', 'tapiocas', 80],
];

/** Unidade sugerida para o alimento: { label, plural, g } ou null. */
export function defaultUnit(food: Food): Unit | null {
  if (food.unit) return food.unit; // alimento próprio com unidade
  for (const [re, label, plural, g] of UNIT_RULES) if (re.test(food.n)) return { label, plural, g };
  return null;
}

/** Item de refeição já calculado para a porção (valores congelados). amount = { qty, unit } opcional. */
export function makeItem(food: Food, grams: number, id: string, amount?: { qty: number; unit: Unit } | null): FoodItem {
  const f = grams / 100;
  return {
    id,
    key: food.key,
    name: food.name,
    grams: Math.round(grams),
    kcal: Math.round(food.kcal * f),
    p: r1(food.p * f),
    c: r1(food.c * f),
    g: r1(food.g * f),
    ...(amount ? { qty: amount.qty, unit: amount.unit.label, unitPl: amount.unit.plural } : {}),
  };
}

/** Texto da quantidade: "3 ovos (150 g)" ou "100 g". */
export function itemAmount(it: FoodItem): string {
  if (!it.qty) return `${it.grams} g`;
  const q = String(it.qty).replace('.', ',');
  return `${q} ${Number(it.qty) > 1 ? it.unitPl || it.unit : it.unit} (${it.grams} g)`;
}

export function sumItems(items: Partial<Macros>[] = []): Macros {
  return items.reduce<Macros>(
    (s, i) => ({ kcal: s.kcal + (i.kcal || 0), p: s.p + (i.p || 0), c: s.c + (i.c || 0), g: s.g + (i.g || 0) }),
    { kcal: 0, p: 0, c: 0, g: 0 }
  );
}

/** Total do dia somando todas as refeições. */
export function dayNutrition(day: Day | undefined): Macros {
  return sumItems(Object.values(day?.meals || {}).flatMap((m) => m.items || []));
}

export const fmtKcal = (n: number) => `${Math.round(n).toLocaleString('pt-BR')} kcal`;
