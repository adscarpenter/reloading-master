import { useState, useEffect } from 'react';
import { useApp } from '../core/store.jsx';
import { dbGetAll, dbPut, dbClear } from '../db/index.js';

const STORES = ['platforms', 'recipes', 'sessions', 'test_groups', 'shots', 'target_sessions', 'components'];

async function exportAll() {
  const data = {};
  for (const store of STORES) {
    data[store] = await dbGetAll(store, null, null);
  }
  data._exported_at = new Date().toISOString();
  data._version = 4;
  return data;
}

async function importV4(data, mode = 'merge') {
  if (mode === 'replace') {
    for (const store of STORES) await dbClear(store);
  }
  let imported = 0;
  for (const store of STORES) {
    if (!data[store]) continue;
    for (const record of data[store]) {
      await dbPut(store, record);
      imported++;
    }
  }
  return imported;
}

// ─── V3 → V4 Migration ────────────────────────────────────────────────────

async function migrateV3(data) {
  const log = [];

  // 1. Platforms from V3 firearms
  const platformMap = {}; // V3 firearm name → V4 platform id
  const existingPlatforms = await dbGetAll('platforms', null, null);

  for (const fa of (data.firearms || [])) {
    const existing = existingPlatforms.find(p => p.name === fa.name);
    if (existing) {
      platformMap[fa.name] = existing.id;
      continue;
    }
    const newId = await dbPut('platforms', {
      name: fa.name,
      caliber: fa.chamber || fa.caliber || '',
      action_type: '',
      barrel_len: fa.barrel_length || '',
      twist_rate: '',
      optics: '',
      notes: [fa.make_model, fa.notes].filter(Boolean).join(' — '),
      created_at: new Date().toISOString(),
    });
    platformMap[fa.name] = newId;
  }
  log.push(`Platforms imported: ${Object.keys(platformMap).length}`);

  // 2. Recipes + Sessions + Shots from V3 batches
  let recipeCount = 0, sessionCount = 0, shotCount = 0;

  for (const batch of (data.batches || [])) {
    const platformId = platformMap[batch.firearm_id] || null;

    const recipeId = await dbPut('recipes', {
      platform_id: platformId,
      name: batch.id || 'Unnamed Load',
      status: 'active',
      is_factory: batch.is_factory || false,
      caliber: batch.chambering || '',
      bullet_brand: '',
      bullet_model: batch.bullet || '',
      bullet_weight: null,
      powder_brand: '',
      powder_model: batch.powder || '',
      powder_charge: batch.charge_fixed || null,
      brass_brand: batch.case_brand || '',
      primer_brand: '',
      primer_model: batch.primer || '',
      coal: batch.coal || null,
      cbto: null,
      factory_brand: batch.factory_mfr || '',
      factory_product: batch.factory_product || '',
      adv_mv: batch.factory_mv_adv || null,
      notes: batch.notes || '',
      created_at: batch.created_at || new Date().toISOString(),
    });
    recipeCount++;

    // Build range sessions from V3 format
    let rangeSessions = [];
    if (batch.range_sessions && batch.range_sessions.length) {
      rangeSessions = batch.range_sessions;
    } else if (batch.shots && batch.shots.length) {
      // Legacy: shots stored directly on batch
      rangeSessions = [{
        range_date: batch.range_date || batch.loaded_date?.slice(0, 10) || null,
        firearm_id: batch.firearm_id || '',
        conditions: batch.range_conditions || {},
        shots: batch.shots,
        notes: '',
      }];
    }

    for (const rs of rangeSessions) {
      const rsFirearmId = rs.firearm_id && platformMap[rs.firearm_id]
        ? platformMap[rs.firearm_id]
        : platformId;

      const sessionId = await dbPut('sessions', {
        recipe_id: recipeId,
        platform_id: rsFirearmId,
        range_date: rs.range_date || null,
        distance_yds: rs.distance_yds || null,
        temp_f: rs.conditions?.temp_f || null,
        altitude_ft: rs.conditions?.elevation || null,
        notes: rs.notes || '',
        created_at: rs.created_at || new Date().toISOString(),
      });
      sessionCount++;

      const groupId = await dbPut('test_groups', {
        session_id: sessionId,
        label: 'Group 1',
        distance_yds: rs.distance_yds || null,
      });

      const validShots = (rs.shots || []).filter(s => s && s.velocity > 0);
      for (let i = 0; i < validShots.length; i++) {
        await dbPut('shots', {
          session_id: sessionId,
          test_group_id: groupId,
          velocity: validShots[i].velocity,
          seq: i + 1,
        });
        shotCount++;
      }
    }
  }

  log.push(`Recipes imported: ${recipeCount}`);
  log.push(`Sessions imported: ${sessionCount}`);
  log.push(`Shots imported: ${shotCount}`);

  // 3. Components
  let compCount = 0;
  for (const comp of (data.components || [])) {
    if (!comp.name) continue;
    await dbPut('components', {
      type: comp.type || 'bullet',
      brand: '',
      model: comp.name,
      caliber: comp.caliber || '',
      weight: comp.bullet_weight_gr || null,
      quantity: comp.quantity || null,
      notes: comp.notes || '',
      created_at: new Date().toISOString(),
    });
    compCount++;
  }
  if (compCount) log.push(`Components imported: ${compCount}`);

  return log;
}

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function DataView() {
  const { refresh } = useApp();
  const [counts, setCounts] = useState({});
  const [importMode, setImportMode] = useState('merge');
  const [importStatus, setImportStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadCounts(); }, []);

  async function loadCounts() {
    const c = {};
    for (const store of STORES) {
      const all = await dbGetAll(store, null, null);
      c[store] = all.length;
    }
    setCounts(c);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportAll();
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadJSON(data, `reload-master-v4-${dateStr}.json`);
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportStatus('Reading file…');
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Detect V3 format
      if (data.app === 'ReloadingMaster' && data.version === 3) {
        setImportStatus('Detected V3 format — migrating…');
        const log = await migrateV3(data);
        setImportStatus('V3 migration complete:\n' + log.join('\n'));
        refresh();
        loadCounts();
        e.target.value = '';
        return;
      }

      // V4 format
      if (!data._version) {
        setImportStatus('Error: Not a recognised Reload Master export file.');
        e.target.value = '';
        return;
      }

      const n = await importV4(data, importMode);
      setImportStatus(`Import complete — ${n} records loaded.`);
      refresh();
      loadCounts();
    } catch (err) {
      setImportStatus(`Error: ${err.message}`);
    }
    e.target.value = '';
  }

  async function handleClearAll() {
    if (!confirm('DANGER: This will permanently delete ALL data. This cannot be undone. Are you sure?')) return;
    if (!confirm('Final confirmation — delete everything?')) return;
    for (const store of STORES) await dbClear(store);
    refresh();
    loadCounts();
  }

  const statusIsError = importStatus.startsWith('Error');
  const statusIsSuccess = importStatus.includes('complete') || importStatus.includes('imported');

  return (
    <div>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface2)',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: '0.75rem', letterSpacing: '0.18em', color: 'var(--ink2)', textTransform: 'uppercase',
        }}>
          DATA <span style={{ color: 'var(--accent)' }}>//</span> IMPORT / EXPORT
        </span>
      </div>

      {/* Database stats */}
      <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
        <div className="label-caps" style={{ marginBottom: 10 }}>Database Summary</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {STORES.map(store => (
            <div key={store} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 10px', background: 'var(--surface2)', border: '1px solid var(--border)',
            }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem',
                fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink2)',
              }}>
                {store.replace('_', ' ')}
              </span>
              <span className="mono" style={{ fontSize: '0.875rem', color: counts[store] > 0 ? 'var(--info)' : 'var(--ink3)' }}>
                {counts[store] ?? '…'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Import */}
      <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
        <div className="label-caps" style={{ marginBottom: 8 }}>Import Data</div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink3)', margin: '0 0 12px' }}>
          Supports both <strong style={{ color: 'var(--ink2)' }}>V4 backups</strong> and{' '}
          <strong style={{ color: 'var(--ink2)' }}>V3 exports</strong> — V3 data is automatically migrated.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {['merge', 'replace'].map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setImportMode(mode)}
              style={{
                padding: '5px 12px', border: '1px solid',
                borderColor: importMode === mode ? 'var(--accent)' : 'var(--border2)',
                background: importMode === mode ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: importMode === mode ? 'var(--accent)' : 'var(--ink3)',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {importMode === 'replace' && (
          <div className="alert alert-warning" style={{ marginBottom: 10 }}>
            Replace mode deletes all existing data before importing.
          </div>
        )}

        <label style={{ display: 'inline-block', cursor: 'pointer' }}>
          <span className="btn btn-sm">Select JSON File…</span>
          <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </label>

        {importStatus && (
          <div
            className={`alert ${statusIsError ? 'alert-danger' : statusIsSuccess ? 'alert-info' : ''}`}
            style={{ marginTop: 10, whiteSpace: 'pre-line' }}
          >
            {importStatus}
          </div>
        )}
      </div>

      {/* Export */}
      <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
        <div className="label-caps" style={{ marginBottom: 8 }}>Export Data</div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink3)', margin: '0 0 12px' }}>
          Downloads a complete JSON backup of all your V4 data.
        </p>
        <button className="btn btn-primary btn-sm" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export JSON Backup'}
        </button>
      </div>

      {/* Danger zone */}
      <div style={{ padding: 14 }}>
        <div className="label-caps" style={{ marginBottom: 8, color: 'var(--danger)' }}>Danger Zone</div>
        <div className="alert alert-danger" style={{ marginBottom: 12 }}>
          Clearing all data is permanent. Export a backup first.
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleClearAll}>
          Clear All Data
        </button>
      </div>
    </div>
  );
}
