// Mini-jogo 2D: o personagem do seu rank refaz, na academia, o último treino que você marcou como feito.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { usePortrait } from './RankEmblem';
import { formatShort } from '../store/dates';
import { dayGains } from '../store/game';
import { TIERS, tierSlug } from '../store/tiers';
import type { Data, DayKey } from '../store/types';
import { buildPlan, lastWorkout, movesOf, planLength, STATIONS, stepAt, type Move } from '../game/gym';
import { buildSprite, BODY_CONFIG, DEFAULT_BODY, drawSprite, rigFor, type BodySprite } from '../game/sprite';
import { GROUND, H, W, drawProp, drawBubble, drawConfetti, drawHero, drawRoom, drawStations, drawSweat, frameAt, poseAt, type Look } from '../game/draw';

const SCALE = 3; // resolução interna (nitidez)
const SPEEDS = [1, 2, 4];
const ZOOM = 1.7; // câmera aproximada que segue o personagem

/** Recorte do rosto dentro da imagem do rank: [centro x, centro y, tamanho] (frações). */
const FACE: Record<string, [number, number, number]> = {
  cbum: [0.5, 0.17, 0.24],
};
const DEFAULT_FACE: [number, number, number] = [0.5, 0.48, 0.72];

function useFaceLook(tier: number) {
  const slug = tierSlug(TIERS[tier].name);
  const url = usePortrait(slug);
  const [look, setLook] = useState<Pick<Look, 'face' | 'skin'>>({ face: null, skin: '#d9a066' });
  useEffect(() => {
    if (!url) {
      setLook({ face: null, skin: '#d9a066' });
      return;
    }
    const img = new Image();
    img.onload = () => {
      const [cx, cy, fs] = FACE[slug] || DEFAULT_FACE;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const s = fs * Math.min(w, h);
      const face = { img, sx: cx * w - s / 2, sy: cy * h - s / 2, s };
      // cor da pele: média de um pedacinho do rosto (bochecha/queixo)
      let skin = '#d9a066';
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 8;
        const g = c.getContext('2d')!;
        g.drawImage(img, cx * w - s * 0.12, cy * h + s * 0.02, s * 0.24, s * 0.16, 0, 0, 8, 8);
        const d = g.getImageData(0, 0, 8, 8).data;
        let r = 0, gg = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4;
        const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
        skin = `#${hex(r)}${hex(gg)}${hex(b)}`;
      } catch {
        /* imagem sem permissão de leitura: usa a cor padrão */
      }
      setLook({ face, skin });
    };
    img.src = url;
  }, [url, slug]);
  return look;
}

const BODY_H = 74; // altura do boneco de corpo inteiro na cena

/** Boneco de corpo inteiro do rank (public/ranks/<rank>-corpo.png), se existir. */
function useBodySprite(tier: number) {
  const slug = tierSlug(TIERS[tier].name);
  const url = usePortrait(`${slug}-corpo`);
  const [sprite, setSprite] = useState<BodySprite | null>(null);
  useEffect(() => {
    setSprite(null);
    if (!url) return;
    const img = new Image();
    img.onload = () => setSprite(buildSprite(img, { ...DEFAULT_BODY, ...(BODY_CONFIG[slug] || {}) }));
    img.src = url;
  }, [url, slug]);
  return sprite;
}

interface Hud {
  index: number;
  set: number;
  rep: number;
  kind: string;
}

