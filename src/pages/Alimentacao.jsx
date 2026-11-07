import { useState } from 'react';
import FoodPicker from '../components/FoodPicker.jsx';
import Icon from '../components/Icon.jsx';
import { Check, Empty, Progress } from '../components/ui.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { formatTime, nowMinutes, toMinutes } from '../store/dates.js';
import { dayNutrition, fmtKcal, sumItems } from '../store/foods.js';

export default function Alimentacao({ go }) {
  const { data, today, day, settings, update } = useStore();
  const [openPicker, setOpenPicker] = useState(null); // id da refeição com o seletor aberto
  const [showMine, setShowMine] = useState(false);
  const meals = [...settings.meals].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const n = nowMinutes();
  const doneCount = meals.filter((m) => day.meals[m.id]?.done).length;
  const tot = dayNutrition(day);
  const goal = settings.kcalGoal;

  const patch = (id, fn) =>
    update((d) => {
      const m = d.days[today].meals;
      m[id] = { ...(m[id] || {}) };
      fn(m[id]);
    });

  const addItem = (mealId, item) =>
    patch(mealId, (m) => {
      m.items = [...(m.items || []), item];
      if (!m.done) { m.done = true; m.doneAt = Date.now(); }
    });
  const removeItem = (mealId, itemId) => patch(mealId, (m) => { m.items = (m.items || []).filter((i) => i.id !== itemId); });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Alimentação</h1>
          <p className="muted">{doneCount} de {meals.length} refeições feitas hoje</p>
        </div>
        <button className="btn" onClick={() => go('config')}><Icon name="clock" size={18} /> Editar horários e meta</button>
      </header>

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
          <span>Proteína {Math.round(tot.p)} g · Carboidrato {Math.round(tot.c)} g · Gordura {Math.round(tot.g)} g</span>
          {goal > 0 && <span>{tot.kcal <= goal ? `Restam ${fmtKcal(goal - tot.kcal)}` : `${fmtKcal(tot.kcal - goal)} acima da meta`}</span>}
        </div>
      </section>

      {meals.length ? (
        <section className="grid">
          {meals.map((m) => {
            const st = day.meals[m.id] || {};
            const items = st.items || [];
            const sub = sumItems(items);
            const late = !st.done && n > toMinutes(m.time);
            return (
              <div key={m.id} className="card">
                <div className="card-head">
                  <div className="row" style={{ gap: 12 }}>
                    <Check
                      on={!!st.done}
                      onClick={() => patch(m.id, (x) => { x.done = !st.done; x.doneAt = st.done ? null : Date.now(); })}
                      label="Marcar como feita"
                    />
                    <div>
                      <h2>{m.name}</h2>
                      <div className="muted small">{m.time}{items.length > 0 && ` · ${fmtKcal(sub.kcal)}`}</div>
                    </div>
                  </div>
                  {st.done ? (
                    <span className="badge success">Feita {st.doneAt ? `às ${formatTime(st.doneAt)}` : ''}</span>
                  ) : late ? (
                    <span className="badge warning">Pendente</span>
                  ) : (
                    <span className="badge">Mais tarde</span>
                  )}
                </div>

                {items.length > 0 && (
                  <ul className="list">
                    {items.map((it) => (
                      <li key={it.id} className="item food-item">
                        <span className="item-title small">{it.name} <span className="muted">· {it.grams} g</span></span>
                        <span className="small"><strong>{it.kcal}</strong> kcal</span>
                        <div className="item-actions">
                          <button className="icon-btn danger" title="Remover" onClick={() => removeItem(m.id, it.id)}><Icon name="trash" size={16} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

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
        <div className="card">
          <Empty>Nenhum horário de refeição. <button className="link" onClick={() => go('config')}>Configurar</button></Empty>
        </div>
      )}

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
