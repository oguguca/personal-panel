// Aba Corrida: topo com km e próxima prova, abas (visão geral, provas, treinos, tênis),
// recordes em medalhas, previsão interativa, evolução do pace e mural de provas.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import BarChart from '../components/BarChart';
import Icon, { type IconName } from '../components/Icon';
import { Lightbox, Photo } from '../components/Photos';
import { RaceCard, RaceModal } from '../components/RaceDiary';
import { deleteImage, saveImage } from '../store/images';
import { Empty, Progress } from '../components/ui';
import { useStore } from '../store/StoreContext';
import { daysUntil, formatPace, parseDuration, upcoming } from '../store/calendar';
import { addDays, formatShort, parseKey } from '../store/dates';
import { uid } from '../store/model';
import {
  DISTANCES, FEELS, QUICK_KM, RUN_TYPES, SHOE_LIMIT_KM,
  activitiesOf, avgPace, effortsOf, fmtDist, fmtKm, formatDurationSec, monthKm, personalRecords, predictFor, predictions,
  raceIsDone, raceKm, racePaces, runPace, shoeKm, weekKm, weekStreak, weeklyKm, type Effort,
} from '../store/running';
import type { CalEvent, Run, RunType, Shoe } from '../store/types';
import type { PageProps } from './types';

type Draft = { id?: string; date: string; km: string; time: string; type: RunType; feel: number; shoeId: string; notes: string; place: string; photos: string[] };

