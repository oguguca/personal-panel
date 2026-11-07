import Icon from '../components/Icon.jsx';
import { Check, Empty } from '../components/ui.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { formatTime, nowMinutes, toMinutes } from '../store/dates.js';

export default function Alimentacao({ go }) {
  const { today, day, settings, update } = useStore();
  const meals = [...settings.meals].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const n = nowMinutes();
  const doneCount = meals.filter((m) => day.meals[m.id]?.done).length;

  const patch = (id, obj) =>
    update((d) => {
      const m = d.days[today].meals;
      m[id] = { ...(m[id] || {}), ...obj };
    });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Alimentação</h1>
          <p className="muted">{doneCount} de {meals.length} refeições feitas hoje</p>
        </div>
        <button className="btn" onClick={() => go('config')}><Icon name="clock" size={18} /> Editar horários</button>
      </header>

      {meals.length ? (
        <section className="grid">
          {meals.map((m) => {
            const st = day.meals[m.id] || {};
            const late = !st.done && n > toMinutes(m.time);
            return (
              <div key={m.id} className="card">
                <div className="card-head">
                  <div className="row" style={{ gap: 12 }}>
                    <Check
                      on={!!st.done}
                      onClick={() => patch(m.id, { done: !st.done, doneAt: st.done ? null : Date.now() })}
                      label="Marcar como feita"
                    />
                    <div>
                      <h2>{m.name}</h2>
                      <div className="muted small">{m.time}</div>
                    </div>
                  </div>
                  {st.done ? (
                    <span className="badge success">Feita {st.doneAt ? `às ${formatTime(st.doneAt)}` : ''}</span>
                  ) : late ? (
                    <span className="badge warning">Pendente</span>
                  ) : (
                    <span className="badge">Mais tarde</span>
                  )}
                </div>
                <textarea
                  className="input"
                  placeholder="O que eu comi? (opcional)"
                  value={st.note || ''}
                  onChange={(e) => patch(m.id, { note: e.target.value })}
                />
              </div>
            );
          })}
        </section>
      ) : (
        <div className="card">
          <Empty>Nenhum horário de refeição. <button className="link" onClick={() => go('config')}>Configurar</button></Empty>
        </div>
      )}
    </div>
  );
}
