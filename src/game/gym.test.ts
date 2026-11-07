import { describe, expect, it } from 'vitest';
import { makeData, withDay } from '../test/fixtures';
import { STATIONS, TIMING, animOf, buildPlan, lastWorkout, movesOf, planLength, repAt, stepAt } from './gym';

const ex = (name: string, m: string[] = [], cat = 'Força') => ({ name, m, cat });

describe('movimento de cada exercício', () => {
  it.each([
    ['Supino reto com barra', 'bench'],
    ['Agachamento livre', 'squat'],
    ['Levantamento terra', 'deadlift'],
    ['Rosca direta com barra', 'curl'],
    ['Desenvolvimento com halteres', 'press'],
    ['Puxada frontal', 'pull'],
    ['Remada curvada', 'row'],
    ['Abdominal supra', 'abs'],
    ['Flexão de braço', 'pushup'],
  ])('%s -> %s', (name, anim) => {
    expect(animOf(ex(name))).toBe(anim);
  });

  it('cardio vai para esteira ou bicicleta; sem nome conhecido usa o músculo', () => {
    expect(animOf(ex('Corrida', [], 'Cardio'))).toBe('run');
    expect(animOf(ex('Bicicleta ergométrica', [], 'Cardio'))).toBe('bike');
    expect(animOf(ex('Exercício estranho', ['lats']))).toBe('pull');
    expect(animOf(ex('Outro', ['quads']))).toBe('squat');
  });
});

describe('linha do tempo do treino', () => {
  const moves = movesOf([
    { exId: 'supino-reto-barra', sets: 3, reps: '8-10', weight: '40' },
    { exId: 'rosca-direta', sets: 2, reps: '12', weight: '10' },
  ]);

  it('converte séries, repetições (média da faixa) e carga', () => {
    expect(moves[0]).toMatchObject({ anim: 'bench', station: 'bench', sets: 3, reps: 9, weight: 40 });
    expect(moves[1]).toMatchObject({ sets: 2, reps: 12, weight: 10 });
  });

  it('anda até o aparelho, faz as séries com descanso entre elas e termina', () => {
    const plan = buildPlan(moves);
    expect(plan.map((s) => s.kind)).toEqual(['intro', 'walk', 'set', 'rest', 'set', 'rest', 'set', 'walk', 'set', 'rest', 'set', 'done']);
    const sets = plan.filter((s) => s.kind === 'set');
    expect(sets[0].dur).toBeCloseTo(9 * TIMING.rep);
  });

  it('acha o passo e a repetição pelo tempo', () => {
    const plan = buildPlan(moves);
    const start = plan[0].dur + plan[1].dur;
    const at = stepAt(plan, start + TIMING.rep * 2.5);
    expect(at.step.kind).toBe('set');
    expect(repAt(moves[0], at.elapsed).rep).toBe(3);
    expect(stepAt(plan, planLength(plan) + 99).step.kind).toBe('done');
  });

  it('a caminhada vai até a posição do aparelho', () => {
    const walk = buildPlan(moves).find((s) => s.kind === 'walk');
    expect(walk && 'to' in walk && walk.to).toBe(STATIONS.bench);
  });
});

describe('último treino feito', () => {
  it('pega o treino mais recente até hoje', () => {
    const data = makeData();
    withDay(data, '2026-11-01', { training: { type: 'workout', name: 'A', at: 0, items: [{ exId: 'rosca-direta' }] } });
    withDay(data, '2026-11-02', { training: { type: 'rest', at: 0 } });
    expect(lastWorkout(data, '2026-11-03')).toMatchObject({ key: '2026-11-01', name: 'A' });
    expect(lastWorkout(makeData(), '2026-11-03')).toBeNull();
  });
});
