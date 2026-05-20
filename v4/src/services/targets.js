import { dbGet, dbGetAll, dbPut, dbDelete } from '../db/index.js';

export async function getTargetSessions(sessionId) {
  if (sessionId != null) return dbGetAll('target_sessions', 'session_id', sessionId);
  return dbGetAll('target_sessions', null, null);
}

export async function getTargetSession(id) {
  return dbGet('target_sessions', id);
}

export async function saveTargetSession(obj) {
  if (!obj.created_at) obj.created_at = new Date().toISOString();
  return dbPut('target_sessions', obj);
}

export async function deleteTargetSession(id) {
  return dbDelete('target_sessions', id);
}
