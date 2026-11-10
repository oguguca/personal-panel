// Desenvolvimento pessoal em modo jogo: personagem, atributos, rank de academia e atividade.
import { useEffect, useMemo, useState } from 'react';
import Hologram from '../components/Hologram';
import RankEmblem from '../components/RankEmblem';
import RankedPanel, { RankChange } from '../components/Ranked';
import { Empty, Progress } from '../components/ui';
import { useStore } from '../store/StoreContext';
import { formatShort } from '../store/dates';
import { ATTR_BY_ID, GYM_TIERS, XP, computeGame } from '../store/game';
import { computeRanked } from '../store/rank';
import { divLabel } from '../store/tiers';
import type { AttrId } from '../store/types';
import type { PageProps } from './types';

const fmtKg = (n: number) => `${Math.round(n).toLocaleString('pt-BR')} kg`;

export default function Evolucao({ go }: PageProps) {
  const { data, today, update } = useStore();
  const game = useMemo(() => computeGame(data, today), [data, today]);
  const ranked = useMemo(() => computeRanked(data, today), [data, today]);
  const [selected, setSelected] = useState<AttrId | null>(null);
  const seen = data.game?.seenLevel ?? 0;
  const levelUp = game.total.level > seen;
  const sel = selected ? game.attrs.find((a) => a.id === selected) : null;
  const events = sel ? game.events.filter((e) => e.attr === sel.id) : game.events;
  const { gym } = game;
  const tier = gym.tier;

  const g = data.game || {};
  const step = ranked.season.rank.step;
  // rankV 2 = divisões III/IV/V. Na primeira vez com a escala nova, aceita a posição sem tela de promoção.
  const rankV = 2;
  useEffect(() => {
    if (g.rankV !== rankV) update((d) => { d.game = { ...(d.game || {}), rankV, seenStep: step, seenSeason: ranked.season.id }; });
  }, [g.rankV, step, ranked.season.id, update]);
  const change: 'up' | 'down' | 'season' | null =
    g.rankV !== rankV ? null
    : g.seenSeason && g.seenSeason !== ranked.season.id ? 'season'
    : g.seenStep === undefined ? (step > 0 ? 'up' : null)
    : step > g.seenStep ? 'up' : step < g.seenStep ? 'down' : null;
  const ackRank = () => update((d) => { d.game = { ...(d.game || {}), seenStep: step, seenSeason: ranked.season.id }; });

  const ackLevel = () => update((d) => { d.game = { ...(d.game || {}), seenLevel: game.total.level }; });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Evolução</h1>
          <p className="muted">
            Rank <b>{ranked.season.rank.label}</b> · Personagem nível {game.total.level} ({game.total.title}) · {game.total.xp.toLocaleString('pt-BR')} XP no total
          </p>
        </div>
      </header>

      {levelUp && (
        <div className="levelup" role="status">
          <span className="levelup-badge">LEVEL UP!</span>
          <span>Você chegou ao <b>nível {game.total.level}</b> ({game.total.title}). Seu personagem evoluiu.</span>
          <button className="btn" onClick={ackLevel}>Boa!</button>
        </div>
      )}

      {change && <RankChange ranked={ranked} kind={change} onClose={ackRank} />}

      <RankedPanel ranked={ranked} />

      <section className="card holo-card">
        <Hologram game={game} selected={selected} onSelect={(id) => setSelected(selected === id ? null : id)} />
        <div className="holo-total">
          <span>Personagem · nível {game.total.level}</span>
          <Progress value={game.total.into} max={game.total.need} />
          <span className="muted small">{game.total.need - game.total.into} XP para o nível {game.total.level + 1}</span>
        </div>
      </section>

      <div className="attr-grid">
        {game.attrs.map((a) => (
          <button key={a.id} className={`card attr-card ${selected === a.id ? 'on' : ''}`} onClick={() => setSelected(selected === a.id ? null : a.id)}>
            <div className="attr-top">
              <span className="attr-emoji">{a.emoji}</span>
              <div className="attr-name">
                <b>{a.name}</b>
                <span className="muted small">Nível {a.level}{a.today ? ` · +${a.today} XP hoje` : ''}</span>
              </div>
              <span className={`attr-rank r-${a.rank}`}>{a.rank}</span>
            </div>
            <Progress value={a.into} max={a.need} variant={a.today ? 'success' : ''} />
            <span className="muted small">{a.how}</span>
          </button>
        ))}
      </div>

      <div className="grid">
        <section className="card">
          <div className="card-head">
            <h2>🏋️ Rank da academia</h2>
            <button className="link" onClick={() => go('treino')}>Treino</button>
          </div>
          <div className="gym-rank">
            <RankEmblem tier={tier.index} div={tier.div} size={84} title={tier.name} />
            <div className="gym-rank-info">
              <b>{divLabel(tier.name, tier.div)}</b>
              <span className="muted small">
                {tier.next ? `${tier.need - tier.into} XP de Força para ${tier.next.name}` : 'Rank máximo!'}
              </span>
              {tier.next && <Progress value={tier.into} max={tier.need} />}
            </div>
          </div>
          <div className="gym-tiers">
            {GYM_TIERS.map((t, i) => (
              <span key={t.name} className={`gym-tier ${i <= tier.index ? 'on' : ''}`} style={{ '--tier': t.color }} title={`${t.name}: ${t.min} XP`} />
            ))}
          </div>
          <div className="gym-stats">
            <div><b>{gym.workouts}</b><span className="muted small">treinos feitos</span></div>
            <div><b>{fmtKg(gym.volume)}</b><span className="muted small">carga total levantada</span></div>
          </div>
          {gym.progress.length ? (
            <ul className="list gym-progress">
              {gym.progress.slice(0, 6).map((p) => (
                <li key={p.exId} className="item">
                  <span className="item-title">{p.name}</span>
                  <span className="muted small">{p.first} → {p.last} kg</span>
                  {p.times > 1 && <span className={`badge ${p.pct > 0 ? 'success' : p.pct < 0 ? 'warning' : ''}`}>{p.pct > 0 ? '+' : ''}{p.pct}%</span>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Marque o treino como feito em Treino → Ciclo. As cargas de cada dia ficam guardadas e o rank sobe com a sua evolução.</Empty>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>{sel ? `${sel.emoji} ${sel.name}` : '⚡ Atividade recente'}</h2>
            {sel && <button className="link" onClick={() => setSelected(null)}>Ver tudo</button>}
          </div>
          {events.length ? (
            <ul className="list xp-list">
              {events.slice(0, 12).map((e, i) => (
                <li key={i} className="item">
                  <span>{ATTR_BY_ID[e.attr].emoji}</span>
                  <span className="item-title">{e.label}</span>
                  <span className="muted small">{e.key === today ? 'hoje' : formatShort(e.key)}</span>
                  <span className="badge primary">+{e.xp} XP</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nada ainda. Faça uma tarefa com atributo para ganhar XP.</Empty>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>Como ganhar XP</h2></div>
        <ul className="xp-rules muted small">
          <li>Tarefa com atributo (escolha em <button className="link" onClick={() => go('tarefas')}>Tarefas</button>): <b>+{XP.task} XP</b> naquele atributo. Sem atributo: +{XP.taskPlain} em Disciplina.</li>
          <li>Água: +{XP.waterMin} ao bater o mínimo e +{XP.waterIdeal} no ideal. Cada refeição feita: +{XP.meal}. Tudo vai para Vitalidade.</li>
          <li>Treino feito: +{XP.workout} de Força, mais um bônus pela carga levantada. Cardio e pernas dão Resistência.</li>
          <li>Metas do dia (+{XP.goal} cada) e meta da renda (+{XP.record}) dão Disciplina.</li>
          <li>
            <button className="link" onClick={() => go('calendario')}>Calendário</button>: corrida marcada como feita dá +{XP.race} de Resistência
            (+{XP.raceKm} por km); compromisso cumprido dá +{XP.event} de Disciplina.
          </li>
          <li>
            <button className="link" onClick={() => go('corrida')}>Corrida</button>: cada corrida registrada dá +{XP.run} de Resistência (+{XP.runKm} por km).
          </li>
          <li>Ranks dos atributos: E → D → C → B → A → S. Quanto maior o nível geral, mais forte a aura do personagem.</li>
        </ul>
      </section>
    </div>
  );
}
