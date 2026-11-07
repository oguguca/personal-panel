import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Empty, Progress } from '../components/ui.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { addDays, formatDuration, formatTime } from '../store/dates.js';
import { recordTotal } from '../store/model.js';

const pad = (n) => String(n).padStart(2, '0');
function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  return `${h ? h + ':' : ''}${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Dias seguidos batendo a meta (hoje conta se já bateu). */
export function recordStreak(data, today) {
  let k = today;
  let n = 0;
  const hit = (key) => {
    const d = data.days[key];
    return d && recordTotal(d) >= (d.summary?.recordGoal || data.settings.recordGoalMin);
  };
  if (!hit(k)) k = addDays(k, -1);
  while (hit(k)) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

export default function Gravacao() {
  const { data, today, day, settings, update } = useStore();
  const [custom, setCustom] = useState('');
  const [now, setNow] = useState(Date.now());
  const timer = data.recTimer;

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const total = recordTotal(day);
  const goal = settings.recordGoalMin;
  const left = Math.max(0, goal - total);
  const week = Array.from({ length: 7 }, (_, i) => recordTotal(data.days[addDays(today, -i)])).reduce((a, b) => a + b, 0);
  const streak = recordStreak(data, today);

  const add = (min, note) => {
    const v = Math.round(Number(String(min).replace(',', '.')));
    if (!v || v <= 0 || v > 1440) return;
    update((d) => d.days[today].recording.push({ min: v, at: Date.now(), ...(note ? { note } : {}) }));
  };
  const undo = () => update((d) => d.days[today].recording.pop());
  const removeAt = (i) => update((d) => d.days[today].recording.splice(i, 1));

  const start = () => update((d) => { d.recTimer = { startedAt: Date.now() }; });
  const stop = () => {
    const min = Math.round((Date.now() - timer.startedAt) / 60000);
    update((d) => {
      d.recTimer = null;
      if (min >= 1) d.days[today].recording.push({ min, at: Date.now(), note: 'cronômetro' });
    });
  };
  const cancel = () => confirm('Descartar o tempo do cronômetro?') && update((d) => { d.recTimer = null; });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Gravação</h1>
          <p className="muted">Meta diária de {formatDuration(goal)}</p>
        </div>
      </header>

      <section className="card">
        <div className="water-hero">
          <div className="water-numbers" style={{ flex: 1 }}>
            <div className="water-big" style={{ color: 'var(--primary)' }}>{formatDuration(total)}</div>
            <div className="muted">{left > 0 ? `Faltam ${formatDuration(left)} para a meta` : 'Meta de gravação batida! 🎉'}</div>
            <Progress value={total} max={goal} variant={left ? '' : 'success'} />
            <div className="row" style={{ marginTop: 8 }}>
              {settings.recordQuick.map((m) => (
                <button key={m} className="btn" onClick={() => add(m)}>+{m} min</button>
              ))}
            </div>
            <form className="row" onSubmit={(e) => { e.preventDefault(); add(custom); setCustom(''); }}>
              <input className="input w-num" type="number" min="1" max="1440" placeholder="min" value={custom} onChange={(e) => setCustom(e.target.value)} />
              <button className="btn" type="submit"><Icon name="plus" size={16} /> Adicionar</button>
              <button className="btn" type="button" onClick={undo} disabled={!day.recording.length}><Icon name="undo" size={16} /> Desfazer</button>
            </form>
          </div>

          <div className="card" style={{ alignItems: 'center', minWidth: 220, boxShadow: 'none', background: 'var(--surface-2)' }}>
            <h3>Cronômetro</h3>
            <div style={{ fontSize: '2.2rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {timer ? clock(now - timer.startedAt) : '00:00'}
            </div>
            {timer ? (
              <div className="row">
                <button className="btn primary" onClick={stop}><Icon name="stop" size={16} /> Parar e salvar</button>
                <button className="icon-btn danger" title="Descartar" onClick={cancel}><Icon name="x" size={18} /></button>
              </div>
            ) : (
              <button className="btn primary" onClick={start}><Icon name="play" size={16} /> Iniciar</button>
            )}
            <span className="muted small">Conta mesmo com a janela fechada.</span>
          </div>
        </div>
      </section>

      <section className="grid-3">
        <div className="card stat">
          <div className="stat-icon"><Icon name="gravacao" /></div>
          <div><div className="stat-value">{formatDuration(week)}</div><div className="stat-label">últimos 7 dias</div></div>
        </div>
        <div className="card stat">
          <div className="stat-icon food"><Icon name="metas" /></div>
          <div><div className="stat-value">{streak} dia(s)</div><div className="stat-label">seguidos batendo a meta</div></div>
        </div>
        <div className="card stat">
          <div className="stat-icon water"><Icon name="clock" /></div>
          <div><div className="stat-value">{day.recording.length}</div><div className="stat-label">sessões hoje</div></div>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Sessões de hoje</h2></div>
        {day.recording.length ? (
          <ul className="list">
            {day.recording.map((r, i) => ({ r, i })).reverse().map(({ r, i }) => (
              <li key={r.at + '-' + i} className="item">
                <Icon name="gravacao" size={18} className="muted" />
                <span className="item-title">{formatDuration(r.min)}{r.note && <span className="muted small"> · {r.note}</span>}</span>
                <span className="muted small">{formatTime(r.at)}</span>
                <div className="item-actions">
                  <button className="icon-btn danger" title="Apagar" onClick={() => removeAt(i)}><Icon name="trash" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nenhuma gravação hoje. Use os botões ou o cronômetro.</Empty>
        )}
      </section>
    </div>
  );
}
