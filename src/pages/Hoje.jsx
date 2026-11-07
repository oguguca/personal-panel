import Icon from '../components/Icon.jsx';
import WaterCup from '../components/WaterCup.jsx';
import { Check, Empty, Progress, fmtValue, pct } from '../components/ui.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { formatDuration, formatLong, formatTime, greeting, nowMinutes, toMinutes } from '../store/dates.js';
import { goalDone, recordTotal, waterTotal } from '../store/model.js';
import { dayNutrition, fmtKcal } from '../store/foods.js';

export function nextMeal(settings, day) {
  const n = nowMinutes();
  const pending = [...settings.meals]
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
    .filter((m) => !day.meals[m.id]?.done);
  if (!pending.length) return null;
  const upcoming = pending.find((m) => toMinutes(m.time) >= n);
  const meal = upcoming || pending[pending.length - 1];
  return { meal, diff: toMinutes(meal.time) - n };
}

export default function Hoje({ go }) {
  const { data, today, day, settings, update } = useStore();
  const tasks = day.tasks.filter((t) => !t.movedTo);
  const done = tasks.filter((t) => t.done).length;
  const water = waterTotal(day);
  const nm = nextMeal(settings, day);
  const name = settings.userName.trim();

  const toggleTask = (id) =>
    update((d) => {
      const t = d.days[today].tasks.find((t) => t.id === id);
      t.done = !t.done;
    });
  const addWater = (ml) => update((d) => d.days[today].water.push({ ml, at: Date.now() }));
  const rec = recordTotal(day);
  const kcal = dayNutrition(day).kcal;
  const addRec = (min) => update((d) => d.days[today].recording.push({ min, at: Date.now() }));
  const markMeal = (id) =>
    update((d) => {
      const m = d.days[today].meals;
      m[id] = { ...(m[id] || {}), done: true, doneAt: Date.now() }; // horário real do registro
    });
  const bumpGoal = (g) =>
    update((d) => {
      const cur = d.days[today].goals[g.id] || 0;
      d.days[today].goals[g.id] = g.type === 'check' ? (cur ? 0 : 1) : cur + (g.step || 1);
    });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="muted">{formatLong(today)}</p>
          <h1>
            {greeting()}
            {name ? `, ${name}` : ''}! 👋
          </h1>
        </div>
      </header>

      {/* Resumo do dia */}
      <section className="grid-3">
        <button className="card stat" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => go('tarefas')}>
          <div className="stat-icon"><Icon name="tarefas" /></div>
          <div>
            <div className="stat-value">{done}/{tasks.length}</div>
            <div className="stat-label">tarefas feitas</div>
          </div>
        </button>
        <button className="card stat" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => go('agua')}>
          <div className="stat-icon water"><Icon name="agua" /></div>
          <div>
            <div className="stat-value">{water} <span className="muted small">/ {settings.waterGoal} ml</span></div>
            <div className="stat-label">água hoje</div>
          </div>
        </button>
        <button className="card stat" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => go('alimentacao')}>
          <div className="stat-icon food"><Icon name="alimentacao" /></div>
          <div>
            {nm ? (
              <>
                <div className="stat-value">{nm.meal.name} · {nm.meal.time}</div>
                <div className="stat-label">
                  {nm.diff >= 0 ? `próxima refeição, em ${formatDuration(nm.diff)}` : 'refeição atrasada'}
                </div>
              </>
            ) : (
              <>
                <div className="stat-value">Tudo certo</div>
                <div className="stat-label">refeições do dia feitas</div>
              </>
            )}
          </div>
        </button>
      </section>

      <section className="grid">
        {/* Tarefas */}
        <div className="card">
          <div className="card-head">
            <h2>Tarefas do dia</h2>
            <button className="link" onClick={() => go('tarefas')}>Ver todas</button>
          </div>
          <Progress value={done} max={tasks.length} variant="success" />
          {tasks.length ? (
            <ul className="list">
              {tasks.slice(0, 6).map((t) => (
                <li key={t.id} className={`item ${t.done ? 'done' : ''}`}>
                  <Check on={t.done} onClick={() => toggleTask(t.id)} label="Marcar como feita" />
                  <span className="item-title">{t.title}</span>
                  {t.recurringId && <Icon name="repeat" size={14} className="muted" />}
                </li>
              ))}
              {tasks.length > 6 && <li className="muted small">+ {tasks.length - 6} tarefas</li>}
            </ul>
          ) : (
            <Empty>Nenhuma tarefa para hoje. <button className="link" onClick={() => go('tarefas')}>Adicionar</button></Empty>
          )}
        </div>

        {/* Água */}
        <div className="card">
          <div className="card-head">
            <h2>Água</h2>
            <button className="link" onClick={() => go('agua')}>Detalhes</button>
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 20 }}>
            <WaterCup value={water} goal={settings.waterGoal} size={120} />
            <div className="field" style={{ gap: 8 }}>
              <div><strong>{water} ml</strong> <span className="muted">de {settings.waterGoal} ml</span></div>
              <div className="row">
                {settings.waterQuick.map((ml) => (
                  <button key={ml} className="btn water sm" onClick={() => addWater(ml)}>+{ml}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gravação */}
        <div className="card">
          <div className="card-head">
            <h2>Gravação</h2>
            <button className="link" onClick={() => go('gravacao')}>Abrir</button>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span><strong>{formatDuration(rec)}</strong> <span className="muted">de {formatDuration(settings.recordGoalMin)}</span></span>
            <span className={`badge ${rec >= settings.recordGoalMin ? 'success' : 'primary'}`}>{pct(rec, settings.recordGoalMin)}%</span>
          </div>
          <Progress value={rec} max={settings.recordGoalMin} variant={rec >= settings.recordGoalMin ? 'success' : ''} />
          <div className="row">
            {settings.recordQuick.map((m) => (
              <button key={m} className="btn sm" onClick={() => addRec(m)}>+{m} min</button>
            ))}
          </div>
        </div>

        {/* Metas do dia */}
        <div className="card">
          <div className="card-head">
            <h2>Metas do dia</h2>
            <button className="link" onClick={() => go('metas')}>Gerenciar</button>
          </div>
          {data.dailyGoals.length ? (
            <ul className="list">
              {data.dailyGoals.map((g) => {
                const v = day.goals[g.id] || 0;
                const ok = goalDone(g, v);
                return (
                  <li key={g.id} className={`item ${ok ? 'done' : ''}`}>
                    {g.type === 'check' ? (
                      <Check on={ok} onClick={() => bumpGoal(g)} label="Cumprida" />
                    ) : (
                      <button className="icon-btn" onClick={() => bumpGoal(g)} title={`+${g.step || 1}`}><Icon name="plus" /></button>
                    )}
                    <span className="item-title">{g.title}</span>
                    {g.type === 'count' && (
                      <span className={`badge ${ok ? 'success' : ''}`}>{fmtValue(v)}/{fmtValue(g.target, g.unit)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>Sem metas diárias. <button className="link" onClick={() => go('metas')}>Criar meta</button></Empty>
          )}
        </div>

        {/* Refeições */}
        <div className="card">
          <div className="card-head">
            <h2>Refeições</h2>
            <button className="link" onClick={() => go('alimentacao')}>Abrir</button>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span><strong>{fmtKcal(kcal)}</strong>{settings.kcalGoal > 0 && <span className="muted"> de {fmtKcal(settings.kcalGoal)}</span>}</span>
            {settings.kcalGoal > 0 && <span className="badge primary">{pct(kcal, settings.kcalGoal)}%</span>}
          </div>
          {settings.kcalGoal > 0 && <Progress value={kcal} max={settings.kcalGoal} variant={kcal > settings.kcalGoal ? '' : 'success'} />}
          <ul className="list">
            {[...settings.meals]
              .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
              .map((m) => {
                const st = day.meals[m.id];
                return (
                  <li key={m.id} className={`item ${st?.done ? 'done' : ''}`}>
                    <Check on={!!st?.done} onClick={() => (st?.done ? go('alimentacao') : markMeal(m.id))} label="Marcar como feita" />
                    <span className="item-title">{m.name}</span>
                    {st?.done && st.doneAt ? (
                      <span className="badge success" title={`Sugerido: ${m.time}`}>{formatTime(st.doneAt)}</span>
                    ) : (
                      <span className="badge" title="Horário sugerido">{m.time}</span>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>

        {/* Metas de longo prazo */}
        {data.longGoals.length > 0 && (
          <div className="card">
            <div className="card-head">
              <h2>Longo prazo</h2>
              <button className="link" onClick={() => go('metas')}>Ver</button>
            </div>
            {data.longGoals.slice(0, 4).map((g) => (
              <div key={g.id} className="field">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{g.title}</span>
                  <span className="muted small">{pct(g.current, g.target)}%</span>
                </div>
                <Progress value={g.current} max={g.target} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
