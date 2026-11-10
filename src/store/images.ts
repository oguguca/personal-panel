// Fotos (capa das provas e fotos durante a corrida) ficam no IndexedDB do app, não no localStorage:
// o localStorage tem limite de poucos MB e as fotos não caberiam. As imagens são reduzidas antes de salvar.
import { useEffect, useState } from 'react';
import { uid } from './model';

const DB = 'painel-pessoal-imagens';
const STORE = 'imagens';
const MAX_SIDE = 1600; // px no maior lado
const QUALITY = 0.85;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Reduz a imagem (mantém a proporção) e converte para JPEG. */
export async function shrinkImage(file: Blob, max = MAX_SIDE): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível ler a imagem.'))), 'image/jpeg', QUALITY));
}

/** Salva uma foto e devolve o id dela. */
export async function saveImage(file: Blob): Promise<string> {
  const id = uid();
  const blob = await shrinkImage(file);
  await tx('readwrite', (s) => s.put(blob, id));
  return id;
}

export async function deleteImage(id: string): Promise<void> {
  urls.get(id) && URL.revokeObjectURL(urls.get(id)!);
  urls.delete(id);
  await tx('readwrite', (s) => s.delete(id));
}

// endereços já carregados (evita ler a mesma foto várias vezes)
const urls = new Map<string, string>();

export async function imageURL(id: string): Promise<string | null> {
  if (urls.has(id)) return urls.get(id)!;
  const blob = await tx<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

/** Endereço da foto para usar em <img> (null enquanto carrega ou se não existir). */
export function useImage(id: string | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(id ? urls.get(id) || null : null);
  useEffect(() => {
    let alive = true;
    if (!id) return setUrl(null);
    imageURL(id).then((u) => alive && setUrl(u)).catch(() => alive && setUrl(null));
    return () => { alive = false; };
  }, [id]);
  return url;
}
