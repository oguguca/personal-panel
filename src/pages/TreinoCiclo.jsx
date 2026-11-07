// Aba "Ciclo" do Treino: sequência de 1 a 7 treinos, dias de descanso e registro do dia.
import Icon from '../components/Icon.jsx';
import { Empty } from '../components/ui.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { WEEKDAYS_NAME, formatMedium, formatShort, weekday } from '../store/dates.js';
import { MAX_ROTATION, forecast, nextAfter, slotLetter, suggestion, trainingConfig } from '../store/training.js';

/** Ações de registro do dia (usadas aqui e na tela Hoje). */
export function useTrainingActions() {
  const { data, today, update } = useStore();
  const nameOf = (id) => data.workouts.find((w) => w.id === id)?.name || 'Treino';
  return {
    done: (workoutId) =>
      update((d) => { d.days[today].training = { type: 'workout', workoutId, name: nameOf(workoutId), at: Date.now() }; }),
    rest: () => update((d) => { d.days[today].training = { type: 'rest', at: Date.now() }; }),
    undo: () => update((d) => { delete d.days[today].training; }),
  };
}

/** Bloco "treino de hoje" (reaproveitado na tela Hoje). */
export function TodayTraining({ compact = false, onOpen }) {
  const { data, today } = useStore();
  const act = useTrainingActions();
  const { rotation } = trainingConfig(data);
  const s = suggestion(data, today);
  const nameOf = (id) => data.workouts.find((w) => w.id === id)?.name || '—';

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
            <div className="today-train-title">{s.logged.type === 'workout' ? `Feito: ${s.logged.name || nameOf(s.logged.workoutId)}` : 'Descanso registrado'}</div>
            <div className="muted small">Próximo da sequência: <strong>{nameOf(next)}</strong></div>
          </div>
        </div>
        <button className="btn sm" onClick={act.undo}><Icon name="undo" size={14} /> Desfazer</button>
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
        <button className="btn primary sm" onClick={() => act.done(target)}>
          <Icon name="check" size={14} /> {s.rest ? `Treinei ${nameOf(target)}` : `Fiz o ${nameOf(target)}`}
        </button>
        {!s.rest && <button className="btn sm" onClick={act.rest}>Descansei</button>}
        {s.rest && <button className="btn sm" onClick={act.rest}>Descansei ✓</button>}
        {!compact && data.workouts.length > 1 && (
          <select className="input sm-select" value="" onChange={(e) => e.target.value && act.done(e.target.value)} aria-label="Fiz outro treino">
            <option value="">Fiz outro treino…</option>
            {data.workouts.filter((w) => w.id !== target).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

export default function TreinoCiclo({ goTab }) {
  const { data, today, update } = useStore();
  const { rotation, restDays } = trainingConfig(data);
  const fc = forecast(data, today, 7);
  const byId = Object.fromEntries(data.workouts.map((w) => [w.id, w]));
  const letterOf = (id) => slotLetter(rotation.indexOf(id));

  // grava a sequência efetiva antes de editar (na 1ª vez ela vem da ordem dos treinos)
  const editRotation = (fn) =>
    update((d) => {
      const cfg = trainingConfig(d);
      d.training = { ...cfg, rotation: [...cfg.rotation] };
      fn(d.training.rotation);
    });
  const toggleRest = (wd) =>
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
              <span className="week-day-label">{d.type === 'rest' ? 'Descanso' : byId[d.workoutId]?.name || '—'}</span>
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
                const t = data.days[k].training;
                return (
                  <li key={k} className="item food-item">
                    <span className="item-title">{k === today ? 'Hoje' : formatMedium(k)}</span>
                    {t.type === 'rest' ? (
                      <span className="badge">😴 Descanso</span>
                    ) : (
                      <span className="badge primary">{t.name || byId[t.workoutId]?.name || 'Treino'}</span>
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