export default function GymGame({ data, today, tier, onGoTreino }: { data: Data; today: DayKey; tier: number; onGoTreino: () => void }) {
  const last = useMemo(() => lastWorkout(data, today), [data, today]);
  // só recomeça o jogo quando o TREINO muda (não a cada alteração qualquer nos dados)
  const sig = last ? last.key + JSON.stringify(last.items) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const moves = useMemo<Move[]>(() => (last ? movesOf(last.items) : []), [sig]);
  const plan = useMemo(() => buildPlan(moves), [moves]);
  const total = useMemo(() => planLength(plan), [plan]);
  const restToday = data.days[today]?.training?.type === 'rest';
  const xp = useMemo(() => {
    if (!last) return 0;
    return dayGains(data, last.key).gains.filter((g) => g.attr === 'forca' || g.attr === 'resist').reduce((s, g) => s + g.xp, 0);
  }, [data, last]);

  const faceLook = useFaceLook(tier);
  const [light, base, dark] = TIERS[tier].colors;
  const look: Look = { ...faceLook, shirt: base, shirtDark: dark, bulk: tier / (TIERS.length - 1), tier, top: tier === TIERS.length - 1 };
  const lookRef = useRef(look);
  lookRef.current = look;
  const sprite = useBodySprite(tier);
  const spriteRef = useRef(sprite);
  spriteRef.current = sprite;

  const canvas = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(!restToday);
  const [speed, setSpeed] = useState(1);
  const [hud, setHud] = useState<Hud>({ index: 0, set: 0, rep: 0, kind: 'intro' });
  const [progress, setProgress] = useState(0);
  const tRef = useRef(0);
  const ctl = useRef({ playing, speed });
  ctl.current = { playing, speed };

  // recomeça quando muda o treino
  useEffect(() => {
    tRef.current = 0;
    setPlaying(!restToday && moves.length > 0);
  }, [plan, restToday, moves.length]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    let raf = 0;
    let prev = performance.now();
    let lastHud = '';
    /** desenha o boneco de corpo inteiro (se houver) ou o chibi. Devolve a altura do topo da cabeça. */
    const hero = (x: number, facing: 1 | -1, action: string, phase: number, pose: ReturnType<typeof poseAt>, kg: number, time: number) => {
      const sp = spriteRef.current;
      const lk = lookRef.current;
      if (sp) {
        const r = rigFor(action, phase, time, sp.cfg);
        drawSprite(ctx, sp, x, GROUND, facing, BODY_H, r, (kind, px, py) => drawProp(ctx, kind, px, py, kg));
        return GROUND - BODY_H + r.dy - (r.lie ? -BODY_H * 0.55 : 0);
      }
      drawHero(ctx, x, GROUND, facing, pose, lk, kg, time);
      return GROUND + Math.min(pose.head[1], pose.hip[1]) - 10;
    };
    let camX = W / 2;
    const camera = (target: number, dt: number) => {
      camX += (target - camX) * Math.min(1, dt * 3);
      const vw = W / ZOOM;
      const left = Math.max(0, Math.min(W - vw, camX - vw / 2));
      const top = H - H / ZOOM;
      const k = SCALE * ZOOM;
      ctx.setTransform(k, 0, 0, k, -left * k, -top * k);
    };
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      const time = now / 1000;
      const { playing: on, speed: sp } = ctl.current;
      if (on && moves.length) tRef.current = Math.min(total, tRef.current + dt * sp);
      const lk = lookRef.current;

      ctx.imageSmoothingEnabled = true;
      const sleeping = !moves.length || (restToday && !on && tRef.current === 0);
      const target = sleeping ? (restToday ? STATIONS.bench : W / 2) : frameAt(plan, moves, tRef.current, time).x;
      camera(target, dt);
      drawRoom(ctx, lk.shirt, time);

      if (sleeping) {
        drawStations(ctx, null, 0, time);
        if (restToday) {
          const x = STATIONS.bench;
          hero(x, 1, 'sleep', 0, poseAt('sleep', 0, time), 0, time);
          ctx.fillStyle = '#c7d2fe';
          ctx.font = 'bold 8px "Courier New", monospace';
          for (let i = 0; i < 3; i++) {
            const k = (time * 0.6 + i / 3) % 1;
            ctx.globalAlpha = 1 - k;
            ctx.fillText('z', x - 16 + k * 10 + i * 3, GROUND - 22 - k * 20);
          }
          ctx.globalAlpha = 1;
        } else {
          hero(W / 2, 1, 'idle', 0, poseAt('idle', 0, time), 0, time);
        }
      } else {
        const t = tRef.current;
        const f = frameAt(plan, moves, t, time);
        const busy = f.kind === 'set' || f.kind === 'rest' ? f.move!.station : null;
        drawStations(ctx, f.kind === 'set' ? busy : null, f.move?.weight || 0, time);
        // no supino a barra fica com ele; no descanso volta para o suporte
        const pose = f.kind === 'rest' ? { ...f.pose, prop: null } : f.pose;
        const kg = f.move?.weight || 0;
        const topY = hero(f.x, f.facing, f.kind === 'rest' ? 'idle' : f.action, f.phase, pose, kg, time);
        if (f.kind === 'set' && f.move) {
          const headY = topY - 6;
          const hx = spriteRef.current ? 0 : pose.head[0];
          const label = f.move.reps ? `${f.rep}` : f.move.minutes ? `${Math.round(f.move.minutes * stepAt(plan, t).local)} min` : '';
          if (label) drawBubble(ctx, f.x + hx, headY, label, lk.shirt);
          if (f.rep >= Math.ceil(f.move.reps / 2) || !f.move.reps) drawSweat(ctx, f.x + hx, headY + 10, time);
        }
        if (f.kind === 'rest') drawBubble(ctx, f.x, GROUND - 58, 'descanso…', '#94a3b8');
        if (f.kind === 'done') drawConfetti(ctx, time);

        const { index } = stepAt(plan, t);
        const step = plan[index];
        const h = { index: 'move' in step ? step.move : f.kind === 'done' ? moves.length : 0, set: f.set, rep: f.rep, kind: f.kind };
        const key = `${h.index}|${h.set}|${h.rep}|${h.kind}`;
        if (key !== lastHud) {
          lastHud = key;
          setHud(h);
          setProgress(t / total);
        }
        if (t >= total && on) setPlaying(false);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [plan, moves, total, restToday]);

  const cur = hud.kind !== 'done' && hud.kind !== 'intro' ? moves[hud.index] : null;
  const finished = hud.kind === 'done';
  const replay = () => {
    tRef.current = 0;
    setPlaying(true);
  };
  const skip = () => {
    tRef.current = total;
    setPlaying(true);
  };
  const style = { '--t-light': light, '--t-base': base, '--t-dark': dark } as CSSProperties;

  return (
    <section className="card gym-game" style={style}>
      <div className="gym-screen">
        <canvas ref={canvas} width={W * SCALE} height={H * SCALE} aria-label="Academia: o personagem faz o seu último treino" />

        <div className="gym-hud-top">
          {last ? (
            <span className="gym-chip">🏋️ {last.name} · {last.key === today ? 'hoje' : formatShort(last.key)}</span>
          ) : (
            <span className="gym-chip">🏋️ Academia</span>
          )}
          <span className="gym-chip rank">{TIERS[tier].name}</span>
        </div>

        {cur && (
          <div className="gym-hud-move">
            <b>{cur.name}</b>
            <span>
              {cur.reps
                ? <>Série {hud.set || 1}/{cur.sets} · Rep {hud.kind === 'set' ? hud.rep : 0}/{cur.reps}{cur.weight ? ` · ${cur.weight} kg` : ''}</>
                : <>{cur.minutes ? `${cur.minutes} min` : 'Cardio'}</>}
              {hud.kind === 'walk' && ' · indo para o aparelho'}
            </span>
          </div>
        )}

        {finished && (
          <div className="gym-done">
            <span>TREINO CONCLUÍDO!</span>
            {xp > 0 && <b>+{xp} XP</b>}
          </div>
        )}

        {!moves.length && !restToday && (
          <div className="gym-empty">
            <b>Nenhum treino feito ainda</b>
            <span>Marque um treino como feito e o seu personagem vai repetir ele aqui.</span>
            <button className="btn primary" onClick={onGoTreino}>Ir para Treino</button>
          </div>
        )}
        {restToday && progress === 0 && !playing && (
          <div className="gym-hud-move">
            <b>Dia de descanso 😴</b>
            <span>Músculo cresce no descanso.</span>
          </div>
        )}
      </div>

      {moves.length > 0 && (
        <div className="gym-controls">
          <button className="btn" onClick={() => (finished || progress >= 1 ? replay() : setPlaying(!playing))}>
            {playing && !finished ? '⏸ Pausar' : finished || progress >= 1 ? '↻ Treinar de novo' : restToday && progress === 0 ? '▶ Ver último treino' : '▶ Continuar'}
          </button>
          <div className="segmented">
            {SPEEDS.map((s) => (
              <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>{s}x</button>
            ))}
          </div>
          <button className="btn" onClick={skip} disabled={finished}>Pular ⏭</button>
          <div className="gym-progress"><span style={{ width: `${progress * 100}%` }} /></div>
        </div>
      )}

      {moves.length > 0 && (
        <div className="gym-moves">
          {moves.map((m, i) => (
            <span key={i} className={`gym-move ${i < hud.index || finished ? 'done' : i === hud.index && hud.kind !== 'intro' ? 'on' : ''}`}>
              {i < hud.index || finished ? '✓ ' : ''}{m.name}
              <small>{m.reps ? `${m.sets}×${m.reps}${m.weight ? ` · ${m.weight} kg` : ''}` : m.minutes ? `${m.minutes} min` : ''}</small>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
