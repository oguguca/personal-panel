import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Check, Empty, Progress } from '../components/ui.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { WEEKDAYS_NAME, WEEKDAYS_SHORT, addDays, weekday } from '../store/dates.js';
import { getDay, uid } from '../store/model.js';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function DayPicker({ value, onChange }) {
  const all = value.length === 7;
  const toggle = (d) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort());
  return (
    <div className="chips">
      <button type="button" className={`chip ${all ? 'on' : ''}`} onClick={() => onChange(all ? [] : ALL_DAYS)}>
        Todo dia
      </button>
      {ALL_DAYS.map((d) => (
        <button
          type="button"
          key={d}
          className={`chip ${value.includes(d) ? 'on' : ''}`}
          onClick={() => toggle(d)}
          title={WEEKDAYS_NAME[d]}
        >
          {WEEKDAYS_SHORT[d]}
        </button>
      ))}
    </div>
  );
}

export function describeDays(days) {
  if (days.length === 7) return 'Todo dia';
  if (days.join() === '1,2,3,4,5') return 'Dias úteis';
  if (days.join() === '0,6') return 'Fins de semana';
  return days.map((d) => WEEKDAYS_NAME[d]).join(', ');
}

export default function Tarefas() {
  const { data, today, day, update } = useStore();
  const [title, setTitle] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [days, setDays] = useState(ALL_DAYS);
  const [editing, setEditing] = useState(null); // { id, title, days? , kind }
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const tomorrow = addDays(today, 1);
  const tasks = day.tasks.filter((t) => !t.movedTo);
  const done = tasks.filter((t) => t.done).length;
  const tomorrowTasks = data.days[tomorrow]?.tasks || [];

  const mutTasks = (fn) => update((d) => fn(d.days[today].tasks, d));

  const add = (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (recurring) {
      if (!days.length) return;
      update((d) => {
        const r = { id: uid(), title: t, days };
        d.recurring.push(r);
        if (days.includes(weekday(today))) {
          d.days[today].tasks.push({ id: uid(), title: t, done: false, recurringId: r.id });
        }
      });
    } else {
      mutTasks((list) => list.push({ id: uid(), title: t, done: false }));
    }
    setTitle('');
  };

  const toggle = (id) => mutTasks((list) => { const t = list.find((x) => x.id === id); t.done = !t.done; });
  const remove = (id) => mutTasks((list) => list.splice(list.findIndex((x) => x.id === id), 1));

  // Reordena considerando só as tarefas visíveis (as "movidas" ficam onde estão).
  const reorder = (fromId, toId) =>
    mutTasks((list) => {
      const from = list.findIndex((x) => x.id === fromId);
      const to = list.findIndex((x) => x.id === toId);
      if (from < 0 || to < 0 || from === to) return;
      const [it] = list.splice(from, 1);
      list.splice(to, 0, it);
    });
  const move = (id, dir) => {
    const i = tasks.findIndex((t) => t.id === id);
    const j = i + dir;
    if (j >= 0 && j < tasks.length) reorder(id, tasks[j].id);
  };

  const postpone = (id) =>
    update((d) => {
      const list = d.days[today].tasks;
      const i = list.findIndex((x) => x.id === id);
      const [t] = list.splice(i, 1);
      getDay(d, tomorrow).tasks.push({ id: uid(), title: t.title, done: false, carried: true });
    });
  const bringBack = (id) =>
    update((d) => {
      const list = d.days[tomorrow].tasks;
      const i = list.findIndex((x) => x.id === id);
      const [t] = list.splice(i, 1);
      d.days[today].tasks.push({ ...t, carried: false });
    });

  const saveEdit = () => {
    const t = editing.title.trim();
    if (!t) return;
    if (editing.kind === 'task') {
      mutTasks((list) => { list.find((x) => x.id === editing.id).title = t; });
    } else {
      if (!editing.days.length) return;
      update((d) => {
        const r = d.recurring.find((x) => x.id === editing.id);
        r.title = t;
        r.days = editing.days;
        const inst = d.days[today].tasks.find((x) => x.recurringId === r.id);
        if (inst) inst.title = t;
        else if (r.days.includes(weekday(today))) {
          d.days[today].tasks.push({ id: uid(), title: t, done: false, recurringId: r.id });
        }
      });
    }
    setEditing(null);
  };

  const removeRecurring = (id) => {
    if (!confirm('Apagar esta tarefa recorrente? A de hoje também sai, se não estiver feita.')) return;
    update((d) => {
      d.recurring = d.recurring.filter((r) => r.id !== id);
      d.days[today].tasks = d.days[today].tasks.filter((t) => t.recurringId !== id || t.done);
    });
  };

  const editRow = (
    <form className="inline-edit" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
      <input
        className="input"
        autoFocus
        value={editing?.title || ''}
        onChange={(e) => setEditing({ ...editing, title: e.target.value })}
        onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
      />
      {editing?.kind === 'recurring' && (
        <DayPicker value={editing.days} onChange={(v) => setEditing({ ...editing, days: v })} />
      )}
      <button className="icon-btn" type="submit" title="Salvar"><Icon name="check" /></button>
      <button className="icon-btn" type="button" title="Cancelar" onClick={() => setEditing(null)}><Icon name="x" /></button>
    </form>
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Tarefas</h1>
          <p className="muted">{done} de {tasks.length} feitas hoje</p>
        </div>
      </header>

      <form className="card" onSubmit={add}>
        <div className="row">
          <input
            className="input"
            placeholder="Nova tarefa… (Enter para adicionar)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button className="btn primary" type="submit"><Icon name="plus" size={18} /> Adicionar</button>
        </div>
        <label className="row small" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          <Icon name="repeat" size={16} /> Repetir
        </label>
        {recurring && <DayPicker value={days} onChange={setDays} />}
      </form>

      <section className="card">
        <div className="card-head"><h2>Hoje</h2></div>
        <Progress value={done} max={tasks.length} variant="success" />
        {tasks.length ? (
          <ul className="list">
            {tasks.map((t, i) => (
              <li
                key={t.id}
                className={`item ${t.done ? 'done' : ''} ${dragId === t.id ? 'dragging' : ''} ${overId === t.id && dragId !== t.id ? 'drop-target' : ''}`}
                draggable={editing?.id !== t.id}
                onDragStart={() => setDragId(t.id)}
                onDragOver={(e) => { e.preventDefault(); setOverId(t.id); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onDrop={(e) => { e.preventDefault(); if (dragId) reorder(dragId, t.id); setDragId(null); setOverId(null); }}
              >
                <span className="grip" title="Arraste para reordenar"><Icon name="grip" size={16} /></span>
                <Check on={t.done} onClick={() => toggle(t.id)} label="Marcar como feita" />
                {editing?.id === t.id ? (
                  editRow
                ) : (
                  <>
                    <span className="item-title" onDoubleClick={() => setEditing({ id: t.id, title: t.title, kind: 'task' })}>
                      {t.title}{' '}
                      {t.recurringId && <span className="badge primary"><Icon name="repeat" size={12} /> recorrente</span>}
                      {t.carried && <span className="badge warning">adiada</span>}
                    </span>
                    <div className="item-actions">
                      <button className="icon-btn" title="Subir" disabled={i === 0} onClick={() => move(t.id, -1)}><Icon name="up" size={18} /></button>
                      <button className="icon-btn" title="Descer" disabled={i === tasks.length - 1} onClick={() => move(t.id, 1)}><Icon name="down" size={18} /></button>
                      {!t.recurringId && (
                        <>
                          <button className="icon-btn" title="Editar" onClick={() => setEditing({ id: t.id, title: t.title, kind: 'task' })}><Icon name="edit" size={18} /></button>
                          {!t.done && <button className="icon-btn" title="Passar para amanhã" onClick={() => postpone(t.id)}><Icon name="next" size={18} /></button>}
                        </>
                      )}
                      <button className="icon-btn danger" title="Apagar" onClick={() => remove(t.id)}><Icon name="trash" size={18} /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nada por aqui. Adicione sua primeira tarefa acima.</Empty>
        )}
      </section>

      {tomorrowTasks.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Agendadas para amanhã</h2></div>
          <ul className="list">
            {tomorrowTasks.map((t) => (
              <li key={t.id} className="item">
                <span className="item-title">{t.title}</span>
                <div className="item-actions">
                  <button className="icon-btn" title="Trazer de volta para hoje" onClick={() => bringBack(t.id)}><Icon name="back" size={18} /></button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2><Icon name="repeat" size={18} /> Tarefas recorrentes</h2>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Aparecem sozinhas nos dias escolhidos. Para criar, marque “Repetir” ao adicionar uma tarefa.
        </p>
        {data.recurring.length ? (
          <ul className="list">
            {data.recurring.map((r) => (
              <li key={r.id} className="item">
                {editing?.id === r.id ? (
                  editRow
                ) : (
                  <>
                    <span className="item-title">{r.title}</span>
                    <span className="badge">{describeDays(r.days)}</span>
                    <div className="item-actions">
                      <button className="icon-btn" title="Editar" onClick={() => setEditing({ id: r.id, title: r.title, days: r.days, kind: 'recurring' })}><Icon name="edit" size={18} /></button>
                      <button className="icon-btn danger" title="Apagar" onClick={() => removeRecurring(r.id)}><Icon name="trash" size={18} /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nenhuma tarefa recorrente.</Empty>
        )}
      </section>
    </div>
  );
}
