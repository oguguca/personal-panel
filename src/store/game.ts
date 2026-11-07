// Desenvolvimento pessoal em modo "jogo": atributos, XP, níveis e rank de força.
// Tudo é CALCULADO a partir do que já está salvo (tarefas, água, refeições, treinos…),
// então desmarcar uma tarefa tira o XP e nada fica duplicado.
import { EXERCISE_BY_ID } from '../data/exercises';
import { norm } from './foods';
import { TIERS } from './tiers';
import { goalDone, mealList, recordTotal, waterTotal } from './model';
import type { AttrId, Data, DayKey, TrainingLog, WorkoutItem } from './types';

export interface Attr {
  id: AttrId;
  name: string;
  emoji: string;
  part: string; // parte do corpo onde aparece
  anchor: [number, number];
  side: 'left' | 'right';
  how: string;
}

export interface Gain {
  attr: AttrId;
  xp: number;
  label: string;
}

export interface Level {
  level: number;
  xp: number;
  into: number; // XP dentro do nível atual
  need: number; // XP do nível atual até o próximo
}

export interface AttrState extends Attr, Level {
  rank: string;
  today: number;
}

export interface GymTier {
  min: number;
  name: string;
  color: string;
}

export interface LoadProgress {
  exId: string;
  name: string;
  first: number;
  last: number;
  best: number;
  times: number;
  pct: number;
}

export interface Game {
  attrs: AttrState[];
  total: Level & { title: string };
  muscles: Record<string, number>;
  events: (Gain & { key: DayKey })[];
  gym: {
    tier: GymTier & { index: number; div: number; next?: GymTier; into: number; need: number };
    workouts: number;
    volume: number;
    progress: LoadProgress[];
  };
}

// anchor = ponto no desenho do corpo (viewBox 0 0 200 430) de onde sai a linha.
export const ATTRS: Attr[] = [
  { id: 'int', name: 'Intelecto', emoji: '🧠', part: 'Cérebro', anchor: [100, 22], side: 'right', how: 'Ler, estudar, cursos, aulas' },
  { id: 'lang', name: 'Idiomas', emoji: '🗣️', part: 'Fala', anchor: [100, 47], side: 'left', how: 'Inglês, espanhol, qualquer idioma' },
  { id: 'vit', name: 'Vitalidade', emoji: '❤️', part: 'Coração', anchor: [114, 108], side: 'right', how: 'Água, refeições, sono, descanso' },
  { id: 'forca', name: 'Força', emoji: '💪', part: 'Braços e peito', anchor: [44, 138], side: 'left', how: 'Treinos de musculação (carga conta)' },
  { id: 'disc', name: 'Disciplina', emoji: '🎯', part: 'Núcleo', anchor: [100, 172], side: 'right', how: 'Metas diárias, renda, tarefas em geral' },
  { id: 'resist', name: 'Resistência', emoji: '🏃', part: 'Pernas', anchor: [78, 262], side: 'left', how: 'Cardio, corrida, treino de pernas' },
];
export const ATTR_BY_ID = Object.fromEntries(ATTRS.map((a) => [a.id, a])) as Record<AttrId, Attr>;

// Palavras que sugerem o atributo de uma tarefa (sem acento, minúsculas).
const KEYWORDS: Partial<Record<AttrId, RegExp>> = {
  lang: /ingl|espanh|frances|alema|italian|japon|corean|chines|idioma|duolingo|lingua|vocabul|english/,
  int: /\bler\b|leitura|livro|\blivr|estud|curso|aula|faculdade|prova|revis|pesquis|podcast|artigo|programa|apostila/,
  forca: /academia|muscula|\bgym\b|flexao|supino|agacha|barra fixa|treino de forca/,
  resist: /corr(er|ida)|caminh|bike|pedal|natac|cardio|esteira|trilha|futebol|bicicleta/,
  vit: /medit|dormir|\bsono\b|agua|vitamin|alonga|medico|dentista|yoga|salada|terapia/,
};

