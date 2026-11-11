import { useMemo, useState } from 'react';
import BodyMap from '../components/BodyMap';
import ExercisePreview, { hasPreview } from '../components/ExercisePreview';
import Icon from '../components/Icon';
import { Empty } from '../components/ui';
import { CATEGORIES, EQUIPMENT, EXERCISES, EXERCISE_BY_ID, MUSCLES } from '../data/exercises';
import { useStore } from '../store/StoreContext';
import { norm } from '../store/foods';
import { uid } from '../store/model';
import { slotLetter, suggestion, trainingConfig } from '../store/training';
import type { Exercise, Workout, WorkoutItem } from '../store/types';
import TreinoHistorico from './TreinoHistorico';
import TreinoCiclo, { WorkoutCheck, useTrainingActions } from './TreinoCiclo';

type SetItem = (id: string, k: 'sets' | 'reps' | 'weight' | 'minutes' | 'distance', v: string) => void;
type Dispatch = (fn: (list: string[]) => string[]) => void;

const LETTERS = 'ABCDEFGHIJ';
const PAGE = 40; // exercícios por página na biblioteca

/** Cardio é registrado por tempo (e distância opcional), não por séries/repetições. */
export const isTimed = (exId: string) => EXERCISE_BY_ID[exId]?.cat === 'Cardio';

function CardioPills({ it, setItem }: { it: WorkoutItem; setItem: SetItem }) {
  const noDist = String(it.distance ?? '').trim() === '';
  const noMin = String(it.minutes ?? '').trim() === '';
  return (
    <div className="pills">
      <label className={`pill ${noMin ? 'pill-empty' : 'pill-strong'}`}>
        <input
          type="number"
          min="1"
          value={it.minutes ?? ''}
          onChange={(ev) => setItem(it.id, 'minutes', ev.target.value)}
          aria-label="Minutos"
          placeholder="20"
          style={{ width: `${Math.max(2, String(it.minutes ?? '').length + 0.6)}ch` }}
        />
        <span>min</span>
      </label>
      <label className={`pill ${noDist ? 'pill-empty' : ''}`} title="Distância (opcional)">
        {noDist && <span>+</span>}
        <input
          type="number"
          min="0"
          step="0.1"
          value={it.distance ?? ''}
          onChange={(ev) => setItem(it.id, 'distance', ev.target.value)}
          aria-label="Distância em km"
          style={{ width: `${Math.max(noDist ? 0.5 : 1.6, String(it.distance ?? '').length + 0.6)}ch` }}
        />
        <span>km</span>
      </label>
    </div>
  );
}

/** Músculos trabalhados por um treino (principais). */
function musclesOf(w: Workout): string[] {
  const set = new Set<string>();
  for (const it of w.items) EXERCISE_BY_ID[it.exId]?.m.forEach((m) => set.add(m));
  return [...set];
}

