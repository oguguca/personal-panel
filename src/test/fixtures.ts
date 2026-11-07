// Dados de exemplo para os testes.
import { defaultData, emptyDay } from '../store/model';
import type { Data, Day, DayKey } from '../store/types';

/** Dados vazios com algumas alterações. */
export function makeData(patch: Partial<Data> = {}): Data {
  return { ...defaultData(), ...patch };
}

/** Coloca um dia nos dados (já marcado como iniciado). */
export function withDay(data: Data, key: DayKey, day: Partial<Day> = {}): Day {
  data.days[key] = { ...emptyDay(), init: true, ...day };
  return data.days[key];
}

// Datas fixas: 2026-11-01 é domingo, 2026-11-02 segunda.
export const SUN = '2026-11-01';
export const MON = '2026-11-02';
export const TUE = '2026-11-03';
export const WED = '2026-11-04';
