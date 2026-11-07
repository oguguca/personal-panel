// Personagem de corpo inteiro a partir de UMA imagem (public/ranks/<rank>-corpo.png).
// "Animação de recorte": tira o fundo preto, corta as pernas (que balançam) e o resto do corpo
// inclina, agacha, deita e pula conforme o exercício.

export interface BodyConfig {
  /** onde as pernas começam (fração da altura do corpo) */
  legTop: number;
  /** divisão entre as duas pernas (fração da largura) */
  legSplit: number;
  /** mão da frente e ombro (frações) — onde ficam halteres e barra */
  hand: [number, number];
  shoulder: [number, number];
  /** o desenho olha para a direita? */
  facesRight: boolean;
  /** inclinação natural das pernas na imagem (graus: trás, frente). Usada para endireitar ao sentar/deitar. */
  legTilt: [number, number];
  /** onde fica a junta do quadril dentro de cada pedaço de perna (fração da largura: trás, frente) */
  legPivot: [number, number];
}

export const DEFAULT_BODY: BodyConfig = { legTop: 0.64, legSplit: 0.52, hand: [0.86, 0.58], shoulder: [0.55, 0.2], facesRight: true, legTilt: [0, 0], legPivot: [0.5, 0.5] };

/** Ajustes por imagem (quando o corpo é muito diferente do padrão). */
export const BODY_CONFIG: Record<string, Partial<BodyConfig>> = {
  toguro: { legTop: 0.6, legSplit: 0.45, hand: [0.92, 0.53], shoulder: [0.45, 0.25], legTilt: [13, -30] },
};

export interface BodySprite {
  upper: HTMLCanvasElement;
  legB: HTMLCanvasElement; // perna de trás (esquerda na imagem)
  legF: HTMLCanvasElement; // perna da frente
  w: number;
  h: number;
  cfg: BodyConfig;
}

