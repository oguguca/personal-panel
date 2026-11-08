import { describe, expect, it } from 'vitest';
import { alertMessage, describeAlert, dueAlerts, eventTime, formatPace, monthGrid, nextAlert, paceOf, parseDuration, upcoming, whenText } from './calendar';
import type { CalEvent } from './types';

const at = (d: number, h = 0, m = 0) => new Date(2026, 10, d, h, m).getTime(); // novembro de 2026
const race = (patch: Partial<CalEvent> = {}): CalEvent => ({
  id: 'r', title: 'Corrida da Ponte', date: '2026-11-15', time: '07:00', kind: 'corrida', distance: '10',
  alert: { daysBefore: 3, everyHours: 24 }, ...patch,
});

describe('alertas do calendário', () => {
  it('primeiro aviso X dias antes da hora do evento', () => {
    expect(nextAlert(race(), at(10))).toBe(at(12, 7));
  });

  it('depois de avisar, repete a cada Y horas', () => {
    expect(nextAlert(race({ lastAlert: at(12, 7) }), at(12, 8))).toBe(at(13, 7));
    expect(nextAlert(race({ alert: { daysBefore: 1, everyHours: 6 }, lastAlert: at(14, 7) }), at(14, 8))).toBe(at(14, 13));
  });

  it('para de avisar quando chega a hora, se estiver concluído ou sem alerta', () => {
    expect(nextAlert(race({ lastAlert: at(14, 7) }), at(14, 8))).toBeNull(); // próximo seria 15 às 07:00 = hora do evento
    expect(nextAlert(race(), at(15, 8))).toBeNull();
    expect(nextAlert(race({ done: true }), at(13))).toBeNull();
    expect(nextAlert(race({ alert: null }), at(13))).toBeNull();
  });

  it('se o app ficou fechado, avisa uma vez ao abrir (não acumula)', () => {
    const ev = race();
    expect(dueAlerts([ev], at(14, 20))).toEqual([ev]);
    expect(dueAlerts([{ ...ev, lastAlert: at(14, 20) }], at(14, 21))).toEqual([]);
  });

  it('aviso de alerta antigo (de antes da janela) não bloqueia o novo', () => {
    expect(nextAlert(race({ lastAlert: at(1) }), at(12, 8))).toBe(at(12, 7));
  });

  it('sem hora marcada conta como 9h', () => {
    expect(eventTime({ date: '2026-11-15' })).toBe(at(15, 9));
  });

  it('mensagem da notificação', () => {
    expect(alertMessage(race(), at(12, 7))).toEqual({ title: '🏃 Corrida da Ponte', body: 'Em 3 dias · 10 km' });
    expect(alertMessage(race({ kind: 'compromisso', title: 'Dentista', place: 'Centro' }), at(15, 6)).body).toBe('Hoje às 07:00 · Centro');
  });
});

describe('telas do calendário', () => {
  it('quando é o evento', () => {
    expect(whenText(race(), '2026-11-15')).toBe('hoje às 07:00');
    expect(whenText(race(), '2026-11-14')).toBe('amanhã às 07:00');
    expect(whenText(race(), '2026-11-10')).toBe('em 5 dias');
    expect(whenText(race(), '2026-11-17')).toBe('foi há 2 dias');
  });

  it('grade do mês começa no domingo e tem 6 semanas', () => {
    const g = monthGrid(2026, 10); // novembro de 2026 começa num domingo
    expect(g).toHaveLength(42);
    expect(g[0]).toBe('2026-11-01');
    expect(monthGrid(2026, 11)[0]).toBe('2026-11-29'); // dezembro começa na terça
  });

  it('próximos eventos em ordem e sem os concluídos', () => {
    const a = race({ id: 'a', date: '2026-11-20' });
    const b = race({ id: 'b', date: '2026-11-12' });
    const c = race({ id: 'c', date: '2026-11-13', done: true });
    const d = race({ id: 'd', date: '2026-11-01' });
    expect(upcoming([a, b, c, d], '2026-11-07').map((e) => e.id)).toEqual(['b', 'a']);
  });
});

describe('tempo e pace das corridas', () => {
  it('lê o tempo em mm:ss ou h:mm:ss', () => {
    expect(parseDuration('52:30')).toBe(3150);
    expect(parseDuration('1:45:10')).toBe(6310);
    expect(parseDuration('52')).toBeNull();
    expect(parseDuration('10:75')).toBeNull();
    expect(parseDuration('')).toBeNull();
  });

  it('calcula o pace em min/km', () => {
    expect(paceOf({ result: '52:30', distance: '10' })).toBe(315);
    expect(formatPace(315)).toBe('5:15 /km');
    expect(formatPace(299.6)).toBe('5:00 /km');
    expect(paceOf({ result: '52:30', distance: '' })).toBeNull();
  });
});

describe('texto do alerta', () => {
  it('explica quando os avisos começam e de quanto em quanto tempo', () => {
    expect(describeAlert(race())).toBe('Avisos a cada 1 dia, a partir de 12/11 às 07:00, até a hora do evento');
    expect(describeAlert(race({ alert: { daysBefore: 1, everyHours: 6 } }))).toBe('Avisos a cada 6 horas, a partir de 14/11 às 07:00, até a hora do evento');
    expect(describeAlert(race({ alert: null }))).toBe('Sem alerta');
  });
});
