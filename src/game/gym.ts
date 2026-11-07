// Lógica do mini-jogo da academia (sem desenho): qual movimento cada exercício usa,
// em qual aparelho, e a linha do tempo do treino (andar → séries → descanso → fim).
import { EXERCISE_BY_ID } from '../data/exercises';
import { norm } from '../store/foods';
import { num, repsOf, trainingItems } from '../store/game';
import type { Data, DayKey, Exercise, WorkoutItem } from '../store/types';

export type Anim =
  | 'bench' | 'squat' | 'deadlift' | 'curl' | 'press' | 'pull' | 'row'
  | 'abs' | 'pushup' | 'stretch' | 'run' | 'bike';

export type StationId = 'treadmill' | 'bike' | 'bench' | 'rack' | 'platform' | 'pullup' | 'dumbbells' | 'mat';

/** Posição (x) de cada aparelho na cena de 384 px de largura. */
export const STATIONS: Record<StationId, number> = {
  treadmill: 30,
  bike: 72,
  bench: 122,
  rack: 172,
  platform: 220,
  pullup: 266,
  dumbbells: 310,
  mat: 354,
};

export const STATION_OF: Record<Anim, StationId> = {
  run: 'treadmill',
  bike: 'bike',
  bench: 'bench',
  squat: 'rack',
  deadlift: 'platform',
  row: 'platform',
  pull: 'pullup',
  curl: 'dumbbells',
  press: 'dumbbells',
  abs: 'mat',
  pushup: 'mat',
  stretch: 'mat',
};

// Palavras do nome (sem acento) -> movimento. A ordem importa.
const BY_NAME: [RegExp, Anim][] = [
  [/bicicleta|bike|pedal|ergometr|spinning/, 'bike'],
  [/esteira|corrida|correr|caminhada|trote|eliptic|escada|remo ergo|pular corda/, 'run'],
  [/flexao de braco|flexoes|push.?up/, 'pushup'],
  [/supino|crucifixo|voador|peck|chest press|crossover/, 'bench'],
  [/terra|stiff|deadlift|good morning|bom dia/, 'deadlift'],
  [/agacha|leg press|hack|afundo|passada|bulgar|extensora|flexora|panturrilha|elevacao pelvica|gluteo|cadeira|mesa/, 'squat'],
  [/barra fixa|puxada|pulldown|pull.?up|chin.?up/, 'pull'],
  [/remada|serrote/, 'row'],
  [/rosca|curl/, 'curl'],
  [/desenvolvimento|militar|elevacao lateral|elevacao frontal|triceps|frances|testa|mergulho|encolhimento|arnold/, 'press'],
  [/abdominal|prancha|crunch|infra|obliquo|canivete/, 'abs'],
  [/alongamento|mobilidade|rolo/, 'stretch'],
];

const BY_MUSCLE: Record<string, Anim> = {
  chest: 'bench',
  quads: 'squat', glutes: 'squat', hamstrings: 'squat', adductors: 'squat', abductors: 'squat', calves: 'squat',
  lats: 'pull', midback: 'row', lowerback: 'deadlift', traps: 'press',
  biceps: 'curl', forearms: 'curl',
  shoulders: 'press', triceps: 'press', neck: 'press',
  abs: 'abs', obliques: 'abs',
};

/** Qual movimento o personagem faz para este exercício. */
export function animOf(ex: Pick<Exercise, 'name' | 'cat' | 'm'> | undefined): Anim {
  if (!ex) return 'curl';
  const n = norm(ex.name);
  if (ex.cat === 'Cardio') return /bicicleta|bike|pedal|spinning/.test(n) ? 'bike' : 'run';
  if (ex.cat === 'Alongamento') return 'stretch';
  for (const [re, anim] of BY_NAME) if (re.test(n)) return anim;
  for (const m of ex.m || []) if (BY_MUSCLE[m]) return BY_MUSCLE[m];
  return 'curl';
}

// ---------- linha do tempo ----------