// ---------------------------------------------------------------------------
// Biblioteca: mapa do corpo + filtros + lista de exercícios
// ---------------------------------------------------------------------------
function Library({ workouts, target, setTarget, onAdd, onCreate }: {
  workouts: Workout[];
  target: string | null;
  setTarget: (id: string) => void;
  onAdd: (exId: string) => void;
  onCreate: () => string;
}) {
  const [muscles, setMuscles] = useState<string[]>([]);
  const [equip, setEquip] = useState<string[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  // atualização funcional: cliques rápidos seguidos não se perdem
  const toggle = (set: Dispatch) => (v: string) => {
    set((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]));
    setLimit(PAGE);
  };
  const toggleMuscle = toggle(setMuscles);
  const toggleEquip = toggle(setEquip);
  const toggleCat = toggle(setCats);

  const list = useMemo(() => {
    const words = norm(q).split(' ').filter(Boolean);
    const rank = (e: Exercise) =>
      (muscles.length && !muscles.some((m) => e.m.includes(m)) ? 100 : 0) + // músculo escolhido como PRINCIPAL primeiro
      (e.curated ? 0 : 10) + // depois os que têm passo a passo em português
      (hasPreview(e.id) ? 0 : 1);
    return EXERCISES.filter((e) => {
      if (muscles.length && !muscles.some((m) => e.m.includes(m) || e.s.includes(m))) return false;
      if (equip.length && !equip.includes(e.eq)) return false;
      if (cats.length && !cats.includes(e.cat)) return false;
      if (words.length) {
        const hay = norm(`${e.name} ${e.en || ''}`);
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    }).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'));
  }, [muscles, equip, cats, q]);

  const targetW = workouts.find((w) => w.id === target);
  const inTarget = new Set(targetW?.items.map((i) => i.exId) || []);

  return (
    <div className="treino-layout">
      <div className="card">
        <div className="card-head">
          <h2>Grupos musculares</h2>
          {muscles.length > 0 && <button className="link small" onClick={() => setMuscles([])}>Limpar</button>}
        </div>
        <BodyMap selected={muscles} onToggle={toggleMuscle} />
        <div className="chips">
          {Object.entries(MUSCLES).map(([id, name]) => (
            <button key={id} className={`chip ${muscles.includes(id) ? 'on' : ''}`} onClick={() => toggleMuscle(id)}>{name}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row">
          <input className="input" placeholder="Buscar exercício (português ou inglês)…" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
        </div>
        <div className="field" style={{ gap: 6 }}>
          <span className="muted small">Equipamento</span>
          <div className="chips">
            {EQUIPMENT.map((eq) => (
              <button key={eq} className={`chip ${equip.includes(eq) ? 'on' : ''}`} onClick={() => toggleEquip(eq)}>{eq}</button>
            ))}
          </div>
        </div>
        <div className="field" style={{ gap: 6 }}>
          <span className="muted small">Tipo</span>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c} className={`chip ${cats.includes(c) ? 'on' : ''}`} onClick={() => toggleCat(c)}>{c}</button>
            ))}
          </div>
        </div>
        <div className="row small" style={{ justifyContent: 'space-between' }}>
          <span className="muted">{list.length} exercício(s)</span>
          {workouts.length ? (
            <label className="row" style={{ gap: 6 }}>
              <span className="muted">Adicionar em:</span>
              <select className="input" style={{ width: 'auto' }} value={target || ''} onChange={(e) => setTarget(e.target.value)}>
                {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
          ) : (
            <button className="btn sm" onClick={onCreate}><Icon name="plus" size={14} /> Criar treino</button>
          )}
        </div>

        {list.length ? (
          <div className="list" style={{ gap: 8 }}>
            {list.slice(0, limit).map((e) => (
              <div key={e.id} className={`ex-item ${hasPreview(e.id) && open !== e.id ? 'with-thumb' : ''}`}>
                {open !== e.id && <ExercisePreview id={e.id} name={e.name} onClick={() => setOpen(e.id)} />}
                <div className="ex-body">
                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                  <button className="link" style={{ color: 'var(--text)', textAlign: 'left' }} onClick={() => setOpen(open === e.id ? null : e.id)}>
                    {e.name}
                  </button>
                  {inTarget.has(e.id) ? (
                    <span className="badge success"><Icon name="check" size={12} /> no {targetW?.name}</span>
                  ) : (
                    <button className="btn sm primary" onClick={() => onAdd(e.id)} title={workouts.length ? `Adicionar ao ${targetW?.name}` : 'Cria um treino e adiciona'}>
                      <Icon name="plus" size={14} /> Adicionar
                    </button>
                  )}
                </div>
                <div className="chips">
                  {e.m.map((m) => <span key={m} className="badge primary">{MUSCLES[m]}</span>)}
                  {e.s.map((m) => <span key={m} className="badge">{MUSCLES[m]}</span>)}
                  <span className="badge warning">{e.eq}</span>
                  {e.cat !== 'Força' && <span className="badge water">{e.cat}</span>}
                  {e.level && <span className="badge">{e.level}</span>}
                </div>
                {open === e.id ? (
                  <>
                    <ExercisePreview id={e.id} name={e.name} size="big" />
                    <ol>{e.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                    <button className="link small" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(null)}>Fechar</button>
                  </>
                ) : (
                  <button className="link small" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(e.id)}>Como fazer</button>
                )}
                </div>
              </div>
            ))}
            {list.length > limit && (
              <button className="btn" style={{ alignSelf: 'center' }} onClick={() => setLimit(limit + PAGE)}>
                Mostrar mais ({list.length - limit} restantes)
              </button>
            )}
          </div>
        ) : (
          <Empty>Nenhum exercício com esses filtros.</Empty>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Um treino montado (Treino A, B…)
// ---------------------------------------------------------------------------
function WorkoutCard({ w, isToday, doneToday, letter, onOpenCycle, onChange, onRemove, onAddExercises, onDone, onUndo }: {
  w: Workout;
  isToday: boolean;
  doneToday: boolean;
  onDone: () => void;
  onUndo: () => void;
  letter: string | null;
  onOpenCycle: () => void;
  onChange: (fn: (w: Workout) => void) => void;
  onRemove: () => void;
  onAddExercises: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const muscles = musclesOf(w);
  const strength = w.items.filter((it) => !isTimed(it.exId));
  const totalSets = strength.reduce((a, it) => a + (parseInt(String(it.sets), 10) || 0), 0);
  const missing = strength.filter((it) => String(it.weight ?? '').trim() === '').length;
  const cardioMin = w.items.filter((it) => isTimed(it.exId)).reduce((a, it) => a + (parseFloat(String(it.minutes)) || 0), 0);

  const setItem: SetItem = (id, k, v) =>
    onChange((x) => {
      const it = x.items.find((i) => i.id === id);
      if (it) it[k] = v;
    });
  const move = (idx: number, dir: number) =>
    onChange((x) => {
      const j = idx + dir;
      if (j < 0 || j >= x.items.length) return;
      [x.items[idx], x.items[j]] = [x.items[j], x.items[idx]];
    });

  return (
    <div className={`card workout-card ${isToday ? 'is-today' : ''}`}>
      <div className="card-head">
        {renaming ? (
          <form className="inline-edit" onSubmit={(e) => { e.preventDefault(); setRenaming(false); }}>
            <input className="input" autoFocus value={w.name} onChange={(e) => onChange((x) => { x.name = e.target.value; })} onBlur={() => setRenaming(false)} />
          </form>
        ) : (
          <h2 className="workout-title" onDoubleClick={() => setRenaming(true)}>
            {w.name} {doneToday ? <span className="badge success">✓ feito hoje</span> : isToday && <span className="badge success">treino de hoje</span>}
          </h2>
        )}
        <div className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
          {doneToday ? (
            <button className="btn sm" onClick={onUndo} title="Desmarcar o treino de hoje"><Icon name="undo" size={14} /> Desfazer</button>
          ) : (
            <button className="btn sm primary" onClick={onDone} disabled={!w.items.length} title="Confirma o treino: escolha o dia (hoje, ontem…) e marque os exercícios feitos">
              ✅ Já fiz
            </button>
          )}
          <button className="icon-btn" title="Renomear" onClick={() => setRenaming(true)}><Icon name="edit" size={18} /></button>
          <button className="icon-btn danger" title="Apagar treino" onClick={onRemove}><Icon name="trash" size={18} /></button>
        </div>
      </div>

      <div className="workout-meta">
        <button className="meta-item" onClick={onOpenCycle} title="Ver ciclo e descanso">
          <Icon name="repeat" size={14} /> {letter ? `${letter} no ciclo` : 'Fora do ciclo'}
          <span className="link small">ciclo</span>
        </button>
        <span className="meta-item"><Icon name="treino" size={14} /> {w.items.length} exercício(s)</span>
        {totalSets > 0 && <span className="meta-item"><Icon name="repeat" size={14} /> {totalSets} séries</span>}
        {cardioMin > 0 && <span className="meta-item"><Icon name="clock" size={14} /> {cardioMin} min de cardio</span>}
        {missing > 0 && <span className="meta-item warn">{missing} sem carga</span>}
      </div>

      {muscles.length > 0 && (
        <div className="chips">{muscles.map((m) => <span key={m} className="badge primary">{MUSCLES[m]}</span>)}</div>
      )}

      {w.items.length ? (
        <div className="ex-grid">
          {w.items.map((it, i) => {
            const e = EXERCISE_BY_ID[it.exId];
            const noWeight = String(it.weight ?? '').trim() === '';
            return (
              <div key={it.id} className="ex-tile">
                <div className="ex-tile-media">
                  {hasPreview(it.exId) ? (
                    <ExercisePreview id={it.exId} name={e?.name} size="tile" />
                  ) : (
                    <div className="ex-anim tile ex-noimg"><Icon name="treino" size={28} /></div>
                  )}
                  <span className="ex-num">{i + 1}</span>
                </div>
                <div className="ex-tile-body">
                  <div className="ex-tile-head">
                    <div style={{ minWidth: 0 }}>
                      <div className="ex-tile-name">{e?.name || 'Exercício removido'}</div>
                      <div className="muted small">{(e?.m || []).slice(0, 2).map((m) => MUSCLES[m]).join(' · ')}{e && ` · ${e.eq}`}</div>
                    </div>
                    <div className="ex-tile-actions">
                      <button className="icon-btn" title="Subir" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size={16} /></button>
                      <button className="icon-btn" title="Descer" disabled={i === w.items.length - 1} onClick={() => move(i, 1)}><Icon name="down" size={16} /></button>
                      <button className="icon-btn danger" title="Remover" onClick={() => onChange((x) => { x.items = x.items.filter((y) => y.id !== it.id); })}><Icon name="trash" size={16} /></button>
                    </div>
                  </div>
                  {isTimed(it.exId) ? (
                    <CardioPills it={it} setItem={setItem} />
                  ) : (
                  <div className="pills">
                    <label className="pill">
                      <input type="number" min="1" value={it.sets} onChange={(ev) => setItem(it.id, 'sets', ev.target.value)} aria-label="Séries" style={{ width: `${String(it.sets).length + 0.6}ch` }} />
                      <span>séries</span>
                    </label>
                    <label className="pill">
                      <input value={it.reps} onChange={(ev) => setItem(it.id, 'reps', ev.target.value)} aria-label="Repetições" placeholder="10" style={{ width: `${Math.max(1.6, String(it.reps).length + 0.6)}ch` }} />
                      <span>reps</span>
                    </label>
                    <label className={`pill ${noWeight ? 'pill-empty' : 'pill-strong'}`} title={noWeight ? 'Preencha depois do treino' : 'Carga'}>
                      {noWeight && <span>+</span>}
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={it.weight}
                        onChange={(ev) => setItem(it.id, 'weight', ev.target.value)}
                        aria-label="Carga em kg"
                        style={{ width: `${Math.max(noWeight ? 0.5 : 1.6, String(it.weight).length + 0.6)}ch` }}
                      />
                      <span>kg</span>
                    </label>
                  </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>Nenhum exercício ainda.</Empty>
      )}
      <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={onAddExercises}>
        <Icon name="plus" size={16} /> Adicionar exercícios
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function Treino() {
  const { data, today, update } = useStore();
  const workouts = data.workouts;
  const [tab, setTab] = useState('treinos');
  const [target, setTarget] = useState<string | null>(workouts[0]?.id || null);
  const { rotation } = trainingConfig(data);
  const sug = suggestion(data, today);
  const todayId = sug.logged ? sug.logged.workoutId : sug.workoutId ?? null; // em dia de descanso, nenhum
  const act = useTrainingActions();
  const [check, setCheck] = useState<string | null>(null);
  const doneId = data.days[today]?.training?.type === 'workout' ? data.days[today].training!.workoutId : null;

  const createWorkout = () => {
    const w: Workout = { id: uid(), name: `Treino ${LETTERS[workouts.length] || workouts.length + 1}`, days: [], items: [] };
    update((d) => d.workouts.push(w));
    setTarget(w.id);
    return w.id;
  };
  const changeWorkout = (id: string) => (fn: (w: Workout) => void) =>
    update((d) => {
      const w = d.workouts.find((x) => x.id === id);
      if (w) fn(w);
    });
  const removeWorkout = (w: Workout) => {
    if (!confirm(`Apagar o ${w.name}?`)) return;
    update((d) => { d.workouts = d.workouts.filter((x) => x.id !== w.id); });
    if (target === w.id) setTarget(workouts.find((x) => x.id !== w.id)?.id || null);
  };
  const addExercise = (exId: string) => {
    const id = target && workouts.some((w) => w.id === target) ? target : createWorkout();
    update((d) => {
      d.workouts.find((w) => w.id === id)?.items.push(
        isTimed(exId)
          ? { id: uid(), exId, minutes: 20, distance: '' } // cardio: por tempo
          : { id: uid(), exId, sets: 3, reps: '10-12', weight: '' }
      );
    });
  };

  return (
    <div className="page page-wide">
      {check && <WorkoutCheck workoutId={check} onClose={() => setCheck(null)} />}
      <header className="page-header">
        <div>
          <h1>Treino</h1>
          <p className="muted">Monte seus treinos escolhendo músculos e exercícios.</p>
        </div>
        <div className="segmented">
          <button className={tab === 'treinos' ? 'on' : ''} onClick={() => setTab('treinos')}>Meus treinos</button>
          <button className={tab === 'ciclo' ? 'on' : ''} onClick={() => setTab('ciclo')}>Ciclo e descanso</button>
          <button className={tab === 'exercicios' ? 'on' : ''} onClick={() => setTab('exercicios')}>Exercícios</button>
          <button className={tab === 'historico' ? 'on' : ''} onClick={() => setTab('historico')}>Histórico</button>
        </div>
      </header>

      {tab === 'historico' ? (
        <TreinoHistorico />
      ) : tab === 'ciclo' ? (
        <TreinoCiclo goTab={setTab} />
      ) : tab === 'exercicios' ? (
        <Library workouts={workouts} target={target} setTarget={setTarget} onAdd={addExercise} onCreate={createWorkout} />
      ) : (
        <>
          <div className="row">
            <button className="btn primary" onClick={createWorkout}><Icon name="plus" size={18} /> Novo treino</button>
          </div>
          {workouts.length ? (
            <section className="stack">
              {workouts.map((w) => (
                <WorkoutCard
                  key={w.id}
                  w={w}
                  isToday={todayId === w.id}
                  doneToday={doneId === w.id}
                  onDone={() => setCheck(w.id)}
                  onUndo={act.undo}
                  letter={rotation.includes(w.id) ? slotLetter(rotation.indexOf(w.id)) : null}
                  onOpenCycle={() => setTab('ciclo')}
                  onChange={changeWorkout(w.id)}
                  onRemove={() => removeWorkout(w)}
                  onAddExercises={() => { setTarget(w.id); setTab('exercicios'); }}
                />
              ))}
            </section>
          ) : (
            <div className="card">
              <Empty>
                Você ainda não montou nenhum treino.
                <div style={{ marginTop: 8 }}>
                  <button className="btn primary" onClick={() => { createWorkout(); setTab('exercicios'); }}>
                    <Icon name="plus" size={16} /> Montar meu primeiro treino
                  </button>
                </div>
              </Empty>
            </div>
          )}
          <p className="muted small" style={{ textAlign: 'center', margin: 0 }}>
            Dicas gerais de execução. Em caso de dor ou dúvida, procure um profissional de educação física.
            {' '}Imagens: free-exercise-db (domínio público).
          </p>
        </>
      )}
    </div>
  );
}
