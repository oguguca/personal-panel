// Estado global do app: carrega, salva automaticamente e cuida da virada do dia.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { dateKey } from './dates';
import { computeSummary, ensureDay } from './model';
import { loadData, saveData } from './storage';
import type { Data, Day, DayKey, Settings } from './types';

export interface Store {
  data: Data;
  today: DayKey;
  day: Day;
  settings: Settings;
  /** Recebe uma cópia dos dados para mutar; o resumo do dia é recalculado. */
  update: (fn: (draft: Data) => unknown) => void;
  replaceAll: (next: Data) => void;
}

const StoreContext = createContext<Store | null>(null);

function prepare(data: Data, key: DayKey): Data {
  ensureDay(data, key);
  data.days[key].summary = computeSummary(data, key);
  return data;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(dateKey);
  const todayRef = useRef(today);
  const [data, setData] = useState(() => prepare(loadData(), todayRef.current));

  // Salva a cada alteração.
  useEffect(() => saveData(data), [data]);

  /**
   * Altera os dados: update(d => { d.settings.waterGoal = 2500 })
   * Recebe uma cópia; pode mutar à vontade. O resumo de hoje é recalculado.
   */
  const update = useCallback((fn: (draft: Data) => unknown) => {
    setData((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      return prepare(draft, todayRef.current);
    });
  }, []);

  /** Substitui tudo (usado na importação de backup / apagar dados). */
  const replaceAll = useCallback((next: Data) => {
    setData(prepare(structuredClone(next), todayRef.current));
  }, []);

  // Virada da meia-noite: confere a data a cada 15 s.
  useEffect(() => {
    const check = () => {
      const k = dateKey();
      if (k !== todayRef.current) {
        todayRef.current = k;
        setToday(k);
        update(() => {});
      }
    };
    const id = setInterval(check, 15000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [update]);

  const value = useMemo<Store>(
    () => ({ data, today, day: data.days[today], settings: data.settings, update, replaceAll }),
    [data, today, update, replaceAll]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore precisa estar dentro de <StoreProvider>');
  return ctx;
}
