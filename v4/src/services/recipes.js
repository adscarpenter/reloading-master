import { dbGet, dbGetAll, dbPut, dbDelete } from '../db/index.js';

export async function getRecipes(platformId) {
  if (platformId != null) return dbGetAll('recipes', 'platform_id', platformId);
  return dbGetAll('recipes', null, null);
}

export async function getRecipe(id) {
  return dbGet('recipes', id);
}

export async function saveRecipe(obj) {
  if (!obj.created_at) obj.created_at = new Date().toISOString();
  if (!obj.status) obj.status = 'development';
  return dbPut('recipes', obj);
}

export async function deleteRecipe(id) {
  return dbDelete('recipes', id);
}
