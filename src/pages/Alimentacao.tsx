import { useState } from 'react';
import FoodPicker from '../components/FoodPicker';
import Icon from '../components/Icon';
import { Check, Empty, Progress, fmtMl } from '../components/ui';
import { useStore } from '../store/StoreContext';
import BarChart from '../components/BarChart';
import { addDays, formatMedium, formatShort, nowMinutes, parseKey, toMinutes } from '../store/dates';
import { dayNutrition, fmtKcal, itemAmount, sumItems } from '../store/foods';
import { mealList, uid, waterTotal } from '../store/model';
import Agua from './Agua';
import { energy } from '../store/body';
import type { MealEntry } from '../store/model';
import type { DayKey, FoodItem, Macros, MealState } from '../store/types';
import type { PageProps } from './types';

const MACROS: { k: 'p' | 'c' | 'g'; label: string; color: string }[] = [
  { k: 'p', label: 'Proteína', color: 'var(--danger)' },
  { k: 'c', label: 'Carboidrato', color: 'var(--warning)' },
  { k: 'g', label: 'Gordura', color: 'var(--water)' },
];

function MacroLine({ t }: { t: Macros }) {
  return (
    <div className="macros">
      {MACROS.map((m) => (
        <span key={m.k}><i style={{ background: m.color }} />{m.label} <strong>{Math.round(t[m.k])} g</strong></span>
      ))}
    </div>
  );
}

