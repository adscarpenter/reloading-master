import { useState, useEffect } from 'react';
import { useApp } from '../core/store.jsx';
import Modal from '../components/ui/Modal.jsx';
import KpiCard from '../components/ui/KpiCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import {
  getPlatforms, getPlatform, savePlatform, deletePlatform, getPlatformStats,
} from '../services/platforms.js';
import { getRecipes, getRecipe, saveRecipe, deleteRecipe } from '../services/recipes.js';
import { getSessions, getSessionStats } from '../services/sessions.js';
import { CALIBERS, ACTION_TYPES, TWIST_RATES, RECIPE_STATUS, STATUS_COLORS } from '../core/constants.js';

const BLANK_PLATFORM = {
  name: '', caliber: '', action_type: '', barrel_len: '', twist_rate: '', optics: '', notes: '',
};

const BLANK_RECIPE = {
  name: '', status: 'development', caliber: '', is_factory: false,
  bullet_brand: '', bullet_model: '', bullet_weight: '', bullet_bc: '',
  powder_brand: '', powder_model: '', powder_charge: '',
  brass_brand: '', primer_brand: '', primer_model: '',
  coal: '', cbto: '',
  factory_brand: '', factory_product: '', adv_mv: '',
  notes: '',
};

function SectionHeader({ children, onBack, right }) {
  return (
    <div style={{
      padding: '9px 14px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: 'var(--surface2)',
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: 'var(--accent)',
            cursor: 'pointer', padding: 0,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
          }}
        >
          ← BACK
        </button>
      )}
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: '0.75rem',
        letterSpacing: '0.18em',
        color: 'var(--ink2)',
        textTransform: 'uppercase',
        flex: 1,
      }}>
        {onBack && <span style={{ color: 'var(--border2)', margin: '0 6px' }}>|</span>}
        {children}
      </span>
      {right}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = { development: '#f59e0b', active: '#22c55e', retired: '#6b7280' };
  const bg = { development: 'rgba(245,158,11,0.12)', active: 'rgba(34,197,94,0.12)', retired: 'rgba(107,114,128,0.12)' };
  return (
    <span style={{
      background: bg[status] || bg.retired,
      color: colors[status] || colors.retired,
      padding: '1px 6px',
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '0.5625rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
}

function PlatformForm({ initial, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK_PLATFORM, ...initial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return;
    await savePlatform({ ...f, name: f.name.trim() });
    onSave();
  }

  return (
    <form onSubmit={submit}>
      <div className="form-group">
        <label className="form-label">Platform Name *</label>
        <input className="form-control" value={f.name} onChange={e => set('name', e.target.value)} placeholder={'e.g. AR-15 18" Precision, Ruger Precision Rifle'} required />
      </div>
      <div className="form-group">
        <label className="form-label">Primary Caliber</label>
        <select className="form-control" value={f.caliber} onChange={e => set('caliber', e.target.value)}>
          <option value="">Select caliber…</option>
          {CALIBERS.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="custom">Custom…</option>
        </select>
        {f.caliber === 'custom' && (
          <input className="form-control" style={{ marginTop: 4 }} placeholder="Enter caliber" onBlur={e => set('caliber', e.target.value)} />
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Action Type</label>
          <select className="form-control" value={f.action_type} onChange={e => set('action_type', e.target.value)}>
            <option value="">Select…</option>
            {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Twist Rate</label>
          <select className="form-control" value={f.twist_rate} onChange={e => set('twist_rate', e.target.value)}>
            <option value="">Select…</option>
            {TWIST_RATES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Barrel Length (in)</label>
          <input className="form-control" type="number" step="0.5" min="1" value={f.barrel_len} onChange={e => set('barrel_len', e.target.value)} placeholder="24" />
        </div>
        <div className="form-group">
          <label className="form-label">Optics / Scope</label>
          <input className="form-control" value={f.optics} onChange={e => set('optics', e.target.value)} placeholder="Vortex Razor 4-16×50" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm">Save Platform</button>
      </div>
    </form>
  );
}

function RecipeForm({ platformId, initial, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK_RECIPE, ...initial, platform_id: platformId });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return;
    await saveRecipe({ ...f, name: f.name.trim(), platform_id: platformId });
    onSave();
  }

  return (
    <form onSubmit={submit}>
      <div className="form-group">
        <label className="form-label">Recipe Name *</label>
        <input className="form-control" value={f.name} onChange={e => set('name', e.target.value)} placeholder="e.g. 77gr SMK · Varget · 25.0gr" required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={f.status} onChange={e => set('status', e.target.value)}>
            {RECIPE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-control" value={f.is_factory ? 'factory' : 'handload'} onChange={e => set('is_factory', e.target.value === 'factory')}>
            <option value="handload">Handload</option>
            <option value="factory">Factory</option>
          </select>
        </div>
      </div>

      {f.is_factory ? (
        <>
          <div className="form-group">
            <label className="form-label">Manufacturer</label>
            <input className="form-control" value={f.factory_brand} onChange={e => set('factory_brand', e.target.value)} placeholder="Federal, Hornady, Nosler…" />
          </div>
          <div className="form-group">
            <label className="form-label">Product / Load Name</label>
            <input className="form-control" value={f.factory_product} onChange={e => set('factory_product', e.target.value)} placeholder="Gold Medal Match 77gr BTHP" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Bullet Weight (gr)</label>
              <input className="form-control" type="number" step="0.5" value={f.bullet_weight} onChange={e => set('bullet_weight', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Advertised MV (fps)</label>
              <input className="form-control" type="number" value={f.adv_mv} onChange={e => set('adv_mv', e.target.value)} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Bullet</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input className="form-control" value={f.bullet_brand} onChange={e => set('bullet_brand', e.target.value)} placeholder="Sierra, Berger, Hornady…" />
              </div>
              <div className="form-group">
                <label className="form-label">Model</label>
                <input className="form-control" value={f.bullet_model} onChange={e => set('bullet_model', e.target.value)} placeholder="MatchKing, Hybrid…" />
              </div>
              <div className="form-group">
                <label className="form-label">Weight (gr)</label>
                <input className="form-control" type="number" step="0.5" value={f.bullet_weight} onChange={e => set('bullet_weight', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">BC (G7)</label>
                <input className="form-control" type="number" step="0.001" value={f.bullet_bc} onChange={e => set('bullet_bc', e.target.value)} placeholder="0.310" />
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Powder</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input className="form-control" value={f.powder_brand} onChange={e => set('powder_brand', e.target.value)} placeholder="Hodgdon, IMR, Vihtavuori…" />
              </div>
              <div className="form-group">
                <label className="form-label">Powder</label>
                <input className="form-control" value={f.powder_model} onChange={e => set('powder_model', e.target.value)} placeholder="Varget, N140, H4350…" />
              </div>
              <div className="form-group">
                <label className="form-label">Charge (gr)</label>
                <input className="form-control" type="number" step="0.1" value={f.powder_charge} onChange={e => set('powder_charge', e.target.value)} placeholder="25.0" />
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Brass & Primer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Brass Brand</label>
                <input className="form-control" value={f.brass_brand} onChange={e => set('brass_brand', e.target.value)} placeholder="Lapua, Nosler, WW…" />
              </div>
              <div className="form-group">
                <label className="form-label">Primer Brand</label>
                <input className="form-control" value={f.primer_brand} onChange={e => set('primer_brand', e.target.value)} placeholder="Federal, CCI, Remington…" />
              </div>
              <div className="form-group">
                <label className="form-label">Primer Model</label>
                <input className="form-control" value={f.primer_model} onChange={e => set('primer_model', e.target.value)} placeholder="210M, BR2, 200…" />
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
            <div className="label-caps" style={{ marginBottom: 10 }}>Seating</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">COAL (in)</label>
                <input className="form-control" type="number" step="0.001" value={f.coal} onChange={e => set('coal', e.target.value)} placeholder="2.260" />
              </div>
              <div className="form-group">
                <label className="form-label">CBTO (in)</label>
                <input className="form-control" type="number" step="0.001" value={f.cbto} onChange={e => set('cbto', e.target.value)} placeholder="1.920" />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm">Save Recipe</button>
      </div>
    </form>
  );
}

function RecipeCard({ recipe, onEdit, onDelete }) {
  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {recipe.name}
          </span>
          <StatusBadge status={recipe.status} />
          {recipe.is_factory && (
            <span style={{
              background: 'rgba(56,189,248,0.1)', color: '#38bdf8',
              padding: '1px 5px', fontSize: '0.5rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>FACTORY</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {recipe.bullet_weight && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
              {recipe.bullet_weight}gr {recipe.bullet_brand} {recipe.bullet_model}
            </span>
          )}
          {recipe.powder_charge && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
              {recipe.powder_charge}gr {recipe.powder_model}
            </span>
          )}
          {recipe.is_factory && recipe.factory_brand && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
              {recipe.factory_brand} {recipe.factory_product}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button className="btn btn-xs" onClick={() => onEdit(recipe)}>Edit</button>
        <button className="btn btn-xs btn-danger" onClick={() => onDelete(recipe.id)}>Del</button>
      </div>
    </div>
  );
}

// ─── Platform Detail ────────────────────────────────────────────────────────

function PlatformDetail({ platform, onBack, onRefresh }) {
  const { state, setActivePlatform } = useApp();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  const isActive = state.activePlatformId === platform.id;

  useEffect(() => { loadAll(); }, [platform.id, state.refreshKey]);

  async function loadAll() {
    const [st, rec, sess] = await Promise.all([
      getPlatformStats(platform.id),
      getRecipes(platform.id),
      getSessions(platform.id),
    ]);
    setStats(st);
    setRecipes(rec);

    // enrich sessions with stats
    const enriched = await Promise.all(
      sess.sort((a, b) => (b.range_date || '').localeCompare(a.range_date || '') || b.id - a.id)
        .map(async s => {
          const st2 = await getSessionStats(s.id);
          return { ...s, stats: st2 };
        })
    );
    setSessions(enriched);
  }

  async function handleDeleteRecipe(id) {
    if (!confirm('Delete this recipe?')) return;
    await deleteRecipe(id);
    onRefresh();
    loadAll();
  }

  function handleEditRecipe(recipe) {
    setEditingRecipe(recipe);
    setShowRecipeForm(true);
  }

  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }); }
    catch { return d; }
  };

  return (
    <div>
      <SectionHeader
        onBack={onBack}
        right={
          <button
            onClick={() => setActivePlatform(isActive ? null : platform.id)}
            style={{
              background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(59,130,246,0.5)' : 'var(--border2)'}`,
              color: isActive ? 'var(--accent)' : 'var(--ink3)',
              padding: '3px 10px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.1em',
              cursor: 'pointer', textTransform: 'uppercase',
            }}
          >
            {isActive ? '● ACTIVE' : 'SET ACTIVE'}
          </button>
        }
      >
        {platform.name}
      </SectionHeader>

      {/* Platform meta */}
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        {platform.caliber && <span style={{ fontSize: '0.75rem', color: 'var(--ink2)' }}>{platform.caliber}</span>}
        {platform.action_type && <span style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>{platform.action_type}</span>}
        {platform.barrel_len && <span style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>{platform.barrel_len}" barrel</span>}
        {platform.twist_rate && <span style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>{platform.twist_rate} twist</span>}
        {platform.optics && <span style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>{platform.optics}</span>}
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1, background: 'var(--border)', borderBottom: '1px solid var(--border)',
        }}>
          <KpiCard label="Recipes" value={stats.recipes} />
          <KpiCard label="Sessions" value={stats.sessions} />
          <KpiCard label="Rounds" value={stats.rounds} />
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {['overview', 'recipes', 'sessions'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ padding: 14 }}>
          {platform.notes && (
            <div className="alert" style={{ marginBottom: 14 }}>
              <div className="label-caps" style={{ marginBottom: 4 }}>Notes</div>
              {platform.notes}
            </div>
          )}
          {recipes.filter(r => r.status === 'active').length > 0 && (
            <div>
              <div className="label-caps" style={{ marginBottom: 8 }}>Active Loads</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recipes.filter(r => r.status === 'active').map(r => (
                  <div key={r.id} style={{
                    background: 'var(--surface2)', border: '1px solid rgba(34,197,94,0.2)',
                    padding: '8px 12px', borderLeft: '3px solid var(--success)',
                  }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{r.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'recipes' && (
        <div>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingRecipe(null); setShowRecipeForm(true); }}>
              + Add Recipe
            </button>
          </div>
          <div style={{ padding: '10px 14px' }}>
            {recipes.length === 0 ? (
              <EmptyState
                title="No Recipes"
                subtitle="Add your first load recipe for this platform."
                action={<button className="btn btn-primary btn-sm" onClick={() => setShowRecipeForm(true)}>+ Add Recipe</button>}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recipes.map(r => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    onEdit={handleEditRecipe}
                    onDelete={handleDeleteRecipe}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'sessions' && (
        <div style={{ padding: '10px 14px' }}>
          {sessions.length === 0 ? (
            <EmptyState title="No Sessions" subtitle="Range sessions for this platform will appear here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sessions.map(s => (
                <div key={s.id} style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      {fmtDate(s.range_date)}
                    </span>
                    {s.distance_yds && (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>{s.distance_yds}yds</span>
                    )}
                  </div>
                  {s.notes && <div style={{ fontSize: '0.75rem', color: 'var(--ink3)', marginBottom: 4 }}>{s.notes}</div>}
                  {s.stats.count > 0 && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--info)' }}>{s.stats.avg.toLocaleString()} avg</span>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>ES {s.stats.es}</span>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>SD {s.stats.sd}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showRecipeForm && (
        <Modal
          title={editingRecipe ? 'Edit Recipe' : 'New Recipe'}
          onClose={() => { setShowRecipeForm(false); setEditingRecipe(null); }}
          size="lg"
        >
          <RecipeForm
            platformId={platform.id}
            initial={editingRecipe || {}}
            onSave={() => { setShowRecipeForm(false); setEditingRecipe(null); onRefresh(); loadAll(); }}
            onClose={() => { setShowRecipeForm(false); setEditingRecipe(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Platforms List ──────────────────────────────────────────────────────────

export default function PlatformsView() {
  const { state, setActivePlatform, refresh } = useApp();
  const [platforms, setPlatforms] = useState([]);
  const [platformStats, setPlatformStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPlatforms(); }, [state.refreshKey]);

  async function loadPlatforms() {
    setLoading(true);
    try {
      const list = await getPlatforms();
      setPlatforms(list);
      const stats = {};
      await Promise.all(list.map(async p => {
        stats[p.id] = await getPlatformStats(p.id);
      }));
      setPlatformStats(stats);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this platform? This will not delete associated recipes or sessions.')) return;
    await deletePlatform(id);
    if (state.activePlatformId === id) setActivePlatform(null);
    refresh();
    loadPlatforms();
  }

  if (selected) {
    const p = platforms.find(p => p.id === selected);
    if (p) return (
      <PlatformDetail
        platform={p}
        onBack={() => setSelected(null)}
        onRefresh={() => { refresh(); loadPlatforms(); }}
      />
    );
  }

  return (
    <div>
      <div style={{
        padding: '9px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface2)',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700, fontSize: '0.75rem',
          letterSpacing: '0.18em', color: 'var(--ink2)', textTransform: 'uppercase',
        }}>
          PLATFORMS <span style={{ color: 'var(--accent)' }}>//</span> FIREARMS
        </span>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setEditingPlatform(null); setShowForm(true); }}
        >
          + Add Platform
        </button>
      </div>

      <div style={{ padding: '10px 14px' }}>
        {loading ? (
          <div style={{ color: 'var(--ink3)', fontSize: '0.8125rem', padding: 16 }}>Loading…</div>
        ) : platforms.length === 0 ? (
          <EmptyState
            title="No Platforms"
            subtitle="Add your first firearm to start tracking loads and range sessions."
            action={<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Add Platform</button>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {platforms.map(p => {
              const s = platformStats[p.id] || {};
              const isActive = state.activePlatformId === p.id;
              return (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--surface2)',
                    border: `1px solid ${isActive ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onClick={() => setSelected(p.id)}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: 'var(--accent)',
                    }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 2 }}>
                        {p.name}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {p.caliber && <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>{p.caliber}</span>}
                        {p.action_type && <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>{p.action_type}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {isActive && (
                        <span style={{
                          background: 'rgba(59,130,246,0.15)', color: 'var(--accent)',
                          padding: '2px 6px', fontSize: '0.5625rem', fontWeight: 700,
                          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em',
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                      <span style={{ color: 'var(--ink2)', fontWeight: 600 }}>{s.recipes || 0}</span> recipes
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                      <span style={{ color: 'var(--ink2)', fontWeight: 600 }}>{s.sessions || 0}</span> sessions
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                      <span style={{ color: 'var(--ink2)', fontWeight: 600 }}>{s.rounds || 0}</span> rounds
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-xs"
                      onClick={() => { setActivePlatform(isActive ? null : p.id); }}
                    >
                      {isActive ? 'Deactivate' : 'Set Active'}
                    </button>
                    <button className="btn btn-xs" onClick={() => { setEditingPlatform(p); setShowForm(true); }}>Edit</button>
                    <button className="btn btn-xs btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <Modal
          title={editingPlatform ? 'Edit Platform' : 'New Platform'}
          onClose={() => { setShowForm(false); setEditingPlatform(null); }}
        >
          <PlatformForm
            initial={editingPlatform || {}}
            onSave={() => { setShowForm(false); setEditingPlatform(null); refresh(); loadPlatforms(); }}
            onClose={() => { setShowForm(false); setEditingPlatform(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