const toDraft = (r: Run | null, today: string, shoeId = ''): Draft =>
  r
    ? { id: r.id, date: r.date, km: String(r.km).replace('.', ','), time: formatDurationSec(r.seconds), type: r.type, feel: r.feel || 0, shoeId: r.shoeId || '', notes: r.notes || '', place: r.place || '', photos: r.photos || [] }
    : { date: today, km: '', time: '', type: 'leve', feel: 0, shoeId, notes: '', place: '', photos: [] };

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
    removed.current.forEach((id) => deleteImage(id));
    added.current = [];
    onSave({
      id: f.id, date: f.date, km: Math.round(km * 100) / 100, seconds: secs, type: f.type, feel: f.feel || undefined, shoeId: f.shoeId || undefined,
      notes: f.notes.trim() || undefined, place: f.place.trim() || undefined, photos: f.photos.length ? f.photos : undefined,
    });
  };
  const yesterday = addDays(today, -1);
  // fotos: as novas são apagadas se cancelar; as tiradas só somem de vez ao salvar
  const added = useRef<string[]>([]);
  const removed = useRef<string[]>([]);
  const [busy, setBusy] = useState(false);
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const ids: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const id = await saveImage(file);
        ids.push(id);
        added.current.push(id);
      }
      setF((x) => ({ ...x, photos: [...x.photos, ...ids] }));
    } catch {
      setError('Não consegui abrir essa imagem. Tente JPG ou PNG.');
    } finally {
      setBusy(false);
    }
  };
  const cancel = () => {
    added.current.forEach((id) => deleteImage(id));
    onCancel();
  };
  const mapUrl = f.place.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.place.trim())}` : '';

  return (
    <form className="card run-form" onSubmit={submit}>
      <div className="card-head"><h2>{f.id ? 'Editar corrida' : 'Registrar corrida'}</h2></div>
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
            <button type="button" key={t} className={`chip ${f.type === t ? 'on' : ''}`} onClick={() => set('type', t)}><Icon name={RUN_TYPES[t].icon} size={15} /> {RUN_TYPES[t].label}</button>
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
      <label className="field">
        <span className="ico-text"><Icon name="pin" size={15} /> Local (opcional)</span>
        <div className="row">
          <input className="input" placeholder="Ex.: Parque Ibirapuera, São Paulo" value={f.place} onChange={(e) => set('place', e.target.value)} />
          {mapUrl && <a className="btn sm" href={mapUrl} target="_blank" rel="noreferrer">Ver no mapa <Icon name="external" size={14} /></a>}
        </div>
      </label>
      <div className="field">
        <span className="ico-text"><Icon name="camera" size={15} /> Fotos do treino (opcional)</span>
        <div className="race-gallery edit run-photos">
          {f.photos.map((id) => (
            <span key={id} className="race-photo">
              <Photo id={id} alt="Foto do treino" />
              <button type="button" className="race-photo-del" onClick={() => { removed.current.push(id); set('photos', f.photos.filter((p) => p !== id)); }} title="Tirar foto">×</button>
            </span>
          ))}
          <label className="race-photo-add">
            <Icon name="plus" size={22} />
            <span className="small">Adicionar fotos</span>
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
          </label>
        </div>
        {busy && <span className="muted small">Salvando as fotos…</span>}
      </div>
      <label className="field"><span>Observações (opcional)</span><textarea className="input" rows={2} placeholder="Percurso, clima, tiros 6×400 m…" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></label>
      {error && <p className="cal-error" role="alert">{error}</p>}
      <div className="row">
        <button className="btn primary" type="submit" disabled={busy}><Icon name="check" size={16} /> Salvar</button>
        <button className="btn" type="button" onClick={cancel}>Cancelar</button>
        {onDelete && <button className="btn danger" type="button" onClick={onDelete} style={{ marginLeft: 'auto' }}><Icon name="trash" size={16} /> Apagar</button>}
      </div>
    </form>
  );
}


/** Card de um treino no feed (estilo app de corrida). */
function RunCard({ r, shoe, onEdit, onPhoto, index }: { r: Run; shoe?: string; onEdit: () => void; onPhoto: (i: number) => void; index: number }) {
  const d = parseKey(r.date);
  const when = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const photos = r.photos || [];
  const map = r.place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.place)}` : '';
  return (
    <article className={`run-card t-${r.type}`} style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}>
      <header className="run-card-head">
        <span className="run-card-icon"><Icon name={RUN_TYPES[r.type].icon} size={22} /></span>
        <div className="run-card-when">
          <b>{when.charAt(0).toUpperCase() + when.slice(1)}</b>
          <span className="muted small">
            <span className={`run-type-chip t-${r.type}`}>{RUN_TYPES[r.type].label}</span>
            {r.feel ? <span title="Como foi">{FEELS[r.feel - 1]}</span> : null}
          </span>
        </div>
        <button className="icon-btn" onClick={onEdit} title="Editar treino"><Icon name="edit" size={18} /></button>
      </header>

      <div className="run-card-stats">
        <div><span>Distância</span><b>{fmtKm(r.km)}</b></div>
        <div><span>Tempo</span><b>{formatDurationSec(r.seconds)}</b></div>
        <div><span>Pace</span><b>{runPace(r)}</b></div>
      </div>

      {r.notes && <p className="run-card-notes">{r.notes}</p>}

      {photos.length > 0 && (
        <div className={`run-card-photos n${Math.min(photos.length, 3)}`}>
          {photos.slice(0, 3).map((id, i) => (
            <button key={id} className="run-card-photo" onClick={() => onPhoto(i)} aria-label={`Ver foto ${i + 1}`}>
              <Photo id={id} alt={`Foto ${i + 1} do treino`} />
              {i === 2 && photos.length > 3 && <span className="run-card-more">+{photos.length - 3}</span>}
            </button>
          ))}
        </div>
      )}

      {(r.place || shoe) && (
        <footer className="run-card-foot">
          {r.place && (map ? <a href={map} target="_blank" rel="noreferrer" title="Abrir no mapa" className="ico-text"><Icon name="pin" size={14} /> {r.place}</a> : <span className="ico-text"><Icon name="pin" size={14} /> {r.place}</span>)}
          {shoe && <span className="ico-text"><Icon name="shoe" size={14} /> {shoe}</span>}
        </footer>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
type Tab = 'geral' | 'provas' | 'treinos' | 'tenis';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'geral', label: 'Visão geral', icon: 'historico' },
  { id: 'provas', label: 'Provas', icon: 'medal' },
  { id: 'treinos', label: 'Treinos', icon: 'corrida' },
  { id: 'tenis', label: 'Tênis', icon: 'shoe' },
];
const TAB_KEY = 'painel-pessoal:corrida-aba';

