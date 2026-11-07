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
}

export const DEFAULT_BODY: BodyConfig = { legTop: 0.64, legSplit: 0.52, hand: [0.86, 0.58], shoulder: [0.55, 0.2], facesRight: true };

/** Ajustes por imagem (quando o corpo é muito diferente do padrão). */
export const BODY_CONFIG: Record<string, Partial<BodyConfig>> = {
  toguro: { legTop: 0.63, legSplit: 0.52, hand: [0.9, 0.58], shoulder: [0.55, 0.21] },
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
  legB: number; // graus
  legF: number;
  lean: number; // inclinação do corpo (graus, + = para frente)
  dy: number; // deslocamento vertical (cena)
  squash: number; // 1 = normal
  lie: number; // 0 em pé, 90 deitado (cabeça para trás)
  prop?: { kind: 'barbell' | 'dumbbell'; at: [number, number] } | null; // em frações do corpo
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
      return { ...base, legB: -16 * s, legF: 16 * s, dy: -Math.abs(s) * 1.2, lean: 3 };
    case 'run':
      return { ...base, legB: -30 * s, legF: 30 * s, dy: -Math.abs(s) * 3 - 4, lean: 10 };
    case 'bike':
      return { ...base, legB: -22 * s, legF: 22 * s, lean: 12, dy: -3 };
    case 'squat':
      return { ...base, squash: 1 - 0.22 * e, legB: -8 * e, legF: 8 * e, prop: { kind: 'barbell', at: [sx, sy - 0.02] } };
    case 'deadlift':
      return { ...base, lean: 38 * (1 - e), prop: { kind: 'barbell', at: [hx - 0.05, hy + 0.12 * (1 - e)] } };
    case 'row':
      return { ...base, lean: 35, prop: { kind: 'barbell', at: [hx - 0.08, hy + 0.12 - 0.12 * e] } };
    case 'curl':
      return { ...base, lean: -3 * e, prop: { kind: 'dumbbell', at: [hx, hy - 0.2 * e] } };
    case 'press':
      return { ...base, prop: { kind: 'dumbbell', at: [sx + 0.2, sy + 0.02 - 0.28 * e] } };
    case 'pull':
      return { ...base, dy: -14 - 10 * e, legB: 4 * Math.sin(time * 3), legF: -4 * Math.sin(time * 3) };
    case 'bench':
      return { ...base, lie: 90, dy: -10, prop: { kind: 'barbell', at: [1.0 + 0.35 * e, 0.3] } };
    case 'abs':
      return { ...base, lie: 90 - 30 * e, dy: -1 };
    case 'pushup':
      return { ...base, lie: -90, dy: -2 - 5 * e };
    case 'stretch':
      return { ...base, lean: 70 * e };
    case 'flex':
      return { ...base, dy: -Math.abs(Math.sin(time * 6)) * 5, squash: 1 + Math.sin(time * 12) * 0.02 };
    case 'sleep':
      return { ...base, lie: 90, dy: -10 + Math.sin(time * 2) * 0.4 };
    default: // idle e descanso: respiração
      return { ...base, squash: 1 + Math.sin(time * 2.5) * 0.012 };
  }
}

/** Desenha o boneco. (x, y) = ponto no chão entre os pés; height = altura na cena. */
export function drawSprite(ctx: CanvasRenderingContext2D, sp: BodySprite, x: number, y: number, facing: 1 | -1, height: number, r: RigState, drawProp: (kind: 'barbell' | 'dumbbell', px: number, py: number) => void) {
  const k = height / sp.h;
  const legH = sp.h * (1 - sp.cfg.legTop) * k;
  const legY = sp.h * sp.cfg.legTop * k; // altura (de cima) onde começam as pernas
  const split = sp.w * sp.cfg.legSplit * k;
  const W = sp.w * k;
  const flip = (sp.cfg.facesRight ? 1 : -1) * facing;

  ctx.save();
  ctx.translate(x, y + r.dy);
  ctx.scale(flip, 1);
  // sombra
  if (!r.lie) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, -r.dy, W * 0.42, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (r.lie) {
    // deitado: gira o corpo inteiro em volta do quadril
    ctx.translate(0, -legH * 0.4);
    ctx.rotate(rad(-r.lie));
    ctx.translate(0, legH * 0.4);
  }
  ctx.scale(1, r.squash);
  // pernas: giram no quadril (topo de cada pedaço)
  const top = -height; // topo da cabeça
  const hipY = top + legY;
  const leg = (cv: HTMLCanvasElement, left: number, ang: number) => {
    const w2 = (cv.width / sp.w) * W;
    const cx = left + w2 / 2;
    ctx.save();
    ctx.translate(cx, hipY);
    ctx.rotate(rad(ang));
    ctx.drawImage(cv, -w2 / 2, 0, w2, legH);
    ctx.restore();
  };
  leg(sp.legB, -W / 2, r.legB);
  leg(sp.legF, -W / 2 + split, r.legF);
  // corpo: inclina em volta do quadril
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(rad(r.lean));
  ctx.translate(0, -hipY);
  const upperH = (sp.upper.height / sp.h) * height;
  ctx.drawImage(sp.upper, -W / 2, top, W, upperH);
  if (r.prop) drawProp(r.prop.kind, -W / 2 + r.prop.at[0] * W, top + r.prop.at[1] * height);
  ctx.restore();
  ctx.restore();
}
