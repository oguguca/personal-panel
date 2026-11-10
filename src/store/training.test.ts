import { describe, expect, it } from 'vitest';
import { MON, SUN, TUE, makeData, withDay } from '../test/fixtures';
import { forecast, lastDone, nextAfter, suggestion, trainingConfig, workoutLog } from './training';
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
