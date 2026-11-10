import { describe, expect, it } from 'vitest';
import { MON, SUN, TUE, makeData, withDay } from '../test/fixtures';
import { computeSummary, ensureDay, goalDone, mealList } from './model';

describe('virada do dia (ensureDay)', () => {
  it('cria as tarefas recorrentes só nos dias escolhidos, levando o atributo', () => {
    const data = makeData({ recurring: [{ id: 'r1', title: 'Ler', days: [1, 3], attr: 'int' }] });
    const mon = ensureDay(data, MON); // segunda (1)
    const tue = ensureDay(data, TUE); // terça (2)
    expect(mon.tasks).toHaveLength(1);
    expect(mon.tasks[0]).toMatchObject({ title: 'Ler', recurringId: 'r1', attr: 'int', done: false });
    expect(tue.tasks.filter((t) => t.recurringId)).toHaveLength(0);
  });

  it('passa as não feitas do último dia aberto e marca a original como movida', () => {
    const data = makeData();
    withDay(data, SUN, {
      tasks: [
        { id: 'a', title: 'Feita', done: true },
        { id: 'b', title: 'Pendente', done: false, attr: 'int' },
      ],
    });
    data.lastDay = SUN;
    const mon = ensureDay(data, MON);
    expect(mon.tasks.map((t) => t.title)).toEqual(['Pendente']);
    expect(mon.tasks[0]).toMatchObject({ carried: true, attr: 'int' });
    expect(data.days[SUN].tasks[1].movedTo).toBe(MON);
    expect(data.lastDay).toBe(MON);
  });

  it('não passa nada quando a opção está desligada', () => {
    const data = makeData();
    data.settings.carryOverTasks = false;
    withDay(data, SUN, { tasks: [{ id: 'b', title: 'Pendente', done: false }] });
    data.lastDay = SUN;
    expect(ensureDay(data, MON).tasks).toHaveLength(0);
  });

  it('é idempotente: rodar duas vezes não duplica tarefas', () => {
    const data = makeData({ recurring: [{ id: 'r1', title: 'Ler', days: [1] }] });
    ensureDay(data, MON);
    ensureDay(data, MON);
    expect(data.days[MON].tasks).toHaveLength(1);
  });
});

describe('metas e refeições', () => {
  it('meta de checkbox e de contador', () => {
    expect(goalDone({ id: 'g', title: 'x', type: 'check' }, 1)).toBe(true);
    expect(goalDone({ id: 'g', title: 'x', type: 'check' }, 0)).toBe(false);
    expect(goalDone({ id: 'g', title: 'x', type: 'count', target: 20 }, 19)).toBe(false);
    expect(goalDone({ id: 'g', title: 'x', type: 'count', target: 20 }, 20)).toBe(true);
  });

  it('ordena refeições pelo horário real (se feita) ou sugerido, incluindo as registradas na hora', () => {
    const data = makeData();
    const at = (h: number, m: number) => new Date(2026, 10, 2, h, m).getTime();
    const day = withDay(data, MON, {
      meals: {
        almoco: { done: true, doneAt: at(7, 0) }, // almoçou às 7h (antes do café sugerido às 8h)
        extra: { adhoc: true, name: 'Pré-treino', done: true, doneAt: at(17, 30) },
      },
    });
    const names = mealList(data.settings, day).map((m) => m.name);
    expect(names).toEqual(['Almoço', 'Café da manhã', 'Lanche', 'Pré-treino', 'Jantar']);
  });
});

describe('resumo do dia', () => {
  it('conta água, tarefas, metas e refeições', () => {
    const data = makeData({ dailyGoals: [{ id: 'g1', title: 'Ler', type: 'check' }] });
    withDay(data, MON, {
      tasks: [
        { id: 'a', title: 'A', done: true },
        { id: 'b', title: 'B', done: false },
      ],
      water: [{ ml: 1500, at: 0 }, { ml: 500, at: 0 }],
      goals: { g1: 1 },
      meals: { cafe: { done: true, items: [{ id: 'i', key: 't1', name: 'Pão', grams: 50, kcal: 150, p: 4, c: 29, g: 1 }] } },
      recording: [{ min: 30, at: 0 }],
    });
    const s = computeSummary(data, MON);
    expect(s).toMatchObject({
      water: 2000,
      tasksDone: 1,
      tasksTotal: 2,
      goalsDone: 1,
      goalsTotal: 1,
      mealsDone: 1,
      mealsTotal: 4,
      kcal: 150,
      record: 30,
    });
    expect(s.goalNames).toEqual({ g1: 'Ler' });
  });
});
