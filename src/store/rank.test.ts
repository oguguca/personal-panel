import { describe, expect, it } from 'vitest';
import { makeData, withDay } from '../test/fixtures';
import { addDays } from './dates';
import { gymTier } from './game';
import { RANK, comboOf, computeRanked, rankFromPR, tierStartPR } from './rank';
import type { Data, DayKey } from './types';

/** Dia com N tarefas de atributo feitas (25 XP cada). */
const active = (data: Data, key: DayKey, tasks = 2) =>
  withDay(data, key, { tasks: Array.from({ length: tasks }, (_, i) => ({ id: String(i), title: 'Ler', done: true, attr: 'int' as const })) });

describe('posição no rank', () => {
  it('cada 80 PR sobe uma divisão; os primeiros ranks têm III → II → I', () => {
    expect(rankFromPR(0).label).toBe('Gordo III');
    expect(rankFromPR(79).label).toBe('Gordo III');
    expect(rankFromPR(80).label).toBe('Gordo II');
    expect(rankFromPR(200)).toMatchObject({ label: 'Gordo I', into: 40, need: 80 });
    expect(rankFromPR(240).label).toBe('Toguro III');
    expect(rankFromPR(480).label).toBe('Balestrin III');
  });

  it('ranks do meio têm IV → I e os mais altos V → I', () => {
    expect(tierStartPR(3)).toBe(720);
    expect(rankFromPR(720).label).toBe('Jorlan IV');
    expect(rankFromPR(960).label).toBe('Jorlan I');
    expect(rankFromPR(1040).label).toBe('Cariani IV');
    expect(rankFromPR(1680).label).toBe('Brandão V');
    expect(rankFromPR(2400).label).toBe('CBum I');
  });

  it('a posição (step) só sobe: dá para comparar promoção e queda', () => {
    const steps = [0, 80, 160, 240, 720, 800, 1680, 2480].map((p) => rankFromPR(p).step);
    expect(steps).toEqual([...steps].sort((x, y) => x - y));
    expect(new Set(steps).size).toBe(steps.length);
  });

  it('Ganley não tem divisão e não tem teto', () => {
    expect(tierStartPR(8)).toBe(2480);
    expect(rankFromPR(2480)).toMatchObject({ label: 'Ganley', div: 0, into: 0, need: 0 });
    expect(rankFromPR(9999).label).toBe('Ganley');
  });

  it('combo: +5% por dia seguido, até +50%', () => {
    expect(comboOf(0)).toBe(1);
    expect(comboOf(4)).toBeCloseTo(1.2);
    expect(comboOf(30)).toBeCloseTo(1.5);
  });
});

describe('temporada', () => {
  it('dia ativo é vitória, dia parado é derrota e zera a sequência', () => {
    const data = makeData();
    active(data, '2026-11-01');
    active(data, '2026-11-02');
    // 03 sem nada
    active(data, '2026-11-04');
    const r = computeRanked(data, '2026-11-05');
    expect(r.season.matches.map((m) => m.result)).toEqual(['win', 'win', 'loss', 'win', 'live']);
    expect(r.season.matches[2].delta).toBe(-RANK.loss);
    expect(r.season.matches[3].streak).toBe(1); // recomeçou
    expect(r.bestStreak).toBe(2);
    expect(r.season.wins).toBe(3);
  });

  it('o combo aumenta o PR ganho em dias seguidos', () => {
    const data = makeData();
    active(data, '2026-11-01', 4);
    active(data, '2026-11-02', 4);
    const [d1, d2] = computeRanked(data, '2026-11-03').season.matches;
    expect(d1.delta).toBe(Math.round(100 * RANK.rate * comboOf(1)));
    expect(d2.delta).toBe(Math.round(100 * RANK.rate * comboOf(2)));
    expect(d2.delta).toBeGreaterThan(d1.delta);
  });

  it('hoje ainda não acabou: não conta derrota', () => {
    const data = makeData();
    active(data, '2026-11-01');
    withDay(data, '2026-11-02');
    const r = computeRanked(data, '2026-11-02');
    expect(r.season.matches[1]).toMatchObject({ result: 'live', delta: 0 });
    expect(r.streak).toBe(1);
  });

  it('dia de descanso do treino não é derrota nem quebra a sequência', () => {
    const data = makeData();
    active(data, '2026-11-01');
    withDay(data, '2026-11-02', { training: { type: 'rest' } as never });
    active(data, '2026-11-03');
    const m = computeRanked(data, '2026-11-04').season.matches;
    expect(m[1].result).toBe('rest');
    expect(m[2].streak).toBe(2);
  });

  it('PR nunca fica negativo e dias antes de começar não contam', () => {
    const data = makeData();
    withDay(data, '2026-11-01');
    withDay(data, '2026-11-02');
    const r = computeRanked(data, '2026-11-03');
    expect(r.season.matches.map((m) => m.result)).toEqual(['live']);
    expect(r.season.rank.pr).toBe(0);
  });

  it('marca subida de divisão e guarda o pico', () => {
    const data = makeData();
    for (let i = 0, k = '2026-11-01'; i < 4; i++, k = addDays(k, 1)) active(data, k, 4);
    const r = computeRanked(data, '2026-11-05');
    expect(r.season.matches.some((m) => m.change === 'up')).toBe(true);
    expect(r.season.peak.pr).toBe(r.season.rank.pr);
    expect(r.season.rank.step).toBeGreaterThan(0);
  });

  it('virada do mês: nova temporada com reset suave (30% dos pontos)', () => {
    const data = makeData();
    for (let k = '2026-10-20'; k <= '2026-10-31'; k = addDays(k, 1)) active(data, k, 4);
    active(data, '2026-11-01');
    const r = computeRanked(data, '2026-11-01');
    expect(r.season.id).toBe('2026-11');
    expect(r.past).toHaveLength(1);
    expect(r.past[0].name).toBe('Outubro de 2026');
    expect(r.season.startPR).toBe(Math.round(r.past[0].rank.pr * RANK.carry));
    expect(r.daysLeft).toBe(29);
  });
});

describe('rank da academia com divisões', () => {
  it('divide cada rank em III, II e I', () => {
    expect(gymTier(0)).toMatchObject({ name: 'Gordo', div: 3 });
    expect(gymTier(150)).toMatchObject({ name: 'Gordo', div: 2 });
    expect(gymTier(250)).toMatchObject({ name: 'Gordo', div: 1 });
    expect(gymTier(99999)).toMatchObject({ name: 'Ganley', div: 0 });
  });
});
