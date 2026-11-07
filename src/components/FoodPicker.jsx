// Busca um alimento, escolhe a porção em gramas e devolve o item calculado.
import { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { useStore } from '../store/StoreContext.jsx';
import { allFoods, fmtKcal, frequentFoods, makeItem, searchFoods } from '../store/foods.js';
import { uid } from '../store/model.js';

const PORTIONS = [50, 100, 150, 200, 300];
const num = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export default function FoodPicker({ onAdd, onClose }) {
  const { data, update } = useStore();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [grams, setGrams] = useState('100');
  const [creating, setCreating] = useState(null); // { name, portion, kcal }

  const foods = useMemo(() => allFoods(data.customFoods), [data.customFoods]);
  const results = useMemo(() => searchFoods(q, foods, data.foodUsage), [q, foods, data.foodUsage]);
  const frequent = useMemo(() => frequentFoods(foods, data.foodUsage), [foods, data.foodUsage]);

  const pick = (f) => {
    setSel(f);
    setGrams(String(data.foodUsage[f.key]?.grams || 100));
  };

  const g = num(grams);
  const preview = sel && g > 0 ? makeItem(sel, g) : null;

  const add = (e) => {
    e.preventDefault();
    if (!preview) return;
    onAdd(makeItem(sel, g, uid()));
    update((d) => {
      const u = d.foodUsage[sel.key] || { count: 0 };
      d.foodUsage[sel.key] = { count: u.count + 1, grams: g, last: Date.now() };
    });
    setSel(null);
    setQ('');
  };

  const saveCustom = (e) => {
    e.preventDefault();
    const name = creating.name.trim();
    const portion = num(creating.portion);
    const kcal = num(creating.kcal);
    if (!name || portion <= 0 || kcal < 0) return;
    const food = { id: uid(), name, kcal: Math.round((kcal / portion) * 1000) / 10 };
    update((d) => d.customFoods.push(food));
    setCreating(null);
    setSel({ key: `c${food.id}`, name, kcal: food.kcal, p: 0, c: 0, g: 0, custom: true });
    setGrams(String(portion));
  };

  // ---------- cadastrar alimento próprio ----------
  if (creating) {
    return (
      <form className="picker" onSubmit={saveCustom}>
        <div className="card-head">
          <h3>Cadastrar alimento</h3>
          <button type="button" className="icon-btn" title="Voltar" onClick={() => setCreating(null)}><Icon name="back" size={18} /></button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>Use os dados do rótulo (ex.: porção 30 g = 120 kcal).</p>
        <input className="input" autoFocus placeholder="Nome (ex.: Barra de cereal X)" value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} />
        <div className="row">
          <label className="field"><span>Porção (g ou ml)</span><input className="input w-num" inputMode="decimal" value={creating.portion} onChange={(e) => setCreating({ ...creating, portion: e.target.value })} /></label>
          <label className="field"><span>kcal da porção</span><input className="input w-num" inputMode="decimal" value={creating.kcal} onChange={(e) => setCreating({ ...creating, kcal: e.target.value })} /></label>
        </div>
        <button className="btn primary" type="submit" style={{ alignSelf: 'flex-start' }}><Icon name="check" size={16} /> Salvar e usar</button>
      </form>
    );
  }

  // ---------- escolher porção ----------
  if (sel) {
    return (
      <form className="picker" onSubmit={add}>
        <div className="card-head">
          <h3 style={{ overflowWrap: 'anywhere' }}>{sel.name}</h3>
          <button type="button" className="icon-btn" title="Voltar" onClick={() => setSel(null)}><Icon name="back" size={18} /></button>
        </div>
        <span className="muted small">{fmtKcal(sel.kcal)} a cada 100 g</span>
        <div className="row">
          <input className="input w-num" inputMode="decimal" autoFocus value={grams} onChange={(e) => setGrams(e.target.value)} aria-label="Gramas" />
          <span className="muted">g</span>
          <div className="chips">
            {PORTIONS.map((p) => (
              <button type="button" key={p} className={`chip ${g === p ? 'on' : ''}`} onClick={() => setGrams(String(p))}>{p}g</button>
            ))}
          </div>
        </div>
        {preview && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '1.2rem' }}>{fmtKcal(preview.kcal)}</strong>
            {!sel.custom && <span className="muted small">P {preview.p} g · C {preview.c} g · G {preview.g} g</span>}
          </div>
        )}
        <button className="btn primary" type="submit" disabled={!preview} style={{ alignSelf: 'flex-start' }}><Icon name="plus" size={16} /> Adicionar</button>
      </form>
    );
  }

  // ---------- buscar ----------
  const list = q.trim() ? results : frequent;
  return (
    <div className="picker">
      <div className="row">
        <input className="input" autoFocus placeholder="Buscar alimento (ex.: arroz cozido, banana)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose?.()} />
        {onClose && <button className="icon-btn" title="Fechar" onClick={onClose}><Icon name="x" size={18} /></button>}
      </div>
      {!q.trim() && frequent.length > 0 && <span className="muted small">Mais usados</span>}
      {list.length > 0 ? (
        <ul className="list picker-list">
          {list.map((f) => (
            <li key={f.key}>
              <button className="picker-item" onClick={() => pick(f)}>
                <span className="item-title">{f.name}{f.custom && <span className="badge primary" style={{ marginLeft: 6 }}>meu</span>}</span>
                <span className="muted small">{Math.round(f.kcal)} kcal/100g</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        q.trim() && <p className="muted small" style={{ margin: 0 }}>Nada encontrado para “{q}”. Tente outra palavra ou cadastre.</p>
      )}
      <button className="link small" style={{ alignSelf: 'flex-start' }} onClick={() => setCreating({ name: q, portion: '100', kcal: '' })}>
        + Cadastrar alimento de marca / que não está na lista
      </button>
    </div>
  );
}
