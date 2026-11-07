// Lembretes de água e refeições. Lógica 100% web: só a entrega usa platform.notify.
import { useEffect, useRef } from 'react';
import { notify } from '../platform';
import { useStore } from '../store/StoreContext';
import { nowMinutes, toMinutes } from '../store/dates';
import { waterTotal } from '../store/model';
import { fmtMl } from '../components/ui';
import type { Day, Settings } from '../store/types';

const TICK_MS = 30000;
const MEAL_WINDOW_MIN = 30; // avisa até 30 min depois do horário

export function inActiveWindow(settings: Settings, now = new Date()) {
  const n = nowMinutes(now);
  const s = toMinutes(settings.waterActiveStart);
  const e = toMinutes(settings.waterActiveEnd);
  return s <= e ? n >= s && n < e : n >= s || n < e;
}

/** Momento (ms) do próximo lembrete de água, ou null se não houver. */
export function nextWaterReminder(settings: Settings, day: Day, startedAt: number): number | null {
  if (!settings.notificationsOn || !settings.waterReminderOn) return null;
  if (waterTotal(day) >= (settings.waterIdeal || settings.waterGoal)) return null; // lembra até o ideal
  const lastDrink = day.water.length ? day.water[day.water.length - 1].at : 0;
  const base = Math.max(lastDrink, day.lastWaterReminder || 0, startedAt);
  return base + settings.waterReminderMinutes * 60000;
}

export function useReminders() {
  const { data, today, update } = useStore();
  const ref = useRef({ data, today });
  ref.current = { data, today };
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      const { data, today } = ref.current;
      const s = data.settings;
      const day = data.days[today];
      if (!s.notificationsOn || !day) return;
      const now = new Date();

      // Água
      const next = nextWaterReminder(s, day, startedAt.current);
      if (next && now.getTime() >= next && inActiveWindow(s, now)) {
        const total = waterTotal(day);
        notify(
          'Hora de beber água 💧',
          total < s.waterGoal
            ? `Você bebeu ${fmtMl(total)} hoje. Mínimo: ${fmtMl(s.waterGoal)}.`
            : `Mínimo batido (${fmtMl(total)})! Ideal: ${fmtMl(s.waterIdeal || s.waterGoal)}.`
        );
        update((d) => {
          d.days[today].lastWaterReminder = now.getTime();
        });
      }

      // Refeições
      const n = nowMinutes(now);
      for (const meal of s.meals) {
        const st = day.meals[meal.id];
        const diff = n - toMinutes(meal.time);
        if (!st?.done && !st?.notified && diff >= 0 && diff <= MEAL_WINDOW_MIN) {
          notify(`Hora do ${meal.name.toLowerCase()} 🍽️`, `Horário marcado: ${meal.time}.`);
          update((d) => {
            const day = d.days[today];
            day.meals[meal.id] = { ...(day.meals[meal.id] || {}), notified: true };
          });
        }
      }
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [update]);

  return startedAt.current;
}
