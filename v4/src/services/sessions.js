import { dbGet, dbGetAll, dbPut, dbDelete } from '../db/index.js';

export async function getSessions(platformId) {
  if (platformId != null) return dbGetAll('sessions', 'platform_id', platformId);
  return dbGetAll('sessions', null, null);
}

export async function getSessionsByRecipe(recipeId) {
  return dbGetAll('sessions', 'recipe_id', recipeId);
}

export async function getSession(id) {
  return dbGet('sessions', id);
}

export async function saveSession(obj) {
  if (!obj.created_at) obj.created_at = new Date().toISOString();
  return dbPut('sessions', obj);
}

export async function deleteSession(id) {
  return dbDelete('sessions', id);
}

export async function getTestGroups(sessionId) {
  return dbGetAll('test_groups', 'session_id', sessionId);
}

export async function saveTestGroup(obj) {
  return dbPut('test_groups', obj);
}

export async function deleteTestGroup(id) {
  return dbDelete('test_groups', id);
}

export async function getShots(sessionId) {
  return dbGetAll('shots', 'session_id', sessionId);
}

export async function getShotsByGroup(testGroupId) {
  return dbGetAll('shots', 'test_group_id', testGroupId);
}

export async function saveShot(obj) {
  return dbPut('shots', obj);
}

export async function deleteShot(id) {
  return dbDelete('shots', id);
}

export function computeStats(velocities) {
  const valid = velocities.filter(v => v > 0);
  if (!valid.length) return { count: 0, avg: 0, es: 0, sd: 0, min: 0, max: 0 };
  const n = valid.length;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const avg = valid.reduce((a, b) => a + b, 0) / n;
  const variance = valid.reduce((a, v) => a + (v - avg) ** 2, 0) / (n > 1 ? n - 1 : 1);
  const sd = Math.sqrt(variance);
  return { count: n, avg: Math.round(avg), es: max - min, sd: +sd.toFixed(1), min, max };
}

export async function getSessionStats(sessionId) {
  const shots = await getShots(sessionId);
  return computeStats(shots.map(s => s.velocity));
}
