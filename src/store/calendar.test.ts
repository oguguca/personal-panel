import { describe, expect, it } from 'vitest';
import { alertMessage, canAlertNow, countInMonth, describeAlert, dueAlerts, eventTime, eventsByDay, formatPace, monthGrid, nextAlert, paceOf, parseDuration, toICS, upcoming, whenText } from './calendar';
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

describe('agrupar e contar eventos', () => {
  it('agrupa por dia e ordena pela hora (sem hora conta como 9h)', () => {
    const a = race({ id: 'a', time: '18:00' });
    const b = race({ id: 'b', time: '' });
    const c = race({ id: 'c', time: '06:00' });
    const d = race({ id: 'd', date: '2026-11-16' });
    const by = eventsByDay([a, b, c, d]);
    expect(by['2026-11-15'].map((e) => e.id)).toEqual(['c', 'b', 'a']);
    expect(by['2026-11-16'].map((e) => e.id)).toEqual(['d']);
  });

  it('conta compromissos e corridas do mês', () => {
    const list = [race(), race({ id: 'x', kind: 'compromisso' }), race({ id: 'y', date: '2026-12-01' })];
    expect(countInMonth(list, 2026, 10)).toEqual({ compromisso: 1, corrida: 1 });
    expect(countInMonth(list, 2026, 11)).toEqual({ compromisso: 0, corrida: 1 });
    expect(countInMonth(list, 2027, 0)).toEqual({ compromisso: 0, corrida: 0 });
  });
});

describe('casos de borda dos alertas', () => {
  it('intervalo menor que 1 hora vira 1 hora (não dispara sem parar)', () => {
    expect(nextAlert(race({ alert: { daysBefore: 1, everyHours: 0 }, lastAlert: at(14, 8) }), at(14, 8, 30))).toBe(at(14, 9));
  });

  it('vários eventos: só os que já passaram da hora do aviso disparam', () => {
    const cedo = race({ id: 'cedo', date: '2026-11-30' });
    const agora = race({ id: 'agora', date: '2026-11-10' });
    expect(dueAlerts([cedo, agora], at(8)).map((e) => e.id)).toEqual(['agora']);
  });

  it('evento de ontem', () => {
    expect(whenText(race(), '2026-11-16')).toBe('foi ontem');
  });
});

describe('exportar para outra agenda (.ics)', () => {
  it('evento com hora: início, fim 1 h depois, local, distância e alarme', () => {
    const ics = toICS([race({ place: 'Parque, portão 2', notes: 'Retirar kit' })]);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics).toContain('SUMMARY:🏃 Corrida da Ponte');
    expect(ics).toContain('DTSTART:20261115T070000');
    expect(ics).toContain('DTEND:20261115T080000');
    expect(ics).toContain('LOCATION:Parque\\, portão 2');
    expect(ics).toContain('DESCRIPTION:10 km\\nRetirar kit');
    expect(ics).toContain('TRIGGER:-P3D');
    expect(ics.split('\r\n').at(-1)).toBe('END:VCALENDAR');
  });

  it('evento sem hora vira dia inteiro e sem alerta não tem alarme', () => {
    const ics = toICS([race({ time: '', alert: null, kind: 'compromisso', title: 'Feriado' })]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261115');
    expect(ics).toContain('DTEND;VALUE=DATE:20261116');
    expect(ics).not.toContain('VALARM');
  });
});

describe('avisos à noite', () => {
  it('no horário ativo sempre pode avisar', () => {
    expect(canAlertNow(race(), at(10, 12), true)).toBe(true);
  });

  it('fora do horário só avisa se o evento for nas próximas 24 h', () => {
    expect(canAlertNow(race(), at(12, 23), false)).toBe(false); // faltam ~2 dias e 8 h
    expect(canAlertNow(race(), at(14, 23), false)).toBe(true); // corrida amanhã às 07:00
  });
});
