// Desenvolvimento pessoal em modo "jogo": atributos, XP, níveis e rank de força.
// Tudo é CALCULADO a partir do que já está salvo (tarefas, água, refeições, treinos…),
// então desmarcar uma tarefa tira o XP e nada fica duplicado.
import { EXERCISE_BY_ID } from '../data/exercises.js';
import { norm } from './foods.js';
import { goalDone, mealList, recordTotal, waterTotal } from './model.js';

// anchor = ponto no desenho do corpo (viewBox 0 0 200 430) de onde sai a linha.
export const ATTRS = [
  { id: 'int', name: 'Intelecto', emoji: '🧠', part: 'Cérebro', anchor: [100, 22], side: 'right', how: 'Ler, estudar, cursos, aulas' },
  { id: 'lang', name: 'Idiomas', emoji: '🗣️', part: 'Fala', anchor: [100, 47], side: 'left', how: 'Inglês, espanhol, qualquer idioma' },
  { id: 'vit', name: 'Vitalidade', emoji: '❤️', part: 'Coração', anchor: [114, 108], side: 'right', how: 'Água, refeições, sono, descanso' },
  { id: 'forca', name: 'Força', emoji: '💪', part: 'Braços e peito', anchor: [44, 138], side: 'left', how: 'Treinos de musculação (carga conta)' },
  { id: 'disc', name: 'Disciplina', emoji: '🎯', part: 'Núcleo', anchor: [100, 172], side: 'right', how: 'Metas diárias, renda, tarefas em geral' },
  { id: 'resist', name: 'Resistência', emoji: '🏃', part: 'Pernas', anchor: [78, 262], side: 'left', how: 'Cardio, corrida, treino de pernas' },
];
export const ATTR_BY_ID = Object.fromEntries(ATTRS.map((a) => [a.id, a]));

// Palavras que sugerem o atributo de uma tarefa (sem acento, minúsculas).
const KEYWORDS = {
  lang: /ingl|espanh|frances|alema|italian|japon|corean|chines|idioma|duolingo|lingua|vocabul|english/,
  int: /\bler\b|leitura|livro|\blivr|estud|curso|aula|faculdade|prova|revis|pesquis|podcast|artigo|programa|apostila/,
  forca: /academia|muscula|\bgym\b|flexao|supino|agacha|barra fixa|treino de forca/,
  resist: /corr(er|ida)|caminh|bike|pedal|natac|cardio|esteira|trilha|futebol|bicicleta/,
  vit: /medit|dormir|\bsono\b|agua|vitamin|alonga|medico|dentista|yoga|salada|terapia/,
};

/** Sugere o atributo pelo título da tarefa ("Ler 20 páginas" -> 'int'). */
export function guessAttr(title) {
  const t = norm(title);
  for (const [id, re] of Object.entries(KEYWORDS)) if (re.test(t)) return id;
  return null;
}

export const XP = {
  task: 25, // tarefa com atributo
  taskPlain: 8, // tarefa sem atributo -> Disciplina
  waterMin: 15,
  waterIdeal: 10,
  meal: 4,
  goal: 6,
  record: 20,
  rest: 5,
  workout: 30,
};

const num = (v) => parseFloat(String(v ?? '').replace(',', '.')) || 0;
const repsOf = (r) => {
  const n = String(r ?? '').match(/\d+/g); // "10-12" -> média 11
  return n ? n.map(Number).reduce((a, b) => a + b, 0) / n.length : 0;
};
const isCardio = (exId) => EXERCISE_BY_ID[exId]?.cat === 'Cardio';
const LEG = new Set(['quads', 'hamstrings', 'calves', 'glutes', 'adductors', 'abductors']);

/** Itens do treino feito no dia (cópia salva; dias antigos usam o treino atual). */
function trainingItems(data, t) {
  if (t.items) return t.items;
  return data.workouts.find((w) => w.id === t.workoutId)?.items || [];
}

/** Ganhos de XP de um dia: [{ attr, xp, label }] e XP por músculo. */
export function dayGains(data, key) {
  const day = data.days[key];
  const out = [];
  const muscles = {};
  if (!day) return { gains: out, muscles };
  const s = data.settings;
  const add = (attr, xp, label) => xp > 0 && out.push({ attr, xp: Math.round(xp), label });

  for (const t of day.tasks || []) {
    if (!t.done || t.movedTo) continue;
    if (t.attr && ATTR_BY_ID[t.attr]) add(t.attr, XP.task, t.title);
    else add('disc', XP.taskPlain, t.title);
  }

  const water = waterTotal(day);
  if (water >= s.waterGoal) add('vit', XP.waterMin, 'Meta mínima de água');
  if (water >= (s.waterIdeal || s.waterGoal)) add('vit', XP.waterIdeal, 'Água ideal');
  const mealsDone = mealList(s, day).filter((m) => m.st.done).length;
  if (mealsDone) add('vit', mealsDone * XP.meal, `${mealsDone} refeição(ões)`);

  const goals = data.dailyGoals.filter((g) => goalDone(g, day.goals?.[g.id])).length;
  if (goals) add('disc', goals * XP.goal, `${goals} meta(s) do dia`);
  if (s.recordGoalMin && recordTotal(day) >= s.recordGoalMin) add('disc', XP.record, 'Meta da renda');

  const tr = day.training;
  if (tr?.type === 'rest') add('vit', XP.rest, 'Descanso');
  if (tr?.type === 'workout') {
    let volume = 0;
    let cardioMin = 0;
    let legSets = 0;
    for (const it of trainingItems(data, tr)) {
      const ex = EXERCISE_BY_ID[it.exId];
      if (!ex) continue;
      if (isCardio(it.exId)) {
        cardioMin += num(it.minutes);
        continue;
      }
      const sets = num(it.sets) || 3;
      volume += sets * (repsOf(it.reps) || 10) * num(it.weight);
      for (const m of ex.m || []) {
        muscles[m] = (muscles[m] || 0) + sets;
        if (LEG.has(m)) legSets += sets;
      }
      for (const m of ex.s || []) muscles[m] = (muscles[m] || 0) + sets / 2;
    }
    add('forca', XP.workout + Math.min(50, volume / 200), tr.name || 'Treino');
    if (cardioMin) add('resist', Math.min(60, cardioMin), `${Math.round(cardioMin)} min de cardio`);
    if (legSets) add('resist', Math.min(30, legSets * 2), 'Treino de pernas');
  }
  return { gains: out, muscles };
}

