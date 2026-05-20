import { openDB } from './schema.js';

let _db = null;
async function db() {
  if (!_db) _db = await openDB();
  return _db;
}

export async function dbGet(store, key) {
  return (await db()).transaction(store).objectStore(store).get(key);
}

export async function dbGetAll(store, indexName, query) {
  const tx = (await db()).transaction(store);
  const os = tx.objectStore(store);
  const target = indexName ? os.index(indexName) : os;
  return new Promise((res, rej) => {
    const r = query ? target.getAll(query) : target.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}

export async function dbPut(store, obj) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readwrite');
    const r  = tx.objectStore(store).put(obj);
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}

export async function dbDelete(store, key) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readwrite');
    const r  = tx.objectStore(store).delete(key);
    r.onsuccess = () => res();
    r.onerror   = () => rej(r.error);
  });
}

export async function dbClear(store) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, 'readwrite');
    const r  = tx.objectStore(store).clear();
    r.onsuccess = () => res();
    r.onerror   = () => rej(r.error);
  });
}
