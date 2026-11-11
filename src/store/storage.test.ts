import { describe, expect, it } from 'vitest';
import { exportJSON, parseBackup } from './storage';
import { makeData } from '../test/fixtures';

describe('backup', () => {
  it('exportar e importar devolve os mesmos dados', () => {
    const data = makeData({ recurring: [{ id: 'r', title: 'Ler', days: [1] }] });
    data.settings.userName = 'Ana';
    const back = parseBackup(exportJSON(data));
    expect(back.settings.userName).toBe('Ana');
    expect(back.recurring).toEqual(data.recurring);
  });

  it('backup guarda os compromissos e corridas do calendário', () => {
    const data = makeData({ events: [{ id: 'e', title: 'Corrida', date: '2026-11-15', kind: 'corrida', distance: '10', alert: { daysBefore: 3, everyHours: 24 } }] });
    expect(parseBackup(exportJSON(data)).events).toEqual(data.events);
  });

  it('recusa arquivo que não é JSON ou não é do app', () => {
    expect(() => parseBackup('isso não é json')).toThrow('JSON válido');
    expect(() => parseBackup('{"foo": 1}')).toThrow('backup do Parpi Day');
  });

  it('completa campos que faltam em backups antigos', () => {
    const old = parseBackup(JSON.stringify({ settings: { userName: 'Ana' }, days: {} }));
    expect(old.workouts).toEqual([]);
    expect(old.events).toEqual([]);
    expect(old.training).toEqual({ rotation: [], restDays: [] });
    expect(old.settings.meals).toHaveLength(4);
  });

  it('migra a meta antiga de água para mínimo 4 L e ideal 6 L', () => {
    const old = parseBackup(JSON.stringify({ settings: { waterGoal: 2000, waterQuick: [200, 300, 500] }, days: {} }));
    expect(old.settings).toMatchObject({ waterGoal: 4000, waterIdeal: 6000, waterQuick: [300, 500, 1000] });
  });

  it('migra tarefas do antigo atributo Idiomas para Intelecto', () => {
    const old = parseBackup(JSON.stringify({
      settings: {},
      recurring: [{ id: 'r', title: 'Duolingo', days: [1], attr: 'lang' }],
      days: { '2026-11-02': { tasks: [{ id: 't', title: 'Inglês', done: true, attr: 'lang' }] } },
    }));
    expect(old.recurring[0].attr).toBe('int');
    expect(old.days['2026-11-02'].tasks[0].attr).toBe('int');
  });

  it('prova futura marcada como feita por engano volta a ser próxima', () => {
    const back = parseBackup(JSON.stringify({ settings: {}, days: {}, events: [
      { id: 'f', title: 'Atleta de Cristo Run', date: '2999-12-06', kind: 'corrida', done: true },
      { id: 'p', title: 'Barça Run', date: '2020-08-31', kind: 'corrida', done: true },
    ] }));
    expect(back.events.map((e) => e.done)).toEqual([false, true]);
  });
});
