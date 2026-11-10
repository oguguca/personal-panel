// Aba Corrida: registrar treinos e provas, km da semana/mês, recordes, previsão, gráfico e tênis.
import { useMemo, useState, type FormEvent } from 'react';
import BarChart from '../components/BarChart';
import Icon from '../components/Icon';
import { RaceCard, RaceModal } from '../components/RaceDiary';
import { Empty, Progress } from '../components/ui';
import { useStore } from '../store/StoreContext';
import { formatPace, parseDuration, upcoming, whenText } from '../store/calendar';
import { addDays, formatShort } from '../store/dates';
import { uid } from '../store/model';
import {
  DISTANCES, FEELS, QUICK_KM, RUN_TYPES, SHOE_LIMIT_KM,
  avgPace, effortsOf, fmtKm, formatDurationSec, monthKm, personalRecords, predictions, runPace, shoeKm, weekKm, weekStreak, weeklyKm,
} from '../store/running';
import type { CalEvent, Run, RunType, Shoe } from '../store/types';
import type { PageProps } from './types';

type Draft = { id?: string; date: string; km: string; time: string; type: RunType; feel: number; shoeId: string; notes: string };

const toDraft = (r: Run | null, today: string, shoeId = ''): Draft =>
  r
    ? { id: r.id, date: r.date, km: String(r.km).replace('.', ','), time: formatDurationSec(r.seconds), type: r.type, feel: r.feel || 0, shoeId: r.shoeId || '', notes: r.notes || '' }
    : { date: today, km: '', time: '', type: 'leve', feel: 0, shoeId, notes: '' };

