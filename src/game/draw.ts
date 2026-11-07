// Desenho da academia e do personagem (canvas 2D). Cena lógica de 384 × 216.
// O personagem é um "chibi": cabeça grande (imagem do rank, se houver) e corpo que cresce com o rank.
import { ENTRY_X, STATIONS, TIMING, repAt, stepAt, type Anim, type Move, type StationId, type Step } from './gym';

export const W = 384;
export const H = 216;
export const GROUND = 184;

type P = [number, number];
export interface Pose {
  head: P; sh: P; hip: P;
  kneeF: P; footF: P; kneeB: P; footB: P;
  elbowF: P; handF: P; elbowB: P; handB: P;
  prop?: 'barbell' | 'dumbbell' | null;
  lying?: boolean;
}

export interface Look {
  skin: string;
  shirt: string;
  shirtDark: string;
  bulk: number; // 0..1 (cresce com o rank)
  tier: number;
  top: boolean; // rank máximo (auréola)
  face?: { img: CanvasImageSource; sx: number; sy: number; s: number } | null;
}

// ---------- poses ----------

const STAND: Pose = {
  head: [0, -40], sh: [0, -29], hip: [0, -16],
  kneeF: [2, -8], footF: [3, 0], kneeB: [-2, -8], footB: [-3, 0],
  elbowF: [2, -22], handF: [3, -15], elbowB: [-2, -22], handB: [-3, -15],
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lp = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function mix(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a } as Pose;
  for (const k of Object.keys(a) as (keyof Pose)[]) {
    const va = a[k];
    const vb = b[k];
    if (Array.isArray(va) && Array.isArray(vb)) (out as unknown as Record<string, P>)[k] = lp(va as P, vb as P, t);
  }
  return out;
}
const pose = (patch: Partial<Pose>): Pose => ({ ...STAND, ...patch });
const shift = (p: Pose, dx: number, dy: number): Pose => {
  const out = { ...p };
  for (const k of Object.keys(p) as (keyof Pose)[]) {
    const v = p[k];
    if (Array.isArray(v)) (out as unknown as Record<string, P>)[k] = [v[0] + dx, v[1] + dy];
  }
  return out;
};
/** sobe e desce: 0 → 1 → 0 */
const wave = (phase: number) => (1 - Math.cos(phase * Math.PI * 2)) / 2;

