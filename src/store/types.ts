// Tipos de todos os dados salvos do app (o que vai para o localStorage e para o backup JSON).

/** Chave de dia no horário local: 'AAAA-MM-DD'. */
export type DayKey = string;

export type Theme = 'light' | 'dark' | 'system';
export type Sex = '' | 'm' | 'f';

export interface Profile {
  height: string | number;
  weight: string | number;
  age: string | number;
  birthday: string;
  sex: Sex | string;
  activity: number;
}

export interface MealConfig {
  id: string;
  name: string;
  time: string; // 'HH:MM'
}

export interface Settings {
  userName: string;
  theme: Theme;
  notificationsOn: boolean;
  waterGoal: number; // mínimo do dia (ml)
  waterIdeal: number; // ideal do dia (ml)
  waterQuick: number[];
  waterReminderOn: boolean;
  waterReminderMinutes: number;
  waterActiveStart: string;
  waterActiveEnd: string;
  carryOverTasks: boolean;
  recordGoalMin: number;
  kcalGoal: number;
  profile: Profile;
  recordQuick: number[];
  meals: MealConfig[];
}

/** Atributo de desenvolvimento pessoal (aba Evolução). */
export type AttrId = 'int' | 'vit' | 'forca' | 'disc' | 'resist';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  recurringId?: string;
  carried?: boolean;
  movedTo?: DayKey;
  attr?: AttrId | null;
}

export interface Recurring {
  id: string;
  title: string;
  days: number[]; // 0 = domingo ... 6 = sábado
  attr?: AttrId | null;
}

export interface DailyGoal {
  id: string;
  title: string;
  type: 'check' | 'count';
  target?: number;
  unit?: string;
  step?: number;
}

export interface LongGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit?: string;
}

export interface Unit {
  label: string;
  plural: string;
  g: number;
}

export interface CustomFood {
  id: string;
  name: string;
  kcal: number; // por 100 g
  p?: number;
  c?: number;
  g?: number;
  unit?: Unit | null;
}

/** Alimento pronto para busca (TACO ou próprio). Valores por 100 g. */
export interface Food {
  key: string;
  name: string;
  kcal: number;
  p: number;
  c: number;
  g: number;
  cat: string;
  n: string; // nome normalizado
  custom?: boolean;
  unit?: Unit | null;
}

/** Item de refeição com valores já calculados para a porção. */
export interface FoodItem {
  id: string;
  key: string;
  name: string;
  grams: number;
  kcal: number;
  p: number;
  c: number;
  g: number;
  qty?: number;
  unit?: string;
  unitPl?: string;
}

export interface Macros {
  kcal: number;
  p: number;
  c: number;
  g: number;
}

export interface MealState {
  done?: boolean;
  doneAt?: number;
  notified?: boolean;
  note?: string;
  items?: FoodItem[];
  adhoc?: boolean; // refeição registrada na hora (fora dos horários)
  name?: string;
}

/** O que o app lembra de cada alimento usado (para sugerir a mesma porção). */
export interface FoodUsage {
  count: number;
  last: number;
  mode?: 'g' | 'un';
  grams?: number;
  qty?: number;
  unitG?: number;
}

export interface WorkoutItem {
  id: string;
  exId: string;
  sets?: number | string;
  reps?: string;
  weight?: string | number;
  minutes?: number | string;
  distance?: string | number;
}

export interface Workout {
  id: string;
  name: string;
  items: WorkoutItem[];
  days?: number[];
}

/** Uma série feita: repetições e peso (null = não lembra o peso). */
export interface SetLog {
  reps: number;
  kg: number | null;
}

/** Exercício como foi feito no dia (cópia do plano + séries reais). */
export type LoggedItem = Omit<WorkoutItem, 'id'> & { done?: SetLog[]; noWeight?: boolean };

