import { dbGet, dbGetAll, dbPut, dbDelete } from '../db/index.js';

export async function getComponents(type) {
  if (type) return dbGetAll('components', 'type', type);
  return dbGetAll('components', null, null);
}

export async function getComponent(id) {
  return dbGet('components', id);
}

export async function saveComponent(obj) {
  if (!obj.created_at) obj.created_at = new Date().toISOString();
  return dbPut('components', obj);
}

export async function deleteComponent(id) {
  return dbDelete('components', id);
}
