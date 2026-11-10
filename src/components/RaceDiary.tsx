// Diário das provas (aba Corrida): capa, relato de como foi e fotos durante a corrida.
// Cada prova é um evento "corrida" do Calendário — entra nos recordes, no XP e na contagem regressiva.
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Icon from './Icon';
import { useStore } from '../store/StoreContext';
import { DEFAULT_ALERT, RACE_DISTANCES, formatPace, parseDuration, whenText } from '../store/calendar';
import { formatLong, formatShort } from '../store/dates';
import { deleteImage, saveImage, useImage } from '../store/images';
import { uid } from '../store/model';
import { fmtDist } from '../store/running';
import type { CalEvent } from '../store/types';

const paceText = (ev: Pick<CalEvent, 'result' | 'distance'>) => {
  const s = parseDuration(ev.result);
  const km = parseFloat(ev.distance || '');
  return s && km > 0 ? formatPace(s / km) : null;
};

function Img({ id, alt, className, onClick }: { id: string; alt: string; className?: string; onClick?: () => void }) {
  const url = useImage(id);
  return url ? <img src={url} alt={alt} className={className} onClick={onClick} loading="lazy" /> : <span className={`${className || ''} img-loading`} />;
}

/** Pôster da prova no mural (imagem, título por cima; o relato aparece ao passar o mouse). */
export function RaceCard({ ev, today, onOpen, index = 0 }: { ev: CalEvent; today: string; onOpen: () => void; index?: number }) {
  const pace = paceText(ev);
  const future = ev.date >= today && !ev.done;
  const km = fmtDist(ev);
  return (
    <button className={`race-poster ${ev.cover ? '' : 'no-cover'}`} onClick={onOpen} style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      {ev.cover ? <Img id={ev.cover} alt={`Imagem de ${ev.title}`} className="race-poster-img" /> : <span className="race-poster-empty">🏅</span>}
      <span className="race-poster-top">
        {future ? <span className="race-chip warn">{whenText(ev, today)}</span> : ev.result ? <span className="race-chip">⏱ {ev.result}</span> : <span />}
        {!!ev.photos?.length && <span className="race-chip dark">📷 {ev.photos.length}</span>}
      </span>
      <span className="race-poster-info">
        <b>{ev.title}</b>
        <span className="small">{formatShort(ev.date)}{km ? ` · ${km}` : ''}{pace ? ` · ${pace}` : ''}</span>
        {ev.place && <span className="small race-poster-place">📍 {ev.place}</span>}
        <span className="race-poster-story small">{ev.story || (future ? 'Clique para ver os detalhes da prova.' : '✍️ Clique para contar como foi.')}</span>
      </span>
    </button>
  );
}

type Draft = CalEvent;

