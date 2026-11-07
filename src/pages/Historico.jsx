import { useMemo, useState } from 'react';
import BarChart from '../components/BarChart.jsx';
import Icon from '../components/Icon.jsx';
import { Empty, pct } from '../components/ui.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { addDays, formatMedium, formatShort, formatTime } from '../store/dates.js';

function DayDetail({ day, data }) {
  const s = day.summary || {};
  const tasks = day.tasks || [];
  const mealIds = Object.keys(s.mealNames || {});
  const goalIds = Object.keys(s.goalNames || {});
  return (
    <div className="day-detail">
      <div>
        <h3>Tarefas</h3>
        {tasks.length ? (
          <ul className="list small">
            {tasks.map((t) => (
              <li key={t.id} className={`item ${t.done ? 'done' : ''}`} style={{ minHeight: 0, padding: '3px 0' }}>
                <Icon name={t.done ? 'check' : t.movedTo ? 'next' : 'x'} size={14} />
                <span className="item-title">{t.title}{t.movedTo && <span className="muted"> (passou adiante)</span>}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted small">Sem tarefas.</p>}
      </div>
      <div>
        <h3>Água</h3>
        <p className="small" style={{ margin: '4px 0' }}>{s.water || 0} ml de {s.waterGoal || data.settings.waterGoal} ml</p>
        <p className="muted small" style={{ margin: 0 }}>{(day.water || []).map((w) => `${w.ml} ml às ${formatTime(w.at)}`).join(' · ')}</p>
      </div>
      <div>
        <h3>Refeições</h3>
        <ul className="list small">
          {mealIds.map((id) => {
            const st = day.meals?.[id] || {};
            return (
              <li key={id} style={{ padding: '3px 0' }}>
                {st.done ? '✅' : '⬜'} {s.mealNames[id]}
                {st.note && <div className="muted">“{st.note}”</div>}
              </li>
            );
          })}
        </ul>
      </div>
      {goalIds.length > 0 && (
        <div>
          <h3>Metas diárias</h3>
          <ul className="list small">
            {goalIds.map((id) => (
              <li key={id} style={{ padding: '3px 0' }}>
                {s.goalNames[id]}: <strong>{day.goals?.[id] || 0}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Historico() {
  const { data, today } = useStore();
  const [range, setRange] = useState(7);
  const [open, setOpen] = useState(null);
  const [limit, setLimit] = useState(30);

  const series = useMemo(() => {
    const keys = Array.from({ length: range }, (_, i) => addDays(today, i - range + 1));
    return keys.map((k) => ({ key: k, s: data.days[k]?.summary || null }));
  }, [data, today, range]);

  const withData = series.filter((x) => x.s);
  const avgWater = withData.length ? Math.round(withData.reduce((a, x) => a + x.s.water, 0) / withData.length) : 0;
  const waterHit = withData.filter((x) => x.s.water >= x.s.waterGoal).length;
  const taskPcts = withData.filter((x) => x.s.tasksTotal).map((x) => pct(x.s.tasksDone, x.s.tasksTotal));
  const avgTasks = taskPcts.length ? Math.round(taskPcts.reduce((a, b) => a + b, 0) / taskPcts.length) : 0;
  const goalsDone = withData.reduce((a, x) => a + x.s.goalsDone, 0);

  const label = (k) => (range === 7 ? formatMedium(k).split(',')[0].replace('.', '') : formatShort(k));
  const mk = (fn, title) =>
    series.map(({ key, s }) => ({ key, label: label(key), value: s ? fn(s) : 0, missing: !s, title: `${formatShort(key)}: ${s ? title(s) : 'sem dados'}` }));

  const allDays = Object.keys(data.days).filter((k) => k <= today && data.days[k].summary).sort().reverse();

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Histórico</h1>
          <p className="muted">Tudo zera à meia-noite, mas fica guardado aqui.</p>
        </div>
        <div className="segmented">
          <button className={range === 7 ? 'on' : ''} onClick={() => setRange(7)}>7 dias</button>
          <button className={range === 30 ? 'on' : ''} onClick={() => setRange(30)}>30 dias</button>
        </div>
      </header>

      <section className="grid-3">
        <div className="card stat">
          <div className="stat-icon water"><Icon name="agua" /></div>
          <div><div className="stat-value">{avgWater} ml</div><div className="stat-label">média por dia · meta batida em {waterHit} dia(s)</div></div>
        </div>
        <div className="card stat">
          <div className="stat-icon"><Icon name="tarefas" /></div>
          <div><div className="stat-value">{avgTasks}%</div><div className="stat-label">tarefas concluídas (média)</div></div>
        </div>
        <div className="card stat">
          <div className="stat-icon food"><Icon name="metas" /></div>
          <div><div className="stat-value">{goalsDone}</div><div className="stat-label">metas diárias cumpridas</div></div>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <div className="card-head"><h2>Água bebida</h2></div>
          <BarChart
            items={mk((s) => s.water, (s) => `${s.water} ml de ${s.waterGoal} ml`)}
            goal={data.settings.waterGoal}
            color="var(--water)"
            format={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}L` : v)}
          />
          <div className="legend"><span><i style={{ background: 'var(--water)' }} />ml por dia</span><span>– – meta</span></div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Tarefas concluídas</h2></div>
          <BarChart
            items={mk((s) => pct(s.tasksDone, s.tasksTotal), (s) => `${s.tasksDone} de ${s.tasksTotal} (${pct(s.tasksDone, s.tasksTotal)}%)`)}
            max={100}
            color="var(--success)"
            format={(v) => `${v}%`}
          />
        </div>
        <div className="card">
          <div className="card-head"><h2>Metas diárias cumpridas</h2></div>
          <BarChart
            items={mk((s) => s.goalsDone, (s) => `${s.goalsDone} de ${s.goalsTotal}`)}
            max={Math.max(1, ...withData.map((x) => x.s.goalsTotal))}
            color="var(--primary)"
          />
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Dias anteriores</h2></div>
        {allDays.length ? (
          <div>
            <div className="day-row muted small" style={{ cursor: 'default' }}>
              <span>Dia</span><span>Água</span><span>Tarefas</span><span>Metas</span><span />
            </div>
            {allDays.slice(0, limit).map((k) => {
              const d = data.days[k];
              const s = d.summary;
              return (
                <div key={k}>
                  <button className="day-row" onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k}>
                    <strong>{k === today ? 'Hoje' : formatMedium(k)}</strong>
                    <span className={s.water >= s.waterGoal ? 'badge success' : ''}>{s.water} ml</span>
                    <span>{s.tasksDone}/{s.tasksTotal}</span>
                    <span>{s.goalsDone}/{s.goalsTotal}</span>
                    <Icon name={open === k ? 'up' : 'down'} size={16} />
                  </button>
                  {open === k && <DayDetail day={d} data={data} />}
                </div>
              );
            })}
            {allDays.length > limit && (
              <button className="btn" style={{ marginTop: 8 }} onClick={() => setLimit(limit + 30)}>Ver mais</button>
            )}
          </div>
        ) : (
          <Empty>O histórico aparece a partir de amanhã.</Empty>
        )}
      </section>
    </div>
  );
}