function RunForm({ initial, shoes, today, onSave, onCancel, onDelete }: {
  initial: Draft;
  shoes: Shoe[];
  today: string;
  onSave: (r: Omit<Run, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState('');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setF((x) => ({ ...x, [k]: v })); setError(''); };
  const km = parseFloat(f.km.replace(',', '.'));
  const secs = parseDuration(f.time);
  const pace = km > 0 && secs ? formatPace(secs / km) : null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(km > 0)) return setError('Informe a distância em km (ex.: 5 ou 7,5).');
    if (!secs) return setError('Informe o tempo em mm:ss ou h:mm:ss (ex.: 32:15).');
    onSave({ id: f.id, date: f.date, km: Math.round(km * 100) / 100, seconds: secs, type: f.type, feel: f.feel || undefined, shoeId: f.shoeId || undefined, notes: f.notes.trim() || undefined });
  };
  const yesterday = addDays(today, -1);

  return (
    <form className="card run-form" onSubmit={submit}>
      <div className="card-head"><h2>{f.id ? 'Editar corrida' : '🏃 Registrar corrida'}</h2></div>
      <div className="field">
        <span>Quando?</span>
        <div className="chips">
          <button type="button" className={`chip ${f.date === today ? 'on' : ''}`} onClick={() => set('date', today)}>Hoje</button>
          <button type="button" className={`chip ${f.date === yesterday ? 'on' : ''}`} onClick={() => set('date', yesterday)}>Ontem</button>
          <input className="input run-date" type="date" max={today} value={f.date} onChange={(e) => e.target.value && set('date', e.target.value)} aria-label="Data" />
        </div>
      </div>
      <div className="field">
        <span>Tipo</span>
        <div className="chips">
          {(Object.keys(RUN_TYPES) as RunType[]).map((t) => (
            <button type="button" key={t} className={`chip ${f.type === t ? 'on' : ''}`} onClick={() => set('type', t)}>{RUN_TYPES[t].icon} {RUN_TYPES[t].label}</button>
          ))}
        </div>
      </div>
      <div className="run-main">
        <label className="field">
          <span>Distância (km)</span>
          <input className="input run-big" inputMode="decimal" placeholder="5" value={f.km} onChange={(e) => set('km', e.target.value)} autoFocus={!f.id} />
        </label>
        <label className="field">
          <span>Tempo</span>
          <input className="input run-big" placeholder="28:30" value={f.time} onChange={(e) => set('time', e.target.value)} />
        </label>
        <div className="run-pace">
          <span className="muted small">Pace</span>
          <b>{pace || '—'}</b>
        </div>
      </div>
      <div className="chips">
        {QUICK_KM.map((k) => (
          <button type="button" key={k} className={`chip ${km === k ? 'on' : ''}`} onClick={() => set('km', String(k).replace('.', ','))}>
            {k === 21.1 ? '21,1 km' : `${k} km`}
          </button>
        ))}
      </div>
      <div className="field">
        <span>Como foi?</span>
        <div className="chips">
          {FEELS.map((e, i) => (
            <button type="button" key={e} className={`chip run-feel ${f.feel === i + 1 ? 'on' : ''}`} onClick={() => set('feel', f.feel === i + 1 ? 0 : i + 1)} aria-label={`Sensação ${i + 1} de 5`}>{e}</button>
          ))}
        </div>
      </div>
      {shoes.filter((s) => !s.retired).length > 0 && (
        <label className="field">
          <span>Tênis</span>
          <select className="input" value={f.shoeId} onChange={(e) => set('shoeId', e.target.value)}>
            <option value="">— nenhum —</option>
            {shoes.filter((s) => !s.retired || s.id === f.shoeId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )}
      <label className="field"><span>Observações (opcional)</span><textarea className="input" rows={2} placeholder="Percurso, clima, tiros 6×400 m…" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></label>
      {error && <p className="cal-error" role="alert">{error}</p>}
      <div className="row">
        <button className="btn primary" type="submit"><Icon name="check" size={16} /> Salvar</button>
        <button className="btn" type="button" onClick={onCancel}>Cancelar</button>
        {onDelete && <button className="btn danger" type="button" onClick={onDelete} style={{ marginLeft: 'auto' }}><Icon name="trash" size={16} /> Apagar</button>}
      </div>
    </form>
  );
}

export default function Corrida({ go }: PageProps) {
  const { data, today, update } = useStore();
  const { runs, shoes, monthGoalKm } = data.running;
  const [editing, setEditing] = useState<Draft | null>(null);
  const [newShoe, setNewShoe] = useState('');
  const [goalEdit, setGoalEdit] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [race, setRace] = useState<CalEvent | 'nova' | null>(null);
  const [raceTab, setRaceTab] = useState<'feitas' | 'proximas'>('feitas');
  const races = data.events.filter((e) => e.kind === 'corrida');
  const racesDone = races.filter((e) => e.done || e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const racesNext = races.filter((e) => !(e.done || e.date < today)).sort((a, b) => a.date.localeCompare(b.date));
  const raceList = raceTab === 'feitas' ? racesDone : racesNext;

  const sorted = useMemo(() => [...runs].sort((a, b) => b.date.localeCompare(a.date)), [runs]);
  const efforts = useMemo(() => effortsOf(runs, data.events), [runs, data.events]);
  const prs = useMemo(() => personalRecords(efforts), [efforts]);
  const pred = useMemo(() => predictions(efforts, today), [efforts, today]);
  const weeks = weeklyKm(runs, today, 10);
  const nextRace = upcoming(data.events.filter((e) => e.kind === 'corrida'), today, 1)[0];
  const wk = weekKm(runs, today);
  const mk = monthKm(runs, today);
  const pace = avgPace(runs, today);
  const streak = weekStreak(runs, today);
  const lastShoe = sorted.find((r) => r.shoeId)?.shoeId || '';

  const save = (r: Omit<Run, 'id'> & { id?: string }) => {
    update((d) => {
      if (r.id) {
        const i = d.running.runs.findIndex((x) => x.id === r.id);
        if (i >= 0) d.running.runs[i] = { ...r, id: r.id };
      } else d.running.runs.push({ ...r, id: uid() });
    });
    setEditing(null);
  };
  const remove = (id: string) => {
    if (!window.confirm('Apagar esta corrida?')) return;
    update((d) => { d.running.runs = d.running.runs.filter((x) => x.id !== id); });
    setEditing(null);
  };
  const addShoe = (e: FormEvent) => {
    e.preventDefault();
    if (!newShoe.trim()) return;
    update((d) => { d.running.shoes.push({ id: uid(), name: newShoe.trim(), limitKm: SHOE_LIMIT_KM }); });
    setNewShoe('');
  };
  const patchShoe = (id: string, fn: (s: Shoe) => void) => update((d) => { const s = d.running.shoes.find((x) => x.id === id); if (s) fn(s); });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Corrida</h1>
          <p className="muted">
            {runs.length ? `${runs.length} corrida(s) registrada(s)${streak > 1 ? ` · 🔥 ${streak} semanas seguidas correndo` : ''}` : 'Registre seus treinos e acompanhe sua evolução.'}
          </p>
        </div>
        {!editing && <button className="btn primary" onClick={() => setEditing(toDraft(null, today, lastShoe))}><Icon name="plus" size={18} /> Registrar corrida</button>}
      </header>

      {editing && (
        <RunForm
          key={editing.id || 'nova'}
          initial={editing}
          shoes={shoes}
          today={today}
          onSave={save}
          onCancel={() => setEditing(null)}
          onDelete={editing.id ? () => remove(editing.id!) : undefined}
        />
      )}

      <section className="run-stats">
        <div className="card run-stat"><span className="muted small">Esta semana</span><b>{fmtKm(wk)}</b></div>
        <div className="card run-stat">
          <span className="muted small">
            Este mês {monthGoalKm ? `· meta ${fmtKm(monthGoalKm)}` : ''}
            <button className="link small" onClick={() => setGoalEdit(!goalEdit)}>{monthGoalKm ? 'mudar' : 'definir meta'}</button>
          </span>
          <b>{fmtKm(mk)}</b>
          {monthGoalKm > 0 && <Progress value={mk} max={monthGoalKm} variant={mk >= monthGoalKm ? 'success' : ''} />}
          {goalEdit && (
            <div className="row">
              <input className="input w-num" type="number" min={0} placeholder="km" defaultValue={monthGoalKm || ''}
                onKeyDown={(e) => { if (e.key === 'Enter') { update((d) => { d.running.monthGoalKm = Math.max(0, Number((e.target as HTMLInputElement).value) || 0); }); setGoalEdit(false); } }} />
              <span className="muted small">Enter para salvar (0 = sem meta)</span>
            </div>
          )}
        </div>
        <div className="card run-stat"><span className="muted small">Pace médio (30 dias)</span><b>{pace ? formatPace(pace) : '—'}</b></div>
        <div className="card run-stat"><span className="muted small">Total</span><b>{fmtKm(runs.reduce((s, r) => s + r.km, 0))}</b></div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>🏅 Minhas provas</h2>
          <button className="btn sm primary" onClick={() => setRace('nova')}><Icon name="plus" size={14} /> Adicionar prova</button>
        </div>
        <div className="segmented" style={{ alignSelf: 'flex-start' }}>
          <button className={raceTab === 'feitas' ? 'on' : ''} onClick={() => setRaceTab('feitas')}>Já fui ({racesDone.length})</button>
          <button className={raceTab === 'proximas' ? 'on' : ''} onClick={() => setRaceTab('proximas')}>Próximas ({racesNext.length})</button>
        </div>
        {raceList.length ? (
          <div className="race-grid">
            {raceList.map((ev) => <RaceCard key={ev.id} ev={ev} today={today} onOpen={() => setRace(ev)} />)}
          </div>
        ) : (
          <Empty>
            {raceTab === 'feitas'
              ? 'Adicione as provas que você já correu: tempo, foto da corrida, suas fotos e como foi.'
              : 'Nenhuma prova marcada. Adicione uma ou marque no Calendário.'}
          </Empty>
        )}
      </section>
      {race && <RaceModal ev={race === 'nova' ? null : race} onClose={() => setRace(null)} />}

      <div className="grid">
        <section className="card">
          <div className="card-head">
            <h2>🏅 Próxima prova</h2>
            <button className="link" onClick={() => go('calendario')}>Calendário</button>
          </div>
          {nextRace ? (
            <div className="run-next">
              <b>{nextRace.title}</b>
              <span className="muted">{formatShort(nextRace.date)}{nextRace.time ? ` às ${nextRace.time}` : ''}{nextRace.distance ? ` · ${nextRace.distance} km` : ''}</span>
              <span className="badge warning">{whenText(nextRace, today)}</span>
              {pred && nextRace.distance && (
                <span className="muted small">
                  Previsão: <b>{formatDurationSec(pred.base.seconds * Math.pow(parseFloat(nextRace.distance) / pred.base.km, 1.06))}</b>
                </span>
              )}
            </div>
          ) : (
            <Empty>Nenhuma prova marcada. Adicione no <button className="link" onClick={() => go('calendario')}>Calendário</button>.</Empty>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>🏆 Recordes pessoais</h2></div>
          <ul className="list">
            {DISTANCES.map((d) => {
              const pr = prs[d.key];
              return (
                <li key={d.key} className="item">
                  <span className="item-title">{d.label}</span>
                  {pr ? (
                    <>
                      <span className="muted small">{formatShort(pr.date)}{pr.race ? ' · prova' : ''}</span>
                      <span className="badge success">{formatDurationSec(pr.time)} · {formatPace(pr.time / d.km)}</span>
                    </>
                  ) : <span className="muted small">sem marca ainda</span>}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <div className="card-head"><h2>🔮 Previsão de tempo</h2></div>
          {pred ? (
            <>
              <ul className="list">
                {DISTANCES.map((d) => (
                  <li key={d.key} className="item">
                    <span className="item-title">{d.label}</span>
                    <span className="badge primary">{formatDurationSec(pred.times[d.key])} · {formatPace(pred.times[d.key] / d.km)}</span>
                  </li>
                ))}
              </ul>
              <p className="muted small">Com base em {fmtKm(pred.base.km)} em {formatDurationSec(pred.base.seconds)} ({formatShort(pred.base.date)}), fórmula de Riegel. É uma estimativa.</p>
            </>
          ) : (
            <Empty>Registre uma corrida de 3 km ou mais para ver a previsão.</Empty>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>km por semana</h2><span className="muted small">últimas 10 semanas</span></div>
        <BarChart
          items={weeks.map((w) => ({ key: w.start, label: formatShort(w.start), value: Math.round(w.km * 10) / 10, title: `Semana de ${formatShort(w.start)}: ${fmtKm(w.km)}` }))}
          max={Math.max(10, ...weeks.map((w) => Math.ceil(w.km)))}
          color="#f97316"
          format={(v) => `${v}`}
        />
      </section>

      <div className="run-bottom">
        <section className="card">
          <div className="card-head"><h2>Histórico</h2><span className="muted small">clique para editar</span></div>
          {sorted.length ? (
            <ul className="list">
              {sorted.slice(0, showAll ? sorted.length : 10).map((r) => (
                <li key={r.id} className="item run-item" onClick={() => setEditing(toDraft(r, today))} title="Clique para editar">
                  <span className="run-type">{RUN_TYPES[r.type].icon}</span>
                  <span className="item-title">
                    <b>{fmtKm(r.km)}</b> em {formatDurationSec(r.seconds)}
                    <span className="muted small"> · {formatShort(r.date)} · {RUN_TYPES[r.type].label}{r.feel ? ` ${FEELS[r.feel - 1]}` : ''}</span>
                  </span>
                  <span className="badge primary">{runPace(r)}</span>
                </li>
              ))}
              {sorted.length > 10 && (
                <li><button className="btn sm" onClick={() => setShowAll(!showAll)}>{showAll ? 'Mostrar menos' : `Ver todas (${sorted.length})`}</button></li>
              )}
            </ul>
          ) : (
            <Empty>Nenhuma corrida ainda. Clique em Registrar corrida.</Empty>
          )}
        </section>

        <section className="card">
          <div className="card-head"><h2>👟 Tênis</h2></div>
          {shoes.length > 0 && (
            <ul className="list run-shoes">
              {shoes.map((s) => {
                const km = shoeKm(s, runs);
                const worn = km >= s.limitKm;
                return (
                  <li key={s.id} className={`run-shoe ${s.retired ? 'retired' : ''}`}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <b>{s.name}{s.retired ? ' (aposentado)' : ''}</b>
                      <span className={`badge ${worn ? 'warning' : ''}`}>{fmtKm(km)} de {fmtKm(s.limitKm)}</span>
                    </div>
                    <Progress value={km} max={s.limitKm} variant={worn ? 'warning' : ''} />
                    <div className="row">
                      {worn && !s.retired && <span className="muted small">Hora de trocar: o amortecimento já gastou.</span>}
                      <button className="link small" onClick={() => patchShoe(s.id, (x) => { x.retired = !x.retired; })}>{s.retired ? 'Voltar a usar' : 'Aposentar'}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <form className="row" onSubmit={addShoe}>
            <input className="input" placeholder="Novo tênis (ex.: Nike Pegasus 41)" value={newShoe} onChange={(e) => setNewShoe(e.target.value)} />
            <button className="btn" type="submit"><Icon name="plus" size={16} /> Adicionar</button>
          </form>
          <p className="muted small">Tênis de corrida duram de 500 a 800 km. O app avisa quando passar de {SHOE_LIMIT_KM} km.</p>
        </section>
      </div>
    </div>
  );
}