const POSES: Partial<Record<Anim, [Pose, Pose]>> = {
  squat: [
    pose({ elbowF: [6, -25], handF: [3, -30], elbowB: [-5, -25], handB: [-2, -30], prop: 'barbell' }),
    pose({ head: [1, -30], sh: [-1, -20], hip: [-6, -9], kneeF: [5, -9], kneeB: [4, -8], elbowF: [5, -16], handF: [2, -21], elbowB: [-4, -16], handB: [-1, -21], prop: 'barbell' }),
  ],
  deadlift: [
    pose({ head: [8, -30], sh: [4, -22], hip: [-5, -13], kneeF: [4, -7], kneeB: [3, -7], elbowF: [4, -14], handF: [4, -6], elbowB: [3, -14], handB: [3, -6], prop: 'barbell' }),
    pose({ handF: [2, -14], handB: [1, -14], elbowF: [1, -21], elbowB: [0, -21], prop: 'barbell' }),
  ],
  row: [
    pose({ head: [12, -30], sh: [6, -24], hip: [-4, -15], kneeF: [3, -8], kneeB: [2, -8], elbowF: [6, -17], handF: [6, -10], elbowB: [5, -17], handB: [5, -10], prop: 'barbell' }),
    pose({ head: [12, -30], sh: [6, -24], hip: [-4, -15], kneeF: [3, -8], kneeB: [2, -8], elbowF: [-2, -22], handF: [3, -18], elbowB: [-3, -22], handB: [2, -18], prop: 'barbell' }),
  ],
  curl: [
    pose({ elbowF: [2, -22], handF: [7, -17], elbowB: [-1, -22], handB: [4, -17], prop: 'dumbbell' }),
    pose({ elbowF: [2, -22], handF: [5, -30], elbowB: [-1, -22], handB: [2, -30], prop: 'dumbbell' }),
  ],
  press: [
    pose({ elbowF: [7, -27], handF: [5, -33], elbowB: [-6, -27], handB: [-4, -33], prop: 'dumbbell' }),
    pose({ elbowF: [4, -40], handF: [3, -48], elbowB: [-3, -40], handB: [-2, -48], prop: 'dumbbell' }),
  ],
  pull: [
    shift(pose({ elbowF: [2, -45], handF: [3, -53], elbowB: [-2, -45], handB: [-3, -53] }), 0, -10),
    shift(pose({ elbowF: [7, -36], handF: [3, -43], elbowB: [-6, -36], handB: [-3, -43] }), 0, -20),
  ],
  bench: [
    pose({ lying: true, head: [-17, -16], sh: [-9, -14], hip: [7, -14], kneeF: [14, -14], footF: [16, 0], kneeB: [13, -14], footB: [14, 0], elbowF: [-12, -17], handF: [-8, -21], elbowB: [-11, -17], handB: [-7, -21], prop: 'barbell' }),
    pose({ lying: true, head: [-17, -16], sh: [-9, -14], hip: [7, -14], kneeF: [14, -14], footF: [16, 0], kneeB: [13, -14], footB: [14, 0], elbowF: [-9, -24], handF: [-8, -32], elbowB: [-8, -24], handB: [-7, -32], prop: 'barbell' }),
  ],
  pushup: [
    pose({ lying: true, head: [16, -6], sh: [9, -5], hip: [-4, -5], kneeF: [-10, -3], footF: [-16, -1], kneeB: [-10, -3], footB: [-16, -1], elbowF: [4, -2], handF: [9, 0], elbowB: [3, -2], handB: [8, 0] }),
    pose({ lying: true, head: [16, -15], sh: [9, -12], hip: [-4, -8], kneeF: [-10, -5], footF: [-16, -1], kneeB: [-10, -5], footB: [-16, -1], elbowF: [9, -6], handF: [9, 0], elbowB: [8, -6], handB: [8, 0] }),
  ],
  abs: [
    pose({ lying: true, head: [-18, -5], sh: [-11, -4], hip: [0, -4], kneeF: [6, -12], footF: [11, -2], kneeB: [5, -12], footB: [10, -2], elbowF: [-14, -9], handF: [-17, -8], elbowB: [-13, -9], handB: [-16, -8] }),
    pose({ lying: true, head: [-11, -17], sh: [-7, -10], hip: [0, -4], kneeF: [6, -12], footF: [11, -2], kneeB: [5, -12], footB: [10, -2], elbowF: [-6, -16], handF: [-10, -18], elbowB: [-5, -16], handB: [-9, -18] }),
  ],
  stretch: [
    pose({ elbowF: [2, -38], handF: [2, -47], elbowB: [-1, -38], handB: [-1, -47] }),
    pose({ head: [9, -12], sh: [6, -20], hip: [-3, -16], elbowF: [6, -11], handF: [5, -2], elbowB: [5, -11], handB: [4, -2] }),
  ],
};

const FLEX = pose({ elbowF: [9, -30], handF: [8, -39], elbowB: [-9, -30], handB: [-8, -39] });

function runPose(phase: number, lift: number, amp: number): Pose {
  const a = phase * Math.PI * 2;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const bob = -Math.abs(c) * (amp / 4);
  return shift(
    pose({
      footF: [amp * s, -Math.max(0, c) * (amp * 0.6)],
      footB: [-amp * s, -Math.max(0, -c) * (amp * 0.6)],
      kneeF: [amp * s * 0.5 + 2, -8 - Math.max(0, c) * 2],
      kneeB: [-amp * s * 0.5 + 2, -8 - Math.max(0, -c) * 2],
      elbowF: [-2 * s, -22], handF: [-4 * s + 2, -16],
      elbowB: [2 * s, -22], handB: [4 * s + 2, -16],
    }),
    0,
    lift + bob,
  );
}

function bikePose(phase: number): Pose {
  const a = phase * Math.PI * 2;
  const crank: P = [2, -7];
  const fF: P = [crank[0] + 4 * Math.cos(a), crank[1] + 4 * Math.sin(a)];
  const fB: P = [crank[0] - 4 * Math.cos(a), crank[1] - 4 * Math.sin(a)];
  return pose({
    head: [3, -42], sh: [2, -31], hip: [-3, -19],
    footF: fF, footB: fB, kneeF: [fF[0] + 4, -15 + (fF[1] + 7) / 2], kneeB: [fB[0] + 4, -15 + (fB[1] + 7) / 2],
    elbowF: [6, -26], handF: [11, -25], elbowB: [5, -26], handB: [10, -25],
  });
}

