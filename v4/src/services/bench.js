import { dbGetAll, dbPut, dbDelete } from '../db/index.js';

export async function getBenchSessions(recipeId) {
  if (recipeId != null) return dbGetAll('bench_sessions', 'recipe_id', recipeId);
  return dbGetAll('bench_sessions', null, null);
}

export async function saveBenchSession(obj) {
  if (!obj.created_at) obj.created_at = new Date().toISOString();
  return dbPut('bench_sessions', obj);
}

export async function deleteBenchSession(id) {
  return dbDelete('bench_sessions', id);
}
