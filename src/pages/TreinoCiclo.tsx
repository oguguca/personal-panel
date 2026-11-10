// Aba "Ciclo" do Treino: sequência de 1 a 7 treinos, dias de descanso e registro do dia.
import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { EXERCISE_BY_ID } from '../data/exercises';
import { Empty } from '../components/ui';
import { useStore } from '../store/StoreContext';
import { WEEKDAYS_NAME, addDays, formatMedium, formatShort, weekday } from '../store/dates';
import { emptyDay } from '../store/model';
import type { DayKey, Workout } from '../store/types';
import { MAX_ROTATION, forecast, nextAfter, slotLetter, suggestion, trainingConfig, workoutLog } from '../store/training';

/** Ações de registro do dia (usadas aqui e na tela Hoje). */
export function useTrainingActions() {
  const { today, update } = useStore();
  return {
    /** Marca o treino como feito em um dia (hoje por padrão) com os exercícios feitos. */
    done: (workoutId: string, opts: { date?: DayKey; itemIds?: string[] } = {}) =>
      update((d) => {
        const key = opts.date || today;
        // dia que o app não abriu (ex.: esqueceu de marcar ontem): cria o dia vazio
        d.days[key] ||= { ...emptyDay(), init: key !== today };
        d.days[key].training = workoutLog(d.workouts.find((x) => x.id === workoutId), workoutId, Date.now(), opts.itemIds);
      }),
    /** Apaga o registro de treino/descanso de um dia. */
    clear: (date: DayKey) => update((d) => { if (d.days[date]) delete d.days[date].training; }),
    rest: () => update((d) => { d.days[today].training = { type: 'rest', at: Date.now() }; }),
    undo: () => update((d) => { delete d.days[today].training; }),
  };
}