/** Pose do personagem para um passo do treino. */
export function poseAt(anim: Anim | 'walk' | 'idle' | 'rest' | 'flex' | 'sleep', phase: number, time: number): Pose {
  if (anim === 'walk') return runPose(phase, 0, 3);
  if (anim === 'run') return runPose(phase, -5, 4);
  if (anim === 'bike') return bikePose(phase);
  if (anim === 'flex') return shift(FLEX, 0, -Math.abs(Math.sin(time * 6)) * 3);
  if (anim === 'sleep') return shift(POSES.bench![0], 0, Math.sin(time * 2) * 0.4);
  if (anim === 'idle' || anim === 'rest') {
    const b = Math.sin(time * 2.5) * 0.6;
    return shift(pose({}), 0, b);
  }
  const pair = POSES[anim];
  if (!pair) return STAND;
  return mix(pair[0], pair[1], wave(phase));
}

// ---------- cena ----------

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function drawRoom(ctx: CanvasRenderingContext2D, accent: string, time: number) {
  // parede
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, '#141832');
  g.addColorStop(1, '#232a4d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, GROUND);
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let y = 6; y < GROUND - 40; y += 8) {
    for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) ctx.fillRect(x, y, 15, 7);
  }
  // janelas com céu
  for (const wx of [40, 300]) {
    rect(ctx, wx, 18, 52, 34, '#0b0f24');
    const sky = ctx.createLinearGradient(0, 20, 0, 50);
    sky.addColorStop(0, '#1e3a8a');
    sky.addColorStop(1, '#7c3aed');
    ctx.fillStyle = sky;
    ctx.fillRect(wx + 2, 20, 48, 30);
    rect(ctx, wx + 25, 20, 2, 30, '#0b0f24');
    rect(ctx, wx + 2, 34, 48, 2, '#0b0f24');
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(wx + 8 + ((time * 2) % 30), 24, 1, 1);
    ctx.fillRect(wx + 36, 28, 1, 1);
  }
  // letreiro neon
  const flick = Math.sin(time * 13) > -0.95 ? 1 : 0.4;
  ctx.save();
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 10 * flick;
  ctx.fillStyle = accent;
  ctx.globalAlpha = flick;
  ctx.fillText('ACADEMIA', W / 2, 38);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 7px "Courier New", monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('NO PAIN · NO GAIN', W / 2, 50);
  ctx.restore();
  // espelho
  rect(ctx, 104, 66, 176, 70, '#2a3566');
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(130, 66);
  ctx.lineTo(150, 66);
  ctx.lineTo(120, 136);
  ctx.lineTo(100 + 4, 136);
  ctx.fill();
  rect(ctx, 104, 136, 176, 2, '#11152c');
  // rodapé e chão de madeira
  rect(ctx, 0, GROUND - 6, W, 6, '#0d1022');
  for (let y = GROUND; y < H; y += 8) {
    rect(ctx, 0, y, W, 8, y % 16 ? '#5b3a24' : '#664129');
    for (let x = (y % 16) * 3; x < W; x += 48) rect(ctx, x, y, 1, 8, '#3f2716');
  }
  const shade = ctx.createLinearGradient(0, GROUND, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0.35)');
  shade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  // porta
  rect(ctx, ENTRY_X - 9, GROUND - 44, 22, 44, '#0b0e1f');
  rect(ctx, ENTRY_X - 7, GROUND - 42, 18, 42, '#3b2a1e');
  rect(ctx, ENTRY_X + 7, GROUND - 22, 2, 2, '#fbbf24');
}

function plate(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#16181f';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5b6170';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#9aa1b2';
  ctx.beginPath();
  ctx.arc(x, y, 1.2, 0, Math.PI * 2);
  ctx.fill();
}
const plateR = (kg: number) => 3 + Math.min(6, kg / 18);

