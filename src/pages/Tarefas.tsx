import { useState, type FormEvent } from 'react';
import Icon from '../components/Icon';
import { Check, Empty, Progress } from '../components/ui';
import { useStore } from '../store/StoreContext';
import { WEEKDAYS_NAME, WEEKDAYS_SHORT, addDays, weekday } from '../store/dates';
import { getDay, uid } from '../store/model';
import { ATTRS, ATTR_BY_ID, XP, guessAttr } from '../store/game';
import type { AttrId, Data, Task } from '../store/types';

type Editing = { id: string; title: string; kind: 'task' } | { id: string; title: string; kind: 'recurring'; days: number[] };

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function DayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const all = value.length === 7;
  const toggle = (d: number) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort());
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

/** Atributo de desenvolvimento pessoal da tarefa (aba Evolução). */
function AttrSelect({ value, onChange }: { value?: AttrId | null; onChange: (a: AttrId | null) => void }) {
  return (
    <select
      className={`attr-select ${value ? 'set' : ''}`}
      value={value || ''}
      onChange={(e) => onChange((e.target.value as AttrId) || null)}
      title="Atributo que esta tarefa desenvolve (aba Evolução)"
    >
      <option value="">+ atributo</option>
      {ATTRS.map((a) => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
    </select>
  );
}

export function describeDays(days: number[]): string {
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
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [attr, setAttr] = useState<AttrId | null>(null); // escolhido à mão
  const [attrManual, setAttrManual] = useState(false);
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const autoAttr = attrManual ? attr : guessAttr(title); // sem escolha: adivinha pelo título

  const tomorrow = addDays(today, 1);
  const tasks = day.tasks.filter((t) => !t.movedTo);
  const done = tasks.filter((t) => t.done).length;
  const tomorrowTasks = data.days[tomorrow]?.tasks || [];

  const mutTasks = (fn: (list: Task[], d: Data) => unknown) => update((d) => fn(d.days[today].tasks, d));

  const add = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const a = autoAttr || null;
    if (recurring) {
      if (!days.length) return;
      update((d) => {
        const r = { id: uid(), title: t, days, attr: a };
        d.recurring.push(r);
        if (days.includes(weekday(today))) {
          d.days[today].tasks.push({ id: uid(), title: t, done: false, recurringId: r.id, attr: a });
        }
      });
    } else {
      mutTasks((list) => list.push({ id: uid(), title: t, done: false, attr: a }));
    }
    setTitle('');
    setAttr(null);
    setAttrManual(false);
  };

  const toggle = (id: string) => {
    const cur = tasks.find((x) => x.id === id);
    if (cur && !cur.done) {
      const a = cur.attr ? ATTR_BY_ID[cur.attr] : null;
      setToast({ key: Date.now(), text: a ? `+${XP.task} XP ${a.emoji} ${a.name}` : `+${XP.taskPlain} XP 🎯 Disciplina` });
    }
    mutTasks((list) => { const t = list.find((x) => x.id === id); if (t) t.done = !t.done; });
  };
  const setTaskAttr = (id: string, a: AttrId | null) =>
    mutTasks((list) => { const t = list.find((x) => x.id === id); if (t) t.attr = a; });
  const setRecurringAttr = (id: string, a: AttrId | null) =>
    update((d) => {
      const r = d.recurring.find((x) => x.id === id);
      if (r) r.attr = a;
      const inst = d.days[today].tasks.find((x) => x.recurringId === id);
      if (inst) inst.attr = a;
    });
  const remove = (id: string) => mutTasks((list) => list.splice(list.findIndex((x) => x.id === id), 1));

  // Reordena considerando só as tarefas visíveis (as "movidas" ficam onde estão).
  const reorder = (fromId: string, toId: string) =>
    mutTasks((list) => {
      const from = list.findIndex((x) => x.id === fromId);
      const to = list.findIndex((x) => x.id === toId);
      if (from < 0 || to < 0 || from === to) return;
      const [it] = list.splice(from, 1);
      list.splice(to, 0, it);
    });
  const move = (id: string, dir: number) => {
    const i = tasks.findIndex((t) => t.id === id);
    const j = i + dir;
    if (j >= 0 && j < tasks.length) reorder(id, tasks[j].id);
  };

  const postpone = (id: string) =>
    update((d) => {
      const list = d.days[today].tasks;
      const i = list.findIndex((x) => x.id === id);
      const [t] = list.splice(i, 1);
      getDay(d, tomorrow).tasks.push({ id: uid(), title: t.title, done: false, carried: true, attr: t.attr || null });
    });
  const bringBack = (id: string) =>
    update((d) => {
      const list = d.days[tomorrow].tasks;
      const i = list.findIndex((x) => x.id === id);
      const [t] = list.splice(i, 1);
      d.days[today].tasks.push({ ...t, carried: false });
    });

  const saveEdit = () => {
    if (!editing) return;
    const t = editing.title.trim();
    if (!t) return;
    if (editing.kind === 'task') {
      mutTasks((list) => { const x = list.find((y) => y.id === editing.id); if (x) x.title = t; });
    } else {
      if (!editing.days.length) return;
      update((d) => {
        const r = d.recurring.find((x) => x.id === editing.id);
        if (!r) return;
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

  const removeRecurring = (id: string) => {
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
        onChange={(e) => editing && setEditing({ ...editing, title: e.target.value })}
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
        <div className="chips" aria-label="Desenvolvimento pessoal">
          <span className="muted small" style={{ alignSelf: 'center' }}>Evolução:</span>
          {ATTRS.map((a) => (
            <button
              type="button"
              key={a.id}
              className={`chip ${autoAttr === a.id ? 'on' : ''}`}
              onClick={() => { setAttrManual(true); setAttr(autoAttr === a.id ? null : a.id); }}
              title={a.how}
            >
              {a.emoji} {a.name}
            </button>
          ))}
        </div>
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
                    <AttrSelect value={t.attr} onChange={(a) => setTaskAttr(t.id, a)} />
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
                    <AttrSelect value={r.attr} onChange={(a) => setRecurringAttr(r.id, a)} />
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
      {toast && <div key={toast.key} className="xp-toast" onAnimationEnd={() => setToast(null)}>{toast.text}</div>}
    </div>
  );
}
