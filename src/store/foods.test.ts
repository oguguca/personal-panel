import { describe, expect, it } from 'vitest';
import { allFoods, dayNutrition, defaultUnit, itemAmount, makeItem, norm, searchFoods, sumItems } from './foods';
import type { Food } from './types';

const foods = allFoods([]);
const find = (name: string) => foods.find((f) => f.name.toLowerCase().startsWith(name.toLowerCase()))!;

describe('alimentos (Tabela TACO)', () => {
  it('normaliza texto: sem acento, minúsculo, só letras e números', () => {
    expect(norm('Pão Francês, 1ª')).toBe('pao frances 1');
  });

  it('carrega a tabela inteira', () => {
    expect(foods.length).toBeGreaterThan(500);
  });

  it('busca em qualquer ordem e sem acento', () => {
    const r = searchFoods('feijao preto', foods);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((f) => f.n.includes('feijao') && f.n.includes('preto'))).toBe(true);
  });

  it('prioriza o pronto para comer: arroz cozido antes de arroz cru', () => {
    const r = searchFoods('arroz integral', foods);
    const cozido = r.findIndex((f) => f.n.includes('cozido'));
    const cru = r.findIndex((f) => /\bcru\b/.test(f.n));
    expect(cozido).toBeGreaterThanOrEqual(0);
    expect(cru === -1 || cozido < cru).toBe(true);
  });

  it('o que você mais usa sobe na busca', () => {
    const r1 = searchFoods('banana', foods);
    const last = r1[r1.length - 1];
    const r2 = searchFoods('banana', foods, { [last.key]: { count: 10, last: 1 } });
    expect(r2[0].key).toBe(last.key);
  });

  it('alimentos próprios entram na lista e na busca', () => {
    const mine = allFoods([{ id: 'x', name: 'Barra Proteica Z', kcal: 380 }]);
    expect(searchFoods('barra proteica', mine)[0]).toMatchObject({ key: 'cx', custom: true });
  });
});

describe('porções e totais', () => {
  const food: Food = { key: 'k', name: 'Teste', kcal: 200, p: 10, c: 20, g: 5, cat: '', n: 'teste' };

  it('calcula a porção a partir dos valores por 100 g', () => {
    expect(makeItem(food, 150, 'i1')).toMatchObject({ grams: 150, kcal: 300, p: 15, c: 30, g: 7.5 });
  });

  it('mostra a quantidade em unidades quando foi contado por unidade', () => {
    const it1 = makeItem(food, 150, 'i1', { qty: 3, unit: { label: 'ovo', plural: 'ovos', g: 50 } });
    expect(itemAmount(it1)).toBe('3 ovos (150 g)');
    expect(itemAmount(makeItem(food, 100, 'i2'))).toBe('100 g');
  });

  it('sugere unidade para alimentos que se contam', () => {
    expect(defaultUnit(find('Ovo, de galinha, inteiro'))).toMatchObject({ label: 'ovo', g: 50 });
    expect(defaultUnit(find('Arroz'))).toBeNull();
  });

  it('soma macros dos itens e do dia', () => {
    expect(sumItems([{ kcal: 100, p: 1 }, { kcal: 50, c: 2 }])).toEqual({ kcal: 150, p: 1, c: 2, g: 0 });
    const day = {
      tasks: [], water: [], goals: {}, recording: [], summary: null, init: true,
      meals: { a: { items: [makeItem(food, 100, '1')] }, b: { items: [makeItem(food, 50, '2')] } },
    };
    expect(dayNutrition(day).kcal).toBe(300);
    expect(dayNutrition(undefined).kcal).toBe(0);
  });
});
