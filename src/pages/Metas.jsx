import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Check, Empty, Progress, fmtValue, pct } from '../components/ui.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { goalDone, uid } from '../store/model.js';

const num = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function DailyGoalForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { title: '', type: 'check', target: 20, unit: 'páginas', step: 1 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    onSave({
      ...f,
      title: f.title.trim(),
      target: Math.max(1, num(f.target)),
      step: Math.max(0.01, num(f.step) || 1),
      unit: (f.unit || '').trim(),
    });
  };
  return (
    <form className="field" style={{ gap: 10 }} onSubmit={submit}>
      <div className="row">
        <input className="input" placeholder='Ex.: "Ler 20 páginas"' value={f.title} onChange={set('title')} autoFocus={!!initial} />
        <div className="segmented">
          <button type="button" className={f.type === 'check' ? 'on' : ''} onClick={() => setF({ ...f, type: 'check' })}>Checkbox</button>
          <button type="button" className={f.type === 'count' ? 'on' : ''} onClick={() => setF({ ...f, type: 'count' })}>Contador</button>
        </div>
      </div>
      {f.type === 'count' && (
        <div className="row">
          <label className="field"><span>Meta</span><input className="input w-num" inputMode="decimal" value={f.target} onChange={set('target')} /></label>
          <label className="field"><span>Unidade</span><input className="input w-num" placeholder="min, páginas…" value={f.unit} onChange={set('unit')} /></label>
          <label className="field"><span>Somar por clique</span><input className="input w-num" inputMode="decimal" value={f.step} onChange={set('step')} /></label>
        </div>
      )}
      <div className="row">
        <button className="btn primary" type="submit"><Icon name={initial ? 'check' : 'plus'} size={18} /> {initial ? 'Salvar' : 'Adicionar meta diária'}</button>
        {onCancel && <button className="btn" type="button" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}

function LongGoalForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { title: '', target: 1000, current: 0, unit: 'R$' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    onSave({ ...f, title: f.title.trim(), target: Math.max(0.01, num(f.target)), current: num(f.current), unit: (f.unit || '').trim() });
  };
  return (
    <form className="field" style={{ gap: 10 }} onSubmit={submit}>
      <input className="input" placeholder='Ex.: "Juntar R$ 1000"' value={f.title} onChange={set('title')} autoFocus={!!initial} />
      <div className="row">
        <label className="field"><span>Valor atual</span><input className="input w-num" inputMode="decimal" value={f.current} onChange={set('current')} /></label>
        <label className="field"><span>Meta</span><input className="input w-num" inputMode="decimal" value={f.target} onChange={set('target')} /></label>
        <label className="field"><span>Unidade</span><input className="input w-num" placeholder="R$, km, livros…" value={f.unit} onChange={set('unit')} /></label>
      </div>
      <div className="row">
        <button className="btn primary" type="submit"><Icon name={initial ? 'check' : 'plus'} size={18} /> {initial ? 'Salvar' : 'Adicionar meta'}</button>
        {onCancel && <button className="btn" type="button" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}

function LongGoalCard({ g, onEdit, onRemove, onChange }) {
  const [amount, setAmount] = useState('');
  const p = pct(g.current, g.target);
  const apply = (sign) => {
    const v = num(amount);
    if (!v) return;
    onChange(Math.max(0, +(g.current + sign * v).toFixed(2)));
    setAmount('');
  };
  return (
    <div className="card">
      <div className="card-head">
        <h2>{g.title}</h2>
        <div className="row" style={{ gap: 2 }}>
          {p >= 100 && <span className="badge success">Concluída 🎉</span>}
          <button className="icon-btn" title="Editar" onClick={onEdit}><Icon name="edit" size={18} /></button>
          <button className="icon-btn danger" title="Apagar" onClick={onRemove}><Icon name="trash" size={18} /></button>
        </div>
      </div>
      <Progress value={g.current} max={g.target} variant={p >= 100 ? 'success' : ''} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span><strong>{fmtValue(g.current, g.unit)}</strong> <span className="muted">de {fmtValue(g.target, g.unit)}</span></span>
        <span className="badge primary">{p}%</span>
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); apply(1); }}>
        <input className="input" inputMode="decimal" placeholder="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="btn sm" type="button" onClick={() => apply(-1)} title="Tirar"><Icon name="minus" size={16} /></button>
        <button className="btn sm primary" type="submit" title="Somar"><Icon name="plus" size={16} /></button>
      </form>
    </div>
  );
}