// Nível: para chegar ao nível L precisa de base * L * (L + 1) / 2 de XP acumulado.
export function levelOf(xp, base = 60) {
  const L = Math.floor((Math.sqrt(1 + (8 * xp) / base) - 1) / 2);
  const cur = (base * L * (L + 1)) / 2;
  const next = (base * (L + 1) * (L + 2)) / 2;
  return { level: L, xp, into: xp - cur, need: next - cur };
}

const RANKS = [[16, 'S'], [11, 'A'], [7, 'B'], [4, 'C'], [2, 'D'], [0, 'E']];
export const rankOf = (level) => RANKS.find(([min]) => level >= min)[1];

const TITLES = [[25, 'Lenda'], [18, 'Mestre'], [12, 'Elite'], [8, 'Veterano'], [5, 'Aventureiro'], [2, 'Aprendiz'], [0, 'Iniciante']];
export const titleOf = (level) => TITLES.find(([min]) => level >= min)[1];

// Rank de academia (pelo XP de Força).
export const GYM_TIERS = [
  { min: 0, name: 'Ferro', color: '#9ca3af' },
  { min: 300, name: 'Bronze', color: '#d08a4f' },
  { min: 800, name: 'Prata', color: '#cbd5e1' },
  { min: 1600, name: 'Ouro', color: '#facc15' },
  { min: 3000, name: 'Platina', color: '#5eead4' },
  { min: 5000, name: 'Diamante', color: '#7dd3fc' },
  { min: 8000, name: 'Mestre', color: '#c084fc' },
  { min: 12000, name: 'Lenda', color: '#fb7185' },
];
export function gymTier(xp) {
  let i = GYM_TIERS.length - 1;
  while (GYM_TIERS[i].min > xp) i--;
  const next = GYM_TIERS[i + 1];
  return { ...GYM_TIERS[i], index: i, next, into: xp - GYM_TIERS[i].min, need: next ? next.min - GYM_TIERS[i].min : 0 };
}

/** Estado completo do personagem. */
export function computeGame(data, today) {
  const attrXp = Object.fromEntries(ATTRS.map((a) => [a.id, 0]));
  const todayXp = Object.fromEntries(ATTRS.map((a) => [a.id, 0]));
  const muscles = {};
  const events = []; // { key, attr, xp, label }
  const loads = {}; // exId -> [{ key, w }]
  let workouts = 0;
  let volume = 0;

  for (const key of Object.keys(data.days).sort()) {
    if (key > today) continue;
    const { gains, muscles: m } = dayGains(data, key);
    for (const g of gains) {
      attrXp[g.attr] += g.xp;
      if (key === today) todayXp[g.attr] += g.xp;
      events.push({ key, ...g });
    }
    for (const [id, v] of Object.entries(m)) muscles[id] = (muscles[id] || 0) + v;

    const tr = data.days[key].training;
    if (tr?.type === 'workout') {
      workouts++;
      for (const it of trainingItems(data, tr)) {
        const w = num(it.weight);
        if (!w || isCardio(it.exId)) continue;
        volume += (num(it.sets) || 3) * (repsOf(it.reps) || 10) * w;
        (loads[it.exId] ||= []).push({ key, w });
      }
    }
  }

  const attrs = ATTRS.map((a) => {
    const lv = levelOf(attrXp[a.id]);
    return { ...a, ...lv, rank: rankOf(lv.level), today: todayXp[a.id] };
  });
  const totalXp = Object.values(attrXp).reduce((s, v) => s + v, 0);
  const total = levelOf(totalXp, 200);

  // Evolução de carga: primeira x última carga registrada de cada exercício.
  const progress = Object.entries(loads)
    .filter(([, l]) => l.length >= 1)
    .map(([exId, l]) => {
      const first = l[0].w;
      const last = l[l.length - 1].w;
      const best = Math.max(...l.map((x) => x.w));
      return { exId, name: EXERCISE_BY_ID[exId]?.name || exId, first, last, best, times: l.length, pct: first ? Math.round(((last - first) / first) * 100) : 0 };
    })
    .sort((a, b) => b.times - a.times || b.pct - a.pct);

  return {
    attrs,
    total: { ...total, title: titleOf(total.level) },
    muscles,
    events: events.reverse(),
    gym: { tier: gymTier(attrXp.forca), workouts, volume: Math.round(volume), progress },
  };
}
