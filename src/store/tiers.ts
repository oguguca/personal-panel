// Ranks com nomes de marombeiros e fisiculturistas (do Gordo, o começo, até o Ganley, o topo).
// Para trocar um nome, edite aqui: vale para o rank da temporada e o da academia.
// Imagem opcional de cada rank: coloque em public/ranks/<slug>.png (ex.: ganley.png).
// Essa pasta não vai para o GitHub.
export interface Tier {
  name: string;
  /** [claro, base, escuro] usados no emblema */
  colors: [string, string, string];
  /** quantas divisões (III → I, IV → I…); o topo não tem divisão */
  divisions: number;
}

export const TIERS: Tier[] = [
  { name: 'Gordo', divisions: 3, colors: ['#d1d5db', '#6b7280', '#30363f'] },
  { name: 'Toguro', divisions: 3, colors: ['#f6c9a4', '#c2733d', '#6b3412'] },
  { name: 'Cariani', divisions: 3, colors: ['#f8fafc', '#a8b3c4', '#4f5a6b'] },
  { name: 'Balestrin', divisions: 4, colors: ['#fff4b8', '#f2b711', '#8a5a00'] },
  { name: 'Jorlan', divisions: 4, colors: ['#d5fbf3', '#2dd4bf', '#0d5f58'] },
  { name: 'Stronda', divisions: 4, colors: ['#c8f9da', '#22c55e', '#12532c'] },
  { name: 'Brandão', divisions: 5, colors: ['#e3f3ff', '#4cb6f5', '#1e3a99'] },
  { name: 'CBum', divisions: 5, colors: ['#f5ebff', '#a855f7', '#4c1782'] },
  { name: 'Ganley', divisions: 0, colors: ['#ffe4e8', '#f43f5e', '#7a0f2c'] },
];

/** Nome do arquivo de imagem do rank: "Brandão" -> "brandao". */
export const tierSlug = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
/** "Jorlan" + 4 -> "Jorlan IV"; sem divisão (topo) fica só o nome. */
export const divLabel = (name: string, div: number) => (div ? `${name} ${ROMAN[div]}` : name);
/** Divisão de entrada de um rank (a mais baixa: III, IV ou V). */
export const firstDiv = (tier: number) => TIERS[tier].divisions;