/** Bloco "treino de hoje" (reaproveitado na tela Hoje). */
export function TodayTraining({ compact = false, onOpen }: { compact?: boolean; onOpen?: () => void }) {
  const { data, today } = useStore();
  const act = useTrainingActions();
  const { rotation } = trainingConfig(data);
  const s = suggestion(data, today);
  const nameOf = (id: string | null | undefined) => data.workouts.find((w) => w.id === id)?.name || '—';
  const [check, setCheck] = useState<{ id: string; date?: DayKey } | null>(null);
  const dialog = check && <WorkoutCheck workoutId={check.id} date={check.date} onClose={() => setCheck(null)} />;
  const forgot = (id: string | null | undefined) => (
    <button className="link small" onClick={() => setCheck({ id: id || data.workouts[0].id, date: addDays(today, -1) })} title="Registrar um treino de ontem ou de outro dia">
      Esqueceu de marcar um dia?
    </button>
  );

  if (!data.workouts.length) {
    return <Empty>Monte seus treinos para ver o treino do dia.{onOpen && <> <button className="link" onClick={onOpen}>Montar treino</button></>}</Empty>;
  }

  if (s.logged) {
    const next = s.logged.type === 'workout' ? nextAfter(rotation, s.logged.workoutId) : s.next;
    return (
      <div className="today-train done">
        <div className="today-train-main">
          <span className="today-train-emoji">{s.logged.type === 'workout' ? '✅' : '😴'}</span>
          <div>
            <div className="today-train-title">{s.logged.type === 'workout' ? `Feito: ${s.logged.name || nameOf(s.logged.workoutId)}${s.logged.planned && (s.logged.items?.length ?? 0) < s.logged.planned ? ` (${s.logged.items?.length} de ${s.logged.planned} exercícios)` : ''}` : 'Descanso registrado'}</div>
            <div className="muted small">Próximo da sequência: <strong>{nameOf(next)}</strong></div>
          </div>
        </div>
        <div className="row">
          <button className="btn sm" onClick={act.undo}><Icon name="undo" size={14} /> Desfazer</button>
          {!compact && forgot(s.logged.type === 'workout' ? s.logged.workoutId : next)}
        </div>
        {dialog}
      </div>
    );
  }

  const target = s.rest ? s.next : s.workoutId;
  return (
    <div className="today-train">
      <div className="today-train-main">
        <span className="today-train-emoji">{s.rest ? '😴' : '🏋️'}</span>
        <div>
          <div className="today-train-title">{s.rest ? 'Hoje é dia de descanso' : `Hoje: ${nameOf(target)}`}</div>
          <div className="muted small">
            {s.rest ? <>Se for treinar, o próximo é <strong>{nameOf(target)}</strong>.</> : 'Pela sequência do seu ciclo.'}
          </div>
        </div>
      </div>
      <div className="row">
        <button className="btn primary sm" onClick={() => target && setCheck({ id: target })}>
          <Icon name="check" size={14} /> {s.rest ? `Treinei ${nameOf(target)}` : `Fiz o ${nameOf(target)}`}
        </button>
        {!s.rest && <button className="btn sm" onClick={act.rest}>Descansei</button>}
        {s.rest && <button className="btn sm" onClick={act.rest}>Descansei ✓</button>}
        {!compact && data.workouts.length > 1 && (
          <select className="input sm-select" value="" onChange={(e) => e.target.value && setCheck({ id: e.target.value })} aria-label="Fiz outro treino">
            <option value="">Fiz outro treino…</option>
            {data.workouts.filter((w) => w.id !== target).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        {!compact && forgot(target)}
      </div>
      {dialog}
    </div>
  );
}

export default function TreinoCiclo({ goTab }: { goTab: (tab: string) => void }) {
  const { data, today, update } = useStore();
  const { rotation, restDays } = trainingConfig(data);
  const fc = forecast(data, today, 7);
  const byId: Record<string, Workout | undefined> = Object.fromEntries(data.workouts.map((w) => [w.id, w]));
  const letterOf = (id: string | null | undefined) => slotLetter(id ? rotation.indexOf(id) : -1);

  // grava a sequência efetiva antes de editar (na 1ª vez ela vem da ordem dos treinos)
  const editRotation = (fn: (rotation: string[]) => unknown) =>
    update((d) => {
      const cfg = trainingConfig(d);
      d.training = { ...cfg, rotation: [...cfg.rotation] };
      fn(d.training.rotation);
    });
  const toggleRest = (wd: number) =>
    update((d) => {
      const cfg = trainingConfig(d);
      const set = new Set(cfg.restDays);
      set.has(wd) ? set.delete(wd) : set.add(wd);
      d.training = { ...cfg, restDays: [...set].sort() };
    });

  const unused = data.workouts.filter((w) => !rotation.includes(w.id));
  const recent = Object.keys(data.days)
    .filter((k) => data.days[k].training)
    .sort()
    .reverse()
    .slice(0, 10);

  if (!data.workouts.length) {
    return (
      <div className="card">
        <Empty>
          Primeiro monte seus treinos (A, B, C…).{' '}
          <button className="link" onClick={() => goTab('treinos')}>Ir para Meus treinos</button>
        </Empty>
      </div>
    );
  }

  return (
    <>
      <section className="card">
        <div className="card-head"><h2>Treino de hoje</h2><span className="muted small">{formatMedium(today)}</span></div>
        <TodayTraining />
      </section>

      <section className="card">
        <div className="card-head"><h2>Próximos dias</h2></div>
        <div className="week-strip">
          {fc.map((d, i) => (
            <div key={d.key} className={`week-day ${d.type} ${i === 0 ? 'today' : ''} ${d.done ? 'done' : ''}`}>
              <span className="week-day-name">{i === 0 ? 'Hoje' : WEEKDAYS_NAME[weekday(d.key)]}</span>
              <span className="week-day-date">{formatShort(d.key)}</span>
              {d.type === 'rest' ? (
                <span className="week-day-slot rest">😴</span>
              ) : (
                <span className="week-day-slot">{letterOf(d.workoutId)}</span>
              )}
              <span className="week-day-label">{d.type === 'rest' ? 'Descanso' : byId[d.workoutId ?? '']?.name || '—'}</span>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          A previsão segue o último treino feito. Se você fizer outro treino ou treinar num dia de descanso, ela se ajusta sozinha.
        </p>
      </section>

      <section className="grid">
        <div className="card">
          <div className="card-head">
            <h2>Sequência do ciclo</h2>
            <span className="muted small">{rotation.length} de até {MAX_ROTATION}</span>
          </div>
          <ul className="list">
            {rotation.map((id, i) => (
              <li key={id} className="item">
                <span className="slot-badge">{slotLetter(i)}</span>
                <span className="item-title">{byId[id]?.name}</span>
                <div className="item-actions" style={{ opacity: 1 }}>
                  <button className="icon-btn" title="Subir" disabled={i === 0} onClick={() => editRotation((r) => { [r[i - 1], r[i]] = [r[i], r[i - 1]]; })}><Icon name="up" size={16} /></button>
                  <button className="icon-btn" title="Descer" disabled={i === rotation.length - 1} onClick={() => editRotation((r) => { [r[i + 1], r[i]] = [r[i], r[i + 1]]; })}><Icon name="down" size={16} /></button>
                  <button className="icon-btn danger" title="Tirar da sequência" disabled={rotation.length === 1} onClick={() => editRotation((r) => r.splice(i, 1))}><Icon name="x" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
          {unused.length > 0 && rotation.length < MAX_ROTATION && (
            <select className="input" value="" onChange={(e) => e.target.value && editRotation((r) => r.push(e.target.value))}>
              <option value="">+ Adicionar treino à sequência…</option>
              {unused.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          <p className="muted small" style={{ margin: 0 }}>
            A ordem em que os treinos se repetem (A → B → C → A…). Crie os treinos em “Meus treinos”.
          </p>
        </div>

        <div className="card">
          <div className="card-head"><h2>Dias de descanso</h2></div>
          <div className="chips">
            {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
              <button key={wd} className={`chip ${restDays.includes(wd) ? 'on' : ''}`} onClick={() => toggleRest(wd)}>
                {WEEKDAYS_NAME[wd]}
              </button>
            ))}
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            {restDays.length
              ? `Descanso: ${[1, 2, 3, 4, 5, 6, 0].filter((d) => restDays.includes(d)).map((d) => WEEKDAYS_NAME[d]).join(', ')}. Nesses dias o ciclo pausa e continua no dia seguinte.`
              : 'Sem descanso fixo: o ciclo segue todo dia. Você pode marcar “Descansei” quando quiser.'}
          </p>
        </div>

        <div className="card">
          <div className="card-head"><h2>Últimos registros</h2></div>
          {recent.length ? (
            <ul className="list">
              {recent.map((k) => {
                const t = data.days[k].training!;
                return (
                  <li key={k} className="item food-item">
                    <span className="item-title">{k === today ? 'Hoje' : formatMedium(k)}</span>
                    {t.type === 'rest' ? (
                      <span className="badge">😴 Descanso</span>
                    ) : (
                      <span className="badge primary">{t.name || byId[t.workoutId ?? '']?.name || 'Treino'}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>Nenhum treino registrado ainda.</Empty>
          )}
        </div>
      </section>
    </>
  );
}

/**
 * Painel para confirmar um treino: escolhe o dia (hoje, ontem… para quando esquecer de marcar)
 * e marca quais exercícios foram feitos. Só os marcados contam para XP e evolução das cargas.
 */
export function WorkoutCheck({ workoutId, date: initialDate, onClose }: { workoutId: string; date?: DayKey; onClose: () => void }) {
  const { data, today } = useStore();
  const act = useTrainingActions();
  const [wid, setWid] = useState(workoutId);
  const w = data.workouts.find((x) => x.id === wid);
  const [date, setDate] = useState<DayKey>(initialDate || today);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(w?.items.map((i) => i.id)));
  const existing = data.days[date]?.training;
  const quick: [string, DayKey][] = [['Hoje', today], ['Ontem', addDays(today, -1)], ['Anteontem', addDays(today, -2)]];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickWorkout = (id: string) => {
    setWid(id);
    setChecked(new Set(data.workouts.find((x) => x.id === id)?.items.map((i) => i.id)));
  };
  const toggle = (id: string) => setChecked((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const all = w?.items.length || 0;
  const confirm = () => {
    act.done(wid, { date, itemIds: [...checked] });
    onClose();
  };

  return (
    <div className="wcheck-overlay" role="dialog" aria-modal="true" aria-label="Confirmar treino" onClick={onClose}>
      <div className="card wcheck" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h2>✅ Confirmar treino</h2>
          <button className="icon-btn" onClick={onClose} title="Fechar"><Icon name="x" size={18} /></button>
        </div>

        {data.workouts.length > 1 && (
          <label className="field">
            <span>Treino</span>
            <select className="input" value={wid} onChange={(e) => pickWorkout(e.target.value)}>
              {data.workouts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
        )}

        <div className="field">
          <span>Quando você treinou?</span>
          <div className="chips">
            {quick.map(([label, key]) => (
              <button key={key} type="button" className={`chip ${date === key ? 'on' : ''}`} onClick={() => setDate(key)}>{label}</button>
            ))}
            <input className="input wcheck-date" type="date" max={today} value={date} onChange={(e) => e.target.value && e.target.value <= today && setDate(e.target.value)} aria-label="Outra data" />
          </div>
          <span className="muted small">{formatMedium(date)}</span>
        </div>

        {existing && (
          <div className="wcheck-warn">
            <span>
              Já tem registro nesse dia: <b>{existing.type === 'rest' ? 'descanso' : existing.name || 'treino'}</b>. Confirmar vai substituir.
            </span>
            <button className="btn sm danger" onClick={() => act.clear(date)}>Apagar registro</button>
          </div>
        )}

        <div className="wcheck-head">
          <span>Marque o que você fez <b>({checked.size} de {all})</b></span>
          <button className="link small" onClick={() => setChecked(checked.size === all ? new Set() : new Set(w?.items.map((i) => i.id)))}>
            {checked.size === all ? 'Desmarcar todos' : 'Marcar todos'}
          </button>
        </div>
        {w && w.items.length ? (
          <ul className="wcheck-list">
            {w.items.map((it) => {
              const ex = EXERCISE_BY_ID[it.exId];
              const cardio = ex?.cat === 'Cardio';
              const on = checked.has(it.id);
              return (
                <li key={it.id}>
                  <label className={`wcheck-item ${on ? 'on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(it.id)} />
                    <span className="wcheck-box">{on ? '✓' : ''}</span>
                    <span className="wcheck-name">
                      <b>{ex?.name || it.exId}</b>
                      <span className="muted small">
                        {cardio
                          ? [it.minutes && `${it.minutes} min`, it.distance && `${it.distance} km`].filter(Boolean).join(' · ') || 'cardio'
                          : [`${it.sets || 3}×${it.reps || 10}`, it.weight && `${it.weight} kg`].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>Esse treino não tem exercícios.</Empty>
        )}

        <div className="row">
          <button className="btn primary" onClick={confirm} disabled={!checked.size}>
            <Icon name="check" size={16} /> Confirmar {checked.size < all && checked.size ? `(${checked.size} de ${all})` : ''}
          </button>
          <button className="btn" onClick={onClose}>Cancelar</button>
          {!checked.size && <span className="muted small">Não fez nenhum? Use "Descansei".</span>}
        </div>
      </div>
    </div>
  );
}
