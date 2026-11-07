import { describe, expect, it } from 'vitest';
import { defaultSettings, emptyDay } from '../store/model';
import type { Day, Settings } from '../store/types';
import { inActiveWindow, nextWaterReminder, STARTUP_GRACE_MS } from './useReminders';

const at = (h: number, m = 0) => new Date(2026, 10, 7, h, m).getTime();
const settings = (patch: Partial<Settings> = {}): Settings => ({ ...defaultSettings(), waterReminderMinutes: 20, ...patch });
const day = (water: [number, number][] = [], extra: Partial<Day> = {}): Day => ({
  ...emptyDay(),
  init: true,
  water: water.map(([ml, t]) => ({ ml, at: t })),
  ...extra,
});

describe('lembrete de água', () => {
  it('conta a partir do último copo, não de quando o app abriu', () => {
    // bebeu às 10:00, abriu o app às 10:30: já passou dos 20 min -> avisa logo depois de abrir
    const next = nextWaterReminder(settings(), day([[500, at(10)]]), at(10, 30));
    expect(next).toBe(at(10, 30) + STARTUP_GRACE_MS);
  });

  it('se ainda não deu o intervalo, avisa 20 min depois do último copo', () => {
    expect(nextWaterReminder(settings(), day([[500, at(10)]]), at(10, 5))).toBe(at(10, 20));
  });

  it('depois de um aviso, o próximo vem um intervalo depois dele', () => {
    const d = day([[500, at(10)]], { lastWaterReminder: at(10, 20) });
    expect(nextWaterReminder(settings(), d, at(9))).toBe(at(10, 40));
  });

  it('sem água no dia, conta a partir do início do horário ativo', () => {
    expect(nextWaterReminder(settings({ waterActiveStart: '07:00' }), day(), at(6))).toBe(at(7, 20));
  });

  it('reabrir o app não zera a contagem', () => {
    const s = settings();
    const d = day([[500, at(10)]]);
    const a = nextWaterReminder(s, d, at(10, 2));
    const b = nextWaterReminder(s, d, at(10, 9)); // recarregou 7 min depois
    expect(a).toBe(at(10, 20));
    expect(b).toBe(at(10, 20));
  });

  it('para de lembrar ao chegar no ideal ou se estiver desligado', () => {
    expect(nextWaterReminder(settings(), day([[6000, at(10)]]), at(9))).toBeNull();
    expect(nextWaterReminder(settings({ waterReminderOn: false }), day(), at(9))).toBeNull();
    expect(nextWaterReminder(settings({ notificationsOn: false }), day(), at(9))).toBeNull();
  });

  it('respeita o horário ativo (inclusive passando da meia-noite)', () => {
    const s = settings({ waterActiveStart: '07:00', waterActiveEnd: '22:00' });
    expect(inActiveWindow(s, new Date(at(6, 59)))).toBe(false);
    expect(inActiveWindow(s, new Date(at(12)))).toBe(true);
    expect(inActiveWindow(s, new Date(at(22)))).toBe(false);
    const night = settings({ waterActiveStart: '20:00', waterActiveEnd: '02:00' });
    expect(inActiveWindow(night, new Date(at(23)))).toBe(true);
    expect(inActiveWindow(night, new Date(at(1)))).toBe(true);
    expect(inActiveWindow(night, new Date(at(12)))).toBe(false);
  });
});
