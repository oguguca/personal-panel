import { describe, expect, it } from 'vitest';
import { addDays, dateKey, formatDuration, formatShort, parseKey, toMinutes, weekday } from './dates';

describe('datas', () => {
  it('gera a chave do dia no horário local', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('parseKey e dateKey são inversos', () => {
    expect(dateKey(parseKey('2026-11-07'))).toBe('2026-11-07');
  });

  it('soma dias atravessando mês e ano', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29'); // ano bissexto
  });

  it('dia da semana: 0 = domingo', () => {
    expect(weekday('2026-11-01')).toBe(0);
    expect(weekday('2026-11-07')).toBe(6);
  });

  it('converte HH:MM em minutos e tolera vazio', () => {
    expect(toMinutes('08:30')).toBe(510);
    expect(toMinutes('')).toBe(0);
    expect(toMinutes(null)).toBe(0);
  });

  it('formata duração e data curta', () => {
    expect(formatDuration(40)).toBe('40 min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(95)).toBe('1h35');
    expect(formatShort('2026-03-09')).toBe('09/03');
  });
});
