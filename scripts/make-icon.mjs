// Gera o ícone do app (PNG + ICO) sem dependências externas.
// Uso: npm run icon
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname } from 'node:path';

// ---------- desenho (funções de distância, coordenadas 0..1) ----------
const C1 = [79, 70, 229]; // índigo
const C2 = [20, 184, 166]; // verde-água

function sdRoundBox(x, y, half, r) {
  const qx = Math.abs(x - 0.5) - half + r;
  const qy = Math.abs(y - 0.5) - half + r;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

function sample(x, y) {
  // fundo: quadrado arredondado com degradê diagonal
  if (sdRoundBox(x, y, 0.46, 0.2) > 0) return [0, 0, 0, 0];
  const t = Math.min(1, Math.max(0, (x + y) / 2));
  let col = C1.map((c, i) => c + (C2[i] - c) * t);
  // anel claro
  const ring = Math.abs(Math.hypot(x - 0.5, y - 0.5) - 0.3) - 0.035;
  if (ring < 0) col = col.map((c) => c + (255 - c) * 0.28);
  // check branco
  const w = 0.055;
  const d = Math.min(
    sdSegment(x, y, 0.36, 0.51, 0.46, 0.61),
    sdSegment(x, y, 0.46, 0.61, 0.65, 0.41)
  );
  if (d < w) col = [255, 255, 255];
  return [...col, 255];
}

function render(size) {
  const SS = 4; // supersampling para bordas suaves
  const px = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const s = sample((i + (sx + 0.5) / SS) / size, (j + (sy + 0.5) / SS) / size);
          r += s[0] * s[3]; g += s[1] * s[3]; b += s[2] * s[3]; a += s[3];
        }
      }
      const o = (j * size + i) * 4;
      const n = SS * SS;
      px[o] = a ? Math.round(r / a) : 0;
      px[o + 1] = a ? Math.round(g / a) : 0;
      px[o + 2] = a ? Math.round(b / a) : 0;
      px[o + 3] = Math.round(a / n);
    }
  }
  return encodePNG(size, px);
}

// ---------- codificador PNG mínimo ----------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(size, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- ICO com PNGs embutidos ----------
function encodeICO(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

function save(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log('gerado:', file);
}

const big = render(256);
save('electron/icons/icon.png', big);
save('electron/icons/tray.png', render(32));
save('public/icon.png', big);
save('public/icon-192.png', render(192));
save('public/icon-512.png', render(512));
save('build/icon.ico', encodeICO([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, png: render(size) }))));