/** Remove o fundo (preto ou branco liso) a partir das bordas e recorta a figura. */
export function buildSprite(img: HTMLImageElement, cfg: BodyConfig): BodySprite | null {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const max = 700; // limita o tamanho para processar rápido
  const k = Math.min(1, max / H);
  const w = Math.round(W * k);
  const h = Math.round(H * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h);
  let data: ImageData;
  try {
    data = g.getImageData(0, 0, w, h);
  } catch {
    return null;
  }
  const px = data.data;
  // cor do fundo = canto superior esquerdo
  const br = px[0], bg = px[1], bb = px[2];
  const isBg = (i: number) => Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb) < 40 || px[i + 3] < 10;
  // preenchimento a partir das bordas (não apaga contornos escuros dentro da figura)
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    if (!isBg(i)) continue;
    px[i + 3] = 0;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
  // caixa da figura
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (px[(y * w + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 <= x0 || y1 <= y0) return null;
  g.putImageData(data, 0, 0);
  const fw = x1 - x0 + 1;
  const fh = y1 - y0 + 1;
  const part = (sx: number, sy: number, sw: number, sh: number) => {
    const p = document.createElement('canvas');
    p.width = Math.max(1, Math.round(sw));
    p.height = Math.max(1, Math.round(sh));
    p.getContext('2d')!.drawImage(c, x0 + sx, y0 + sy, sw, sh, 0, 0, sw, sh);
    return p;
  };
  const legY = fh * cfg.legTop;
  const split = fw * cfg.legSplit;
  return {
    upper: part(0, 0, fw, Math.min(fh, legY + fh * 0.06)), // um pouco por cima das pernas, esconde a emenda
    legB: part(0, legY, split, fh - legY),
    legF: part(split, legY, fw - split, fh - legY),
    w: fw,
    h: fh,
    cfg,
  };
}

export interface RigState {
  legB: number; // graus (em pé: em volta da pose da imagem; montado: 0 = perna reta para baixo)
  legF: number;
  lean: number; // inclinação do corpo (graus, + = para frente)
  dy: number; // deslocamento vertical (cena)
  squash: number; // 1 = normal
  lie: number; // giro do corpo: 90 = deitado de costas (cabeça para trás), -75 = de bruços
  /** "montado": quadril num ponto fixo (banco, selim, chão). Pernas viram ângulos absolutos. */
  mount?: { x: number; y: number } | null;
  prop?: { kind: 'barbell' | 'dumbbell'; at: [number, number] } | null; // em frações do corpo
  props2?: { kind: 'barbell' | 'dumbbell'; at: [number, number] } | null;
}

const rad = (d: number) => (d * Math.PI) / 180;
const wave = (p: number) => (1 - Math.cos(p * Math.PI * 2)) / 2;

/** Estado do boneco para cada ação. phase = 0..1 do movimento. */
export function rigFor(action: string, phase: number, time: number, cfg: BodyConfig): RigState {
  const s = Math.sin(phase * Math.PI * 2);
  const e = wave(phase);
  const base: RigState = { legB: 0, legF: 0, lean: 0, dy: 0, squash: 1, lie: 0, prop: null };
  const [hx, hy] = cfg.hand;
  const [sx, sy] = cfg.shoulder;
  switch (action) {
    case 'walk':
      return { ...base, legB: -12 * s, legF: 12 * s, dy: -Math.abs(s) * 1.5, lean: 2 * s };
    case 'run':
      return { ...base, legB: -24 * s, legF: 24 * s, dy: -Math.abs(s) * 3 - 5, lean: 8 };
    case 'bike':
      // sentado no selim, pedalando
      return { ...base, mount: { x: -4, y: -24 }, legB: -30 + 16 * s, legF: -30 - 16 * s, lean: 12 };
    case 'squat':
      return { ...base, squash: 1 - 0.2 * e, legB: -6 * e, legF: 6 * e, dy: 0, prop: { kind: 'barbell', at: [sx - 0.15, sy + 0.02] } };
    case 'deadlift':
      return { ...base, lean: 35 * (1 - e), prop: { kind: 'barbell', at: [hx - 0.04, hy + 0.14 * (1 - e)] } };
    case 'row':
      return { ...base, lean: 32, prop: { kind: 'barbell', at: [hx - 0.06, hy + 0.12 - 0.12 * e] } };
    case 'curl':
      return { ...base, lean: -3 * e, prop: { kind: 'dumbbell', at: [hx, hy - 0.2 * e] } };
    case 'press':
      return { ...base, prop: { kind: 'dumbbell', at: [sx + 0.25, sy + 0.05 - 0.3 * e] } };
    case 'fly':
      // voador: os dois braços da máquina se fecham na frente do peito
      return { ...base, lean: -2 * e, prop: { kind: 'dumbbell', at: [0.95 - 0.12 * e, sy + 0.1] }, props2: { kind: 'dumbbell', at: [0.2 + 0.5 * e, sy + 0.1] } };
    case 'pull':
      return { ...base, dy: -8 - 10 * e, legB: 6 * Math.sin(time * 3), legF: -6 * Math.sin(time * 3) };
    case 'bench':
      // deitado de costas no banco, pés no chão, barra sobe e desce acima do peito
      return { ...base, mount: { x: 10, y: -15 }, lie: 55, legB: -10, legF: -22, prop: { kind: 'barbell', at: [0.8 + 0.3 * e, 0.48] } };
    case 'abs':
      // no colchonete: pernas esticadas no chão, tronco sobe
      return { ...base, mount: { x: 8, y: -6 }, lie: 75 - 40 * e, legB: -80, legF: -80 };
    case 'pushup':
      // de bruços: corpo reto, sobe e desce
      return { ...base, mount: { x: -6, y: -7 - 6 * e }, lie: -78 + 10 * e, legB: 80 - 10 * e, legF: 80 - 10 * e };
    case 'stretch':
      return { ...base, lean: 65 * e };
    case 'flex':
      return { ...base, dy: -Math.abs(Math.sin(time * 6)) * 5, squash: 1 + Math.sin(time * 12) * 0.02 };
    case 'sleep':
      return { ...base, mount: { x: 10, y: -15 }, lie: 70, legB: -10, legF: -22, dy: Math.sin(time * 2) * 0.4 };
    default: // idle e descanso: respiração
      return { ...base, squash: 1 + Math.sin(time * 2.5) * 0.012 };
  }
}

/** Desenha o boneco. (x, y) = ponto no chão entre os pés; height = altura na cena. */
export function drawSprite(ctx: CanvasRenderingContext2D, sp: BodySprite, x: number, y: number, facing: 1 | -1, height: number, r: RigState, drawProp: (kind: 'barbell' | 'dumbbell', px: number, py: number) => void) {
  const k = height / sp.h;
  const legH = sp.h * (1 - sp.cfg.legTop) * k;
  const legY = sp.h * sp.cfg.legTop * k; // distância do topo da cabeça até o quadril
  const W = sp.w * k;
  const split = sp.w * sp.cfg.legSplit * k;
  const flip = (sp.cfg.facesRight ? 1 : -1) * facing;
  const [tiltB, tiltF] = sp.cfg.legTilt;
  const wB = (sp.legB.width / sp.w) * W;
  const wF = (sp.legF.width / sp.w) * W;
  // junta do quadril de cada perna (x em relação ao centro do corpo)
  const [pB, pF] = sp.cfg.legPivot;
  const cB = -W / 2 + wB * pB;
  const cF = -W / 2 + split + wF * pF;

  const leg = (cv: HTMLCanvasElement, cx: number, w: number, piv: number, ang: number) => {
    ctx.save();
    ctx.translate(cx, 0);
    ctx.rotate(rad(ang));
    ctx.drawImage(cv, -w * piv, 0, w, legH);
    ctx.restore();
  };
  const upper = () => {
    const upperH = (sp.upper.height / sp.h) * height;
    ctx.drawImage(sp.upper, -W / 2, -legY, W, upperH);
    const P = (p: RigState['prop']) => p && drawProp(p.kind, -W / 2 + p.at[0] * W, -legY + p.at[1] * height);
    P(r.prop);
    P(r.props2);
  };

  ctx.save();
  if (r.mount) {
    // quadril preso num ponto: pernas em ângulo absoluto (0 = para baixo), corpo gira
    ctx.translate(x + r.mount.x * facing, y + r.mount.y + r.dy);
    ctx.scale(flip, 1);
    const mid = (cB + cF) / 2;
    leg(sp.legB, (cB - mid) * 0.6, wB, pB, r.legB - tiltB);
    leg(sp.legF, (cF - mid) * 0.6, wF, pF, r.legF - tiltF);
    ctx.translate(-mid, 0);
    ctx.rotate(rad(-r.lie + r.lean));
    upper();
    ctx.restore();
    return;
  }
  ctx.translate(x, y + r.dy);
  ctx.scale(flip, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, -r.dy, W * 0.42, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(1, r.squash);
  ctx.translate(0, -legH); // origem no quadril
  leg(sp.legB, cB, wB, pB, r.legB);
  leg(sp.legF, cF, wF, pF, r.legF);
  ctx.rotate(rad(r.lean));
  upper();
  ctx.restore();
}
