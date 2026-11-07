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
    unit: f.unit || null, // { label, plural, g } quando cadastrado por unidade
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

// Peso aproximado de 1 unidade (g) para alimentos que se contam. [regex no nome normalizado, singular, plural, gramas]
// Valores médios de medidas caseiras; o usuário pode ajustar ("1 ovo ≈ 50 g") e o app lembra.
const UNIT_RULES = [
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
export function defaultUnit(food) {
  if (food.unit) return food.unit; // alimento próprio com unidade
  for (const [re, label, plural, g] of UNIT_RULES) if (re.test(food.n)) return { label, plural, g };
  return null;
}

/** Item de refeição já calculado para a porção (valores congelados). amount = { qty, unit } opcional. */
export function makeItem(food, grams, id, amount) {
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
export function itemAmount(it) {
  if (!it.qty) return `${it.grams} g`;
  const q = String(it.qty).replace('.', ',');
  return `${q} ${it.qty > 1 ? it.unitPl || it.unit : it.unit} (${it.grams} g)`;
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