export function drawStations(ctx: CanvasRenderingContext2D, busy: StationId | null, moveKg: number, time: number) {
  const G = GROUND;
  const S = STATIONS;
  // esteira
  {
    const x = S.treadmill;
    rect(ctx, x - 16, G - 6, 30, 6, '#2b2f3a');
    rect(ctx, x - 15, G - 7, 28, 2, '#111');
    const off = busy === 'treadmill' ? (time * 30) % 6 : 0;
    for (let i = 0; i < 5; i++) rect(ctx, x - 14 + ((i * 6 + 6 - off) % 27), G - 7, 1, 1, '#555');
    rect(ctx, x + 12, G - 34, 3, 28, '#3c4152');
    rect(ctx, x + 6, G - 38, 12, 6, '#1f2433');
    rect(ctx, x + 8, G - 37, 8, 3, busy === 'treadmill' ? '#22d3ee' : '#0e7490');
    rect(ctx, x + 2, G - 26, 12, 2, '#3c4152');
  }
  // bicicleta
  {
    const x = S.bike;
    ctx.strokeStyle = '#3c4152';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 6, G - 2);
    ctx.lineTo(x - 3, G - 17);
    ctx.moveTo(x - 3, G - 12);
    ctx.lineTo(x + 10, G - 12);
    ctx.lineTo(x + 12, G - 24);
    ctx.stroke();
    rect(ctx, x - 9, G - 2, 24, 2, '#3c4152');
    rect(ctx, x - 7, G - 20, 9, 3, '#111');
    rect(ctx, x + 9, G - 26, 6, 2, '#111');
    ctx.fillStyle = '#1f2433';
    ctx.beginPath();
    ctx.arc(x + 10, G - 6, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // supino
  {
    const x = S.bench;
    rect(ctx, x - 30, G - 12, 46, 4, '#7f1d1d');
    rect(ctx, x - 30, G - 12, 46, 1, '#b91c1c');
    rect(ctx, x - 24, G - 8, 2, 8, '#3c4152');
    rect(ctx, x + 10, G - 8, 2, 8, '#3c4152');
    rect(ctx, x - 20, G - 34, 2, 34, '#3c4152');
    if (busy !== 'bench') {
      rect(ctx, x - 24, G - 34, 10, 1, '#c7ccd6');
      plate(ctx, x - 19, G - 34, plateR(40));
    }
  }
  // rack de agachamento
  {
    const x = S.rack;
    rect(ctx, x - 14, G - 64, 3, 64, '#3c4152');
    rect(ctx, x + 12, G - 64, 3, 64, '#3c4152');
    rect(ctx, x - 14, G - 64, 29, 3, '#3c4152');
    rect(ctx, x - 13, G - 38, 3, 2, '#9aa1b2');
    rect(ctx, x + 11, G - 38, 3, 2, '#9aa1b2');
    if (busy !== 'rack') plate(ctx, x, G - 38, plateR(60));
    rect(ctx, x - 16, G - 2, 33, 2, '#1f2433');
  }
  // plataforma
  {
    const x = S.platform;
    rect(ctx, x - 18, G - 2, 36, 3, '#a16207');
    rect(ctx, x - 18, G - 2, 36, 1, '#ca8a04');
    if (busy !== 'platform') plate(ctx, x + 4, G - 2 - plateR(80), plateR(80));
  }
  // barra fixa
  {
    const x = S.pullup;
    rect(ctx, x - 14, G - 80, 3, 80, '#3c4152');
    rect(ctx, x + 12, G - 80, 3, 80, '#3c4152');
    rect(ctx, x - 14, G - 74, 29, 2, '#c7ccd6');
  }
  // halteres
  {
    const x = S.dumbbells;
    rect(ctx, x - 16, G - 22, 32, 2, '#3c4152');
    rect(ctx, x - 16, G - 12, 32, 2, '#3c4152');
    rect(ctx, x - 16, G - 22, 2, 22, '#3c4152');
    rect(ctx, x + 14, G - 22, 2, 22, '#3c4152');
    for (let i = 0; i < 5; i++) {
      const r = 1.5 + i * 0.4;
      if (!(busy === 'dumbbells' && i === Math.min(4, Math.floor(moveKg / 8)))) {
        plate(ctx, x - 11 + i * 5.5, G - 22 - r, r);
        plate(ctx, x - 11 + i * 5.5, G - 12 - r, r);
      }
    }
  }
  // colchonete
  {
    const x = S.mat;
    rect(ctx, x - 20, G - 2, 40, 2, '#0e7490');
    rect(ctx, x - 20, G - 2, 40, 1, '#22d3ee');
  }
}

// ---------- personagem ----------

function limb(ctx: CanvasRenderingContext2D, a: P, b: P, c: P, w: number, upper: string, lower: string) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = upper;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = lower;
  ctx.lineWidth = w * 0.85;
  ctx.beginPath();
  ctx.moveTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.stroke();
}

