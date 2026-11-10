import { describe, expect, it } from 'vitest';
import { MON, SUN, TUE, makeData, withDay } from '../test/fixtures';
import { XP, computeGame, dayGains, guessAttr, gymTier, levelOf, rankOf } from './game';

describe('atributo sugerido pelo título da tarefa', () => {
  it.each([
    ['Ler 20 páginas', 'int'],
    ['Estudar para a prova', 'int'],
    ['Inglês no Duolingo', 'int'],
    ['Aula de espanhol', 'int'],
    ['Correr 5 km', 'resist'],
    ['Ir à academia', 'forca'],
    ['Meditar 10 min', 'vit'],
  ])('"%s" -> %s', (title, attr) => {
    expect(guessAttr(title)).toBe(attr);
  });

  it('sem palavra conhecida, não sugere nada', () => {
    expect(guessAttr('Lavar o carro')).toBeNull();
  });
});

describe('níveis e ranks', () => {
  it('nível cresce com XP acumulado (60, 180, 360…)', () => {
    expect(levelOf(0).level).toBe(0);
    expect(levelOf(59).level).toBe(0);
    expect(levelOf(60).level).toBe(1);
    expect(levelOf(180).level).toBe(2);
    expect(levelOf(359).level).toBe(2);
    expect(levelOf(360).level).toBe(3);
  });

  it('informa quanto falta para o próximo nível', () => {
    expect(levelOf(100)).toEqual({ level: 1, xp: 100, into: 40, need: 120 });
  });

  it('rank vai de E até S', () => {
    expect([0, 2, 4, 7, 11, 16].map(rankOf)).toEqual(['E', 'D', 'C', 'B', 'A', 'S']);
  });

  it('rank da academia pelo XP de Força', () => {
    expect(gymTier(0).name).toBe('Toguro');
    expect(gymTier(800)).toMatchObject({ name: 'Balestrin', into: 0, need: 800 });
    expect(gymTier(99999)).toMatchObject({ name: 'Ganley', next: undefined });
  });
});

describe('XP do dia', () => {
  it('tarefa feita dá XP no atributo; sem atributo vai para Disciplina; não feita não dá', () => {
    const data = makeData();
    withDay(data, MON, {
      tasks: [
        { id: '1', title: 'Ler', done: true, attr: 'int' },
        { id: '2', title: 'Lavar louça', done: true },
        { id: '3', title: 'Inglês', done: false, attr: 'int' },
      ],
    });
    const { gains } = dayGains(data, MON);
    expect(gains).toEqual([
      { attr: 'int', xp: XP.task, label: 'Ler' },
      { attr: 'disc', xp: XP.taskPlain, label: 'Lavar louça' },
    ]);
  });

  it('tarefa que passou para outro dia não conta duas vezes', () => {
    const data = makeData();
    withDay(data, MON, { tasks: [{ id: '1', title: 'Ler', done: true, attr: 'int', movedTo: TUE }] });
    expect(dayGains(data, MON).gains).toEqual([]);
  });

  it('água: mínimo e ideal dão Vitalidade', () => {
    const data = makeData();
    withDay(data, MON, { water: [{ ml: 6000, at: 0 }] });
    const vit = dayGains(data, MON).gains.filter((g) => g.attr === 'vit').reduce((a, g) => a + g.xp, 0);
    expect(vit).toBe(XP.waterMin + XP.waterIdeal);
  });

  it('treino: Força com bônus de carga, músculos trabalhados e cardio em Resistência', () => {
    const data = makeData();
    withDay(data, MON, {
      training: {
        type: 'workout',
        name: 'A',
        at: 0,
        items: [
          { exId: 'supino-reto-barra', sets: 4, reps: '10', weight: '50' }, // 4 × 10 × 50 = 2000 kg
          { exId: 'x-bicycling-stationary', minutes: 20 },
        ],
      },
    });
    const { gains, muscles } = dayGains(data, MON);
    expect(gains.find((g) => g.attr === 'forca')?.xp).toBe(XP.workout + 10); // 2000 / 200
    expect(gains.find((g) => g.attr === 'resist')?.xp).toBe(20);
    expect(muscles.chest).toBe(4);
    expect(muscles.triceps).toBe(2); // secundário conta metade
  });
});

