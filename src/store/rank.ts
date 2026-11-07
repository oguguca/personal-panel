// Rank competitivo por temporada (cada mês é uma temporada).
// Cada dia é uma "partida": dia ativo = vitória (+PR), dia parado = derrota (−PR).
// Tudo é calculado a partir dos dados salvos, igual ao XP.
import { addDays } from './dates';
import { dayGains } from './game';
import { TIERS } from './tiers';
import type { Data, DayKey } from './types';

export { TIERS, type Tier } from './tiers';
export const TOP = TIERS.length - 1;

export const RANK = {
  divisions: 3, // III → II → I
  divPR: 100, // PR por divisão
  activeXp: 40, // XP no dia para contar vitória
  idleXp: 10, // abaixo disso é derrota
  rate: 0.35, // PR por XP
  maxDay: 120, // teto de PR por dia
  loss: 25, // PR perdido num dia parado
  carry: 0.3, // reset suave: nova temporada começa com 30% dos pontos
  maxCombo: 10, // sequência máxima que conta para o multiplicador
};

const ROMAN = ['', 'I', 'II', 'III'];

export interface RankPos {
  tier: number;
  div: number; // 3, 2, 1 (0 no rank máximo, que não tem divisão)
  /** índice absoluto da divisão (Toguro III = 0) para comparar subida/queda */
  step: number;
  pr: number;
  into: number;
  need: number; // 0 no rank máximo
  name: string;
  label: string; // "Ouro II"
}

/** Posição no rank a partir dos pontos (PR). */
export function rankFromPR(pr: number): RankPos {
  const perTier = RANK.divisions * RANK.divPR;
  const tier = Math.min(TOP, Math.floor(pr / perTier));
  const name = TIERS[tier].name;
  if (tier === TOP) {
    return { tier, div: 0, step: TOP * RANK.divisions, pr, into: pr - TOP * perTier, need: 0, name, label: name };
  }
  const d = Math.floor((pr - tier * perTier) / RANK.divPR); // 0, 1, 2
  const div = RANK.divisions - d;
  return { tier, div, step: tier * RANK.divisions + d, pr, into: pr - tier * perTier - d * RANK.divPR, need: RANK.divPR, name, label: `${name} ${ROMAN[div]}` };
}

/** Multiplicador da sequência: +5% por dia seguido, até +50%. */
export const comboOf = (streak: number) => 1 + Math.min(streak, RANK.maxCombo) * 0.05;

export type MatchResult = 'win' | 'draw' | 'loss' | 'rest' | 'live';

export interface Match {
  key: DayKey;
  xp: number;
  delta: number;
  result: MatchResult;
  streak: number;
  combo: number;
  pr: number; // PR depois do dia
  change?: 'up' | 'down'; // subiu ou caiu de divisão
}

export interface Season {
  id: string; // "2026-11"
  name: string; // "Novembro de 2026"
  start: DayKey;
  end: DayKey;
  rank: RankPos;
  peak: RankPos;
  startPR: number;
  matches: Match[];
  wins: number;
  losses: number;
}

export interface Ranked {
  season: Season;
  past: Season[]; // mais recente primeiro
  streak: number;
  bestStreak: number;
  daysLeft: number;
}

const seasonId = (key: DayKey) => key.slice(0, 7);
const seasonName = (id: string) => {
  const [y, m] = id.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const lastDayOf = (id: string): DayKey => {
  const [y, m] = id.split('-').map(Number);
  return `${id}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

function newSeason(id: string, startPR: number): Season {
  const rank = rankFromPR(startPR);
  return { id, name: seasonName(id), start: `${id}-01`, end: lastDayOf(id), rank, peak: rank, startPR, matches: [], wins: 0, losses: 0 };
}

/** XP total ganho no dia (todos os atributos). */
export function dayXp(data: Data, key: DayKey): number {
  return dayGains(data, key).gains.reduce((s, g) => s + g.xp, 0);
}

/** Calcula todas as temporadas, do primeiro dia salvo até hoje. */
export function computeRanked(data: Data, today: DayKey): Ranked {
  const keys = Object.keys(data.days).filter((k) => k <= today).sort();
  let key = keys[0] || today;
  const seasons: Season[] = [];
  let season = newSeason(seasonId(key), 0);
  let pr = 0;
  let streak = 0;
  let bestStreak = 0;
  let started = false; // só perde pontos depois do primeiro dia ativo

  for (; key <= today; key = addDays(key, 1)) {
    if (seasonId(key) !== season.id) {
      seasons.push(season);
      pr = Math.round(pr * RANK.carry);
      season = newSeason(seasonId(key), pr);
    }
    const xp = dayXp(data, key);
    const before = rankFromPR(pr).step;
    const isToday = key === today;
    let result: MatchResult;
    let delta: number;

    if (xp >= RANK.activeXp) {
      streak++;
      started = true;
      result = isToday ? 'live' : 'win';
      delta = Math.min(RANK.maxDay, Math.round(xp * RANK.rate * comboOf(streak)));
    } else if (data.days[key]?.training?.type === 'rest') {
      result = isToday ? 'live' : 'rest'; // descanso planejado não quebra a sequência
      delta = Math.round(xp * RANK.rate);
    } else if (isToday) {
      result = 'live'; // o dia ainda não acabou: não perde nada
      delta = Math.round(xp * RANK.rate);
    } else if (xp >= RANK.idleXp) {
      streak = 0;
      result = 'draw';
      delta = Math.round(xp * RANK.rate);
    } else {
      streak = 0;
      if (!started) continue; // antes de começar a jogar não conta
      result = 'loss';
      delta = -Math.min(pr, RANK.loss);
    }

    pr += delta;
    bestStreak = Math.max(bestStreak, streak);
    const after = rankFromPR(pr);
    const match: Match = { key, xp, delta, result, streak, combo: comboOf(streak), pr };
    if (after.step > before) match.change = 'up';
    if (after.step < before) match.change = 'down';
    season.matches.push(match);
    if (result === 'win') season.wins++;
    if (result === 'loss') season.losses++;
    season.rank = after;
    if (after.pr > season.peak.pr) season.peak = after;
  }

  const [y, m, d] = today.split('-').map(Number);
  const daysLeft = new Date(y, m, 0).getDate() - d;
  return { season, past: seasons.reverse(), streak, bestStreak, daysLeft };
}
