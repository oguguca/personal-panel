import { describe, expect, it } from 'vitest';
import { MON, SUN, TUE, WED, makeData, withDay } from '../test/fixtures';
import { dueOn, forecast, lastDone, nextAfter, suggestion, trainingConfig, workoutLog } from './training';
import { itemVolume } from './game';
import type { Data } from './types';

function gym(restDays: number[] = []): Data {
  return makeData({
    workouts: [
      { id: 'a', name: 'A', items: [] },
      { id: 'b', name: 'B', items: [] },
      { id: 'c', name: 'C', items: [] },
    ],
    training: { rotation: ['a', 'b', 'c'], restDays },
  });
}

describe('ciclo de treino', () => {
  it('sem sequência salva, usa a ordem dos treinos', () => {
    const data = gym();
    data.training.rotation = [];
    expect(trainingConfig(data).rotation).toEqual(['a', 'b', 'c']);
  });

  it('ignora treinos apagados na sequência', () => {
    const data = gym();
    data.training.rotation = ['a', 'zzz', 'c'];
    expect(trainingConfig(data).rotation).toEqual(['a', 'c']);
  });

  it('o próximo dá a volta no fim da sequência', () => {
    expect(nextAfter(['a', 'b', 'c'], 'c')).toBe('a');
    expect(nextAfter(['a', 'b', 'c'], null)).toBe('a');
    expect(nextAfter([], 'a')).toBeNull();
  });

  it('segue o ÚLTIMO TREINO FEITO, não o dia da semana', () => {
    const data = gym();
    withDay(data, SUN, { training: { type: 'workout', workoutId: 'c', at: 0 } });
    expect(lastDone(data, MON, false)).toEqual({ key: SUN, workoutId: 'c' });
    expect(suggestion(data, MON)).toMatchObject({ workoutId: 'a' });
  });

  it('em dia de descanso sugere descansar, mas já diz qual seria o próximo', () => {
    const data = gym([1]); // segunda = descanso
    withDay(data, SUN, { training: { type: 'workout', workoutId: 'a', at: 0 } });
    expect(suggestion(data, MON)).toMatchObject({ rest: true, next: 'b' });
  });

  it('previsão pula os descansos e continua a sequência', () => {
    const data = gym([2]); // terça = descanso
    withDay(data, SUN, { training: { type: 'workout', workoutId: 'a', at: 0 } });
    const f = forecast(data, MON, 4);
    expect(f.map((d) => d.type === 'rest' ? 'descanso' : d.workoutId)).toEqual(['b', 'descanso', 'c', 'a']);
    expect(f[1].key).toBe(TUE);
  });

  it('o registro de hoje entra na previsão', () => {
    const data = gym();
    withDay(data, MON, { training: { type: 'workout', workoutId: 'b', at: 0 } });
    const f = forecast(data, MON, 2);
    expect(f[0]).toMatchObject({ workoutId: 'b', done: true });
    expect(f[1].workoutId).toBe('c');
  });
});

describe('registro do treino feito (botão Já fiz hoje)', () => {
  const w = { id: 'a', name: 'A - Peito', days: [], items: [{ id: 'i1', exId: 'supino-reto-barra', sets: 4, reps: '8-10', weight: '40' }] };

  it('guarda nome, hora e uma cópia das cargas (sem o id do item)', () => {
    expect(workoutLog(w, 'a', 123)).toEqual({
      type: 'workout', workoutId: 'a', name: 'A - Peito', at: 123,
      items: [{ exId: 'supino-reto-barra', sets: 4, reps: '8-10', weight: '40', minutes: undefined }],
      planned: 1,
    });
  });

  it('a cópia não muda se o treino for editado depois', () => {
    const log = workoutLog(w, 'a', 1);
    w.items[0].weight = '50';
    expect(log.items![0].weight).toBe('40');
  });

  it('treino apagado vira "Treino" sem itens', () => {
    expect(workoutLog(undefined, 'x', 1)).toMatchObject({ name: 'Treino', items: [] });
  });
});

describe('painel de check do treino', () => {
  const w = {
    id: 'a', name: 'A - Peito', days: [],
    items: [
      { id: 'i1', exId: 'supino-reto-barra', sets: 4, reps: '10', weight: '40' },
      { id: 'i2', exId: 'peck-deck', sets: 3, reps: '12', weight: '30' },
      { id: 'i3', exId: 'triceps-corda', sets: 3, reps: '12', weight: '20' },
    ],
  };

  it('guarda só os exercícios marcados, mas lembra quantos tinha', () => {
    const log = workoutLog(w, 'a', 1, ['i1', 'i3']);
    expect(log.items!.map((i) => i.exId)).toEqual(['supino-reto-barra', 'triceps-corda']);
    expect(log.planned).toBe(3);
  });

  it('sem a lista conta o treino inteiro', () => {
    expect(workoutLog(w, 'a', 1).items).toHaveLength(3);
  });
});

