import { useState, useEffect } from 'react';
import { useApp } from '../core/store.jsx';
import Modal from '../components/ui/Modal.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { getComponents, saveComponent, deleteComponent } from '../services/components.js';
import { COMPONENT_TYPES, CALIBERS } from '../core/constants.js';

const TYPE_COLORS = {
  brass:  { bg: 'rgba(245,158,11,0.12)',  fg: '#f59e0b' },
  bullet: { bg: 'rgba(56,189,248,0.12)',  fg: '#38bdf8' },
  powder: { bg: 'rgba(239,68,68,0.12)',   fg: '#ef4444' },
  primer: { bg: 'rgba(34,197,94,0.12)',   fg: '#22c55e' },
};

const BLANK = {
  type: 'brass', brand: '', model: '', caliber: '', weight: '',
  quantity: '', lot: '', notes: '',
};

function ComponentForm({ initial, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK, ...initial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!f.brand.trim()) return;
    await saveComponent({
      ...f,
      brand: f.brand.trim(),
      model: f.model.trim(),
      weight: f.weight ? +f.weight : null,
      quantity: f.quantity ? +f.quantity : null,
    });
    onSave();
  }

  return (
    <form onSubmit={submit}>
      <div className="form-group">
        <label className="form-label">Type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COMPONENT_TYPES.map(t => {
            const c = TYPE_COLORS[t];
            const active = f.type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                style={{
                  padding: '5px 12px', border: '1px solid',
                  borderColor: active ? c.fg : 'var(--border2)',
                  background: active ? c.bg : 'transparent',
                  color: active ? c.fg : 'var(--ink3)',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Brand *</label>
          <input className="form-control" value={f.brand} onChange={e => set('brand', e.target.value)} placeholder="Lapua, Sierra, Hodgdon…" required />
        </div>
        <div className="form-group">
          <label className="form-label">Model / Name</label>
          <input className="form-control" value={f.model} onChange={e => set('model', e.target.value)} placeholder="MatchKing, Varget, BR2…" />
        </div>
      </div>

      {(f.type === 'brass' || f.type === 'bullet') && (
        <div className="form-group">
          <label className="form-label">Caliber</label>
          <select className="form-control" value={f.caliber} onChange={e => set('caliber', e.target.value)}>
            <option value="">Select caliber…</option>
            {CALIBERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {f.type === 'bullet' && (
        <div className="form-group">
          <label className="form-label">Weight (gr)</label>
          <input type="number" step="0.5" className="form-control" value={f.weight} onChange={e => set('weight', e.target.value)} placeholder="77" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input type="number" className="form-control" value={f.quantity} onChange={e => set('quantity', e.target.value)} placeholder="500" />
        </div>
        <div className="form-group">
          <label className="form-label">Lot #</label>
          <input className="form-control" value={f.lot} onChange={e => set('lot', e.target.value)} placeholder="Optional lot number" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm">Save Component</button>
      </div>
    </form>
  );
}

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || { bg: 'rgba(107,114,128,0.12)', fg: '#9ca3af' };
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: '1px 6px', fontSize: '0.5625rem', fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      fontFamily: "'Barlow Condensed', sans-serif",
    }}>
      {type}
    </span>
  );
}

export default function ComponentsView() {
  const { state, refresh } = useApp();
  const [activeTab, setActiveTab] = useState('all');
  const [components, setComponents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [state.refreshKey]);

  async function load() {
    setLoading(true);
    try {
      const all = await getComponents();
      setComponents(all);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this component?')) return;
    await deleteComponent(id);
    refresh();
    load();
  }

  const filtered = activeTab === 'all'
    ? components
    : components.filter(c => c.type === activeTab);

  return (
    <div>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface2)',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: '0.75rem', letterSpacing: '0.18em', color: 'var(--ink2)', textTransform: 'uppercase',
        }}>
          COMPONENTS <span style={{ color: 'var(--accent)' }}>//</span> INVENTORY
        </span>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Add
        </button>
      </div>

      {/* Type tabs */}
      <div className="tab-bar">
        {['all', ...COMPONENT_TYPES].map(t => (
          <button
            key={t}
            className={`tab-btn ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Summary badges */}
      {activeTab === 'all' && components.length > 0 && (
        <div style={{
          padding: '8px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 8, flexWrap: 'wrap',
        }}>
          {COMPONENT_TYPES.map(t => {
            const count = components.filter(c => c.type === t).length;
            if (!count) return null;
            const c = TYPE_COLORS[t];
            return (
              <span
                key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  background: c.bg, color: c.fg, cursor: 'pointer',
                  padding: '2px 8px', fontSize: '0.625rem', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
              >
                {count} {t}
              </span>
            );
          })}
        </div>
      )}

      <div style={{ padding: '10px 14px' }}>
        {loading ? (
          <div style={{ color: 'var(--ink3)', fontSize: '0.8125rem', padding: 16 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={`No ${activeTab === 'all' ? 'Components' : activeTab + 's'}`}
            subtitle="Track bullets, brass, powder, and primers in your inventory."
            action={<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Add Component</button>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.map(c => (
              <div key={c.id} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <TypeBadge type={c.type} />
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                      {c.brand} {c.model}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {c.caliber && <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>{c.caliber}</span>}
                    {c.weight && <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>{c.weight}gr</span>}
                    {c.quantity != null && c.quantity !== '' && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--ink2)', fontWeight: 600 }}>
                        {(+c.quantity).toLocaleString()} qty
                      </span>
                    )}
                    {c.lot && <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>Lot: {c.lot}</span>}
                  </div>
                  {c.notes && (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--ink3)', marginTop: 4, fontStyle: 'italic' }}>
                      {c.notes}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-xs" onClick={() => { setEditing(c); setShowForm(true); }}>Edit</button>
                  <button className="btn btn-xs btn-danger" onClick={() => handleDelete(c.id)}>Del</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Modal
          title={editing ? 'Edit Component' : 'New Component'}
          onClose={() => { setShowForm(false); setEditing(null); }}
        >
          <ComponentForm
            initial={editing ? { ...editing } : { type: activeTab === 'all' ? 'brass' : activeTab }}
            onSave={() => { setShowForm(false); setEditing(null); refresh(); load(); }}
            onClose={() => { setShowForm(false); setEditing(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