/** Sugere o atributo pelo título da tarefa ("Ler 20 páginas" -> 'int'). */
export function guessAttr(title: string): AttrId | null {
  const t = norm(title);
  for (const [id, re] of Object.entries(KEYWORDS)) if (re!.test(t)) return id as AttrId;
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

export const num = (v: unknown) => parseFloat(String(v ?? '').replace(',', '.')) || 0;
export const repsOf = (r: unknown) => {
  const n = String(r ?? '').match(/\d+/g); // "10-12" -> média 11
  return n ? n.map(Number).reduce((a, b) => a + b, 0) / n.length : 0;
};
const isCardio = (exId: string) => EXERCISE_BY_ID[exId]?.cat === 'Cardio';
const LEG = new Set(['quads', 'hamstrings', 'calves', 'glutes', 'adductors', 'abductors']);

/** Itens do treino feito no dia (cópia salva; dias antigos usam o treino atual). */
export function trainingItems(data: Data, t: TrainingLog): Omit<WorkoutItem, 'id'>[] {
  if (t.items) return t.items;
  return data.workouts.find((w) => w.id === t.workoutId)?.items || [];
}

/** Ganhos de XP de um dia: [{ attr, xp, label }] e XP por músculo. */
export function dayGains(data: Data, key: DayKey): { gains: Gain[]; muscles: Record<string, number> } {
  const day = data.days[key];
  const out: Gain[] = [];
  const muscles: Record<string, number> = {};
  if (!day) return { gains: out, muscles };
  const s = data.settings;
  const add = (attr: AttrId, xp: number, label: string) => xp > 0 && out.push({ attr, xp: Math.round(xp), label });

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
export function levelOf(xp: number, base = 60): Level {
  const L = Math.floor((Math.sqrt(1 + (8 * xp) / base) - 1) / 2);
  const cur = (base * L * (L + 1)) / 2;
  const next = (base * (L + 1) * (L + 2)) / 2;
  return { level: L, xp, into: xp - cur, need: next - cur };
}

const RANKS: [number, string][] = [[16, 'S'], [11, 'A'], [7, 'B'], [4, 'C'], [2, 'D'], [0, 'E']];
export const rankOf = (level: number): string => RANKS.find(([min]) => level >= min)![1];

const TITLES: [number, string][] = [[25, 'Lenda'], [18, 'Mestre'], [12, 'Elite'], [8, 'Veterano'], [5, 'Aventureiro'], [2, 'Aprendiz'], [0, 'Iniciante']];
export const titleOf = (level: number): string => TITLES.find(([min]) => level >= min)![1];

// Rank de academia (pelo XP de Força). Mesmos nomes do rank da temporada, com divisões III → I.
const GYM_MIN = [0, 300, 800, 1600, 3000, 5000, 8000, 12000, 17000];
export const GYM_TIERS: GymTier[] = TIERS.map((t, i) => ({ min: GYM_MIN[i], name: t.name, color: t.colors[1] }));
export function gymTier(xp: number): Game['gym']['tier'] {
  let i = GYM_TIERS.length - 1;
  while (GYM_TIERS[i].min > xp) i--;
  const next = GYM_TIERS[i + 1];
  const into = xp - GYM_TIERS[i].min;
  const need = next ? next.min - GYM_TIERS[i].min : 0;
  const div = next ? 3 - Math.min(2, Math.floor((into / need) * 3)) : 0;
  return { ...GYM_TIERS[i], index: i, div, next, into, need };
}

/** Estado completo do personagem. */
export function computeGame(data: Data, today: DayKey): Game {
  const zero = () => Object.fromEntries(ATTRS.map((a) => [a.id, 0])) as Record<AttrId, number>;
  const attrXp = zero();
  const todayXp = zero();
  const muscles: Record<string, number> = {};
  const events: Game['events'] = [];
  const loads: Record<string, { key: DayKey; w: number }[]> = {}; // exId -> cargas por dia
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