/** Gráfico da evolução do pace prova a prova (menor = mais rápido, por isso o eixo é invertido). */
function PaceChart({ points, onOpen }: { points: { ev: CalEvent; pace: number }[]; onOpen: (ev: CalEvent) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <Empty>Com 2 provas com tempo, aparece aqui a evolução do seu pace.</Empty>;
  const W = 640, H = 200, P = 34;
  const paces = points.map((p) => p.pace);
  const min = Math.min(...paces) - 15, max = Math.max(...paces) + 15;
  const x = (i: number) => P + (i * (W - P * 2)) / (points.length - 1);
  const y = (pace: number) => P / 2 + ((pace - min) / (max - min)) * (H - P * 1.5); // mais rápido = mais alto
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.pace)}`).join(' ');
  const best = paces.indexOf(Math.min(...paces));
  const first = paces[0], last = paces[paces.length - 1];
  const diff = Math.round(first - last);
  return (
    <div className="pace-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolução do pace nas provas">
        <defs>
          <linearGradient id="pace-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L${x(points.length - 1)},${H} L${x(0)},${H} Z`} fill="url(#pace-fill)" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.ev.id} className="pace-dot" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onOpen(p.ev)}>
            <circle cx={x(i)} cy={y(p.pace)} r={hover === i ? 9 : 6} fill={i === best ? 'var(--medal)' : 'var(--primary)'} stroke="var(--surface)" strokeWidth="3" />
            <text x={x(i)} y={H - 4} textAnchor="middle" className="pace-label">{formatShort(p.ev.date)}</text>
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="pace-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(points[hover].pace) / H) * 100}%` }}>
          <b>{points[hover].ev.title}</b>
          <span>{formatPace(points[hover].pace)} · {points[hover].ev.result}</span>
        </div>
      )}
      <p className="muted small">
        {diff > 0 ? <>Seu pace melhorou <b>{formatDurationSec(diff)} por km</b> desde a primeira prova.</> : diff < 0 ? <>Seu pace ficou {formatDurationSec(-diff)}/km mais lento que na primeira prova — bora treinar!</> : 'Pace estável.'}
        {' '}A estrela marca o melhor pace. Clique num ponto para abrir a prova.
      </p>
    </div>
  );
}

/**
 * Recorde de uma distância. Conquistado: tempo grande, pace e data.
 * Ainda não: quanto falta (pela sua maior corrida) e a previsão de tempo.
 */
function RecordTile({ label, pr, km, longest, predicted }: { label: string; pr: (Effort & { time: number }) | null; km: number; longest: number; predicted: number | null }) {
  if (pr) {
    return (
      <div className="pr-tile won" title={`${pr.title} em ${formatShort(pr.date)}`}>
        <span className="pr-tile-head">
          <span className="pr-tile-dist">{label}</span>
          <span className="pr-tile-badge"><Icon name="trophy" size={13} /> recorde</span>
        </span>
        <b className="pr-tile-time">{formatDurationSec(pr.time)}</b>
        <span className="pr-tile-meta">{formatPace(pr.time / km)} · {formatShort(pr.date)}{pr.race ? ' · prova' : ''}</span>
      </div>
    );
  }
  const pct = Math.min(100, (longest / km) * 100);
  return (
    <div className="pr-tile" title="Ainda sem marca nessa distância">
      <span className="pr-tile-head"><span className="pr-tile-dist">{label}</span></span>
      <b className="pr-tile-time empty">—</b>
      <div className="pr-tile-bar" aria-label={`Sua maior corrida: ${fmtKm(longest)} de ${fmtKm(km)}`}><span style={{ width: `${pct}%` }} /></div>
      <span className="pr-tile-meta">
        {longest ? <>Sua maior: {fmtKm(longest)}</> : 'Registre uma corrida'}
        {predicted ? <> · previsão {formatDurationSec(predicted)}</> : null}
      </span>
    </div>
  );
}