export default function Metas() {
  const { data, today, day, update } = useStore();
  const [editDaily, setEditDaily] = useState(null);
  const [editLong, setEditLong] = useState(null);
  const [showLongForm, setShowLongForm] = useState(false);

  const daily = data.dailyGoals;
  const doneCount = daily.filter((g) => goalDone(g, day.goals[g.id])).length;

  const setProgress = (id, v) => update((d) => { d.days[today].goals[id] = Math.max(0, v); });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Metas</h1>
          <p className="muted">{doneCount} de {daily.length} metas diárias cumpridas hoje</p>
        </div>
      </header>

      <section className="card">
        <div className="card-head"><h2>Metas diárias</h2></div>
        <DailyGoalForm onSave={(g) => update((d) => d.dailyGoals.push({ ...g, id: uid() }))} key={daily.length} />
        {daily.length ? (
          <ul className="list">
            {daily.map((g) => {
              const v = day.goals[g.id] || 0;
              const ok = goalDone(g, v);
              if (editDaily === g.id) {
                return (
                  <li key={g.id} className="item" style={{ display: 'block' }}>
                    <DailyGoalForm
                      initial={g}
                      onCancel={() => setEditDaily(null)}
                      onSave={(ng) => { update((d) => { Object.assign(d.dailyGoals.find((x) => x.id === g.id), ng); }); setEditDaily(null); }}
                    />
                  </li>
                );
              }
              return (
                <li key={g.id} className={`item ${ok ? 'done' : ''}`}>
                  {g.type === 'check' ? (
                    <Check on={ok} onClick={() => setProgress(g.id, ok ? 0 : 1)} label="Cumprida" />
                  ) : (
                    <span className={`badge ${ok ? 'success' : 'primary'}`}>{pct(v, g.target)}%</span>
                  )}
                  <span className="item-title">
                    {g.title}
                    {g.type === 'count' && (
                      <div style={{ marginTop: 6 }}><Progress value={v} max={g.target} variant={ok ? 'success' : ''} /></div>
                    )}
                  </span>
                  {g.type === 'count' && (
                    <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                      <button className="icon-btn" title={`-${g.step}`} onClick={() => setProgress(g.id, +(v - g.step).toFixed(2))}><Icon name="minus" size={18} /></button>
                      <span className="small" style={{ minWidth: 70, textAlign: 'center' }}>{fmtValue(v)}/{fmtValue(g.target, g.unit)}</span>
                      <button className="icon-btn" title={`+${g.step}`} onClick={() => setProgress(g.id, +(v + g.step).toFixed(2))}><Icon name="plus" size={18} /></button>
                    </div>
                  )}
                  <div className="item-actions">
                    <button className="icon-btn" title="Editar" onClick={() => setEditDaily(g.id)}><Icon name="edit" size={18} /></button>
                    <button
                      className="icon-btn danger"
                      title="Apagar"
                      onClick={() => confirm(`Apagar a meta "${g.title}"?`) && update((d) => { d.dailyGoals = d.dailyGoals.filter((x) => x.id !== g.id); })}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>Crie metas que se repetem todo dia, como “caminhar 30 min”.</Empty>
        )}
      </section>

      <div className="page-header">
        <h2>Metas de longo prazo</h2>
        {!showLongForm && (
          <button className="btn primary" onClick={() => setShowLongForm(true)}><Icon name="plus" size={18} /> Nova meta</button>
        )}
      </div>
      {showLongForm && (
        <div className="card">
          <LongGoalForm
            onCancel={() => setShowLongForm(false)}
            onSave={(g) => { update((d) => d.longGoals.push({ ...g, id: uid() })); setShowLongForm(false); }}
          />
        </div>
      )}
      <section className="grid">
        {data.longGoals.map((g) =>
          editLong === g.id ? (
            <div className="card" key={g.id}>
              <LongGoalForm
                initial={g}
                onCancel={() => setEditLong(null)}
                onSave={(ng) => { update((d) => { Object.assign(d.longGoals.find((x) => x.id === g.id), ng); }); setEditLong(null); }}
              />
            </div>
          ) : (
            <LongGoalCard
              key={g.id}
              g={g}
              onEdit={() => setEditLong(g.id)}
              onRemove={() => confirm(`Apagar a meta "${g.title}"?`) && update((d) => { d.longGoals = d.longGoals.filter((x) => x.id !== g.id); })}
              onChange={(v) => update((d) => { d.longGoals.find((x) => x.id === g.id).current = v; })}
            />
          )
        )}
      </section>
      {!data.longGoals.length && !showLongForm && (
        <div className="card"><Empty>Ex.: “Juntar R$ 1000”. Você atualiza o progresso quando quiser.</Empty></div>
      )}
    </div>
  );
}
