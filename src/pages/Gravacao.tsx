import RendaIcon from '../components/RendaIcon';
import { useState, type FormEvent } from 'react';
import type { Data, DayKey } from '../store/types';
import Icon from '../components/Icon';
import { Empty, Progress } from '../components/ui';
import { useStore } from '../store/StoreContext';
import { addDays, formatDuration, formatTime } from '../store/dates';
import { recordTotal } from '../store/model';

/** Dias seguidos batendo a meta (hoje conta se já bateu). */
export function recordStreak(data: Data, today: DayKey): number {
  let k = today;
  let n = 0;
  const hit = (key: DayKey) => {
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
  const [editGoal, setEditGoal] = useState<string | null>(null); // texto do campo enquanto edita a meta

  const saveGoal = (e: FormEvent) => {
    e.preventDefault();
    const v = Math.round(Number(String(editGoal).replace(',', '.')));
    if (!v || v < 1 || v > 1440) return;
    update((d) => { d.settings.recordGoalMin = v; });
    setEditGoal(null);
  };

  const total = recordTotal(day);
  const goal = settings.recordGoalMin;
  const left = Math.max(0, goal - total);
  const week = Array.from({ length: 7 }, (_, i) => recordTotal(data.days[addDays(today, -i)])).reduce((a, b) => a + b, 0);
  const streak = recordStreak(data, today);

  const add = (min: number | string) => {
    const v = Math.round(Number(String(min).replace(',', '.')));
    if (!v || v <= 0 || v > 1440) return;
    update((d) => d.days[today].recording.push({ min: v, at: Date.now() }));
  };
  const undo = () => update((d) => d.days[today].recording.pop());
  const removeAt = (i: number) => update((d) => d.days[today].recording.splice(i, 1));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="row" style={{ gap: 12 }}>
            <RendaIcon size={32} />
            Renda
          </h1>
          <p className="muted">Minutos gravados · meta diária de {formatDuration(goal)}</p>
        </div>
        {editGoal === null ? (
          <button className="btn" onClick={() => setEditGoal(String(goal))}><Icon name="edit" size={16} /> Mudar meta</button>
        ) : (
          <form className="row" onSubmit={saveGoal}>
            <input
              className="input w-num"
              type="number"
              min="1"
              max="1440"
              autoFocus
              value={editGoal}
              onChange={(e) => setEditGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setEditGoal(null)}
              aria-label="Meta diária em minutos"
            />
            <span className="muted small">min/dia</span>
            <button className="btn primary" type="submit"><Icon name="check" size={16} /> Salvar</button>
            <button className="icon-btn" type="button" title="Cancelar" onClick={() => setEditGoal(null)}><Icon name="x" size={18} /></button>
          </form>
        )}
      </header>

      <section className="card">
        <div className="water-hero" style={{ justifyContent: 'flex-start' }}>
          <div className="water-numbers" style={{ flex: 1, maxWidth: 640 }}>
            <div className="water-big" style={{ color: '#1fc773' }}>{formatDuration(total)}</div>
            <div className="muted">{left > 0 ? `Faltam ${formatDuration(left)} para a meta` : 'Meta de gravação batida! 🎉'}</div>
            <Progress value={total} max={goal} variant={left ? '' : 'success'} />
            <div className="row" style={{ marginTop: 8 }}>
              {settings.recordQuick.map((m) => (
                <button key={m} className="btn" onClick={() => add(m)}>+{m} min</button>
              ))}
            </div>
            <form className="row" onSubmit={(e) => { e.preventDefault(); add(custom); setCustom(''); }}>
              <input className="input w-num" type="number" min="1" max="1440" placeholder="min" value={custom} onChange={(e) => setCustom(e.target.value)} />
              <button className="btn primary" type="submit"><Icon name="plus" size={16} /> Registrar tempo</button>
              <button className="btn" type="button" onClick={undo} disabled={!day.recording.length}><Icon name="undo" size={16} /> Desfazer</button>
            </form>
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
                <span className="item-title">{formatDuration(r.min)}</span>
                <span className="muted small">{formatTime(r.at)}</span>
                <div className="item-actions">
                  <button className="icon-btn danger" title="Apagar" onClick={() => removeAt(i)}><Icon name="trash" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nenhum tempo registrado hoje. Use os botões ou digite os minutos.</Empty>
        )}
      </section>
    </div>
  );
}