/** Escolher quais corridas (provas e treinos) foram feitas com um tênis. */
function ShoePicker({ shoe, acts, shoes, onClose }: { shoe: Shoe; acts: Run[]; shoes: Shoe[]; onClose: () => void }) {
  const { update } = useStore();
  const list = [...acts].sort((a, b) => b.date.localeCompare(a.date));
  const nameOf = (id?: string) => shoes.find((s) => s.id === id)?.name;
  const mine = list.filter((a) => a.shoeId === shoe.id);
  const km = mine.reduce((s, a) => s + a.km, 0);

  // marca/desmarca: provas guardam o tênis no evento do calendário; treinos, no próprio treino
  const setShoe = (a: Run, on: boolean) => update((d) => {
    const value = on ? shoe.id : undefined;
    if (a.id.startsWith('prova-')) {
      const ev = d.events.find((e) => `prova-${e.id}` === a.id);
      if (ev) ev.shoeId = value;
    } else {
      const r = d.running.runs.find((x) => x.id === a.id);
      if (r) r.shoeId = value;
    }
  });
  const all = (on: boolean) => list.forEach((a) => (on ? !a.shoeId : a.shoeId === shoe.id) && setShoe(a, on));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="wcheck-overlay" role="dialog" aria-modal="true" aria-label={`Corridas com ${shoe.name}`} onClick={onClose}>
      <div className="card wcheck" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h2 className="ico-text"><Icon name="shoe" size={20} /> {shoe.name}</h2>
          <button className="icon-btn" onClick={onClose} title="Fechar"><Icon name="x" size={18} /></button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Marque as corridas que você fez com este tênis. <b>{mine.length}</b> marcada(s) · <b>{fmtKm(km)}</b>
          {shoe.startKm ? ` (+ ${fmtKm(shoe.startKm)} de antes)` : ''}.
        </p>
        {list.length ? (
          <>
            <div className="row">
              <button className="link small" onClick={() => all(true)}>Marcar as que estão sem tênis</button>
              <button className="link small" onClick={() => all(false)}>Desmarcar todas</button>
            </div>
            <ul className="wcheck-list">
              {list.map((a) => {
                const on = a.shoeId === shoe.id;
                const other = !on && a.shoeId ? nameOf(a.shoeId) : null;
                return (
                  <li key={a.id}>
                    <label className={`wcheck-item ${on ? 'on' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => setShoe(a, !on)} />
                      <span className="wcheck-box">{on ? '✓' : ''}</span>
                      <span className="wcheck-name">
                        <b className="ico-text"><Icon name={RUN_TYPES[a.type].icon} size={15} /> {a.type === 'prova' && a.notes ? a.notes : RUN_TYPES[a.type].label}</b>
                        <span className="muted small">
                          {formatShort(a.date)} · {fmtKm(a.km)}{a.seconds ? ` · ${formatDurationSec(a.seconds)}` : ''}
                          {other ? ` · com ${other} (marcar troca)` : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <Empty>Nenhuma corrida ainda. Registre treinos ou adicione provas.</Empty>
        )}
        <div className="row"><button className="btn primary" onClick={onClose}><Icon name="check" size={16} /> Pronto</button></div>
      </div>
    </div>
  );
}

export default function Corrida({ go }: PageProps) {
  const { data, today, update } = useStore();
  const { runs, shoes, monthGoalKm } = data.running;
  const [tab, setTabState] = useState<Tab>(() => {
    try {
      const v = localStorage.getItem(TAB_KEY) as Tab | null;
      return v && TABS.some((t) => t.id === v) ? v : 'geral';
    } catch {
      return 'geral';
    }
  });
  const setTab = (t: Tab) => {
    setTabState(t);
    try { localStorage.setItem(TAB_KEY, t); } catch { /* só não lembra a aba */ }
  };
  const [editing, setEditing] = useState<Draft | null>(null);
  const [race, setRace] = useState<CalEvent | 'nova' | null>(null);
  const [raceTab, setRaceTab] = useState<'feitas' | 'proximas'>('feitas');
  const [showAll, setShowAll] = useState(false);
  const [newShoe, setNewShoe] = useState('');
  const [goalEdit, setGoalEdit] = useState(false);
  const [predKm, setPredKm] = useState(10);
  const [picking, setPicking] = useState<Shoe | null>(null);
  const [lb, setLb] = useState<{ ids: string[]; i: number } | null>(null);
  const [typeFilter, setTypeFilter] = useState<'todos' | RunType>('todos');

  const acts = useMemo(() => activitiesOf(runs, data.events, today), [runs, data.events, today]);
  const efforts = useMemo(() => effortsOf(runs, data.events), [runs, data.events]);
  const prs = useMemo(() => personalRecords(efforts), [efforts]);
  const pred = useMemo(() => predictions(efforts, today), [efforts, today]);
  const paces = useMemo(() => racePaces(data.events, today), [data.events, today]);
  const races = data.events.filter((e) => e.kind === 'corrida');
  const racesDone = races.filter((e) => raceIsDone(e, today)).sort((a, b) => b.date.localeCompare(a.date));
  const racesNext = races.filter((e) => !raceIsDone(e, today)).sort((a, b) => a.date.localeCompare(b.date));
  const raceList = raceTab === 'feitas' ? racesDone : racesNext;
  const nextRace = upcoming(races, today, 1)[0];
  const sortedRuns = useMemo(() => [...runs].sort((a, b) => b.date.localeCompare(a.date)), [runs]);
  const weeks = weeklyKm(acts, today, 10);
  const totalKm = acts.reduce((s, r) => s + r.km, 0);
  const wk = weekKm(acts, today);
  const mk = monthKm(acts, today);
  const pace = avgPace(acts, today, 90);
  const streak = weekStreak(acts, today);
  const lastShoe = sortedRuns.find((r) => r.shoeId)?.shoeId || '';
  const days = nextRace ? daysUntil(nextRace.date, today) : 0;
  // feed de treinos: filtro por tipo e grupos por mês
  const filteredRuns = typeFilter === 'todos' ? sortedRuns : sortedRuns.filter((r) => r.type === typeFilter);
  const months = useMemo(() => {
    const out: { key: string; label: string; km: number; runs: Run[] }[] = [];
    for (const r of filteredRuns.slice(0, showAll ? filteredRuns.length : 12)) {
      const key = r.date.slice(0, 7);
      let m = out.find((x) => x.key === key);
      if (!m) {
        const l = parseKey(r.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        m = { key, label: l.charAt(0).toUpperCase() + l.slice(1), km: 0, runs: [] };
        out.push(m);
      }
      m.runs.push(r);
    }
    for (const m of out) m.km = filteredRuns.filter((r) => r.date.startsWith(m.key)).reduce((t, r) => t + r.km, 0);
    return out;
  }, [filteredRuns, showAll]);

  const saveRun = (r: Omit<Run, 'id'> & { id?: string }) => {
    update((d) => {
      if (r.id) {
        const i = d.running.runs.findIndex((x) => x.id === r.id);
        if (i >= 0) d.running.runs[i] = { ...r, id: r.id };
      } else d.running.runs.push({ ...r, id: uid() });
    });
    setEditing(null);
  };
  const removeRun = (id: string) => {
    if (!window.confirm('Apagar esta corrida?')) return;
    runs.find((x) => x.id === id)?.photos?.forEach((p) => deleteImage(p)); // fotos do treino
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
  /** Coloca ou troca a foto do tênis (a antiga é apagada do aparelho). */
  const setShoePhoto = async (s: Shoe, file: File | undefined) => {
    if (!file) return;
    const id = await saveImage(file);
    if (s.photo) deleteImage(s.photo);
    patchShoe(s.id, (x) => { x.photo = id; });
  };
  const removeShoePhoto = (s: Shoe) => {
    if (s.photo) deleteImage(s.photo);
    patchShoe(s.id, (x) => { delete x.photo; });
  };
  const newRun = () => { setTab('treinos'); setEditing(toDraft(null, today, lastShoe)); };

  return (
    <div className="page run-page">
      {/* ---------- topo ---------- */}
      <section className="run-hero">
        <div className="run-hero-main">
          <span className="run-hero-kicker ico-text"><Icon name="corrida" size={15} /> Corrida</span>
          <div className="run-hero-km"><b>{totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b><span>km corridos</span></div>
          <div className="run-hero-chips">
            <span className="ico-text"><Icon name="medal" size={15} /> {racesDone.length} {racesDone.length === 1 ? 'prova' : 'provas'}</span>
            <span className="ico-text"><Icon name="corrida" size={15} /> {runs.length} {runs.length === 1 ? 'treino' : 'treinos'}</span>
            {prs['5k'] && <span className="ico-text"><Icon name="bolt" size={15} /> 5K em {formatDurationSec(prs['5k'].time)}</span>}
            {streak > 1 && <span className="ico-text"><Icon name="flame" size={15} /> {streak} semanas seguidas</span>}
          </div>
          <div className="run-hero-actions">
            <button className="btn primary" onClick={newRun}><Icon name="plus" size={16} /> Registrar treino</button>
            <button className="btn" onClick={() => setRace('nova')}><Icon name="medal" size={16} /> Adicionar prova</button>
          </div>
        </div>
        {nextRace ? (
          <button className="run-countdown" onClick={() => setRace(nextRace)} title="Abrir a prova">
            <span className="run-countdown-label">próxima prova</span>
            <span className="run-countdown-num">{days || 'HOJE'}</span>
            <span className="run-countdown-unit">{days ? (days === 1 ? 'dia' : 'dias') : 'é dia de prova!'}</span>
            <b>{nextRace.title}</b>
            <span className="small">{formatShort(nextRace.date)}{fmtDist(nextRace) ? ` · ${fmtDist(nextRace)}` : ''}</span>
            {pred && raceKm(nextRace) > 0 && <span className="run-countdown-pred">previsão {formatDurationSec(predictFor(pred.base, raceKm(nextRace)))}</span>}
          </button>
        ) : (
          <button className="run-countdown empty" onClick={() => go('calendario')}>
            <span className="run-countdown-num">+</span>
            <span className="small">Marque a próxima prova no Calendário</span>
          </button>
        )}
      </section>

      <nav className="run-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </nav>

      {/* ---------- visão geral ---------- */}
      {tab === 'geral' && (
        <div className="run-panel" key="geral">
          <section className="run-tiles">
            <div className="run-tile"><span className="run-tile-icon"><Icon name="calendar" size={26} /></span><span className="muted small">Esta semana</span><b>{fmtKm(wk)}</b></div>
            <div className="run-tile">
              <span className="run-tile-icon"><Icon name="calendar" size={26} /></span>
              <span className="muted small">Este mês{monthGoalKm ? ` · meta ${fmtKm(monthGoalKm)}` : ''}</span>
              <b>{fmtKm(mk)}</b>
              {monthGoalKm > 0 && <Progress value={mk} max={monthGoalKm} variant={mk >= monthGoalKm ? 'success' : ''} />}
              {goalEdit ? (
                <input className="input w-num" type="number" min={0} autoFocus placeholder="km" defaultValue={monthGoalKm || ''}
                  onBlur={() => setGoalEdit(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { update((d) => { d.running.monthGoalKm = Math.max(0, Number((e.target as HTMLInputElement).value) || 0); }); setGoalEdit(false); } }} />
              ) : (
                <button className="link small" onClick={() => setGoalEdit(true)}>{monthGoalKm ? 'mudar meta' : 'definir meta'}</button>
              )}
            </div>
            <div className="run-tile"><span className="run-tile-icon"><Icon name="clock" size={26} /></span><span className="muted small">Pace médio (90 dias)</span><b>{pace ? formatPace(pace) : '—'}</b></div>
            <div className="run-tile"><span className="run-tile-icon"><Icon name="flag" size={26} /></span><span className="muted small">Maior distância</span><b>{fmtKm(Math.max(0, ...acts.map((a) => a.km)))}</b></div>
          </section>

          <section className="card">
            <div className="card-head"><h2 className="ico-text"><Icon name="trophy" size={20} /> Recordes pessoais</h2><span className="muted small">treinos + provas</span></div>
            <div className="pr-grid">
              {DISTANCES.map((d) => (
                <RecordTile key={d.key} label={d.label} pr={prs[d.key]} km={d.km}
                  longest={Math.max(0, ...acts.map((a) => a.km))}
                  predicted={pred ? predictFor(pred.base, d.km) : null} />
              ))}
            </div>
          </section>

          <div className="run-two">
            <section className="card">
              <div className="card-head"><h2 className="ico-text"><Icon name="trend" size={20} /> Evolução do pace nas provas</h2></div>
              <PaceChart points={paces} onOpen={(ev) => setRace(ev)} />
            </section>

            <section className="card run-predict">
              <div className="card-head"><h2 className="ico-text"><Icon name="clock" size={20} /> Quanto tempo eu faria?</h2></div>
              {pred ? (
                <>
                  <div className="run-predict-value">
                    <b>{formatDurationSec(predictFor(pred.base, predKm))}</b>
                    <span>{formatPace(predictFor(pred.base, predKm) / predKm)}</span>
                  </div>
                  <label className="run-predict-slider">
                    <span>Distância: <b>{fmtKm(predKm)}</b></span>
                    <input type="range" min={1} max={42.2} step={0.1} value={predKm} onChange={(e) => setPredKm(Number(e.target.value))} />
                  </label>
                  <div className="chips">
                    {DISTANCES.map((d) => (
                      <button key={d.key} className={`chip ${Math.abs(predKm - d.km) < 0.15 ? 'on' : ''}`} onClick={() => setPredKm(Math.round(d.km * 10) / 10)}>{d.key.toUpperCase()}</button>
                    ))}
                  </div>
                  <p className="muted small">Base: {fmtKm(pred.base.km)} em {formatDurationSec(pred.base.seconds)} ({pred.base.title}, {formatShort(pred.base.date)}). Fórmula de Riegel — é uma estimativa.</p>
                </>
              ) : (
                <Empty>Registre uma corrida de 3 km ou mais (com tempo) para ver a previsão.</Empty>
              )}
            </section>
          </div>

          <section className="card">
            <div className="card-head"><h2>km por semana</h2><span className="muted small">últimas 10 semanas · treinos + provas</span></div>
            <BarChart
              items={weeks.map((w) => ({ key: w.start, label: formatShort(w.start), value: Math.round(w.km * 10) / 10, title: `Semana de ${formatShort(w.start)}: ${fmtKm(w.km)}` }))}
              max={Math.max(10, ...weeks.map((w) => Math.ceil(w.km)))}
              format={(v) => `${v}`}
            />
          </section>
        </div>
      )}

      {/* ---------- provas ---------- */}
      {tab === 'provas' && (
        <div className="run-panel" key="provas">
          <div className="run-panel-head">
            <div className="segmented">
              <button className={raceTab === 'feitas' ? 'on' : ''} onClick={() => setRaceTab('feitas')}>Já fui ({racesDone.length})</button>
              <button className={raceTab === 'proximas' ? 'on' : ''} onClick={() => setRaceTab('proximas')}>Próximas ({racesNext.length})</button>
            </div>
            <button className="btn primary" onClick={() => setRace('nova')}><Icon name="plus" size={16} /> Adicionar prova</button>
          </div>
          {raceList.length ? (
            <div className="race-wall">
              {raceList.map((ev, i) => <RaceCard key={ev.id} ev={ev} today={today} onOpen={() => setRace(ev)} index={i} />)}
            </div>
          ) : (
            <section className="card run-empty">
              <span className="run-empty-icon"><Icon name="medal" size={40} /></span>
              <b>{raceTab === 'feitas' ? 'Seu mural de provas está vazio' : 'Nenhuma prova marcada'}</b>
              <p className="muted">{raceTab === 'feitas' ? 'Adicione as provas que você já correu: tempo, imagem da corrida, suas fotos e como foi.' : 'Adicione a próxima prova e o app avisa antes.'}</p>
              <button className="btn primary" onClick={() => setRace('nova')}>Adicionar prova</button>
            </section>
          )}
        </div>
      )}

      {/* ---------- treinos ---------- */}
      {tab === 'treinos' && (
        <div className="run-panel run-panel-feed" key="treinos">
          {editing ? (
            <RunForm key={editing.id || 'nova'} initial={editing} shoes={shoes} today={today} onSave={saveRun} onCancel={() => setEditing(null)} onDelete={editing.id ? () => removeRun(editing.id!) : undefined} />
          ) : (
            <div className="run-panel-head">
              <span className="muted">{runs.length ? `${runs.length} ${runs.length === 1 ? 'treino' : 'treinos'} · ${fmtKm(runs.reduce((t, r) => t + r.km, 0))} · clique para editar` : 'Registre seus treinos de corrida.'}</span>
              <button className="btn primary" onClick={newRun}><Icon name="plus" size={16} /> Registrar treino</button>
            </div>
          )}
          {sortedRuns.length > 0 && (
            <div className="run-filter chips">
              <button className={`chip ${typeFilter === 'todos' ? 'on' : ''}`} onClick={() => setTypeFilter('todos')}>Todos · {sortedRuns.length}</button>
              {(Object.keys(RUN_TYPES) as RunType[]).filter((t) => sortedRuns.some((r) => r.type === t)).map((t) => (
                <button key={t} className={`chip ${typeFilter === t ? 'on' : ''}`} onClick={() => setTypeFilter(t)}>
                  <Icon name={RUN_TYPES[t].icon} size={14} /> {RUN_TYPES[t].label} · {sortedRuns.filter((r) => r.type === t).length}
                </button>
              ))}
            </div>
          )}
          {sortedRuns.length ? (
            <div className="run-feed">
              {months.map((m) => (
                <section key={m.key} className="run-month">
                  <div className="run-month-head">
                    <h3>{m.label}</h3>
                    <span className="muted small">{m.runs.length} {m.runs.length === 1 ? 'treino' : 'treinos'} · {fmtKm(m.km)}</span>
                  </div>
                  {m.runs.map((r, i) => (
                    <RunCard key={r.id} r={r} index={i} shoe={shoes.find((x) => x.id === r.shoeId)?.name}
                      onEdit={() => { setEditing(toDraft(r, today)); document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      onPhoto={(i2) => setLb({ ids: r.photos!, i: i2 })} />
                  ))}
                </section>
              ))}
              {filteredRuns.length > 12 && <button className="btn" onClick={() => setShowAll(!showAll)}>{showAll ? 'Mostrar menos' : `Ver todos (${filteredRuns.length})`}</button>}
            </div>
          ) : !editing && (
            <section className="card run-empty">
              <span className="run-empty-icon"><Icon name="corrida" size={40} /></span>
              <b>Nenhum treino ainda</b>
              <p className="muted">Registre distância e tempo; o pace, os recordes e a previsão aparecem sozinhos.</p>
              <button className="btn primary" onClick={newRun}>Registrar treino</button>
            </section>
          )}
        </div>
      )}

      {/* ---------- tênis ---------- */}
      {tab === 'tenis' && (
        <div className="run-panel" key="tenis">
          <div className="shoe-grid">
            {shoes.map((s) => {
              const km = shoeKm(s, acts);
              const pct = Math.min(100, (km / s.limitKm) * 100);
              const worn = km >= s.limitKm;
              return (
                <div key={s.id} className={`card shoe-card ${s.retired ? 'retired' : ''} ${worn ? 'worn' : ''}`}>
                  <label className={`shoe-photo ${s.photo ? 'has' : ''}`} title={s.photo ? 'Trocar a foto' : 'Colocar uma foto do tênis'}>
                    {s.photo ? <Photo id={s.photo} alt={`Foto do ${s.name}`} /> : <span className="shoe-photo-empty"><Icon name="camera" size={26} /> Adicionar foto</span>}
                    {s.photo && <span className="shoe-photo-change"><Icon name="camera" size={14} /> Trocar</span>}
                    <input type="file" accept="image/*" onChange={(e) => { setShoePhoto(s, e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {s.photo && <button className="link small shoe-photo-remove" onClick={() => removeShoePhoto(s)}>Remover foto</button>}
                  <div className="shoe-ring" style={{ '--pct': `${pct}%` } as CSSProperties}>
                    <span><b>{Math.round(km)}</b><small>de {s.limitKm} km</small></span>
                  </div>
                  <b className="shoe-name">{s.name}</b>
                  <span className={`badge ${s.retired ? '' : worn || pct >= 85 ? 'warning' : 'success'}`}>{s.retired ? 'aposentado' : worn ? 'hora de trocar' : pct >= 85 ? `quase na hora · ${Math.round(s.limitKm - km)} km` : `${Math.round(s.limitKm - km)} km de vida`}</span>
                  <span className="muted small">{acts.filter((a) => a.shoeId === s.id).length} corrida(s) com ele</span>
                  <div className="row" style={{ justifyContent: 'center' }}>
                    <button className="btn sm primary" onClick={() => setPicking(s)}><Icon name="shoe" size={16} /> Escolher corridas</button>
                    <button className="link small" onClick={() => patchShoe(s.id, (x) => { x.retired = !x.retired; })}>{s.retired ? 'Voltar a usar' : 'Aposentar'}</button>
                  </div>
                </div>
              );
            })}
            <form className="card shoe-card shoe-new" onSubmit={addShoe}>
              <span className="shoe-new-icon"><Icon name="shoe" size={40} /></span>
              <input className="input" placeholder="Novo tênis (ex.: Nike Pegasus 41)" value={newShoe} onChange={(e) => setNewShoe(e.target.value)} />
              <button className="btn primary" type="submit"><Icon name="plus" size={16} /> Adicionar</button>
              <span className="muted small">Tênis de corrida duram de 500 a 800 km. Escolha o tênis ao registrar cada treino.</span>
            </form>
          </div>
        </div>
      )}

      {race && <RaceModal ev={race === 'nova' ? null : race} onClose={() => setRace(null)} />}
      {lb && <Lightbox ids={lb.ids} index={lb.i} onChange={(i) => setLb({ ...lb, i })} onClose={() => setLb(null)} />}
      {picking && <ShoePicker shoe={picking} acts={acts} shoes={shoes} onClose={() => setPicking(null)} />}
    </div>
  );
}
