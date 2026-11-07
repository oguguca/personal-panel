// Estado global do app: carrega, salva automaticamente e cuida da virada do dia.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { dateKey } from './dates.js';
import { computeSummary, ensureDay } from './model.js';
import { loadData, saveData } from './storage.js';

const StoreContext = createContext(null);

function prepare(data, key) {
  ensureDay(data, key);
  data.days[key].summary = computeSummary(data, key);
  return data;
}

export function StoreProvider({ children }) {
  const [today, setToday] = useState(dateKey);
  const todayRef = useRef(today);
  const [data, setData] = useState(() => prepare(loadData(), todayRef.current));

  // Salva a cada alteração.
  useEffect(() => saveData(data), [data]);

  /**
   * Altera os dados: update(d => { d.settings.waterGoal = 2500 })
   * Recebe uma cópia; pode mutar à vontade. O resumo de hoje é recalculado.
   */
  const update = useCallback((fn) => {
    setData((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      return prepare(draft, todayRef.current);
    });
  }, []);

  /** Substitui tudo (usado na importação de backup / apagar dados). */
  const replaceAll = useCallback((next) => {
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

  const value = useMemo(
    () => ({ data, today, day: data.days[today], settings: data.settings, update, replaceAll }),
    [data, today, update, replaceAll]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore precisa estar dentro de <StoreProvider>');
  return ctx;
}