function darken(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, facing: 1 | -1, p: Pose, look: Look, kg: number, time: number) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing, 1);
  const b = look.bulk;
  const armW = 3 + b * 2.6;
  const legW = 4 + b * 2;
  const torsoW = 8 + b * 6;
  const skinD = darken(look.skin, 0.8);

  // sombra
  if (!p.lying) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 9 + b * 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // aura nos ranks altos
  if (look.tier >= 6) {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(time * 4) * 0.1;
    ctx.shadowColor = look.top ? '#ffd25e' : look.shirt;
    ctx.shadowBlur = 14;
    ctx.fillStyle = look.top ? '#ffd25e' : look.shirt;
    ctx.beginPath();
    ctx.ellipse(p.sh[0], (p.sh[1] + p.hip[1]) / 2, torsoW, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // perna e braço de trás
  limb(ctx, p.hip, p.kneeB, p.footB, legW, '#1f2440', skinD);
  rect(ctx, p.footB[0] - 2, p.footB[1] - 2, 5, 2, '#e5e7eb');
  limb(ctx, p.sh, p.elbowB, p.handB, armW, skinD, skinD);
  if (p.prop === 'dumbbell') dumbbell(ctx, p.handB, kg);

  // tronco (regata na cor do rank)
  ctx.lineCap = 'round';
  ctx.strokeStyle = look.shirt;
  ctx.lineWidth = torsoW;
  ctx.beginPath();
  ctx.moveTo(p.hip[0], p.hip[1]);
  ctx.lineTo(p.sh[0], p.sh[1]);
  ctx.stroke();
  ctx.strokeStyle = look.shirtDark;
  ctx.lineWidth = torsoW * 0.35;
  ctx.beginPath();
  const mx = lerp(p.hip[0], p.sh[0], 0.15);
  const my = lerp(p.hip[1], p.sh[1], 0.15);
  ctx.moveTo(mx, my);
  ctx.lineTo(lerp(p.hip[0], p.sh[0], 0.85), lerp(p.hip[1], p.sh[1], 0.85));
  ctx.stroke();
  // bermuda
  ctx.strokeStyle = '#1f2440';
  ctx.lineWidth = torsoW * 0.95;
  ctx.beginPath();
  ctx.moveTo(p.hip[0], p.hip[1]);
  ctx.lineTo(lerp(p.hip[0], p.sh[0], 0.12), lerp(p.hip[1], p.sh[1], 0.12));
  ctx.stroke();

  // perna da frente
  limb(ctx, p.hip, p.kneeF, p.footF, legW, '#283057', look.skin);
  rect(ctx, p.footF[0] - 2, p.footF[1] - 2, 5, 2, '#f8fafc');

  // cabeça
  drawHead(ctx, p.head, p.sh, look, facing, time);

  // braço da frente por cima
  limb(ctx, p.sh, p.elbowF, p.handF, armW, look.skin, look.skin);
  if (b > 0.3) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(lerp(p.sh[0], p.elbowF[0], 0.5), lerp(p.sh[1], p.elbowF[1], 0.5), armW * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.prop === 'dumbbell') dumbbell(ctx, p.handF, kg);
  if (p.prop === 'barbell') {
    const hx = (p.handF[0] + p.handB[0]) / 2;
    const hy = (p.handF[1] + p.handB[1]) / 2;
    rect(ctx, hx - 1, hy - 0.5, 2, 1, '#c7ccd6');
    plate(ctx, hx, hy, plateR(kg));
  }
  ctx.restore();
}

/** Barra (anilha vista de lado) ou halter numa posição da cena. */
export function drawProp(ctx: CanvasRenderingContext2D, kind: 'barbell' | 'dumbbell', x: number, y: number, kg: number) {
  if (kind === 'barbell') {
    rect(ctx, x - 1.5, y - 0.5, 3, 1, '#c7ccd6');
    plate(ctx, x, y, plateR(kg));
  } else dumbbell(ctx, [x, y], kg);
}

function dumbbell(ctx: CanvasRenderingContext2D, h: P, kg: number) {
  const r = 1.8 + Math.min(2.5, kg / 12);
  plate(ctx, h[0], h[1], r);
}

function drawHead(ctx: CanvasRenderingContext2D, head: P, sh: P, look: Look, facing: 1 | -1, time: number) {
  const R = 10;
  // pescoço
  ctx.strokeStyle = look.skin;
  ctx.lineWidth = 4 + look.bulk * 2;
  ctx.beginPath();
  ctx.moveTo(sh[0], sh[1]);
  ctx.lineTo(lerp(sh[0], head[0], 0.6), lerp(sh[1], head[1], 0.6));
  ctx.stroke();

  ctx.save();
  ctx.translate(head[0], head[1]);
  if (look.face) {
    // a imagem não é espelhada: desfaz o scale(-1) quando olha para a esquerda
    ctx.scale(facing, 1);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.save();
    ctx.clip();
    const f = look.face;
    ctx.drawImage(f.img, f.sx, f.sy, f.s, f.s, -R, -R, R * 2, R * 2);
    ctx.restore();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = look.top ? '#ffd25e' : look.shirtDark;
    ctx.stroke();
  } else {
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f1410';
    ctx.beginPath();
    ctx.arc(0, -3, R, Math.PI, Math.PI * 2);
    ctx.fill();
    rect(ctx, 3, -1, 2, 3, '#111');
    rect(ctx, 7, -1, 1.5, 3, '#111');
    rect(ctx, 4, 5, 4, 1, '#7a2e2e');
  }
  ctx.restore();

  if (look.top) {
    // auréola do topo
    ctx.save();
    ctx.translate(head[0], head[1] - R - 3 - Math.sin(time * 3) * 1);
    ctx.shadowColor = '#ffd25e';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#ffd25e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 2.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- efeitos ----------

export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.save();
  ctx.font = 'bold 8px "Courier New", monospace';
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = 'rgba(10,12,30,0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 11, w, 12, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 2);
  ctx.restore();
}

export function drawSweat(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  for (let i = 0; i < 3; i++) {
    const t = (time * 1.5 + i / 3) % 1;
    ctx.fillStyle = `rgba(125,211,252,${1 - t})`;
    ctx.beginPath();
    ctx.arc(x + (i - 1) * 7, y + t * 14, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawConfetti(ctx: CanvasRenderingContext2D, t: number) {
  const colors = ['#facc15', '#f472b6', '#60a5fa', '#4ade80', '#fb923c'];
  for (let i = 0; i < 60; i++) {
    const seed = Math.sin(i * 99.1) * 1000;
    const x = ((seed % W) + W) % W;
    const y = ((t * (40 + (i % 7) * 10) + (i * 37) % 120) % (H + 20)) - 20;
    ctx.fillStyle = colors[i % colors.length];
    ctx.save();
    ctx.translate(x + Math.sin(t * 3 + i) * 6, y);
    ctx.rotate(t * 4 + i);
    ctx.fillRect(-1.5, -1, 3, 2);
    ctx.restore();
  }
}

// ---------- quadro completo ----------

export interface Frame {
  x: number;
  /** ação para o boneco de corpo inteiro e fase do movimento (0..1) */
  action: string;
  phase: number;
  facing: 1 | -1;
  pose: Pose;
  move: Move | null;
  set: number;
  rep: number;
  kind: Step['kind'] | 'idle' | 'sleep';
}

/** Onde o personagem está e o que faz no tempo t do plano. */
export function frameAt(plan: Step[], moves: Move[], t: number, time: number): Frame {
  const { step, local, elapsed } = stepAt(plan, t);
  if (step.kind === 'intro') {
    return { x: step.x, action: 'idle', phase: 0, facing: 1, pose: poseAt('idle', 0, time), move: null, set: 0, rep: 0, kind: 'intro' };
  }
  if (step.kind === 'walk') {
    const x = lerp(step.from, step.to, local);
    return { x, action: 'walk', phase: (elapsed * 1.6) % 1, facing: step.to >= step.from ? 1 : -1, pose: poseAt('walk', elapsed * 1.6, time), move: moves[step.move], set: 0, rep: 0, kind: 'walk' };
  }
  if (step.kind === 'done') {
    return { x: step.x, action: 'flex', phase: 0, facing: 1, pose: poseAt('flex', 0, time), move: null, set: 0, rep: 0, kind: 'done' };
  }
  const move = moves[step.move];
  const x = STATIONS[move.station];
  if (step.kind === 'rest') {
    return { x, action: 'idle', phase: 0, facing: 1, pose: poseAt('rest', 0, time), move, set: step.set, rep: move.reps, kind: 'rest' };
  }
  const { rep, phase } = repAt(move, elapsed);
  return { x, action: move.anim, phase, facing: 1, pose: poseAt(move.anim, phase, time), move, set: step.set, rep, kind: 'set' };
}

export { TIMING };
