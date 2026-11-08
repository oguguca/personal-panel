// Calendário interativo: compromissos e corridas, com alertas antes do evento.
import { useMemo, useState, type FormEvent } from 'react';
import Icon from '../components/Icon';
import { Empty, Switch } from '../components/ui';
import { useStore } from '../store/StoreContext';
import {
  DAYS_BEFORE, DEFAULT_ALERT, EVERY_HOURS, RACE_DISTANCES,
  daysUntil, describeAlert, eventsByDay, formatPace, monthGrid, paceOf, parseDuration, upcoming, whenText,
} from '../store/calendar';
import { formatLong, parseKey, WEEKDAYS_NAME } from '../store/dates';
import { uid } from '../store/model';
import type { CalEvent, DayKey, EventKind } from '../store/types';

const KIND: Record<EventKind, { label: string; icon: string }> = {
  compromisso: { label: 'Compromisso', icon: '📅' },
  corrida: { label: 'Corrida', icon: '🏃' },
};

const monthName = (y: number, m: number) => {
  const s = new Date(y, m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

type Draft = Omit<CalEvent, 'id'> & { id?: string };
const blank = (date: DayKey, kind: EventKind = 'compromisso'): Draft => ({
  title: '', date, time: '', kind, place: '', distance: '', notes: '', alert: { ...DEFAULT_ALERT },
});

function EventForm({ initial, onSave, onCancel, onDelete }: {
  initial: Draft;
  onSave: (d: Draft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [f, setF] = useState<Draft>(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((x) => ({ ...x, [k]: v }));
  const [customDays, setCustomDays] = useState(!DAYS_BEFORE.includes(initial.alert?.daysBefore ?? 3));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.title.trim() || !f.date) return;
    onSave({ ...f, title: f.title.trim(), lastAlert: f.id && f.alert === initial.alert ? f.lastAlert : undefined });
  };
  const race = f.kind === 'corrida';

  return (
    <form className="cal-form" onSubmit={submit}>
      <div className="segmented">
        {(Object.keys(KIND) as EventKind[]).map((k) => (
          <button type="button" key={k} className={f.kind === k ? 'on' : ''} onClick={() => set('kind', k)}>
            {KIND[k].icon} {KIND[k].label}
          </button>
        ))}
      </div>
      <input className="input" autoFocus placeholder={race ? 'Ex.: "Corrida de São Silvestre"' : 'Ex.: "Dentista"'} value={f.title} onChange={(e) => set('title', e.target.value)} />
      <div className="row">
        <label className="field"><span>Data</span><input className="input" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} required /></label>
        <label className="field"><span>Hora (opcional)</span><input className="input" type="time" value={f.time || ''} onChange={(e) => set('time', e.target.value)} /></label>
      </div>
      <label className="field"><span>Local (opcional)</span><input className="input" placeholder={race ? 'Largada: Av. Paulista' : 'Endereço ou lugar'} value={f.place || ''} onChange={(e) => set('place', e.target.value)} /></label>
      {race && (
        <div className="field">
          <span>Distância</span>
          <div className="chips">
            {RACE_DISTANCES.map((d) => (
              <button type="button" key={d} className={`chip ${f.distance === d ? 'on' : ''}`} onClick={() => set('distance', f.distance === d ? '' : d)}>
                {d === '21' ? '21 km (meia)' : d === '42' ? '42 km (maratona)' : `${d} km`}
              </button>
            ))}
            <input className="input w-num" inputMode="decimal" placeholder="outra (km)" value={RACE_DISTANCES.includes(f.distance || '') ? '' : f.distance || ''} onChange={(e) => set('distance', e.target.value.replace(',', '.'))} />
          </div>
        </div>
      )}
      {race && (
        <label className="field">
          <span>Tempo final (depois da prova)</span>
          <div className="row">
            <input className="input w-num" placeholder="52:30" value={f.result || ''} onChange={(e) => set('result', e.target.value)} />
            {paceOf(f) ? <span className="badge success">Pace {formatPace(paceOf(f)!)}</span> : f.result && !parseDuration(f.result) ? <span className="muted small">Use mm:ss ou h:mm:ss</span> : null}
          </div>
        </label>
      )}
      <label className="field"><span>Observações (opcional)</span><textarea className="input" rows={2} placeholder={race ? 'Kit, horário de chegada, pace…' : ''} value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} /></label>

      <div className="cal-alert">
        <Switch label="🔔 Me avisar antes" checked={!!f.alert} onChange={(on) => set('alert', on ? { ...DEFAULT_ALERT } : null)} />
        {f.alert && (
          <>
            <div className="field">
              <span>Começar a avisar quantos dias antes?</span>
              <div className="chips">
                {DAYS_BEFORE.map((d) => (
                  <button type="button" key={d} className={`chip ${!customDays && f.alert!.daysBefore === d ? 'on' : ''}`} onClick={() => { setCustomDays(false); set('alert', { ...f.alert!, daysBefore: d }); }}>
                    {d} {d === 1 ? 'dia' : 'dias'}
                  </button>
                ))}
                <button type="button" className={`chip ${customDays ? 'on' : ''}`} onClick={() => setCustomDays(true)}>Outro</button>
                {customDays && (
                  <input className="input w-num" type="number" min={1} max={60} value={f.alert.daysBefore} onChange={(e) => set('alert', { ...f.alert!, daysBefore: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} />
                )}
              </div>
            </div>
            <div className="field">
              <span>Repetir o aviso a cada</span>
              <div className="chips">
                {EVERY_HOURS.map((o) => (
                  <button type="button" key={o.h} className={`chip ${f.alert!.everyHours === o.h ? 'on' : ''}`} onClick={() => set('alert', { ...f.alert!, everyHours: o.h })}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="muted small cal-alert-text">{describeAlert(f)}.</p>
          </>
        )}
      </div>

      <div className="row">
        <button className="btn primary" type="submit"><Icon name="check" size={16} /> Salvar</button>
        <button className="btn" type="button" onClick={onCancel}>Cancelar</button>
        {onDelete && <button className="btn danger" type="button" onClick={onDelete} style={{ marginLeft: 'auto' }}><Icon name="trash" size={16} /> Apagar</button>}
      </div>
    </form>
  );
}

function EventItem({ ev, today, onEdit, onToggle }: { ev: CalEvent; today: DayKey; onEdit: () => void; onToggle: () => void }) {
  const past = ev.date < today;
  return (
    <li className={`cal-event ${ev.kind} ${ev.done ? 'done' : ''}`}>
      <button className="cal-event-check" title={ev.done ? 'Desmarcar' : ev.kind === 'corrida' ? 'Marcar como corrida feita' : 'Marcar como feito'} onClick={onToggle}>
        {ev.done ? '✓' : KIND[ev.kind].icon}
      </button>
      <button className="cal-event-main" onClick={onEdit}>
        <b>{ev.title}</b>
        <span className="muted small">
          {[ev.time || 'dia inteiro', ev.kind === 'corrida' && ev.distance ? `${ev.distance} km` : '', ev.place].filter(Boolean).join(' · ')}
          {paceOf(ev) && <> · ⏱ {ev.result} ({formatPace(paceOf(ev)!)})</>}
        </span>
        {ev.notes && <span className="muted small cal-notes">{ev.notes}</span>}
      </button>
      <span className="cal-event-side">
        {!ev.done && !past && <span className="badge primary">{whenText(ev, today)}</span>}
        {ev.alert && !ev.done && !past && <span className="cal-bell" title={describeAlert(ev)}>🔔</span>}
      </span>
    </li>
  );
}

export default function Calendario() {
  const { data, today, update } = useStore();
  const events = data.events;
  const t = parseKey(today);
  const [ym, setYm] = useState<[number, number]>([t.getFullYear(), t.getMonth()]);
  const [selected, setSelected] = useState<DayKey>(today);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [filter, setFilter] = useState<'todos' | EventKind>('todos');

  const shown = filter === 'todos' ? events : events.filter((e) => e.kind === filter);
  const byDay = useMemo(() => eventsByDay(shown), [shown]);
  const grid = monthGrid(ym[0], ym[1]);
  const next = upcoming(shown, today, 6);
  const dayEvents = byDay[selected] || [];
  const races = events.filter((e) => e.kind === 'corrida');
  const racesDone = races.filter((e) => e.done || e.date < today);
  const kmDone = racesDone.reduce((s, e) => s + (parseFloat(e.distance || '') || 0), 0);
  const paces = racesDone.map((e) => paceOf(e)).filter((p): p is number => p !== null);
  const bestPace = paces.length ? Math.min(...paces) : null;
  const longest = racesDone.reduce((m, e) => Math.max(m, parseFloat(e.distance || '') || 0), 0);

  const move = (n: number) => setYm(([y, m]) => {
    const d = new Date(y, m + n, 1);
    return [d.getFullYear(), d.getMonth()];
  });
  const goToday = () => {
    setYm([t.getFullYear(), t.getMonth()]);
    setSelected(today);
  };
  const save = (d: Draft) => {
    update((x) => {
      if (d.id) {
        const i = x.events.findIndex((e) => e.id === d.id);
        if (i >= 0) x.events[i] = { ...x.events[i], ...d, id: d.id };
      } else {
        x.events.push({ ...d, id: uid() });
      }
    });
    setSelected(d.date);
    const dd = parseKey(d.date);
    setYm([dd.getFullYear(), dd.getMonth()]);
    setEditing(null);
  };
  const remove = (id: string) => {
    update((x) => { x.events = x.events.filter((e) => e.id !== id); });
    setEditing(null);
  };
  const toggle = (id: string) => update((x) => {
    const e = x.events.find((ev) => ev.id === id);
    if (e) e.done = !e.done;
  });
  const openNew = (kind: EventKind = 'compromisso') => setEditing(blank(selected < today ? today : selected, kind));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Calendário</h1>
          <p className="muted">
            {next.length ? `Próximo: ${KIND[next[0].kind].icon} ${next[0].title} · ${whenText(next[0], today)}` : 'Marque seus compromissos e corridas.'}
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => openNew('corrida')}>🏃 Nova corrida</button>
          <button className="btn primary" onClick={() => openNew('compromisso')}><Icon name="plus" size={18} /> Novo compromisso</button>
        </div>
      </header>

      <div className="cal-layout">
        <section className="card cal-card">
          <div className="cal-head">
            <button className="icon-btn" onClick={() => move(-1)} title="Mês anterior"><Icon name="left" size={18} /></button>
            <h2>{monthName(ym[0], ym[1])}</h2>
            <button className="icon-btn" onClick={() => move(1)} title="Próximo mês"><Icon name="right" size={18} /></button>
            <button className="btn sm" onClick={goToday}>Hoje</button>
            <div className="segmented cal-filter">
              {(['todos', 'compromisso', 'corrida'] as const).map((k) => (
                <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
                  {k === 'todos' ? 'Todos' : `${KIND[k].icon} ${KIND[k].label}s`}
                </button>
              ))}
            </div>
          </div>
          <div className="cal-grid">
            {WEEKDAYS_NAME.map((w) => <span key={w} className="cal-wd">{w}</span>)}
            {grid.map((key) => {
              const d = parseKey(key);
              const evs = byDay[key] || [];
              const out = d.getMonth() !== ym[1];
              return (
                <button
                  key={key}
                  className={`cal-day ${out ? 'out' : ''} ${key === today ? 'today' : ''} ${key === selected ? 'sel' : ''} ${key < today ? 'past' : ''}`}
                  onClick={() => setSelected(key)}
                  onDoubleClick={() => setEditing(blank(key))}
                  title="Clique para ver · duplo clique para adicionar"
                >
                  <span className="cal-num">{d.getDate()}</span>
                  <span className="cal-chips">
                    {evs.slice(0, 3).map((e) => (
                      <span key={e.id} className={`cal-chip ${e.kind} ${e.done ? 'done' : ''}`}>
                        {KIND[e.kind].icon}<span className="cal-chip-text"> {e.time ? `${e.time} ` : ''}{e.title}</span>
                      </span>
                    ))}
                    {evs.length > 3 && <span className="cal-more">+{evs.length - 3}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="cal-side">
          <section className="card">
            <div className="card-head">
              <h2>{formatLong(selected)}</h2>
              {!editing && <button className="btn sm" onClick={() => setEditing(blank(selected))}><Icon name="plus" size={14} /> Adicionar</button>}
            </div>
            {editing ? (
              <EventForm
                key={editing.id || 'novo'}
                initial={editing}
                onSave={save}
                onCancel={() => setEditing(null)}
                onDelete={editing.id ? () => remove(editing.id!) : undefined}
              />
            ) : dayEvents.length ? (
              <ul className="list">
                {dayEvents.map((ev) => (
                  <EventItem key={ev.id} ev={ev} today={today} onEdit={() => setEditing(ev)} onToggle={() => toggle(ev.id)} />
                ))}
              </ul>
            ) : (
              <Empty>Nada marcado neste dia. Clique em Adicionar (ou dê dois cliques no dia).</Empty>
            )}
          </section>

          <section className="card">
            <div className="card-head"><h2>Próximos</h2></div>
            {next.length ? (
              <ul className="list">
                {next.map((ev) => (
                  <li key={ev.id} className={`cal-next ${ev.kind}`} onClick={() => { const d = parseKey(ev.date); setYm([d.getFullYear(), d.getMonth()]); setSelected(ev.date); }}>
                    <span className="cal-next-date">
                      <b>{parseKey(ev.date).getDate()}</b>
                      <small>{parseKey(ev.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small>
                    </span>
                    <span className="cal-next-main">
                      <b>{KIND[ev.kind].icon} {ev.title}</b>
                      <span className="muted small">{whenText(ev, today)}{ev.kind === 'corrida' && ev.distance ? ` · ${ev.distance} km` : ''}</span>
                    </span>
                    {daysUntil(ev.date, today) <= 3 && <span className="badge warning">em breve</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nenhum compromisso pela frente.</Empty>
            )}
          </section>

          {races.length > 0 && (
            <section className="card">
              <div className="card-head"><h2>🏃 Corridas</h2></div>
              <div className="cal-stats">
                <div><b>{racesDone.length}</b><span className="muted small">feitas</span></div>
                <div><b>{races.length - racesDone.length}</b><span className="muted small">marcadas</span></div>
                <div><b>{kmDone.toLocaleString('pt-BR')} km</b><span className="muted small">percorridos</span></div>
                {bestPace !== null && <div><b>{formatPace(bestPace)}</b><span className="muted small">melhor pace</span></div>}
                {longest > 0 && <div><b>{longest.toLocaleString('pt-BR')} km</b><span className="muted small">maior distância</span></div>}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
