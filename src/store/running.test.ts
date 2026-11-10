import { describe, expect, it } from 'vitest';
import {
  activitiesOf, avgPace, effortsOf, formatDurationSec, predictFor, racePaces, monthKm, personalRecords, predictions, runPace, shoeKm, weekKm, weekStart, weekStreak, weeklyKm,
} from './running';
import type { CalEvent, Run } from './types';

const run = (date: string, km: number, seconds: number, patch: Partial<Run> = {}): Run => ({ id: date + km, date, km, seconds, type: 'leve', ...patch });
// 2026-11-09 é segunda-feira
const runs = [run('2026-11-02', 5, 1500), run('2026-11-09', 10, 3300), run('2026-11-11', 6, 2100), run('2026-10-30', 8, 2800)];

describe('números da corrida', () => {
  it('pace e tempo formatados', () => {
    expect(runPace({ km: 10, seconds: 3300 })).toBe('5:30 /km');
    expect(runPace({ km: 0, seconds: 0 })).toBe('—');
    expect(formatDurationSec(3150)).toBe('52:30');
    expect(formatDurationSec(6310)).toBe('1:45:10');
  });

  it('semana começa na segunda e soma os km', () => {
    expect(weekStart('2026-11-11')).toBe('2026-11-09');
    expect(weekStart('2026-11-15')).toBe('2026-11-09'); // domingo ainda é da semana
    expect(weekKm(runs, '2026-11-11')).toBe(16);
  });

  it('km do mês e das últimas semanas', () => {
    expect(monthKm(runs, '2026-11-20')).toBe(21);
    const w = weeklyKm(runs, '2026-11-11', 3);
    expect(w.map((x) => x.start)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
    expect(w.map((x) => x.km)).toEqual([8, 5, 16]);
  });

  it('pace médio dos últimos 30 dias pondera pelos km', () => {
    expect(avgPace(runs, '2026-11-11')).toBeCloseTo((1500 + 3300 + 2100 + 2800) / 29);
    expect(avgPace([], '2026-11-11')).toBe(0);
  });

  it('semanas seguidas correndo', () => {
    expect(weekStreak(runs, '2026-11-11')).toBe(3);
    expect(weekStreak(runs, '2026-11-17')).toBe(3); // semana nova ainda sem corrida não quebra
    expect(weekStreak(runs, '2026-11-25')).toBe(0);
  });
});

describe('recordes e previsão', () => {
  const race: CalEvent = { id: 'p', title: 'Corrida da Ponte', date: '2026-11-08', kind: 'corrida', distance: '10', result: '48:00', done: true };

  it('provas do calendário com tempo entram nos esforços', () => {
    const e = effortsOf(runs, [race, { ...race, id: 'x', result: '' }]);
    expect(e).toHaveLength(5);
    expect(e.find((x) => x.race)).toMatchObject({ km: 10, seconds: 2880, title: 'Corrida da Ponte' });
  });

  it('recorde por distância (aceita GPS um pouco diferente) e ajusta para a distância exata', () => {
    const pr = personalRecords(effortsOf([...runs, run('2026-11-12', 5.05, 1414)], [race]));
    expect(pr['10k']).toMatchObject({ title: 'Corrida da Ponte', time: 2880 });
    expect(Math.round(pr['5k']!.time)).toBe(1400); // 5,05 km em 23:34 -> 23:20 nos 5 km
    expect(pr['21k']).toBeNull();
  });

  it('previsão de Riegel a partir do melhor esforço', () => {
    const p = predictions(effortsOf(runs, [race]), '2026-11-12')!;
    expect(p.base.title).toBe('Corrida da Ponte');
    expect(Math.round(p.times['10k'])).toBe(2880);
    expect(Math.round(p.times['5k'])).toBe(Math.round(2880 * Math.pow(0.5, 1.06)));
    expect(predictions([], '2026-11-12')).toBeNull();
  });
});

describe('tênis', () => {
  it('soma os km das corridas com o tênis e o que ele já tinha', () => {
    const shoe = { id: 's', name: 'Tênis', limitKm: 700, startKm: 100 };
    expect(shoeKm(shoe, [run('2026-11-01', 10, 3000, { shoeId: 's' }), run('2026-11-02', 5, 1500)])).toBe(110);
  });
});

describe('provas contam como corrida', () => {
  const ev = (patch: Partial<CalEvent>): CalEvent => ({ id: 'e', title: 'Batman Run', date: '2026-09-19', kind: 'corrida', distance: '4km', result: '00:44:04', done: true, ...patch });

  it('distância digitada com "km" é lida certo', () => {
    expect(effortsOf([], [ev({})])[0]).toMatchObject({ km: 4, seconds: 2644 });
  });

  it('provas feitas entram nos km; futuras e repetidas como treino não', () => {
    const acts = activitiesOf(
      [run('2026-11-01', 5, 1650, { type: 'prova' })],
      [ev({}), ev({ id: 'f', date: '2026-12-13', done: false }), ev({ id: 'g', date: '2026-11-01', distance: '5' })],
      '2026-11-10',
    );
    expect(acts.map((a) => a.km)).toEqual([5, 4]);
  });

  it('pace das provas em ordem de data e previsão para qualquer distância', () => {
    const list = racePaces([ev({ id: 'b', date: '2026-11-01', distance: '5', result: '55:00' }), ev({})], '2026-11-10');
    expect(list.map((x) => x.ev.id)).toEqual(['e', 'b']);
    expect(Math.round(list[0].pace)).toBe(661);
    expect(predictFor({ date: '', km: 5, seconds: 1500, title: '', race: false }, 5)).toBe(1500);
  });
});

describe('tênis nas provas', () => {
  it('prova com tênis soma na quilometragem dele', () => {
    const shoe = { id: 's', name: 'Tênis', limitKm: 700 };
    const ev: CalEvent = { id: 'p', title: 'Batman Run', date: '2026-09-19', kind: 'corrida', distance: '4', result: '44:04', done: true, shoeId: 's' };
    const acts = activitiesOf([run('2026-11-01', 10, 3000, { shoeId: 's' })], [ev], '2026-11-10');
    expect(shoeKm(shoe, acts)).toBe(14);
  });
});