const MEAL_TYPES = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'];
const pad = (n: number) => String(n).padStart(2, '0');
const toHHMM = (ts: number) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** Timestamp do dia `key` no horário 'HH:MM'. */
const atTime = (key: DayKey, hhmm: string) => {
  const d = parseKey(key);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
/** Sugere o tipo de refeição pela hora atual. */
const guessType = () => {
  const h = new Date().getHours();
  if (h < 10) return 'Café da manhã';
  if (h < 15) return 'Almoço';
  if (h < 18) return 'Lanche';
  if (h < 22) return 'Jantar';
  return 'Ceia';
};

function NewMealForm({ onSave, onCancel }: { onSave: (name: string, time: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(guessType);
  const [time, setTime] = useState(() => toHHMM(Date.now()));
  return (
    <form
      className="card"
      onSubmit={(e) => { e.preventDefault(); if (name.trim() && time) onSave(name.trim(), time); }}
    >
      <div className="card-head"><h2>Registrar refeição</h2></div>
      <div className="chips">
        {MEAL_TYPES.map((t) => (
          <button type="button" key={t} className={`chip ${name === t ? 'on' : ''}`} onClick={() => setName(t)}>{t}</button>
        ))}
      </div>
      <div className="row">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex.: Pré-treino)" aria-label="Nome da refeição" />
        <label className="row small muted" style={{ gap: 6 }}>
          Comi às
          <input className="input w-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <button className="btn primary" type="submit"><Icon name="check" size={16} /> Registrar e adicionar alimentos</button>
        <button className="btn" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export default function Alimentacao({ go, startedAt, tab = 'refeicoes' }: PageProps & { tab?: 'refeicoes' | 'agua' }) {
  const { data, today, day, settings, update } = useStore();
  const [openPicker, setOpenPicker] = useState<string | null>(null); // id da refeição com o seletor aberto
  const [adding, setAdding] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const meals = mealList(settings, day);
  const n = nowMinutes();
  const doneCount = meals.filter((m) => m.st.done).length;
  const tot = dayNutrition(day);
  const goal = settings.kcalGoal;
  const en = energy(settings.profile);

  // Últimos 7 dias (hoje incluso), barras empilhadas de proteína/carboidrato/gordura em gramas.
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((k) => ({ k, t: dayNutrition(data.days[k]) }));
  const withFood = week.filter((w) => w.t.kcal > 0);
  const avg = (f: keyof Macros) => (withFood.length ? withFood.reduce((a, w) => a + w.t[f], 0) / withFood.length : 0);
  const weekAvg = { kcal: avg('kcal'), p: avg('p'), c: avg('c'), g: avg('g') };
  const weekItems = week.map(({ k, t }) => ({
    key: k,
    label: formatMedium(k).split(',')[0].replace('.', ''),
    value: t.p + t.c + t.g,
    segments: MACROS.map((m) => ({ value: t[m.k], color: m.color, title: `${formatShort(k)} · ${m.label}: ${Math.round(t[m.k])} g` })),
  }));

  const patch = (id: string, fn: (m: MealState) => void) =>
    update((d) => {
      const m = d.days[today].meals;
      m[id] = { ...(m[id] || {}) };
      fn(m[id]);
    });

  const createMeal = (name: string, time: string) => {
    const id = uid();
    update((d) => {
      d.days[today].meals[id] = { adhoc: true, name, done: true, doneAt: atTime(today, time), items: [] };
    });
    setAdding(false);
    setOpenPicker(id);
  };
  const removeMeal = (m: MealEntry) => {
    if ((m.st.items || []).length && !confirm(`Apagar o registro "${m.name}" e seus alimentos?`)) return;
    update((d) => { delete d.days[today].meals[m.id]; });
  };

  const addItem = (mealId: string, item: FoodItem) =>
    patch(mealId, (m) => {
      m.items = [...(m.items || []), item];
      if (!m.done) { m.done = true; m.doneAt = Date.now(); }
    });
  const removeItem = (mealId: string, itemId: string) => patch(mealId, (m) => { m.items = (m.items || []).filter((i) => i.id !== itemId); });

  const water = waterTotal(day);
  const addWater = (ml: number) => update((d) => d.days[today].water.push({ ml, at: Date.now() }));

  const header = (
    <header className="page-header">
      <div>
        <h1>Alimentação</h1>
        <p className="muted">
          {tab === 'agua'
            ? `Água hoje: ${fmtMl(water)} · mínimo ${fmtMl(settings.waterGoal)} · ideal ${fmtMl(settings.waterIdeal || settings.waterGoal)}`
            : meals.length ? `${doneCount} de ${meals.length} refeições feitas hoje` : 'Nenhuma refeição registrada hoje'}
        </p>
      </div>
      <div className="row">
        <div className="segmented">
          <button className={tab !== 'agua' ? 'on' : ''} onClick={() => go('alimentacao')}><Icon name="alimentacao" size={16} /> Refeições</button>
          <button className={tab === 'agua' ? 'on' : ''} onClick={() => go('agua')}><Icon name="agua" size={16} /> Água</button>
        </div>
        {tab !== 'agua' && !adding && (
          <button className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" size={18} /> Registrar refeição</button>
        )}
        {tab !== 'agua' && (
          <button className="btn" onClick={() => go('config')}><Icon name="clock" size={18} /> Horários e meta</button>
        )}
      </div>
    </header>
  );

  if (tab === 'agua') {
    return (
      <div className="page">
        {header}
        <Agua embedded startedAt={startedAt} />
      </div>
    );
  }

  return (
    <div className="page">
      {header}

      {adding && <NewMealForm onSave={createMeal} onCancel={() => setAdding(false)} />}

      <section className="card">
        <div className="kcal-total">
          <h2>Calorias de hoje</h2>
          <span>
            <strong style={{ fontSize: '1.4rem' }}>{fmtKcal(tot.kcal)}</strong>
            {goal > 0 && <span className="muted"> de {fmtKcal(goal)}</span>}
          </span>
        </div>
        {goal > 0 && <Progress value={tot.kcal} max={goal} variant={tot.kcal > goal ? '' : 'success'} />}
        <div className="row small muted" style={{ justifyContent: 'space-between' }}>
          <MacroLine t={tot} />
          {goal > 0 && <span>{tot.kcal <= goal ? `Restam ${fmtKcal(goal - tot.kcal)}` : `${fmtKcal(tot.kcal - goal)} acima da meta`}</span>}
        </div>
        <div className="energy">
          {en.tdee ? (
            <>
              <div>
                <div className="muted small">Gasto diário estimado</div>
                <strong style={{ fontSize: '1.2rem' }}>{fmtKcal(en.tdee)}</strong>
                <div className="muted small">basal {fmtKcal(en.bmr ?? 0)} × atividade {String(en.factor).replace('.', ',')}</div>
              </div>
              <div>
                <div className="muted small">Saldo de hoje</div>
                <strong style={{ fontSize: '1.2rem', color: tot.kcal > en.tdee ? 'var(--warning)' : 'var(--success)' }}>
                  {tot.kcal > en.tdee ? '+' : '−'}{fmtKcal(Math.abs(en.tdee - tot.kcal))}
                </strong>
                <div className="muted small">{tot.kcal > en.tdee ? 'acima do gasto' : 'abaixo do gasto (déficit)'}</div>
              </div>
              {goal !== en.tdee && (
                <button className="btn sm" onClick={() => update((d) => { d.settings.kcalGoal = en.tdee ?? d.settings.kcalGoal; })}>
                  Usar {fmtKcal(en.tdee)} como meta
                </button>
              )}
            </>
          ) : (
            <span className="muted small">
              Para ver quantas calorias você gasta por dia, preencha {en.missing.join(', ')} em{' '}
              <button className="link" onClick={() => go('config')}>Configurações</button>.
            </span>
          )}
        </div>
      </section>

      {/* Água compacta: registra sem sair da aba de refeições */}
      <section className="card water-mini">
        <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
          <div className="stat-icon water"><Icon name="agua" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                <strong>{fmtMl(water)}</strong>{' '}
                <span className="muted">de água · mínimo {fmtMl(settings.waterGoal)} · ideal {fmtMl(settings.waterIdeal || settings.waterGoal)}</span>
              </span>
              <button className="link small" onClick={() => go('agua')}>Detalhes</button>
            </div>
            <Progress
              value={water}
              max={Math.max(settings.waterGoal, settings.waterIdeal || 0)}
              mark={settings.waterGoal}
              variant={water >= settings.waterGoal ? 'success' : 'water'}
            />
          </div>
        </div>
        <div className="row">
          {settings.waterQuick.map((ml) => (
            <button key={ml} className="btn water sm" onClick={() => addWater(ml)}>+{fmtMl(ml)}</button>
          ))}
          <button className="btn sm" onClick={() => update((d) => d.days[today].water.pop())} disabled={!day.water.length}>
            <Icon name="undo" size={14} /> Desfazer
          </button>
        </div>
      </section>

      {meals.length ? (
        <section className="grid">
          {meals.map((m) => {
            const st = m.st;
            const items = st.items || [];
            const sub = sumItems(items);
            const late = !st.done && m.time && n > toMinutes(m.time);
            return (
              <div key={m.id} className="card">
                <div className="card-head">
                  <div className="row" style={{ gap: 12 }}>
                    {m.adhoc ? (
                      <span className="stat-icon food" style={{ width: 32, height: 32, borderRadius: 10 }}><Icon name="alimentacao" size={16} /></span>
                    ) : (
                      <Check
                        on={!!st.done}
                        onClick={() => patch(m.id, (x) => { x.done = !st.done; x.doneAt = st.done ? undefined : Date.now(); })}
                        label="Marcar como feita"
                      />
                    )}
                    <div>
                      <h2>{m.name}</h2>
                      <div className="muted small">
                        {m.time ? `Sugerido: ${m.time}` : 'Registrada na hora'}
                        {items.length > 0 && ` · ${fmtKcal(sub.kcal)}`}
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                    {st.done ? (
                      <label className="badge success" title="Horário em que você comeu (pode ajustar)">
                        Comi às
                        <input
                          type="time"
                          className="time-inline"
                          value={st.doneAt ? toHHMM(st.doneAt) : ''}
                          onChange={(e) => e.target.value && patch(m.id, (x) => { x.doneAt = atTime(today, e.target.value); })}
                        />
                      </label>
                    ) : late ? (
                      <span className="badge warning">Pendente</span>
                    ) : (
                      <span className="badge">Mais tarde</span>
                    )}
                    {m.adhoc && (
                      <button className="icon-btn danger" title="Apagar registro" onClick={() => removeMeal(m)}><Icon name="trash" size={16} /></button>
                    )}
                  </div>
                </div>

                {items.length > 0 && (
                  <ul className="list">
                    {items.map((it) => (
                      <li key={it.id} className="item food-item">
                        <span className="item-title small">{it.name} <span className="muted">· {itemAmount(it)}</span></span>
                        <span className="small"><strong>{it.kcal}</strong> kcal</span>
                        <div className="item-actions">
                          <button className="icon-btn danger" title="Remover" onClick={() => removeItem(m.id, it.id)}><Icon name="trash" size={16} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {items.length > 0 && <MacroLine t={sub} />}

                {openPicker === m.id ? (
                  <FoodPicker onAdd={(item) => addItem(m.id, item)} onClose={() => setOpenPicker(null)} />
                ) : (
                  <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setOpenPicker(m.id)}>
                    <Icon name="plus" size={16} /> Adicionar alimento
                  </button>
                )}

                <textarea
                  className="input"
                  placeholder="Anotações (opcional)"
                  value={st.note || ''}
                  onChange={(e) => patch(m.id, (x) => { x.note = e.target.value; })}
                />
              </div>
            );
          })}
        </section>
      ) : (
        !adding && (
          <div className="card">
            <Empty>
              Comeu algo? <button className="link" onClick={() => setAdding(true)}>Registrar refeição</button>
              <div className="small" style={{ marginTop: 6 }}>
                Se quiser lembretes, cadastre horários sugeridos em <button className="link" onClick={() => go('config')}>Configurações</button>.
              </div>
            </Empty>
          </div>
        )
      )}

      <section className="card">
        <div className="card-head">
          <h2>Macros da semana</h2>
          <span className="muted small">média: {weekAvg.kcal ? `${fmtKcal(weekAvg.kcal)}/dia` : '—'}</span>
        </div>
        <BarChart items={weekItems} format={(v) => `${v}g`} />
        <div className="legend">
          {MACROS.map((m) => <span key={m.k}><i style={{ background: m.color }} />{m.label}</span>)}
          {weekAvg.kcal > 0 && (
            <span>média/dia: P {Math.round(weekAvg.p)} g · C {Math.round(weekAvg.c)} g · G {Math.round(weekAvg.g)} g</span>
          )}
        </div>
      </section>

      {data.customFoods.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>Meus alimentos cadastrados</h2>
            <button className="link" onClick={() => setShowMine(!showMine)}>{showMine ? 'Esconder' : `Ver (${data.customFoods.length})`}</button>
          </div>
          {showMine && (
            <ul className="list">
              {data.customFoods.map((f) => (
                <li key={f.id} className="item food-item">
                  <span className="item-title">{f.name}</span>
                  <span className="muted small">{Math.round(f.kcal)} kcal/100g</span>
                  <button
                    className="icon-btn danger"
                    title="Apagar"
                    onClick={() => confirm(`Apagar "${f.name}" da sua lista? (Refeições já registradas não mudam.)`) &&
                      update((d) => {
                        d.customFoods = d.customFoods.filter((x) => x.id !== f.id);
                        delete d.foodUsage[`c${f.id}`];
                      })}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="muted small" style={{ textAlign: 'center', margin: 0 }}>
        Valores da Tabela TACO (NEPA/UNICAMP), por 100 g do alimento. São aproximações.
      </p>
    </div>
  );
}