export const TIMING = {
  intro: 1.2, // entra na academia
  rep: 0.9, // segundos por repetição
  rest: 1.4, // descanso entre séries
  walkSpeed: 70, // px por segundo
  cardio: 6, // segundos de animação para qualquer cardio
  outro: 4, // pose final
};

export interface Move {
  exId: string;
  name: string;
  anim: Anim;
  station: StationId;
  sets: number;
  reps: number;
  weight: number;
  minutes: number;
}

export type Step =
  | { kind: 'intro'; dur: number; x: number }
  | { kind: 'walk'; dur: number; from: number; to: number; move: number }
  | { kind: 'set'; dur: number; move: number; set: number }
  | { kind: 'rest'; dur: number; move: number; set: number }
  | { kind: 'done'; dur: number; x: number };

export const ENTRY_X = 8; // porta da academia

/** Transforma os itens do treino em movimentos do jogo. */
export function movesOf(items: Omit<WorkoutItem, 'id'>[]): Move[] {
  return items
    .filter((it) => EXERCISE_BY_ID[it.exId])
    .map((it) => {
      const ex = EXERCISE_BY_ID[it.exId]!;
      const anim = animOf(ex);
      const cardio = anim === 'run' || anim === 'bike';
      return {
        exId: it.exId,
        name: ex.name,
        anim,
        station: STATION_OF[anim],
        sets: cardio ? 1 : Math.max(1, Math.round(num(it.sets) || 3)),
        reps: cardio ? 0 : Math.max(1, Math.round(repsOf(it.reps) || 10)),
        weight: num(it.weight),
        minutes: num(it.minutes),
      };
    });
}

/** Linha do tempo completa do treino. */
export function buildPlan(moves: Move[]): Step[] {
  const steps: Step[] = [{ kind: 'intro', dur: TIMING.intro, x: ENTRY_X }];
  let x = ENTRY_X;
  moves.forEach((m, i) => {
    const to = STATIONS[m.station];
    steps.push({ kind: 'walk', dur: Math.max(0.4, Math.abs(to - x) / TIMING.walkSpeed), from: x, to, move: i });
    x = to;
    const cardio = m.anim === 'run' || m.anim === 'bike';
    for (let s = 1; s <= m.sets; s++) {
      steps.push({ kind: 'set', dur: cardio ? TIMING.cardio : m.reps * TIMING.rep, move: i, set: s });
      if (s < m.sets) steps.push({ kind: 'rest', dur: TIMING.rest, move: i, set: s });
    }
  });
  steps.push({ kind: 'done', dur: TIMING.outro, x });
  return steps;
}

export const planLength = (plan: Step[]) => plan.reduce((s, st) => s + st.dur, 0);

/** Em qual passo estamos no tempo t (segundos) e quanto dele já passou (0..1). */
export function stepAt(plan: Step[], t: number): { index: number; step: Step; local: number; elapsed: number } {
  let acc = 0;
  for (let i = 0; i < plan.length; i++) {
    const st = plan[i];
    if (t < acc + st.dur || i === plan.length - 1) {
      const elapsed = Math.min(st.dur, Math.max(0, t - acc));
      return { index: i, step: st, local: st.dur ? elapsed / st.dur : 1, elapsed };
    }
    acc += st.dur;
  }
  throw new Error('plano vazio');
}

/** Repetição atual (1..reps) dentro de uma série e a fase do movimento (0..1). */
export function repAt(move: Move, elapsed: number): { rep: number; phase: number } {
  if (!move.reps) return { rep: 0, phase: (elapsed / 0.6) % 1 };
  const r = elapsed / TIMING.rep;
  return { rep: Math.min(move.reps, Math.floor(r) + 1), phase: r % 1 };
}

/** Último treino feito (hoje ou antes), para o personagem repetir. */
export function lastWorkout(data: Data, today: DayKey) {
  const keys = Object.keys(data.days).filter((k) => k <= today).sort().reverse();
  for (const key of keys) {
    const t = data.days[key].training;
    if (t?.type === 'workout') return { key, name: t.name || 'Treino', items: trainingItems(data, t) };
  }
  return null;
}
