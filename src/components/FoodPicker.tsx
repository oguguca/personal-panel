// Busca um alimento, escolhe a porção (em unidades ou gramas) e devolve o item calculado.
import { useMemo, useState, type FormEvent } from 'react';
import Icon from './Icon';
import { useStore } from '../store/StoreContext';
import { allFoods, defaultUnit, fmtKcal, frequentFoods, makeItem, norm, searchFoods } from '../store/foods';
import type { CustomFood, Food, FoodItem, Unit } from '../store/types';
import { uid } from '../store/model';

const PORTIONS = [50, 100, 150, 200, 300];
const QTYS = [1, 2, 3, 4, 5];
const FALLBACK_UNIT: Unit = { label: 'unidade', plural: 'unidades', g: 100 };
const num = (v: unknown) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

interface NewFood {
  name: string;
  portion: string;
  kcal: string;
  unit: string;
}

export default function FoodPicker({ onAdd, onClose }: { onAdd: (item: FoodItem) => void; onClose: () => void }) {
  const { data, update } = useStore();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Food | null>(null);
  const [mode, setMode] = useState<'g' | 'un'>('g');
  const [grams, setGrams] = useState('100');
  const [qty, setQty] = useState('1');
  const [unitG, setUnitG] = useState('50');
  const [editUnit, setEditUnit] = useState(false);
  const [creating, setCreating] = useState<NewFood | null>(null);

  const foods = useMemo(() => allFoods(data.customFoods), [data.customFoods]);
  const results = useMemo(() => searchFoods(q, foods, data.foodUsage), [q, foods, data.foodUsage]);
  const frequent = useMemo(() => frequentFoods(foods, data.foodUsage), [foods, data.foodUsage]);

  const unitOf = (f: Food): Unit => {
    const u = data.foodUsage[f.key];
    const base = defaultUnit(f) || FALLBACK_UNIT;
    return u?.unitG ? { ...base, g: u.unitG } : base;
  };

  const pick = (f: Food) => {
    const u = data.foodUsage[f.key];
    const unit = unitOf(f);
    setSel(f);
    setMode(u?.mode || (defaultUnit(f) ? 'un' : 'g'));
    setGrams(String(u?.grams || 100));
    setQty(String(u?.qty || 1));
    setUnitG(String(unit.g));
    setEditUnit(false);
  };

  const unit: Unit = sel ? { ...unitOf(sel), g: num(unitG) || unitOf(sel).g } : FALLBACK_UNIT;
  const totalG = sel ? (mode === 'un' ? num(qty) * unit.g : num(grams)) : 0;
  const preview = sel && totalG > 0 ? makeItem(sel, totalG, 'preview') : null;

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!preview || !sel) return;
    const amount = mode === 'un' ? { qty: num(qty), unit } : null;
    onAdd(makeItem(sel, totalG, uid(), amount));
    update((d) => {
      const u = d.foodUsage[sel.key] || { count: 0 };
      d.foodUsage[sel.key] = {
        ...u,
        count: (u.count || 0) + 1,
        last: Date.now(),
        mode,
        ...(mode === 'un' ? { qty: num(qty), unitG: unit.g } : { grams: num(grams) }),
      };
    });
    setSel(null);
    setQ('');
  };

  const saveCustom = (e: FormEvent) => {
    e.preventDefault();
    if (!creating) return;
    const name = creating.name.trim();
    const portion = num(creating.portion);
    const kcal = num(creating.kcal);
    if (!name || portion <= 0 || kcal < 0) return;
    const label = creating.unit.trim();
    const food: CustomFood = {
      id: uid(),
      name,
      kcal: Math.round((kcal / portion) * 1000) / 10,
      ...(label ? { unit: { label, plural: label.endsWith('s') ? label : `${label}s`, g: portion } } : {}),
    };
    update((d) => d.customFoods.push(food));
    setCreating(null);
    const f: Food = { key: `c${food.id}`, name, kcal: food.kcal, p: 0, c: 0, g: 0, cat: 'Meus alimentos', n: norm(name), custom: true, unit: food.unit || null };
    setSel(f);
    setMode(food.unit ? 'un' : 'g');
    setQty('1');
    setGrams(String(portion));
    setUnitG(String(portion));
  };

  // ---------- cadastrar alimento próprio ----------
  if (creating) {
    return (
      <form className="picker" onSubmit={saveCustom}>
        <div className="card-head">
          <h3>Cadastrar alimento</h3>
          <button type="button" className="icon-btn" title="Voltar" onClick={() => setCreating(null)}><Icon name="back" size={18} /></button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>Use os dados do rótulo (ex.: 1 barra de 25 g = 95 kcal).</p>
        <input className="input" autoFocus placeholder="Nome (ex.: Barra de cereal X)" value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} />
        <div className="row">
          <label className="field"><span>Porção (g ou ml)</span><input className="input w-num" inputMode="decimal" value={creating.portion} onChange={(e) => setCreating({ ...creating, portion: e.target.value })} /></label>
          <label className="field"><span>kcal da porção</span><input className="input w-num" inputMode="decimal" value={creating.kcal} onChange={(e) => setCreating({ ...creating, kcal: e.target.value })} /></label>
          <label className="field"><span>Contar por (opcional)</span><input className="input w-num" placeholder="barra, unidade…" value={creating.unit} onChange={(e) => setCreating({ ...creating, unit: e.target.value })} /></label>
        </div>
        <span className="muted small">Se preencher “contar por”, a porção vale 1 unidade (ex.: 1 barra = 25 g).</span>
        <button className="btn primary" type="submit" style={{ alignSelf: 'flex-start' }}><Icon name="check" size={16} /> Salvar e usar</button>
      </form>
    );
  }

  // ---------- escolher porção ----------
  if (sel) {
    const nq = num(qty);
    return (
      <form className="picker" onSubmit={add}>
        <div className="card-head">
          <h3 style={{ overflowWrap: 'anywhere' }}>{sel.name}</h3>
          <button type="button" className="icon-btn" title="Voltar" onClick={() => setSel(null)}><Icon name="back" size={18} /></button>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="segmented">
            <button type="button" className={mode === 'un' ? 'on' : ''} onClick={() => setMode('un')}>Unidades</button>
            <button type="button" className={mode === 'g' ? 'on' : ''} onClick={() => setMode('g')}>Gramas</button>
          </div>
          <span className="muted small">{fmtKcal(sel.kcal)} a cada 100 g</span>
        </div>

        {mode === 'un' ? (
          <>
            <div className="row">
              <input className="input w-num" inputMode="decimal" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantidade" />
              <span className="muted">{nq > 1 ? unit.plural : unit.label}</span>
              <div className="chips">
                {QTYS.map((n) => (
                  <button type="button" key={n} className={`chip ${nq === n ? 'on' : ''}`} onClick={() => setQty(String(n))}>{n}</button>
                ))}
              </div>
            </div>
            <div className="row small muted">
              {editUnit ? (
                <>
                  1 {unit.label} =
                  <input className="input w-num" inputMode="decimal" autoFocus value={unitG} onChange={(e) => setUnitG(e.target.value)} aria-label="Gramas por unidade" />
                  g
                  <button type="button" className="link small" onClick={() => setEditUnit(false)}>ok</button>
                </>
              ) : (
                <>
                  1 {unit.label} ≈ {String(unit.g).replace('.', ',')} g
                  <button type="button" className="link small" onClick={() => setEditUnit(true)}>ajustar</button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="row">
            <input className="input w-num" inputMode="decimal" autoFocus value={grams} onChange={(e) => setGrams(e.target.value)} aria-label="Gramas" />
            <span className="muted">g</span>
            <div className="chips">
              {PORTIONS.map((p) => (
                <button type="button" key={p} className={`chip ${num(grams) === p ? 'on' : ''}`} onClick={() => setGrams(String(p))}>{p}g</button>
              ))}
            </div>
          </div>
        )}

        {preview && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>
              <strong style={{ fontSize: '1.2rem' }}>{fmtKcal(preview.kcal)}</strong>
              {mode === 'un' && <span className="muted small"> · {Math.round(totalG)} g</span>}
            </span>
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
        <input className="input" autoFocus placeholder="Buscar alimento (ex.: ovo, pão francês, banana)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose?.()} />
        {onClose && <button className="icon-btn" title="Fechar" onClick={onClose}><Icon name="x" size={18} /></button>}
      </div>
      {!q.trim() && frequent.length > 0 && <span className="muted small">Mais usados</span>}
      {list.length > 0 ? (
        <ul className="list picker-list">
          {list.map((f) => {
            const u = defaultUnit(f);
            return (
              <li key={f.key}>
                <button className="picker-item" onClick={() => pick(f)}>
                  <span className="item-title">{f.name}{f.custom && <span className="badge primary" style={{ marginLeft: 6 }}>meu</span>}</span>
                  <span className="muted small">
                    {u ? `${Math.round((f.kcal * unitOf(f).g) / 100)} kcal/${u.label}` : `${Math.round(f.kcal)} kcal/100g`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        q.trim() && <p className="muted small" style={{ margin: 0 }}>Nada encontrado para “{q}”. Tente outra palavra ou cadastre.</p>
      )}
      <button className="link small" style={{ alignSelf: 'flex-start' }} onClick={() => setCreating({ name: q, portion: '100', kcal: '', unit: '' })}>
        + Cadastrar alimento de marca / que não está na lista
      </button>
    </div>
  );
}
