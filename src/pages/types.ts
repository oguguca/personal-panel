/** Props que o App passa para toda tela. */
export interface PageProps {
  /** Navega para outra tela (id da rota, ex.: 'treino'). */
  go: (id: string) => void;
  /** Momento em que o app abriu (usado no lembrete de água). */
  startedAt: number;
}
