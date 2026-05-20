export const DB_NAME = 'ReloadingV4';
export const DB_VER  = 1;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;

      // Platforms (rifles)
      if (!db.objectStoreNames.contains('platforms')) {
        const s = db.createObjectStore('platforms', { keyPath: 'id', autoIncrement: true });
        s.createIndex('name', 'name', { unique: true });
      }

      // Recipes (load definitions)
      if (!db.objectStoreNames.contains('recipes')) {
        const s = db.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true });
        s.createIndex('platform_id', 'platform_id');
        s.createIndex('status', 'status');
      }

      // Sessions (range events)
      if (!db.objectStoreNames.contains('sessions')) {
        const s = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        s.createIndex('recipe_id', 'recipe_id');
        s.createIndex('platform_id', 'platform_id');
        s.createIndex('range_date', 'range_date');
      }

      // Test groups within a session
      if (!db.objectStoreNames.contains('test_groups')) {
        const s = db.createObjectStore('test_groups', { keyPath: 'id', autoIncrement: true });
        s.createIndex('session_id', 'session_id');
      }

      // Individual shots
      if (!db.objectStoreNames.contains('shots')) {
        const s = db.createObjectStore('shots', { keyPath: 'id', autoIncrement: true });
        s.createIndex('session_id', 'session_id');
        s.createIndex('test_group_id', 'test_group_id');
      }

      // Target sessions
      if (!db.objectStoreNames.contains('target_sessions')) {
        const s = db.createObjectStore('target_sessions', { keyPath: 'id', autoIncrement: true });
        s.createIndex('session_id', 'session_id');
        s.createIndex('platform_id', 'platform_id');
      }

      // Components / inventory
      if (!db.objectStoreNames.contains('components')) {
        const s = db.createObjectStore('components', { keyPath: 'id', autoIncrement: true });
        s.createIndex('type', 'type');
        s.createIndex('name', 'name');
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}
