// Painel do rank da temporada: emblema, pontos, sequência, partidas, escada e temporadas passadas.
import { useEffect, useState, type CSSProperties } from 'react';
import RankEmblem from './RankEmblem';
import { formatShort, parseKey } from '../store/dates';
import { GYM_TIERS } from '../store/game';
import { RANK, TIERS, TOP, comboOf, type Match, type Ranked } from '../store/rank';

const RESULT: Record<Match['result'], { label: string; cls: string }> = {
  win: { label: 'Vitória', cls: 'win' },
  draw: { label: 'Empate', cls: 'draw' },
  loss: { label: 'Derrota', cls: 'loss' },
  rest: { label: 'Descanso', cls: 'rest' },
  live: { label: 'Hoje (em jogo)', cls: 'live' },
};

const tierStyle = (tier: number) => {
  const [light, base, dark] = TIERS[tier].colors;
  return { '--t-light': light, '--t-base': base, '--t-dark': dark } as CSSProperties;
};

export default function RankedPanel({ ranked }: { ranked: Ranked }) {
  const { season, streak, bestStreak, daysLeft, past } = ranked;
  const r = season.rank;
  const nextLabel = r.need ? (r.div > 1 ? `${r.name} ${['', 'I', 'II'][r.div - 1]}` : r.tier + 1 === TIERS.length - 1 ? TIERS[r.tier + 1].name : `${TIERS[r.tier + 1].name} III`) : null;
  const todayMatch = season.matches[season.matches.length - 1];
  const todayXp = todayMatch?.result === 'live' ? todayMatch.xp : 0;
  const toWin = Math.max(0, RANK.activeXp - todayXp);
  const recent = season.matches.slice(-14);
  const [showAll, setShowAll] = useState(false);

  return (
    <section className="card ranked" style={tierStyle(r.tier)}>
      <div className="ranked-hero">
        <div className="ranked-emblem">
          <RankEmblem tier={r.tier} div={r.div} size={150} title={r.label} />
        </div>
        <div className="ranked-info">
          <span className="ranked-season">
            Temporada · {season.name} · {daysLeft ? `termina em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}` : 'último dia!'}
          </span>
          <h2 className="ranked-name">{r.label}</h2>
          <div className="ranked-bar" aria-label={`${r.into} de ${r.need} PR`}>
            <span style={{ width: r.need ? `${(r.into / r.need) * 100}%` : '100%' }} />
          </div>
          <span className="ranked-pr">
            {r.need ? <><b>{r.into}</b> / {r.need} PR · próximo: {nextLabel}</> : <><b>{r.into}</b> PR no topo</>}
          </span>
          <div className="ranked-chips">
            <span className={`ranked-chip ${streak ? 'fire' : ''}`} title="Dias seguidos ativos">
              🔥 {streak} dia{streak === 1 ? '' : 's'} · combo x{comboOf(streak).toFixed(2)}
            </span>
            <span className="ranked-chip">🏆 Pico: {season.peak.label}</span>
            <span className="ranked-chip">⚔️ {season.wins}V · {season.losses}D</span>
            <span className="ranked-chip">⭐ Melhor sequência: {bestStreak}</span>
          </div>
          <span className="ranked-today">
            {toWin
              ? <>Hoje: <b>{todayXp} XP</b>. Faltam <b>{toWin} XP</b> para garantir a vitória do dia.</>
              : <>Vitória de hoje garantida! <b>+{todayMatch?.delta ?? 0} PR</b>. Continue para ganhar mais (até {RANK.maxDay}).</>}
          </span>
        </div>
      </div>

      <div className="ranked-section">
        <h3>Partidas (cada dia é uma)</h3>
        {recent.length ? (
          <div className="matches">
            {recent.map((m) => (
              <div
                key={m.key}
                className={`match ${RESULT[m.result].cls}`}
                title={`${formatShort(m.key)}: ${RESULT[m.result].label} · ${m.xp} XP${m.combo > 1 ? ` · combo x${m.combo.toFixed(2)}` : ''}`}
              >
                <span className="match-day">{parseKey(m.key).getDate()}</span>
                <span className="match-delta">{m.delta > 0 ? '+' : ''}{m.delta}</span>
                {m.change && <span className={`match-change ${m.change}`}>{m.change === 'up' ? '▲' : '▼'}</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted small">Nenhuma partida ainda. Ganhe {RANK.activeXp} XP hoje para a primeira vitória.</p>
        )}
      </div>

      <div className="ranked-section">
        <div className="ranked-section-head">
          <h3>Escada de ranks</h3>
          <button className="ranked-all-btn" onClick={() => setShowAll(true)}>Ver todos os ranks</button>
        </div>
        <div className="ladder">
          {TIERS.map((t, i) => (
            <div key={t.name} className={`ladder-step ${i === r.tier ? 'on' : ''} ${i > r.tier ? 'off' : ''}`}>
              <RankEmblem tier={i} div={i === r.tier ? r.div : i === TIERS.length - 1 ? 0 : 1} size={46} locked={i > r.tier} animate={false} />
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      {past.length > 0 && (
        <div className="ranked-section">
          <h3>Temporadas passadas</h3>
          <div className="past-seasons">
            {past.slice(0, 8).map((s) => (
              <div key={s.id} className="past-season" title={`Pico: ${s.peak.label}`}>
                <RankEmblem tier={s.rank.tier} div={s.rank.div} size={40} animate={false} />
                <div>
                  <b>{s.rank.label}</b>
                  <span className="muted small">{s.name} · {s.wins}V</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAll && <AllRanks current={r.tier} onClose={() => setShowAll(false)} />}

      <details className="ranked-rules">
        <summary>Como funciona o rank</summary>
        <ul className="muted small">
          <li>Cada mês é uma <b>temporada</b>. Cada dia é uma <b>partida</b>.</li>
          <li>Dia com {RANK.activeXp}+ XP = <b>vitória</b>: ganha PR (XP × {RANK.rate}, até {RANK.maxDay} por dia).</li>
          <li>Dias seguidos dão <b>combo</b>: +5% por dia, até +50%.</li>
          <li>Dia parado (menos de {RANK.idleXp} XP) = <b>derrota</b>: −{RANK.loss} PR e a sequência zera. Dia de descanso do treino não conta como derrota.</li>
          <li>{RANK.divPR} PR sobe uma divisão (III → II → I). Depois de I vem o próximo rank. Do Toguro (frango) ao Ganley (topo).</li>
          <li>Nova temporada: reset suave, você começa com {Math.round(RANK.carry * 100)}% dos pontos da anterior.</li>
        </ul>
      </details>
    </section>
  );
}

/** Tela de promoção / rebaixamento / nova temporada. */
export function RankChange({ ranked, kind, onClose }: { ranked: Ranked; kind: 'up' | 'down' | 'season'; onClose: () => void }) {
  const r = ranked.season.rank;
  const title = kind === 'up' ? 'PROMOVIDO!' : kind === 'down' ? 'Rebaixado' : 'Nova temporada!';
  const text =
    kind === 'up'
      ? `Você subiu para ${r.label}. Continue assim!`
      : kind === 'down'
        ? `Você caiu para ${r.label}. Um dia ativo já começa a recuperar.`
        : `${ranked.season.name} começou. Você parte de ${r.label}.`;
  return (
    <div className={`rank-change ${kind}`} role="dialog" aria-modal="true" aria-label={title} style={tierStyle(r.tier)} onClick={onClose}>
      <div className="rank-change-box" onClick={(e) => e.stopPropagation()}>
        <div className="rank-change-burst" />
        <RankEmblem tier={r.tier} div={r.div} size={190} />
        <span className="rank-change-title">{title}</span>
        <b className="rank-change-name">{r.label}</b>
        <p>{text}</p>
        <button className="btn primary" onClick={onClose} autoFocus>Bora!</button>
      </div>
    </div>
  );
}

/** Todos os ranks, do primeiro ao topo, com quanto PR precisa. */
function AllRanks({ current, onClose }: { current: number; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  const perTier = RANK.divisions * RANK.divPR;
  return (
    <div className="all-ranks" role="dialog" aria-modal="true" aria-label="Todos os ranks" onClick={onClose}>
      <div className="all-ranks-box" onClick={(e) => e.stopPropagation()}>
        <div className="all-ranks-head">
          <h2>Todos os ranks</h2>
          <button className="ranked-all-btn" onClick={onClose} autoFocus>Fechar</button>
        </div>
        <div className="all-ranks-grid">
          {TIERS.map((t, i) => (
            <div key={t.name} className={`all-rank ${i === current ? 'on' : ''} ${i === TOP ? 'top' : ''}`} style={tierStyle(i)}>
              <RankEmblem tier={i} div={i === TOP ? 0 : 1} size={i === TOP ? 150 : 110} animate={i === current || i === TOP} />
              <b>{t.name}</b>
              <span>{i === 0 ? 'Começo' : `${(i * perTier).toLocaleString('pt-BR')} PR`}</span>
              <span className="all-rank-gym">Academia: {GYM_TIERS[i].min.toLocaleString('pt-BR')} XP de Força</span>
              {i === current && <span className="all-rank-you">Você está aqui</span>}
              {i === TOP && i !== current && <span className="all-rank-you top">Topo</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