describe('troca de treino (ex.: academia lotada)', () => {
  // Peito → Perna → Costas → Ombro
  const gym4 = () =>
    makeData({
      workouts: ['peito', 'perna', 'costas', 'ombro'].map((id) => ({ id, name: id, items: [] })),
      training: { rotation: ['peito', 'perna', 'costas', 'ombro'], restDays: [] },
    });

  it('trocou: era Perna, fez Costas -> amanhã é Perna e depois pula o Costas', () => {
    const data = gym4();
    withDay(data, SUN, { training: { type: 'workout', workoutId: 'peito', at: 0 } });
    expect(dueOn(data, MON)).toBe('perna');
    withDay(data, MON, { training: { type: 'workout', workoutId: 'costas', swap: 'perna', at: 0 } });
    const f = forecast(data, MON, 4);
    expect(f.map((d) => d.workoutId)).toEqual(['costas', 'perna', 'ombro', 'peito']);
    expect(suggestion(data, MON).next).toBe('perna');
  });

  it('trocou e depois fez a Perna: a sequência continua sem repetir o Costas', () => {
    const data = gym4();
    withDay(data, SUN, { training: { type: 'workout', workoutId: 'peito', at: 0 } });
    withDay(data, MON, { training: { type: 'workout', workoutId: 'costas', swap: 'perna', at: 0 } });
    withDay(data, TUE, { training: { type: 'workout', workoutId: 'perna', at: 0 } });
    expect(suggestion(data, WED)).toMatchObject({ workoutId: 'ombro' });
  });

  it('sem trocar: segue a sequência a partir do treino feito (como antes)', () => {
    const data = gym4();
    withDay(data, SUN, { training: { type: 'workout', workoutId: 'peito', at: 0 } });
    withDay(data, MON, { training: { type: 'workout', workoutId: 'costas', at: 0 } });
    expect(suggestion(data, TUE)).toMatchObject({ workoutId: 'ombro' });
  });

  it('workoutLog só guarda a troca quando o treino é outro', () => {
    expect(workoutLog(undefined, 'costas', 1, undefined, undefined, 'perna').swap).toBe('perna');
    expect(workoutLog(undefined, 'perna', 1, undefined, undefined, 'perna').swap).toBeUndefined();
  });
});

describe('séries, repetições e peso de verdade', () => {
  const w = {
    id: 'a', name: 'A', days: [],
    items: [
      { id: 'i1', exId: 'supino-reto-barra', sets: 3, reps: '10', weight: '40' },
      { id: 'i2', exId: 'esteira', minutes: 20 },
    ],
  };

  it('guarda cada série com o peso dela e a carga mais pesada', () => {
    const log = workoutLog(w, 'a', 1, undefined, {
      i1: { sets: [{ reps: 12, kg: 40 }, { reps: 10, kg: 45 }, { reps: 8, kg: 50 }, { reps: 0, kg: 50 }] },
      i2: { minutes: 35, km: 5 },
    });
    const [sup, est] = log.items!;
    expect(sup.done).toEqual([{ reps: 12, kg: 40 }, { reps: 10, kg: 45 }, { reps: 8, kg: 50 }]);
    expect(sup).toMatchObject({ sets: 3, reps: '10', weight: 50 });
    expect(est).toMatchObject({ minutes: 35, distance: 5 });
  });

  it('não lembro o peso: guarda as séries sem peso', () => {
    const log = workoutLog(w, 'a', 1, ['i1'], { i1: { sets: [{ reps: 10, kg: 40 }], noWeight: true } });
    expect(log.items![0]).toMatchObject({ noWeight: true, done: [{ reps: 10, kg: null }], weight: undefined });
  });

  it('volume soma série por série; sem peso usa a carga do plano', () => {
    expect(itemVolume({ exId: 'x', done: [{ reps: 10, kg: 40 }, { reps: 8, kg: 50 }] })).toBe(800);
    expect(itemVolume({ exId: 'x', done: [{ reps: 10, kg: null }], noWeight: true }, 30)).toBe(300);
    expect(itemVolume({ exId: 'x', sets: 3, reps: '10', weight: 20 })).toBe(600);
  });
});
