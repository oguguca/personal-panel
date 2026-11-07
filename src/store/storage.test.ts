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

  it('recusa arquivo que não é JSON ou não é do app', () => {
    expect(() => parseBackup('isso não é json')).toThrow('JSON válido');
    expect(() => parseBackup('{"foo": 1}')).toThrow('backup do Painel Pessoal');
  });

  it('completa campos que faltam em backups antigos', () => {
    const old = parseBackup(JSON.stringify({ settings: { userName: 'Ana' }, days: {} }));
    expect(old.workouts).toEqual([]);
    expect(old.training).toEqual({ rotation: [], restDays: [] });
    expect(old.settings.meals).toHaveLength(4);
  });

  it('migra a meta antiga de água para mínimo 4 L e ideal 6 L', () => {
    const old = parseBackup(JSON.stringify({ settings: { waterGoal: 2000, waterQuick: [200, 300, 500] }, days: {} }));
    expect(old.settings).toMatchObject({ waterGoal: 4000, waterIdeal: 6000, waterQuick: [300, 500, 1000] });
  });
});