export interface TrainingLog {
  type: 'workout' | 'rest';
  workoutId?: string;
  name?: string;
  at: number;
  /** Cópia das cargas no dia (mede a evolução de força). */
  items?: LoggedItem[];
  /** Treino que era do dia e ficou para o próximo (trocou a ordem: ex. academia lotada). */
  swap?: string;
  /** Quantos exercícios o treino tinha (para mostrar "5 de 6 feitos"). */
  planned?: number;
}

export interface Summary {
  water: number;
  waterGoal: number;
  waterIdeal: number;
  kcal: number;
  kcalGoal: number;
  record: number;
  recordGoal: number;
  tasksDone: number;
  tasksTotal: number;
  goalsDone: number;
  goalsTotal: number;
  mealsDone: number;
  mealsTotal: number;
  goalNames: Record<string, string>;
  mealNames: Record<string, string>;
}

export interface Day {
  tasks: Task[];
  water: { ml: number; at: number }[];
  goals: Record<string, number>;
  meals: Record<string, MealState>;
  recording: { min: number; at: number }[];
  summary: Summary | null;
  init: boolean;
  training?: TrainingLog;
  lastWaterReminder?: number;
}

export interface Data {
  version: number;
  settings: Settings;
  recurring: Recurring[];
  dailyGoals: DailyGoal[];
  longGoals: LongGoal[];
  days: Record<DayKey, Day>;
  lastDay: DayKey | null;
  customFoods: CustomFood[];
  foodUsage: Record<string, FoodUsage>;
  workouts: Workout[];
  training: { rotation: string[]; restDays: number[] };
  game?: { seenLevel?: number; seenStep?: number; seenSeason?: string; rankV?: number };
  /** Calendário: compromissos e corridas. */
  events: CalEvent[];
  /** Aba Corrida: treinos de corrida, tênis e meta do mês. */
  running: Running;
}

/** Exercício da biblioteca. m = músculos principais, s = secundários. */
export interface Exercise {
  id: string;
  name: string;
  en?: string;
  m: string[];
  s: string[];
  eq: string;
  cat: string;
  steps: string[];
  level?: string;
  curated?: boolean;
  lang?: string;
}

export type EventKind = 'compromisso' | 'corrida';

/** Alerta antes do evento: começa X dias antes e repete a cada Y horas até a hora do evento. */
export interface EventAlert {
  daysBefore: number;
  everyHours: number;
}

export interface CalEvent {
  id: string;
  title: string;
  date: DayKey;
  time?: string; // 'HH:MM' (vazio = dia inteiro)
  kind: EventKind;
  place?: string;
  distance?: string; // corridas: '5', '10', '21', '42' (km)
  result?: string; // corridas: tempo final ('52:30' ou '1:45:10')
  link?: string; // site da inscrição ou do evento
  /** Diário da prova (aba Corrida): relato e fotos (ids das imagens salvas no IndexedDB). */
  story?: string;
  cover?: string;
  photos?: string[];
  /** Tênis usado na prova (aba Corrida). */
  shoeId?: string;
  notes?: string;
  alert?: EventAlert | null;
  lastAlert?: number; // último aviso enviado (ms)
  done?: boolean;
}

export type RunType = 'leve' | 'longo' | 'tiro' | 'ritmo' | 'prova';

/** Uma corrida registrada (treino ou prova). */
export interface Run {
  id: string;
  date: DayKey;
  km: number;
  seconds: number; // tempo total
  type: RunType;
  feel?: number; // 1 (péssimo) a 5 (ótimo)
  shoeId?: string;
  notes?: string;
  place?: string; // onde correu
  photos?: string[]; // ids das fotos (IndexedDB)
}

export interface Shoe {
  id: string;
  name: string;
  limitKm: number; // quando trocar (ex.: 700 km)
  startKm?: number; // km que já tinha antes de usar no app
  retired?: boolean;
  /** foto do tênis (id da imagem guardada no aparelho) */
  photo?: string;
}

export interface Running {
  runs: Run[];
  shoes: Shoe[];
  monthGoalKm: number; // 0 = sem meta
}