/** Janela da prova: ver o relato e as fotos, ou editar. `ev` null = nova prova. */
export function RaceModal({ ev, onClose }: { ev: CalEvent | null; onClose: () => void }) {
  const { data, today, update } = useStore();
  const isNew = !ev;
  const [editing, setEditing] = useState(isNew);
  const [f, setF] = useState<Draft>(
    ev || { id: uid(), title: '', date: today, kind: 'corrida', distance: '', result: '', place: '', story: '', photos: [], alert: null, done: true },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<number | null>(null); // foto aberta em tela cheia
  const added = useRef<string[]>([]); // fotos enviadas nesta edição (apagar se cancelar)
  const removed = useRef<string[]>([]); // fotos tiradas nesta edição (apagar ao salvar)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setF((x) => ({ ...x, [k]: v })); setError(''); };
  const current = (!isNew && data.events.find((e) => e.id === f.id)) || f;
  const shown = editing ? f : current;
  const photos = shown.photos || [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== null) {
        if (e.key === 'Escape') setView(null);
        if (e.key === 'ArrowRight') setView((v) => (v === null ? v : (v + 1) % photos.length));
        if (e.key === 'ArrowLeft') setView((v) => (v === null ? v : (v - 1 + photos.length) % photos.length));
        return;
      }
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const upload = async (files: FileList | null, kind: 'cover' | 'photos') => {
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
      if (kind === 'cover') {
        if (f.cover) removed.current.push(f.cover);
        set('cover', ids[0]);
      } else set('photos', [...(f.photos || []), ...ids]);
    } catch {
      setError('Não consegui abrir essa imagem. Tente outro arquivo (JPG ou PNG).');
    } finally {
      setBusy(false);
    }
  };
  const pick = (kind: 'cover' | 'photos') => (e: ChangeEvent<HTMLInputElement>) => {
    upload(e.target.files, kind);
    e.target.value = '';
  };
  const removePhoto = (id: string) => {
    removed.current.push(id);
    set('photos', (f.photos || []).filter((p) => p !== id));
  };

  const save = () => {
    if (!f.title.trim()) return setError('Dê um nome para a prova.');
    if (!f.date) return setError('Escolha a data.');
    if (f.result && !parseDuration(f.result)) return setError('Tempo em mm:ss ou h:mm:ss (ex.: 52:30).');
    const past = f.date < today;
    const ev: CalEvent = {
      ...f,
      title: f.title.trim(),
      // passou: feita; data futura: ainda não aconteceu (nunca conta como feita); hoje: como marcado
      done: past ? true : f.date > today ? false : f.done,
      alert: isNew && !past ? { ...DEFAULT_ALERT } : f.alert,
    };
    update((d) => {
      const i = d.events.findIndex((e) => e.id === ev.id);
      if (i >= 0) d.events[i] = ev;
      else d.events.push(ev);
    });
    removed.current.forEach((id) => deleteImage(id));
    removed.current = [];
    added.current = [];
    if (isNew) onClose();
    else setEditing(false);
  };
  const cancel = () => {
    added.current.forEach((id) => deleteImage(id));
    added.current = [];
    removed.current = [];
    if (isNew) return onClose();
    if (editing) {
      setF(current);
      setEditing(false);
    } else onClose();
  };
  const remove = () => {
    if (!window.confirm(`Apagar "${current.title}" e as fotos dela?`)) return;
    [current.cover, ...(current.photos || []), ...added.current].forEach((id) => id && deleteImage(id));
    update((d) => { d.events = d.events.filter((e) => e.id !== current.id); });
    onClose();
  };

  const pace = paceText(shown);

  return (
    <div className="race-overlay" role="dialog" aria-modal="true" aria-label={shown.title || 'Nova prova'} onClick={cancel}>
      <div className="card race-modal" onClick={(e) => e.stopPropagation()}>
        <div className="race-hero">
          {shown.cover ? <Img id={shown.cover} alt={`Imagem de ${shown.title}`} /> : <span className="race-cover-empty big">🏅</span>}
          {editing && (
            <label className="btn sm race-hero-btn">
              <Icon name="upload" size={14} /> {shown.cover ? 'Trocar imagem da corrida' : 'Imagem da corrida'}
              <input type="file" accept="image/*" hidden onChange={pick('cover')} />
            </label>
          )}
          <button className="icon-btn race-close" onClick={cancel} title="Fechar"><Icon name="x" size={18} /></button>
        </div>

        {editing ? (
          <div className="race-form">
            <input className="input race-title-input" placeholder='Nome da prova (ex.: "Corrida de São Silvestre")' value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus={isNew} />
            <div className="row">
              <label className="field"><span>Data</span><input className="input" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></label>
              <label className="field"><span>Tempo final</span><input className="input" placeholder="52:30" value={f.result || ''} onChange={(e) => set('result', e.target.value)} /></label>
              <label className="field"><span>Local</span><input className="input" placeholder="Cidade, largada…" value={f.place || ''} onChange={(e) => set('place', e.target.value)} /></label>
            </div>
            <div className="field">
              <span>Distância (km)</span>
              <div className="chips">
                {RACE_DISTANCES.map((d) => (
                  <button type="button" key={d} className={`chip ${f.distance === d ? 'on' : ''}`} onClick={() => set('distance', d)}>{d} km</button>
                ))}
                <input className="input w-num" inputMode="decimal" placeholder="outra" value={RACE_DISTANCES.includes(f.distance || '') ? '' : f.distance || ''} onChange={(e) => set('distance', e.target.value.replace(',', '.'))} />
                {pace && <span className="badge success">Pace {pace}</span>}
              </div>
            </div>
            {data.running.shoes.length > 0 && (
              <label className="field">
                <span>Tênis</span>
                <select className="input" value={f.shoeId || ''} onChange={(e) => set('shoeId', e.target.value || undefined)}>
                  <option value="">— nenhum —</option>
                  {data.running.shoes.filter((s) => !s.retired || s.id === f.shoeId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            )}
            <label className="field">
              <span>Como foi a corrida?</span>
              <textarea className="input race-story-input" rows={7} placeholder="Conte como foi: o percurso, o clima, como você se sentiu, o que achou da organização, o momento mais marcante…" value={f.story || ''} onChange={(e) => set('story', e.target.value)} />
            </label>
            <div className="field">
              <span>Suas fotos durante a corrida</span>
              <div className="race-gallery edit">
                {(f.photos || []).map((id) => (
                  <span key={id} className="race-photo">
                    <Img id={id} alt="Foto da corrida" />
                    <button className="race-photo-del" onClick={() => removePhoto(id)} title="Tirar foto">×</button>
                  </span>
                ))}
                <label className="race-photo-add">
                  <Icon name="plus" size={22} />
                  <span className="small">Adicionar fotos</span>
                  <input type="file" accept="image/*" multiple hidden onChange={pick('photos')} />
                </label>
              </div>
            </div>
            {busy && <p className="muted small">Salvando as fotos…</p>}
            {error && <p className="cal-error" role="alert">{error}</p>}
            <div className="row">
              <button className="btn primary" onClick={save} disabled={busy}><Icon name="check" size={16} /> Salvar</button>
              <button className="btn" onClick={cancel}>Cancelar</button>
              {!isNew && <button className="btn danger" onClick={remove} style={{ marginLeft: 'auto' }}><Icon name="trash" size={16} /> Apagar prova</button>}
            </div>
            <p className="muted small">As fotos ficam salvas só neste computador (não entram no backup .json).</p>
          </div>
        ) : (
          <div className="race-view">
            <div className="race-view-head">
              <div>
                <h2>{shown.title}</h2>
                <span className="muted">{formatLong(shown.date)}{shown.place ? ` · ${shown.place}` : ''}</span>
              </div>
              <button className="btn" onClick={() => { setF(current); setEditing(true); }}><Icon name="edit" size={16} /> Editar</button>
            </div>
            <div className="race-stats">
              {fmtDist(shown) && <div><b>{fmtDist(shown)}</b><span className="muted small">distância</span></div>}
              {shown.result && <div><b>{shown.result}</b><span className="muted small">tempo</span></div>}
              {pace && <div><b>{pace}</b><span className="muted small">pace</span></div>}
              {shown.date >= today && !shown.done && <div><b>{whenText(shown, today)}</b><span className="muted small">largada</span></div>}
            </div>
            {shown.story ? (
              <p className="race-story">{shown.story}</p>
            ) : (
              <button className="race-story-empty" onClick={() => { setF(current); setEditing(true); }}>✍️ Conte como foi essa corrida…</button>
            )}
            {photos.length > 0 && (
              <div className="race-gallery">
                {photos.map((id, i) => <Img key={id} id={id} alt={`Foto ${i + 1} da corrida`} className="race-photo-img" onClick={() => setView(i)} />)}
              </div>
            )}
            {shown.link && /^https?:\/\//.test(shown.link) && <a className="cal-link" href={shown.link} target="_blank" rel="noreferrer">Site da prova ↗</a>}
          </div>
        )}
      </div>

      {view !== null && photos[view] && (
        <div className="race-lightbox" onClick={(e) => { e.stopPropagation(); setView(null); }}>
          <Img id={photos[view]} alt={`Foto ${view + 1}`} />
          {photos.length > 1 && (
            <>
              <button className="race-lb-nav left" onClick={(e) => { e.stopPropagation(); setView((view - 1 + photos.length) % photos.length); }} aria-label="Foto anterior"><Icon name="left" size={28} /></button>
              <button className="race-lb-nav right" onClick={(e) => { e.stopPropagation(); setView((view + 1) % photos.length); }} aria-label="Próxima foto"><Icon name="right" size={28} /></button>
            </>
          )}
          <span className="race-lb-count">{view + 1} / {photos.length}</span>
        </div>
      )}
    </div>
  );
}
