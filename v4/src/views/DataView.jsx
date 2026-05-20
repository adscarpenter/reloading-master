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

async function importAll(data, mode = 'merge') {
  if (mode === 'replace') {
    for (const store of STORES) {
      await dbClear(store);
    }
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

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
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

      if (!data._version) {
        setImportStatus('Error: Does not appear to be a Reload Master export file.');
        return;
      }

      const n = await importAll(data, importMode);
      setImportStatus(`Successfully imported ${n} records.`);
      refresh();
      loadCounts();
    } catch (err) {
      setImportStatus(`Error: ${err.message}`);
    }
    e.target.value = '';
  }

  async function handleClearAll() {
    if (!confirm('DANGER: This will permanently delete ALL data from this device. This cannot be undone. Are you sure?')) return;
    if (!confirm('Final confirmation: delete everything?')) return;
    for (const store of STORES) await dbClear(store);
    refresh();
    loadCounts();
  }

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

      {/* Export */}
      <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
        <div className="label-caps" style={{ marginBottom: 8 }}>Export Data</div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink3)', marginBottom: 12, marginTop: 0 }}>
          Downloads a complete JSON backup of all platforms, recipes, sessions, shots, and components.
        </p>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting…' : 'Export JSON Backup'}
        </button>
      </div>

      {/* Import */}
      <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
        <div className="label-caps" style={{ marginBottom: 8 }}>Import Data</div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink3)', marginBottom: 12, marginTop: 0 }}>
          Restore from a previous JSON backup. Merge adds new records; Replace overwrites all existing data.
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
            Replace mode will delete all existing data before importing.
          </div>
        )}
        <label style={{ display: 'inline-block', cursor: 'pointer' }}>
          <span className="btn btn-sm">Select JSON File…</span>
          <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </label>
        {importStatus && (
          <div
            className={`alert ${importStatus.startsWith('Error') ? 'alert-danger' : 'alert-info'}`}
            style={{ marginTop: 10 }}
          >
            {importStatus}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div style={{ padding: 14 }}>
        <div className="label-caps" style={{ marginBottom: 8, color: 'var(--danger)' }}>Danger Zone</div>
        <div className="alert alert-danger" style={{ marginBottom: 12 }}>
          Clearing all data is permanent and cannot be undone. Export a backup first.
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleClearAll}>
          Clear All Data
        </button>
      </div>
    </div>
  );
}
