// Converte os CSVs da Tabela TACO (repositório raulfdm/taco-api, licença MIT)
// em src/data/taco.json compacto. Uso: node scripts/build-taco.mjs <pasta-com-os-csv>
// Formato de saída: { categories: [nome], foods: [[id, nome, kcal, prot, carb, gord, catIdx]] } por 100 g.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('Uso: node scripts/build-taco.mjs <pasta-com-food.csv-nutrients.csv-categories.csv>');
  process.exit(1);
}

function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const read = (f) => parseCSV(readFileSync(join(dir, f), 'utf8').replace(/^﻿/, ''));
const num = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
};

const cats = read('categories.csv');
const catIndex = new Map(cats.map((c, i) => [c.id, i]));
const nutr = new Map(read('nutrients.csv').map((n) => [n.foodId, n]));

// Alguns alimentos não têm energia na tabela original: ficam de fora para não mostrar 0 kcal.
const foods = read('food.csv').filter((f) => (nutr.get(f.id)?.kcal ?? '') !== '').map((f) => {
  const n = nutr.get(f.id);
  return [Number(f.id), f.name, Math.round(num(n.kcal)), num(n.protein), num(n.carbohydrates), num(n.lipids), catIndex.get(f.categoryId) ?? -1];
});

mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/taco.json', JSON.stringify({ source: 'TACO 4ª ed. (NEPA/UNICAMP) via raulfdm/taco-api', categories: cats.map((c) => c.name), foods }));
console.log(`taco.json: ${foods.length} alimentos, ${cats.length} categorias`);
