import { useState, useEffect } from 'react';
import { useApp } from '../core/store.jsx';
import Modal from '../components/ui/Modal.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { getRecipe, saveRecipe } from '../services/recipes.js';
import { getSessionsByRecipe, getSessionStats } from '../services/sessions.js';
import { getBenchSessions, saveBenchSession, deleteBenchSession } from '../services/bench.js';
import { RECIPE_STATUS } from '../core/constants.js';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }); }
  catch { return d; }
};

function StatusBadge({ status }) {
  const colors = { development: '#f59e0b', active: '#22c55e', retired: '#6b7280' };
  const bg     = { development: 'rgba(245,158,11,0.12)', active: 'rgba(34,197,94,0.12)', retired: 'rgba(107,114,128,0.12)' };
  return (
    <span style={{
      background: bg[status] || bg.retired, color: colors[status] || colors.retired,
      padding: '1px 6px', fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span className="label-caps">{label}</span>
      <span className="mono" style={{ fontSize: '0.8125rem', color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}

// ─── Bench Log Tab ────────────────────────────────────────────────────────────

const BLANK_BENCH = {
  bench_date: new Date().toISOString().slice(0, 10),
  rounds_loaded: '',
  primer_batch: '',
  brass_firings: '',
  notes: '',
};

function BenchForm({ initial, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK_BENCH, ...initial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    await saveBenchSession({
      ...f,
      rounds_loaded: f.rounds_loaded ? +f.rounds_loaded : null,
      brass_firings: f.brass_firings ? +f.brass_firings : null,
    });
    onSave();
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input type="date" className="form-control" value={f.bench_date} onChange={e => set('bench_date', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Rounds Loaded</label>
          <input type="number" className="form-control" value={f.rounds_loaded} onChange={e => set('rounds_loaded', e.target.value)} placeholder="50" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Primer Lot / Batch</label>
          <input className="form-control" value={f.primer_batch} onChange={e => set('primer_batch', e.target.value)} placeholder="Fed 210M lot #..." />
        </div>
        <div className="form-group">
          <label className="form-label">Brass Firings</label>
          <input type="number" className="form-control" value={f.brass_firings} onChange={e => set('brass_firings', e.target.value)} placeholder="3" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes (case prep, annealing, issues…)</label>
        <textarea className="form-control" rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm">Save Entry</button>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RecipeDetail({ recipeId, onBack, onRefresh, onOpenSession }) {
  const { state } = useApp();
  const [recipe, setRecipe]           = useState(null);
  const [tab, setTab]                 = useState('specs');
  const [benchSessions, setBenchSessions] = useState([]);
  const [sessions, setSessions]       = useState([]);
  const [showBenchForm, setShowBenchForm] = useState(false);
  const [editBench, setEditBench]     = useState(null);
  const [totalRounds, setTotalRounds] = useState(0);

  useEffect(() => { load(); }, [recipeId, state.refreshKey]);

  async function load() {
    const [rec, bench, sess] = await Promise.all([
      getRecipe(recipeId),
      getBenchSessions(recipeId),
      getSessionsByRecipe(recipeId),
    ]);
    setRecipe(rec);
    setBenchSessions(bench.sort((a, b) => (b.bench_date || '').localeCompare(a.bench_date || '')));

    const enriched = await Promise.all(
      sess.sort((a, b) => (b.range_date || '').localeCompare(a.range_date || '')).map(async s => {
        const st = await getSessionStats(s.id);
        return { ...s, stats: st };
      })
    );
    setSessions(enriched);

    const loaded = bench.reduce((sum, b) => sum + (b.rounds_loaded || 0), 0);
    setTotalRounds(loaded);
  }

  async function handleDeleteBench(id) {
    if (!confirm('Delete this bench entry?')) return;
    await deleteBenchSession(id);
    load();
  }

  async function handleStatusChange(status) {
    await saveRecipe({ ...recipe, status });
    onRefresh();
    load();
  }

  if (!recipe) return <div style={{ padding: 24, color: 'var(--ink3)' }}>Loading…</div>;

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: 'var(--accent)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem',
            fontWeight: 700, cursor: 'pointer', padding: 0,
          }}
        >
          ← BACK
        </button>
        <span style={{ color: 'var(--border2)', margin: '0 4px' }}>|</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: '0.75rem', letterSpacing: '0.12em', color: 'var(--ink2)',
          textTransform: 'uppercase', flex: 1, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {recipe.name}
        </span>
        <StatusBadge status={recipe.status} />
      </div>

      {/* Status quick-change */}
      <div style={{
        padding: '6px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span className="label-caps" style={{ marginRight: 4 }}>Status:</span>
        {RECIPE_STATUS.map(s => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            style={{
              padding: '2px 8px', border: '1px solid',
              borderColor: recipe.status === s ? 'var(--accent)' : 'var(--border2)',
              background: recipe.status === s ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: recipe.status === s ? 'var(--accent)' : 'var(--ink3)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
          {sessions.length} sessions · {totalRounds} rounds loaded
        </span>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {['specs', 'bench log', 'sessions'].map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* SPECS tab */}
      {tab === 'specs' && (
        <div style={{ padding: 14 }}>
          {recipe.is_factory ? (
            <>
              <Row label="Type" value="Factory" />
              <Row label="Manufacturer" value={recipe.factory_brand} />
              <Row label="Product" value={recipe.factory_product} />
              <Row label="Bullet Weight" value={recipe.bullet_weight ? `${recipe.bullet_weight} gr` : null} />
              <Row label="Adv. MV" value={recipe.adv_mv ? `${recipe.adv_mv} fps` : null} />
            </>
          ) : (
            <>
              <Row label="Caliber" value={recipe.caliber} />
              <Row label="Bullet" value={[recipe.bullet_brand, recipe.bullet_model, recipe.bullet_weight ? recipe.bullet_weight + 'gr' : null].filter(Boolean).join(' ')} />
              <Row label="BC (G7)" value={recipe.bullet_bc} />
              <Row label="Powder" value={[recipe.powder_brand, recipe.powder_model].filter(Boolean).join(' ')} />
              <Row label="Charge" value={recipe.powder_charge ? `${recipe.powder_charge} gr` : null} />
              <Row label="Brass" value={recipe.brass_brand} />
              <Row label="Primer" value={[recipe.primer_brand, recipe.primer_model].filter(Boolean).join(' ')} />
              <Row label="COAL" value={recipe.coal ? `${recipe.coal}"` : null} />
              <Row label="CBTO" value={recipe.cbto ? `${recipe.cbto}"` : null} />
            </>
          )}
          {recipe.notes && (
            <div className="alert" style={{ marginTop: 12 }}>
              <div className="label-caps" style={{ marginBottom: 4 }}>Notes</div>
              {recipe.notes}
            </div>
          )}
        </div>
      )}

      {/* BENCH LOG tab */}
      {tab === 'bench log' && (
        <div>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--ink3)' }}>
              {totalRounds > 0 ? `${totalRounds} total rounds loaded` : 'No rounds logged yet'}
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditBench(null); setShowBenchForm(true); }}>
              + Log Session
            </button>
          </div>
          <div style={{ padding: '10px 14px' }}>
            {benchSessions.length === 0 ? (
              <EmptyState
                title="No Bench Log Entries"
                subtitle="Record when you sit down to load ammo — date, round count, case prep notes, primer lot."
                action={<button className="btn btn-primary btn-sm" onClick={() => setShowBenchForm(true)}>+ Log Loading Session</button>}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {benchSessions.map(b => (
                  <div key={b.id} style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    padding: '10px 12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{fmtDate(b.bench_date)}</span>
                        {b.rounds_loaded && (
                          <span style={{ marginLeft: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--info)', fontSize: '0.875rem' }}>
                            {b.rounds_loaded} rds
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs" onClick={() => { setEditBench(b); setShowBenchForm(true); }}>Edit</button>
                        <button className="btn btn-xs btn-danger" onClick={() => handleDeleteBench(b.id)}>Del</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: b.notes ? 6 : 0 }}>
                      {b.primer_batch && <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>Primer: {b.primer_batch}</span>}
                      {b.brass_firings != null && b.brass_firings !== '' && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>Brass firings: {b.brass_firings}</span>
                      )}
                    </div>
                    {b.notes && <div style={{ fontSize: '0.75rem', color: 'var(--ink3)', fontStyle: 'italic' }}>{b.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SESSIONS tab */}
      {tab === 'sessions' && (
        <div style={{ padding: '10px 14px' }}>
          {sessions.length === 0 ? (
            <EmptyState title="No Sessions" subtitle="Range sessions using this recipe will appear here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => onOpenSession && onOpenSession(s)}
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    padding: '10px 12px', cursor: onOpenSession ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{fmtDate(s.range_date)}</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>{s.distance_yds ? `${s.distance_yds}yds` : '—'}</span>
                  </div>
                  {s.stats.count > 0 ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--info)' }}>{s.stats.avg.toLocaleString()} avg</span>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>ES {s.stats.es}</span>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>SD {s.stats.sd}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>{s.stats.count} shots</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>No shots yet</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showBenchForm && (
        <Modal
          title={editBench ? 'Edit Bench Entry' : 'Log Loading Session'}
          onClose={() => { setShowBenchForm(false); setEditBench(null); }}
        >
          <BenchForm
            initial={editBench ? { ...editBench, recipe_id: recipeId } : { recipe_id: recipeId }}
            onSave={() => { setShowBenchForm(false); setEditBench(null); load(); }}
            onClose={() => { setShowBenchForm(false); setEditBench(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
