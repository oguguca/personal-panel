import { Fragment, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import WaterCup from '../components/WaterCup';
import { Empty, Progress, Switch, fmtMl } from '../components/ui';
import { inActiveWindow, nextWaterReminder } from '../hooks/useReminders';
import { useStore } from '../store/StoreContext';
import { formatTime } from '../store/dates';
import { waterTotal } from '../store/model';
import type { Settings } from '../store/types';

export default function Agua({ startedAt, embedded = false }: { startedAt: number; embedded?: boolean }) {
  const { today, day, settings, update } = useStore();
  const [custom, setCustom] = useState('');
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const total = waterTotal(day);
  const goal = settings.waterGoal; // mínimo
  const ideal = Math.max(goal, settings.waterIdeal || goal);
  const status =
    total < goal
      ? `Faltam ${fmtMl(goal - total)} para o mínimo (${fmtMl(goal)})`
      : total < ideal
        ? `Mínimo batido! ✅ Faltam ${fmtMl(ideal - total)} para o ideal (${fmtMl(ideal)})`
        : 'Ideal do dia batido! 🎉';

  const add = (ml: number | string) => {
    const v = Math.round(Number(ml));
    if (!v || v <= 0 || v > 5000) return;
    update((d) => d.days[today].water.push({ ml: v, at: Date.now() }));
  };
  const undo = () => update((d) => d.days[today].water.pop());
  const removeAt = (i: number) => update((d) => d.days[today].water.splice(i, 1));
  const setS = <K extends keyof Settings>(k: K, v: Settings[K]) => update((d) => { d.settings[k] = v; });

  const next = nextWaterReminder(settings, day, startedAt);
  let nextText = 'Lembretes desligados';
  if (settings.notificationsOn && settings.waterReminderOn) {
    if (!next) nextText = 'Ideal batido! Sem mais lembretes hoje 🎉';
    else if (!inActiveWindow(settings)) nextText = `Fora do horário (${settings.waterActiveStart}–${settings.waterActiveEnd})`;
    else nextText = `Próximo lembrete às ${formatTime(Math.max(next, Date.now()))}`;
  }

  // embedded: mostrada como aba dentro de Alimentação (sem cabeçalho próprio)
  const Wrapper = embedded ? Fragment : 'div';
  return (
    <Wrapper {...(embedded ? {} : { className: 'page' })}>
      {!embedded && (
        <header className="page-header">
          <div>
            <h1>Água</h1>
            <p className="muted">Mínimo {fmtMl(goal)} · ideal {fmtMl(ideal)}</p>
          </div>
        </header>
      )}

      <section className="card">
        <div className="water-hero">
          <WaterCup value={total} goal={ideal} mark={goal} size={200} />
          <div className="water-numbers">
            <div className="water-big">{fmtMl(total)}</div>
            <div className="muted">{status}</div>
            <Progress value={total} max={ideal} mark={goal} variant={total >= goal ? 'success' : 'water'} />
            <div className="row small muted" style={{ justifyContent: 'space-between' }}>
              <span>0</span><span>mínimo {fmtMl(goal)}</span><span>ideal {fmtMl(ideal)}</span>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              {settings.waterQuick.map((ml) => (
                <button key={ml} className="btn water" onClick={() => add(ml)}>+{fmtMl(ml)}</button>
              ))}
            </div>
            <form className="row" onSubmit={(e) => { e.preventDefault(); add(custom); setCustom(''); }}>
              <input
                className="input w-num"
                type="number"
                min="1"
                max="5000"
                placeholder="ml"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
              <button className="btn" type="submit"><Icon name="plus" size={16} /> Adicionar</button>
              <button className="btn" type="button" onClick={undo} disabled={!day.water.length}><Icon name="undo" size={16} /> Desfazer</button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <div className="card-head"><h2>Registros de hoje</h2></div>
          {day.water.length ? (
            <ul className="list">
              {day.water.map((w, i) => ({ w, i })).reverse().map(({ w, i }) => (
                <li key={w.at + '-' + i} className="item">
                  <Icon name="agua" size={18} className="muted" />
                  <span className="item-title">{w.ml} ml</span>
                  <span className="muted small">{formatTime(w.at)}</span>
                  <div className="item-actions">
                    <button className="icon-btn danger" title="Apagar" onClick={() => removeAt(i)}><Icon name="trash" size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhum copo registrado ainda.</Empty>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h2><Icon name="bell" size={18} /> Lembrete</h2></div>
          <div className="badge water" style={{ alignSelf: 'flex-start' }}>{nextText}</div>
          <Switch label="Lembrar de beber água" checked={settings.waterReminderOn} onChange={(v) => setS('waterReminderOn', v)} />
          <label className="field">
            <span>Intervalo</span>
            <select className="input" value={settings.waterReminderMinutes} onChange={(e) => setS('waterReminderMinutes', Number(e.target.value))}>
              {[15, 20, 30, 45, 60, 90, 120, 180].map((m) => (
                <option key={m} value={m}>a cada {m < 60 ? `${m} min` : `${m / 60} h`.replace('.5', ',5')}</option>
              ))}
            </select>
          </label>
          {!settings.notificationsOn && (
            <p className="muted small" style={{ margin: 0 }}>As notificações estão desligadas nas Configurações.</p>
          )}
        </div>
      </section>
    </Wrapper>
  );
}
