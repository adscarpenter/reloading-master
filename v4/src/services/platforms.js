import { dbGet, dbGetAll, dbPut, dbDelete } from '../db/index.js';
import { getSessions, getShots } from './sessions.js';
import { getRecipes } from './recipes.js';

export async function getPlatforms() {
  return dbGetAll('platforms', null, null);
}

export async function getPlatform(id) {
  return dbGet('platforms', id);
}

export async function savePlatform(obj) {
  if (!obj.created_at) obj.created_at = new Date().toISOString();
  return dbPut('platforms', obj);
}

export async function deletePlatform(id) {
  return dbDelete('platforms', id);
}

export async function getPlatformStats(id) {
  const [recipes, sessions] = await Promise.all([
    getRecipes(id),
    getSessions(id),
  ]);
  let totalRounds = 0;
  for (const s of sessions) {
    const shots = await getShots(s.id);
    totalRounds += shots.filter(sh => sh.velocity).length;
  }
  return { recipes: recipes.length, sessions: sessions.length, rounds: totalRounds };
}
