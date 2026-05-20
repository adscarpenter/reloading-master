import { useState, useEffect, useRef } from 'react';
import { useApp } from '../core/store.jsx';
import Modal from '../components/ui/Modal.jsx';
import KpiCard from '../components/ui/KpiCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { getPlatforms } from '../services/platforms.js';
import { getRecipes, getRecipe, saveRecipe, deleteRecipe } from '../services/recipes.js';
import {
  getSessions, getSession, saveSession, deleteSession,
  getTestGroups, saveTestGroup, deleteTestGroup,
  getShots, saveShot, deleteShot,
  computeStats,
} from '../services/sessions.js';
import { RECIPE_STATUS, STATUS_COLORS, CALIBERS } from '../core/constants.js';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }); }
  catch { return d; }
};

function StatusBadge({ status }) {
  const colors = { development: '#f59e0b', active: '#22c55e', retired: '#6b7280' };
  const bg = { development: 'rgba(245,158,11,0.12)', active: 'rgba(34,197,94,0.12)', retired: 'rgba(107,114,128,0.12)' };
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

// ─── Session Form ────────────────────────────────────────────────────────────

const BLANK_SESSION = {
  recipe_id: '', platform_id: '', range_date: new Date().toISOString().slice(0, 10),
  distance_yds: '', temp_f: '', altitude_ft: '', notes: '',
};

function SessionForm({ platforms, recipes, initial, onSave, onClose }) {
  const { state } = useApp();
  const [f, setF] = useState({
    ...BLANK_SESSION,
    platform_id: state.activePlatformId || '',
    ...initial,
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const filteredRecipes = f.platform_id
    ? recipes.filter(r => r.platform_id === f.platform_id || r.platform_id === +f.platform_id)
    : recipes;

  async function submit(e) {
    e.preventDefault();
    if (!f.range_date) return;
    await saveSession({
      ...f,
      platform_id: f.platform_id ? +f.platform_id : null,
      recipe_id: f.recipe_id ? +f.recipe_id : null,
      distance_yds: f.distance_yds ? +f.distance_yds : null,
      temp_f: f.temp_f ? +f.temp_f : null,
      altitude_ft: f.altitude_ft ? +f.altitude_ft : null,
    });
    onSave();
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input type="date" className="form-control" value={f.range_date} onChange={e => set('range_date', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Distance (yds)</label>
          <input type="number" className="form-control" value={f.distance_yds} onChange={e => set('distance_yds', e.target.value)} placeholder="100" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Platform</label>
        <select className="form-control" value={f.platform_id} onChange={e => set('platform_id', e.target.value)}>
          <option value="">Select platform…</option>
          {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Recipe / Load</label>
        <select className="form-control" value={f.recipe_id} onChange={e => set('recipe_id', e.target.value)}>
          <option value="">Select recipe…</option>
          {filteredRecipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Temp (°F)</label>
          <input type="number" className="form-control" value={f.temp_f} onChange={e => set('temp_f', e.target.value)} placeholder="72" />
        </div>
        <div className="form-group">
          <label className="form-label">Altitude (ft)</label>
          <input type="number" className="form-control" value={f.altitude_ft} onChange={e => set('altitude_ft', e.target.value)} placeholder="500" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm">Save Session</button>
      </div>
    </form>
  );
}

// ─── Shot Entry ──────────────────────────────────────────────────────────────

function ShotEntry({ session, groups, onShotsChanged }) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || null);
  const [shots, setShots] = useState([]);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) setSelectedGroupId(groups[0].id);
  }, [groups]);

  useEffect(() => { loadShots(); }, [session.id]);

  async function loadShots() {
    const all = await getShots(session.id);
    setShots(all.sort((a, b) => a.id - b.id));
  }

  async function addGroup() {
    const label = `Group ${groups.length + 1}`;
    const ng = await saveTestGroup({ session_id: session.id, label, distance_yds: session.distance_yds });
    onShotsChanged();
    setSelectedGroupId(ng);
  }

  async function logShot() {
    const v = parseFloat(input);
    if (!v || v < 100 || v > 5000) return;
    await saveShot({
      session_id: session.id,
      test_group_id: selectedGroupId,
      velocity: v,
      seq: shots.filter(s => s.test_group_id === selectedGroupId).length + 1,
    });
    setInput('');
    loadShots();
    onShotsChanged();
  }

  async function removeShot(id) {
    await deleteShot(id);
    loadShots();
    onShotsChanged();
  }

  function keypad(k) {
    if (k === '⌫') {
      setInput(p => p.slice(0, -1));
    } else if (k === 'LOG') {
      logShot();
    } else if (input.length < 6) {
      setInput(p => p + k);
    }
  }

  const groupShots = shots.filter(s => s.test_group_id === selectedGroupId);
  const allStats = computeStats(shots.map(s => s.velocity));
  const groupStats = computeStats(groupShots.map(s => s.velocity));

  const KEYS = [['7','8','9'],['4','5','6'],['1','2','3'],['0','⌫','LOG']];

  return (
    <div>
      {/* Group selector */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="label-caps" style={{ flexShrink: 0 }}>Group:</div>
        <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              style={{
                padding: '3px 10px', border: '1px solid',
                borderColor: selectedGroupId === g.id ? 'var(--accent)' : 'var(--border2)',
                background: selectedGroupId === g.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: selectedGroupId === g.id ? 'var(--accent)' : 'var(--ink3)',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.6875rem', fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {g.label}
            </button>
          ))}
          <button
            onClick={addGroup}
            style={{
              padding: '3px 10px', border: '1px dashed var(--border2)',
              background: 'transparent', color: 'var(--ink3)',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.6875rem',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            + Group
          </button>
        </div>
      </div>

      {/* Velocity display + keypad */}
      <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', monospace",
            fontSize: '3rem', fontWeight: 700, lineHeight: 1,
            color: input ? 'var(--ink)' : 'var(--border2)',
            letterSpacing: '-1px',
            minHeight: '3rem',
          }}>
            {input || '0000'}
          </div>
          <div className="label-caps" style={{ marginTop: 4 }}>fps</div>
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxWidth: 240, margin: '0 auto' }}>
          {KEYS.flat().map((k) => (
            <button
              key={k}
              onClick={() => keypad(k)}
              style={{
                padding: '14px 8px',
                background: k === 'LOG' ? 'var(--accent)' : k === '⌫' ? 'var(--surface3)' : 'var(--surface2)',
                border: '1px solid',
                borderColor: k === 'LOG' ? 'var(--accent)' : 'var(--border)',
                color: k === 'LOG' ? '#fff' : 'var(--ink)',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: k === 'LOG' ? '0.625rem' : '1.125rem',
                fontWeight: 700,
                letterSpacing: k === 'LOG' ? '0.1em' : 0,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {shots.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1, background: 'var(--border)',
          borderBottom: '1px solid var(--border)',
        }}>
          <KpiCard label="Shots" value={allStats.count} />
          <KpiCard label="Avg" value={allStats.avg.toLocaleString()} unit="fps" />
          <KpiCard label="ES" value={allStats.es} unit="fps" />
          <KpiCard label="SD" value={allStats.sd} unit="fps" />
        </div>
      )}

      {/* Shot list */}
      <div style={{ padding: '10px 14px' }}>
        <div className="label-caps" style={{ marginBottom: 8 }}>
          {selectedGroupId ? `Group shots (${groupShots.length})` : `All shots (${shots.length})`}
        </div>
        {groupShots.length === 0 ? (
          <div style={{ color: 'var(--ink3)', fontSize: '0.8125rem', padding: '8px 0' }}>
            No shots in this group. Use the keypad to log velocities.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {groupShots.map((s, i) => (
              <div
                key={s.id}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: '0.625rem', color: 'var(--ink3)', minWidth: 20 }}>#{i + 1}</span>
                <span className="mono" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                  {s.velocity.toLocaleString()}
                </span>
                <button
                  onClick={() => removeShot(s.id)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--ink3)',
                    cursor: 'pointer', fontSize: '0.875rem', padding: 0, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Session Detail ──────────────────────────────────────────────────────────

function SessionDetail({ session, onBack, onRefresh }) {
  const [recipe, setRecipe] = useState(null);
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState({ count: 0, avg: 0, es: 0, sd: 0 });
  const [showEdit, setShowEdit] = useState(false);
  const [platforms, setPlatforms] = useState([]);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    load();
    getPlatforms().then(setPlatforms);
    getRecipes().then(setRecipes);
  }, [session.id]);

  async function load() {
    const [rec, grps, shots] = await Promise.all([
      session.recipe_id ? getRecipe(session.recipe_id).catch(() => null) : Promise.resolve(null),
      getTestGroups(session.id),
      getShots(session.id),
    ]);
    setRecipe(rec);

    // Ensure at least one default group exists
    let g = grps;
    if (g.length === 0) {
      await saveTestGroup({ session_id: session.id, label: 'Group 1', distance_yds: session.distance_yds });
      g = await getTestGroups(session.id);
    }
    setGroups(g);
    setStats(computeStats(shots.map(s => s.velocity)));
  }

  async function handleDeleteSession() {
    if (!confirm('Delete this session and all its shots?')) return;
    const shots = await getShots(session.id);
    await Promise.all(shots.map(s => deleteShot(s.id)));
    const grps = await getTestGroups(session.id);
    await Promise.all(grps.map(g => deleteTestGroup(g.id)));
    await deleteSession(session.id);
    onRefresh();
    onBack();
  }

  return (
    <div>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: 'var(--accent)',
            cursor: 'pointer', padding: 0,
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700,
          }}
        >
          ← BACK
        </button>
        <span style={{ color: 'var(--border2)', margin: '0 4px' }}>|</span>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: '0.75rem', letterSpacing: '0.12em', color: 'var(--ink2)',
          textTransform: 'uppercase', flex: 1,
        }}>
          {fmtDate(session.range_date)} · {recipe?.name || 'Session'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-xs" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-xs btn-danger" onClick={handleDeleteSession}>Del</button>
        </div>
      </div>

      {/* Session meta */}
      <div style={{
        padding: '8px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', gap: 14, flexWrap: 'wrap',
      }}>
        {session.distance_yds && <span style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>{session.distance_yds}yds</span>}
        {session.temp_f && <span style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>{session.temp_f}°F</span>}
        {session.altitude_ft && <span style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>{session.altitude_ft}ft alt</span>}
        {session.notes && <span style={{ fontSize: '0.75rem', color: 'var(--ink3)', fontStyle: 'italic' }}>{session.notes}</span>}
      </div>

      <ShotEntry
        session={session}
        groups={groups}
        onShotsChanged={() => { load(); onRefresh(); }}
      />

      {showEdit && (
        <Modal title="Edit Session" onClose={() => setShowEdit(false)}>
          <SessionForm
            platforms={platforms}
            recipes={recipes}
            initial={session}
            onSave={() => { setShowEdit(false); onRefresh(); }}
            onClose={() => setShowEdit(false)}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Recipe Form (standalone for Recipes tab) ────────────────────────────────

const BLANK_RECIPE = {
  name: '', status: 'development', is_factory: false,
  bullet_brand: '', bullet_model: '', bullet_weight: '', bullet_bc: '',
  powder_brand: '', powder_model: '', powder_charge: '',
  brass_brand: '', primer_brand: '', primer_model: '',
  coal: '', cbto: '', factory_brand: '', factory_product: '', adv_mv: '', notes: '',
};

function RecipeForm({ platforms, initial, platformIdOverride, onSave, onClose }) {
  const { state } = useApp();
  const [f, setF] = useState({
    ...BLANK_RECIPE,
    platform_id: platformIdOverride || state.activePlatformId || '',
    ...initial,
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return;
    await saveRecipe({
      ...f,
      name: f.name.trim(),
      platform_id: f.platform_id ? +f.platform_id : null,
      bullet_weight: f.bullet_weight ? +f.bullet_weight : null,
      powder_charge: f.powder_charge ? +f.powder_charge : null,
      coal: f.coal ? +f.coal : null,
      cbto: f.cbto ? +f.cbto : null,
      adv_mv: f.adv_mv ? +f.adv_mv : null,
    });
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
          <label className="form-label">Platform</label>
          <select className="form-control" value={f.platform_id} onChange={e => set('platform_id', e.target.value)}>
            <option value="">No platform</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" value={f.status} onChange={e => set('status', e.target.value)}>
            {RECIPE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['handload', 'factory'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set('is_factory', t === 'factory')}
              style={{
                padding: '6px 14px', border: '1px solid',
                borderColor: (t === 'factory') === f.is_factory ? 'var(--accent)' : 'var(--border2)',
                background: (t === 'factory') === f.is_factory ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: (t === 'factory') === f.is_factory ? 'var(--accent)' : 'var(--ink3)',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {f.is_factory ? (
        <>
          <div className="form-group">
            <label className="form-label">Manufacturer</label>
            <input className="form-control" value={f.factory_brand} onChange={e => set('factory_brand', e.target.value)} placeholder="Federal, Hornady…" />
          </div>
          <div className="form-group">
            <label className="form-label">Product</label>
            <input className="form-control" value={f.factory_product} onChange={e => set('factory_product', e.target.value)} placeholder="Gold Medal Match 77gr BTHP" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Bullet Wt (gr)</label>
              <input type="number" step="0.5" className="form-control" value={f.bullet_weight} onChange={e => set('bullet_weight', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Adv. MV (fps)</label>
              <input type="number" className="form-control" value={f.adv_mv} onChange={e => set('adv_mv', e.target.value)} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
            <div className="label-caps" style={{ marginBottom: 8 }}>Bullet</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input className="form-control" value={f.bullet_brand} onChange={e => set('bullet_brand', e.target.value)} placeholder="Sierra, Berger…" />
              </div>
              <div className="form-group">
                <label className="form-label">Model</label>
                <input className="form-control" value={f.bullet_model} onChange={e => set('bullet_model', e.target.value)} placeholder="MatchKing, Hybrid…" />
              </div>
              <div className="form-group">
                <label className="form-label">Weight (gr)</label>
                <input type="number" step="0.5" className="form-control" value={f.bullet_weight} onChange={e => set('bullet_weight', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">BC G7</label>
                <input type="number" step="0.001" className="form-control" value={f.bullet_bc} onChange={e => set('bullet_bc', e.target.value)} placeholder="0.310" />
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
            <div className="label-caps" style={{ marginBottom: 8 }}>Powder</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input className="form-control" value={f.powder_brand} onChange={e => set('powder_brand', e.target.value)} placeholder="Hodgdon, IMR…" />
              </div>
              <div className="form-group">
                <label className="form-label">Powder</label>
                <input className="form-control" value={f.powder_model} onChange={e => set('powder_model', e.target.value)} placeholder="Varget, N140…" />
              </div>
              <div className="form-group">
                <label className="form-label">Charge (gr)</label>
                <input type="number" step="0.1" className="form-control" value={f.powder_charge} onChange={e => set('powder_charge', e.target.value)} placeholder="25.0" />
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
            <div className="label-caps" style={{ marginBottom: 8 }}>Brass & Primer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Brass Brand</label>
                <input className="form-control" value={f.brass_brand} onChange={e => set('brass_brand', e.target.value)} placeholder="Lapua, Nosler…" />
              </div>
              <div className="form-group">
                <label className="form-label">Primer</label>
                <input className="form-control" value={f.primer_model} onChange={e => set('primer_model', e.target.value)} placeholder="Fed 210M, CCI BR2…" />
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
            <div className="label-caps" style={{ marginBottom: 8 }}>Seating</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">COAL (in)</label>
                <input type="number" step="0.001" className="form-control" value={f.coal} onChange={e => set('coal', e.target.value)} placeholder="2.260" />
              </div>
              <div className="form-group">
                <label className="form-label">CBTO (in)</label>
                <input type="number" step="0.001" className="form-control" value={f.cbto} onChange={e => set('cbto', e.target.value)} placeholder="1.920" />
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

// ─── Main View ───────────────────────────────────────────────────────────────

export default function DevelopmentView() {
  const { state, refresh } = useApp();
  const [tab, setTab] = useState('sessions');
  const [platforms, setPlatforms] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionStats, setSessionStats] = useState({});
  const [recipeNames, setRecipeNames] = useState({});
  const [selectedSession, setSelectedSession] = useState(null);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [filterPlatformId, setFilterPlatformId] = useState(state.activePlatformId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFilterPlatformId(state.activePlatformId || '');
    load();
  }, [state.refreshKey, state.activePlatformId]);

  async function load() {
    setLoading(true);
    try {
      const [p, r, s] = await Promise.all([getPlatforms(), getRecipes(), getSessions()]);
      setPlatforms(p);
      setRecipes(r);
      setSessions(s);

      const names = {};
      r.forEach(rec => { names[rec.id] = rec; });
      setRecipeNames(names);

      const stats = {};
      await Promise.all(s.map(async sess => {
        const shots = await getShots(sess.id);
        stats[sess.id] = computeStats(shots.map(sh => sh.velocity));
      }));
      setSessionStats(stats);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRecipe(id) {
    if (!confirm('Delete this recipe?')) return;
    await deleteRecipe(id);
    refresh();
    load();
  }

  const filteredRecipes = filterPlatformId
    ? recipes.filter(r => r.platform_id === +filterPlatformId)
    : recipes;

  const filteredSessions = [...sessions]
    .filter(s => !filterPlatformId || s.platform_id === +filterPlatformId)
    .sort((a, b) => (b.range_date || '').localeCompare(a.range_date || '') || b.id - a.id);

  if (selectedSession) {
    return (
      <SessionDetail
        session={selectedSession}
        onBack={() => setSelectedSession(null)}
        onRefresh={() => { refresh(); load(); }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface2)',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: '0.75rem', letterSpacing: '0.18em', color: 'var(--ink2)', textTransform: 'uppercase',
        }}>
          DEV <span style={{ color: 'var(--accent)' }}>//</span> LOAD DEVELOPMENT
        </span>
      </div>

      {/* Platform filter */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <label className="label-caps" style={{ flexShrink: 0 }}>Platform:</label>
        <select
          className="form-control"
          style={{ flex: 1, minHeight: 32, padding: '4px 8px', fontSize: '0.8125rem' }}
          value={filterPlatformId}
          onChange={e => setFilterPlatformId(e.target.value)}
        >
          <option value="">All Platforms</option>
          {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
        <button className={`tab-btn ${tab === 'sessions' ? 'active' : ''}`} onClick={() => setTab('sessions')}>
          SESSIONS
        </button>
        <button className={`tab-btn ${tab === 'recipes' ? 'active' : ''}`} onClick={() => setTab('recipes')}>
          RECIPES
        </button>
      </div>

      {/* Sessions tab */}
      {tab === 'sessions' && (
        <div>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSessionForm(true)}>
              + New Session
            </button>
          </div>
          <div style={{ padding: '10px 14px' }}>
            {loading ? (
              <div style={{ color: 'var(--ink3)', fontSize: '0.8125rem', padding: 16 }}>Loading…</div>
            ) : filteredSessions.length === 0 ? (
              <EmptyState
                title="No Sessions"
                subtitle="Log a range session to start recording velocity data."
                action={<button className="btn btn-primary btn-sm" onClick={() => setShowSessionForm(true)}>+ New Session</button>}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredSessions.map(s => {
                  const st = sessionStats[s.id] || {};
                  const rec = recipeNames[s.recipe_id];
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      style={{
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        padding: '10px 12px', cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                          {rec?.name || 'No Recipe'}
                        </span>
                        <span className="mono" style={{ fontSize: '0.625rem', color: 'var(--ink3)' }}>
                          {fmtDate(s.range_date)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {s.distance_yds && <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>{s.distance_yds}yds</span>}
                        {st.count > 0 ? (
                          <>
                            <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--info)' }}>
                              {st.avg?.toLocaleString()} avg
                            </span>
                            <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                              ES {st.es}
                            </span>
                            <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                              SD {st.sd}
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                              {st.count} shots
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>No shots yet — tap to enter</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recipes tab */}
      {tab === 'recipes' && (
        <div>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingRecipe(null); setShowRecipeForm(true); }}>
              + New Recipe
            </button>
          </div>
          <div style={{ padding: '10px 14px' }}>
            {loading ? (
              <div style={{ color: 'var(--ink3)', fontSize: '0.8125rem', padding: 16 }}>Loading…</div>
            ) : filteredRecipes.length === 0 ? (
              <EmptyState
                title="No Recipes"
                subtitle="Define a load recipe to associate with range sessions."
                action={<button className="btn btn-primary btn-sm" onClick={() => setShowRecipeForm(true)}>+ New Recipe</button>}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredRecipes.map(r => (
                  <div key={r.id} style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    padding: '10px 12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{r.name}</span>
                          <StatusBadge status={r.status} />
                          {r.is_factory && (
                            <span style={{
                              background: 'rgba(56,189,248,0.1)', color: '#38bdf8',
                              padding: '1px 5px', fontSize: '0.5rem', fontWeight: 700,
                              letterSpacing: '0.1em', textTransform: 'uppercase',
                              fontFamily: "'Barlow Condensed', sans-serif",
                            }}>FACTORY</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {r.bullet_weight && (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                              {r.bullet_weight}gr {r.bullet_brand} {r.bullet_model}
                            </span>
                          )}
                          {r.powder_charge && (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                              {r.powder_charge}gr {r.powder_model}
                            </span>
                          )}
                          {r.is_factory && r.factory_brand && (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                              {r.factory_brand} {r.factory_product}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button className="btn btn-xs" onClick={() => { setEditingRecipe(r); setShowRecipeForm(true); }}>Edit</button>
                        <button className="btn btn-xs btn-danger" onClick={() => handleDeleteRecipe(r.id)}>Del</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showSessionForm && (
        <Modal title="New Range Session" onClose={() => setShowSessionForm(false)}>
          <SessionForm
            platforms={platforms}
            recipes={recipes}
            initial={{}}
            onSave={() => { setShowSessionForm(false); refresh(); load(); }}
            onClose={() => setShowSessionForm(false)}
          />
        </Modal>
      )}

      {showRecipeForm && (
        <Modal
          title={editingRecipe ? 'Edit Recipe' : 'New Recipe'}
          onClose={() => { setShowRecipeForm(false); setEditingRecipe(null); }}
          size="lg"
        >
          <RecipeForm
            platforms={platforms}
            initial={editingRecipe || {}}
            onSave={() => { setShowRecipeForm(false); setEditingRecipe(null); refresh(); load(); }}
            onClose={() => { setShowRecipeForm(false); setEditingRecipe(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