describe('personagem completo', () => {
  it('soma o XP de todos os dias, separa o de hoje e mede a evolução das cargas', () => {
    const data = makeData();
    const treino = (kg: string) => ({
      type: 'workout' as const,
      at: 0,
      items: [{ exId: 'supino-reto-barra', sets: 3, reps: '10', weight: kg }],
    });
    withDay(data, SUN, { tasks: [{ id: '1', title: 'Ler', done: true, attr: 'int' }], training: treino('40') });
    withDay(data, MON, { tasks: [{ id: '2', title: 'Ler', done: true, attr: 'int' }], training: treino('50') });
    withDay(data, TUE, { tasks: [{ id: '3', title: 'Ler', done: true, attr: 'int' }] }); // futuro: ignorado

    const g = computeGame(data, MON);
    const int = g.attrs.find((a) => a.id === 'int')!;
    expect(int.xp).toBe(2 * XP.task);
    expect(int.today).toBe(XP.task);
    expect(g.gym.workouts).toBe(2);
    expect(g.gym.volume).toBe(3 * 10 * 40 + 3 * 10 * 50);
    expect(g.gym.progress[0]).toMatchObject({ first: 40, last: 50, best: 50, times: 2, pct: 25 });
    expect(g.events[0].key).toBe(MON); // mais recente primeiro
  });

  it('desmarcar a tarefa tira o XP (nada fica guardado em dobro)', () => {
    const data = makeData();
    const day = withDay(data, MON, { tasks: [{ id: '1', title: 'Ler', done: true, attr: 'int' }] });
    expect(computeGame(data, MON).total.xp).toBe(XP.task);
    day.tasks[0].done = false;
    expect(computeGame(data, MON).total.xp).toBe(0);
  });
});

describe('XP do calendário', () => {
  const ev = (patch: object) => ({ id: 'e', title: 'Corrida da Ponte', date: MON, kind: 'corrida' as const, distance: '10', done: true, ...patch });

  it('corrida feita dá Resistência com bônus por km; compromisso feito dá Disciplina', () => {
    const data = makeData({ events: [ev({}), ev({ id: 'c', kind: 'compromisso', title: 'Dentista' })] });
    withDay(data, MON);
    const { gains } = dayGains(data, MON);
    expect(gains).toContainEqual({ attr: 'resist', xp: XP.race + 10 * XP.raceKm, label: 'Corrida: Corrida da Ponte (10 km)' });
    expect(gains).toContainEqual({ attr: 'disc', xp: XP.event, label: 'Compromisso: Dentista' });
  });

  it('evento não concluído não dá XP', () => {
    const data = makeData({ events: [ev({ done: false })] });
    expect(dayGains(data, MON).gains).toEqual([]);
  });

  it('conta mesmo sem o app aberto naquele dia', () => {
    const data = makeData({ events: [ev({})] });
    const game = computeGame(data, TUE);
    expect(game.attrs.find((a) => a.id === 'resist')!.xp).toBe(XP.race + 10 * XP.raceKm);
  });
});

describe('XP da aba Corrida', () => {
  it('cada corrida dá Resistência com bônus por km', () => {
    const data = makeData({ running: { runs: [{ id: 'r', date: MON, km: 8, seconds: 2700, type: 'leve' }], shoes: [], monthGoalKm: 0 } });
    expect(dayGains(data, MON).gains).toEqual([{ attr: 'resist', xp: XP.run + 8 * XP.runKm, label: 'Corrida de 8 km' }]);
  });

  it('prova registrada na aba Corrida e marcada no calendário não conta duas vezes', () => {
    const data = makeData({
      running: { runs: [{ id: 'r', date: MON, km: 10, seconds: 3000, type: 'prova' }], shoes: [], monthGoalKm: 0 },
      events: [{ id: 'e', title: 'Corrida da Ponte', date: MON, kind: 'corrida', distance: '10', done: true }],
    });
    expect(dayGains(data, MON).gains).toHaveLength(1);
  });
});
