// Aba "Ciclo" do Treino: sequência de 1 a 7 treinos, dias de descanso e registro do dia.
import { Fragment, useEffect, useState } from 'react';
import ExercisePreview, { hasPreview } from '../components/ExercisePreview';
import Icon from '../components/Icon';
import { EXERCISE_BY_ID } from '../data/exercises';
import { Empty } from '../components/ui';
import { useStore } from '../store/StoreContext';
import { WEEKDAYS_NAME, addDays, formatMedium, formatShort, weekday } from '../store/dates';
import { emptyDay } from '../store/model';
import { num, repsOf, setsOf, itemVolume, XP } from '../store/game';
import type { Data, DayKey, LoggedItem, Workout, WorkoutItem } from '../store/types';
import { MAX_ROTATION, dueOn, forecast, slotLetter, suggestion, trainingConfig, workoutLog, type ItemEntry } from '../store/training';

/** Ações de registro do dia (usadas aqui e na tela Hoje). */
export function useTrainingActions() {
  const { today, update } = useStore();
  return {
    /** Marca o treino como feito em um dia (hoje por padrão) com os exercícios feitos. */
    done: (workoutId: string, opts: { date?: DayKey; itemIds?: string[]; entries?: Record<string, ItemEntry>; swap?: string } = {}) =>
      update((d) => {
        const key = opts.date || today;
        // dia que o app não abriu (ex.: esqueceu de marcar ontem): cria o dia vazio
        d.days[key] ||= { ...emptyDay(), init: key !== today };
        d.days[key].training = workoutLog(d.workouts.find((x) => x.id === workoutId), workoutId, Date.now(), opts.itemIds, opts.entries, opts.swap);
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
    const next = s.next;
    return (
      <div className="today-train done">
        <div className="today-train-main">
          <span className={`today-train-emoji ${s.logged.type === 'workout' ? 'ok' : 'rest'}`}><Icon name={s.logged.type === 'workout' ? 'check' : 'moon'} size={22} /></span>
          <div>
            <div className="today-train-title">{s.logged.type === 'workout' ? `Feito: ${s.logged.name || nameOf(s.logged.workoutId)}${s.logged.planned && (s.logged.items?.length ?? 0) < s.logged.planned ? ` (${s.logged.items?.length} de ${s.logged.planned} exercícios)` : ''}` : 'Descanso registrado'}</div>
            <div className="muted small">
              {s.logged.swap ? <><Icon name="repeat" size={13} /> Trocou a ordem: <strong>{nameOf(s.logged.swap)}</strong> fica para o próximo treino.</> : <>Próximo da sequência: <strong>{nameOf(next)}</strong></>}
            </div>
            {s.logged.type === 'workout' && <LoggedSummary items={s.logged.items} />}
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
        <span className={`today-train-emoji ${s.rest ? 'rest' : ''}`}><Icon name={s.rest ? 'moon' : 'treino'} size={22} /></span>
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
                <span className="week-day-slot rest"><Icon name="moon" size={18} /></span>
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
                      <span className="badge"><Icon name="moon" size={12} /> Descanso</span>
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

/** Resumo curto do que foi feito: "Supino 3×10 · até 50 kg". */
function LoggedSummary({ items }: { items?: LoggedItem[] }) {
  const done = (items || []).filter((i) => i.done?.length || (EXERCISE_BY_ID[i.exId]?.cat === 'Cardio' && num(i.minutes)));
  if (!done.length) return null;
  return (
    <div className="logged-sum">
      {done.slice(0, 6).map((i, k) => (
        <span key={k} className="badge">{EXERCISE_BY_ID[i.exId]?.name || i.exId}: {describeItem(i)}</span>
      ))}
      {done.length > 6 && <span className="badge">+{done.length - 6}</span>}
    </div>
  );
}

/** "3×10 · até 50 kg", "3×10 · peso ?" ou "35 min · 5 km". */
export function describeItem(i: LoggedItem) {
  if (EXERCISE_BY_ID[i.exId]?.cat === 'Cardio') return [num(i.minutes) && `${num(i.minutes)} min`, num(i.distance) && `${num(i.distance)} km`].filter(Boolean).join(' · ') || 'cardio';
  const reps = i.done?.length ? [...new Set(i.done.map((x) => x.reps))].join('/') : i.reps || 10;
  const kg = i.noWeight ? 'peso ?' : num(i.weight) ? `${i.done && new Set(i.done.map((x) => x.kg)).size > 1 ? 'até ' : ''}${num(i.weight)} kg` : '';
  return [`${setsOf(i)}×${reps}`, kg].filter(Boolean).join(' · ');
}

interface SetDraft { reps: string; kg: string }
interface Draft { sets: SetDraft[]; noWeight: boolean; minutes: string; km: string }

/** Últimas séries feitas desse exercício antes do dia (para já vir preenchido). */
function lastLogged(data: Data, exId: string, before: DayKey): LoggedItem | null {
  const keys = Object.keys(data.days).filter((k) => k < before).sort().reverse();
  for (const k of keys) {
    const t = data.days[k].training;
    const it = t?.type === 'workout' ? t.items?.find((x) => x.exId === exId && (x.done?.length || x.minutes)) : undefined;
    if (it) return it;
  }
  return null;
}

/** Rascunho inicial: o que já foi salvo nesse dia > última vez > o plano do treino. */
function draftFor(it: WorkoutItem, saved: LoggedItem | undefined, last: LoggedItem | null): Draft {
  const src = saved || last;
  const str = (v: unknown) => (num(v) ? String(num(v)) : '');
  if (src?.done?.length) {
    return {
      sets: src.done.map((x) => ({ reps: String(x.reps), kg: x.kg === null ? '' : String(x.kg) })),
      noWeight: !!saved?.noWeight,
      minutes: str(src.minutes ?? it.minutes),
      km: str(src.distance ?? it.distance),
    };
  }
  const n = Math.min(12, num(it.sets) || 3);
  const reps = String(Math.round(repsOf(it.reps)) || 10);
  return {
    sets: Array.from({ length: n }, () => ({ reps, kg: str(it.weight) })),
    noWeight: false,
    minutes: str(saved?.minutes ?? last?.minutes ?? it.minutes),
    km: str(saved?.distance ?? last?.distance ?? it.distance),
  };
}

const toEntry = (d: Draft, cardio: boolean): ItemEntry =>
  cardio
    ? { minutes: num(d.minutes), km: num(d.km) }
    : { sets: d.sets.map((x) => ({ reps: Math.round(num(x.reps)), kg: d.noWeight || x.kg.trim() === '' ? null : num(x.kg) })), noWeight: d.noWeight };

/**
 * Painel para confirmar um treino: escolhe o dia (hoje, ontem… para quando esquecer de marcar),
 * marca quais exercícios foram feitos e anota as séries (repetições e peso de cada uma) e o tempo do cardio.
 * Se fizer outro treino no lugar do da vez, pergunta se é troca (o da vez fica para o próximo) ou se segue dali.
 */
export function WorkoutCheck({ workoutId, date: initialDate, onClose }: { workoutId: string; date?: DayKey; onClose: () => void }) {
  const { data, today } = useStore();
  const act = useTrainingActions();
  const [wid, setWid] = useState(workoutId);
  const w = data.workouts.find((x) => x.id === wid);
  const [date, setDate] = useState<DayKey>(initialDate || today);
  const existing = data.days[date]?.training;
  const quick: [string, DayKey][] = [['Hoje', today], ['Ontem', addDays(today, -1)], ['Anteontem', addDays(today, -2)]];
  const isCardio = (exId: string) => EXERCISE_BY_ID[exId]?.cat === 'Cardio';

  const initDrafts = (id: string) => {
    const wk = data.workouts.find((x) => x.id === id);
    const saved = existing?.type === 'workout' && existing.workoutId === id ? existing.items : undefined;
    return Object.fromEntries((wk?.items || []).map((it) => [it.id, draftFor(it, saved?.find((x) => x.exId === it.exId), lastLogged(data, it.exId, date))]));
  };
  const initChecked = (id: string) => {
    const wk = data.workouts.find((x) => x.id === id);
    const saved = existing?.type === 'workout' && existing.workoutId === id ? existing.items : undefined;
    return new Set((wk?.items || []).filter((it) => !saved || saved.some((x) => x.exId === it.exId)).map((i) => i.id));
  };
  const [checked, setChecked] = useState<Set<string>>(() => initChecked(workoutId));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => initDrafts(workoutId));

  // treino que era a vez nesse dia: se fizer outro, pergunta se é troca
  const { rotation } = trainingConfig(data);
  const due = dueOn(data, date);
  const canSwap = !!due && due !== wid && rotation.includes(wid);
  const [swap, setSwap] = useState(existing?.type === 'workout' && existing.workoutId === workoutId ? !!existing.swap : true);
  const dueName = data.workouts.find((x) => x.id === due)?.name || '—';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickWorkout = (id: string) => {
    setWid(id);
    setChecked(initChecked(id));
    setDrafts(initDrafts(id));
  };
  const toggle = (id: string) => setChecked((cur) => {
    const n = new Set(cur);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const edit = (id: string, fn: (d: Draft) => Draft) => setDrafts((cur) => ({ ...cur, [id]: fn(cur[id]) }));
  const setSet = (id: string, i: number, field: keyof SetDraft, v: string) =>
    edit(id, (d) => {
      const old = d.sets[i][field];
      // mudar o peso de uma série leva junto as de baixo que estavam iguais (dá para mudar uma por uma depois)
      const sets = d.sets.map((x, j) => (j === i || (field === 'kg' && j > i && x.kg === old) ? { ...x, [field]: v } : x));
      return { ...d, sets };
    });
  const addSet = (id: string) => edit(id, (d) => ({ ...d, sets: [...d.sets, { ...(d.sets[d.sets.length - 1] || { reps: '10', kg: '' }) }] }));
  const removeSet = (id: string, i: number) => edit(id, (d) => ({ ...d, sets: d.sets.filter((_, j) => j !== i) }));

  const items = w?.items || [];
  const all = items.length;
  const entries = Object.fromEntries(items.filter((it) => checked.has(it.id) && drafts[it.id]).map((it) => [it.id, toEntry(drafts[it.id], isCardio(it.exId))]));
  const preview = workoutLog(w, wid, 0, [...checked], entries);
  const volume = (preview.items || []).filter((i) => !isCardio(i.exId)).reduce((sum, i) => sum + itemVolume(i, i.noWeight ? num(items.find((x) => x.exId === i.exId)?.weight) : 0), 0);
  const cardioMin = (preview.items || []).filter((i) => isCardio(i.exId)).reduce((sum, i) => sum + num(i.minutes), 0);
  const totalSets = (preview.items || []).filter((i) => !isCardio(i.exId)).reduce((sum, i) => sum + setsOf(i), 0);
  const xpForca = Math.round(XP.workout + Math.min(50, volume / 200));
  const xpCardio = Math.round(Math.min(60, cardioMin));

  const confirm = () => {
    act.done(wid, { date, itemIds: [...checked], entries, swap: canSwap && swap ? due! : undefined });
    onClose();
  };

  return (
    <div className="wcheck-overlay" role="dialog" aria-modal="true" aria-label="Confirmar treino" onClick={onClose}>
      <div className="card wcheck" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h2>Confirmar treino</h2>
          <button className="icon-btn" onClick={onClose} title="Fechar"><Icon name="x" size={18} /></button>
        </div>

        {data.workouts.length > 1 && (
          <label className="field">
            <span>Treino que você fez</span>
            <select className="input" value={wid} onChange={(e) => pickWorkout(e.target.value)}>
              {data.workouts.map((x) => <option key={x.id} value={x.id}>{x.name}{x.id === due ? ' (era a vez)' : ''}</option>)}
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

        {canSwap && (
          <div className="wswap">
            <span className="wswap-q">Era dia de <b>{dueName}</b>. Você fez <b>{w?.name}</b> no lugar. E agora?</span>
            <div className="wswap-opts">
              <button type="button" className={`wswap-opt ${swap ? 'on' : ''}`} onClick={() => setSwap(true)}>
                <b className="ico-text"><Icon name="repeat" size={15} /> Trocar a ordem</b>
                <span>O {dueName} fica para o próximo treino. Depois o ciclo continua normal, sem repetir o {w?.name}.</span>
              </button>
              <button type="button" className={`wswap-opt ${!swap ? 'on' : ''}`} onClick={() => setSwap(false)}>
                <b className="ico-text"><Icon name="next" size={15} /> Pular o {dueName}</b>
                <span>Segue a sequência a partir do {w?.name}.</span>
              </button>
            </div>
          </div>
        )}

        {existing && (
          <div className="wcheck-warn">
            <span>
              Já tem registro nesse dia: <b>{existing.type === 'rest' ? 'descanso' : existing.name || 'treino'}</b>. Confirmar vai substituir.
            </span>
            <button className="btn sm danger" onClick={() => act.clear(date)}>Apagar registro</button>
          </div>
        )}

        <div className="wcheck-head">
          <span>Marque o que você fez e anote as séries <b>({checked.size} de {all})</b></span>
          <button className="link small" onClick={() => setChecked(checked.size === all ? new Set() : new Set(items.map((i) => i.id)))}>
            {checked.size === all ? 'Desmarcar todos' : 'Marcar todos'}
          </button>
        </div>
        {items.length ? (
          <ul className="wcheck-list">
            {items.map((it) => {
              const ex = EXERCISE_BY_ID[it.exId];
              const cardio = isCardio(it.exId);
              const on = checked.has(it.id);
              const d = drafts[it.id];
              const last = lastLogged(data, it.exId, date);
              return (
                <li key={it.id} className={`wcheck-row ${on ? 'on' : ''}`}>
                  <label className={`wcheck-item ${on ? 'on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(it.id)} />
                    <span className="wcheck-box">{on ? '✓' : ''}</span>
                    {hasPreview(it.exId) ? <ExercisePreview id={it.exId} name={ex?.name} size="wcheck-thumb" /> : <span className="wcheck-thumb-empty"><Icon name="treino" size={30} /></span>}
                    <span className="wcheck-name">
                      <b>{ex?.name || it.exId}</b>
                      <span className="muted small">
                        Plano: {cardio
                          ? [it.minutes && `${it.minutes} min`, it.distance && `${it.distance} km`].filter(Boolean).join(' · ') || 'cardio'
                          : [`${it.sets || 3}×${it.reps || 10}`, it.weight && `${it.weight} kg`].filter(Boolean).join(' · ')}
                      </span>
                      {last && <span className="muted small">Última vez: {describeItem(last)}</span>}
                    </span>
                  </label>

                  {on && d && (cardio ? (
                    <div className="wsets cardio">
                      <label className="wsets-field">
                        <span>Tempo</span>
                        <input className="input" inputMode="decimal" value={d.minutes} placeholder="0" onChange={(e) => edit(it.id, (x) => ({ ...x, minutes: e.target.value }))} aria-label="Minutos" />
                        <span className="muted small">min</span>
                      </label>
                      <label className="wsets-field">
                        <span>Distância</span>
                        <input className="input" inputMode="decimal" value={d.km} placeholder="opcional" onChange={(e) => edit(it.id, (x) => ({ ...x, km: e.target.value }))} aria-label="Quilômetros" />
                        <span className="muted small">km</span>
                      </label>
                      {!num(d.minutes) && <span className="wsets-warn">Coloque o tempo para contar o XP do cardio.</span>}
                    </div>
                  ) : (
                    <div className="wsets">
                      <div className="wsets-grid">
                        <span className="wsets-h">Série</span>
                        <span className="wsets-h">Repetições</span>
                        <span className="wsets-h">Peso</span>
                        <span />
                        {d.sets.map((x, i) => (
                          <Fragment key={i}>
                            <span className="wsets-n">{i + 1}</span>
                            <input className="input" inputMode="numeric" value={x.reps} onChange={(e) => setSet(it.id, i, 'reps', e.target.value.replace(/\D/g, ''))} aria-label={`Repetições da série ${i + 1}`} />
                            <span className="wsets-kg">
                              <input className="input" inputMode="decimal" value={d.noWeight ? '' : x.kg} disabled={d.noWeight} placeholder={d.noWeight ? '?' : '0'} onChange={(e) => setSet(it.id, i, 'kg', e.target.value.replace(/[^\d.,]/g, ''))} aria-label={`Peso da série ${i + 1}`} />
                              <span className="muted small">kg</span>
                            </span>
                            <button type="button" className="icon-btn" title="Tirar série" disabled={d.sets.length <= 1} onClick={() => removeSet(it.id, i)}><Icon name="x" size={14} /></button>
                          </Fragment>
                        ))}
                      </div>
                      <div className="wsets-foot">
                        <button type="button" className="btn sm" onClick={() => addSet(it.id)}><Icon name="plus" size={14} /> Série</button>
                        <label className={`wsets-forgot ${d.noWeight ? 'on' : ''}`}>
                          <input type="checkbox" checked={d.noWeight} onChange={(e) => edit(it.id, (x) => ({ ...x, noWeight: e.target.checked }))} />
                          <Icon name="help" size={14} /> Não lembro o peso
                        </label>
                      </div>
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>Esse treino não tem exercícios.</Empty>
        )}

        {checked.size > 0 && (
          <div className="wcheck-total">
            <span className="ico-text"><Icon name="treino" size={15} /> <b>{totalSets}</b> séries</span>
            <span className="ico-text"><Icon name="box" size={15} /> <b>{Math.round(volume).toLocaleString('pt-BR')}</b> kg de volume</span>
            {cardioMin > 0 && <span className="ico-text"><Icon name="clock" size={15} /> <b>{Math.round(cardioMin)}</b> min de cardio</span>}
            <span className="wcheck-xp">+{xpForca} XP Força{xpCardio ? ` · +${xpCardio} XP Resistência` : ''}</span>
          </div>
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
