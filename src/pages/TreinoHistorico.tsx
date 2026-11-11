// Aba "Histórico" do Treino: todos os treinos marcados como feitos, do mais novo ao mais antigo.
import { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { Empty } from '../components/ui';
import { EXERCISE_BY_ID } from '../data/exercises';
import { useStore } from '../store/StoreContext';
import { formatMedium, parseKey } from '../store/dates';
import { XP, itemVolume, num, planKg, setsOf, trainingItems } from '../store/game';
import type { Data, DayKey, TrainingLog } from '../store/types';
import { WorkoutCheck, describeItem, useTrainingActions } from './TreinoCiclo';

const isCardio = (exId: string) => EXERCISE_BY_ID[exId]?.cat === 'Cardio';

/** Números de um treino feito: séries, volume (kg), minutos de cardio e XP de Força. */
function statsOf(data: Data, t: TrainingLog) {
  let sets = 0;
  let volume = 0;
  let cardio = 0;
  for (const it of trainingItems(data, t)) {
    if (isCardio(it.exId)) {
      cardio += num(it.minutes);
      continue;
    }
    sets += setsOf(it);
    volume += itemVolume(it, it.noWeight ? planKg(data, it.exId) : 0);
  }
  return { sets, volume: Math.round(volume), cardio: Math.round(cardio), xp: Math.round(XP.workout + Math.min(50, volume / 200)) };
}

const monthOf = (key: DayKey) => {
  const s = parseKey(key).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const fmtVolume = (kg: number) =>
  kg >= 10000 ? `${(kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t` : `${kg.toLocaleString('pt-BR')} kg`;

export default function TreinoHistorico() {
  const { data, today } = useStore();
  const act = useTrainingActions();
  const [filter, setFilter] = useState<string>('all');
  const [edit, setEdit] = useState<{ id: string; date: DayKey } | null>(null);
  const [open, setOpen] = useState<Set<DayKey>>(new Set());

  const logs = useMemo(
    () =>
      Object.keys(data.days)
        .filter((k) => k <= today && data.days[k].training?.type === 'workout')
        .sort()
        .reverse()
        .map((k) => ({ key: k, t: data.days[k].training!, ...statsOf(data, data.days[k].training!) })),
    [data, today],
  );
  const nameOf = (t: TrainingLog) => t.name || data.workouts.find((w) => w.id === t.workoutId)?.name || 'Treino';
  const kindOf = (t: TrainingLog) => t.workoutId || nameOf(t);
  const kinds = [...new Map(logs.map((l) => [kindOf(l.t), nameOf(l.t)])).entries()];
  const shown = filter === 'all' ? logs : logs.filter((l) => kindOf(l.t) === filter);

  const thisMonth = logs.filter((l) => l.key.startsWith(today.slice(0, 7))).length;
  const totalVolume = shown.reduce((s, l) => s + l.volume, 0);
  const totalSets = shown.reduce((s, l) => s + l.sets, 0);

  const groups: [string, typeof shown][] = [];
  for (const l of shown) {
    const m = monthOf(l.key);
    const g = groups[groups.length - 1];
    if (g && g[0] === m) g[1].push(l);
    else groups.push([m, [l]]);
  }

  const toggle = (k: DayKey) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const remove = (k: DayKey) => {
    if (confirm(`Apagar o treino de ${formatMedium(k)}? O XP desse dia sai junto.`)) act.clear(k);
  };

  if (!logs.length) {
    return (
      <div className="card">
        <Empty>Nenhum treino marcado ainda. Quando você confirmar um treino ("Já fiz"), ele aparece aqui.</Empty>
      </div>
    );
  }

  return (
    <>
      {edit && <WorkoutCheck workoutId={edit.id} date={edit.date} onClose={() => setEdit(null)} />}

      <section className="hist-stats">
        <div className="hist-stat"><b>{logs.length}</b><span>treinos no total</span></div>
        <div className="hist-stat"><b>{thisMonth}</b><span>neste mês</span></div>
        <div className="hist-stat"><b>{totalSets.toLocaleString('pt-BR')}</b><span>séries{filter !== 'all' ? ' (filtro)' : ''}</span></div>
        <div className="hist-stat"><b>{fmtVolume(totalVolume)}</b><span>de volume levantado</span></div>
      </section>

      {kinds.length > 1 && (
        <div className="chips">
          <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>Todos ({logs.length})</button>
          {kinds.map(([id, name]) => (
            <button key={id} className={`chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>
              {name} ({logs.filter((l) => kindOf(l.t) === id).length})
            </button>
          ))}
        </div>
      )}

      {groups.map(([m, list]) => (
        <section key={m} className="hist-month">
          <h3 className="hist-month-title">
            {m} <span className="muted small">· {list.length} treino{list.length > 1 ? 's' : ''}</span>
          </h3>
          <div className="hist-list">
            {list.map(({ key, t, sets, volume, cardio, xp }) => {
              const items = trainingItems(data, t);
              const isOpen = open.has(key);
              const d = parseKey(key);
              const swapName = t.swap ? data.workouts.find((w) => w.id === t.swap)?.name || 'o treino da vez' : '';
              return (
                <article key={key} className={`card hist-card ${isOpen ? 'open' : ''}`}>
                  <button className="hist-top" onClick={() => toggle(key)} aria-expanded={isOpen}>
                    <span className="hist-date">
                      <b>{d.getDate()}</b>
                      <span>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                    </span>
                    <span className="hist-main">
                      <b className="hist-name">
                        {nameOf(t)}
                        {key === today && <span className="badge primary">Hoje</span>}
                      </b>
                      <span className="hist-nums">
                        <span>
                          {items.length}
                          {t.planned && items.length < t.planned ? ` de ${t.planned}` : ''} exercício{(t.planned || items.length) === 1 ? '' : 's'}
                        </span>
                        {sets > 0 && <span>{sets} séries</span>}
                        {volume > 0 && <span>{fmtVolume(volume)}</span>}
                        {cardio > 0 && <span>{cardio} min de cardio</span>}
                      </span>
                      {t.swap && <span className="hist-swap">🔁 Trocou: {swapName} ficou para depois</span>}
                    </span>
                    <span className="hist-xp">+{xp} XP</span>
                    <span className={`hist-chev ${isOpen ? 'up' : ''}`}><Icon name="down" size={18} /></span>
                  </button>

                  {isOpen && (
                    <div className="hist-body">
                      <ul className="hist-ex">
                        {items.map((it, i) => (
                          <li key={i}>
                            <span className="hist-ex-name">{EXERCISE_BY_ID[it.exId]?.name || it.exId}</span>
                            {it.done?.length ? (
                              <span className="hist-sets">
                                {it.done.map((s, j) => (
                                  <span key={j} className="hist-set" title={`Série ${j + 1}`}>
                                    {s.reps}
                                    <small>×</small>
                                    {s.kg === null ? '?' : s.kg}
                                    {s.kg !== null && <small>kg</small>}
                                  </span>
                                ))}
                                {it.noWeight && <span className="muted small">não lembrou o peso</span>}
                              </span>
                            ) : (
                              <span className="muted small">
                                {describeItem(it)}
                                {isCardio(it.exId) ? '' : ' (do plano)'}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="row">
                        {t.workoutId && data.workouts.some((w) => w.id === t.workoutId) && (
                          <button className="btn sm" onClick={() => setEdit({ id: t.workoutId!, date: key })}>
                            <Icon name="edit" size={14} /> Editar
                          </button>
                        )}
                        <button className="btn sm danger" onClick={() => remove(key)}>
                          <Icon name="trash" size={14} /> Apagar
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
