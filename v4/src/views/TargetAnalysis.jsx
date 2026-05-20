import { useState, useRef, useCallback, useEffect } from 'react';
import { saveTargetSession, deleteTargetSession } from '../services/targets.js';

// ─── constants ───────────────────────────────────────────────────────────────

const GROUP_COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#a855f7'];
const GROUP_LABELS = ['G1', 'G2', 'G3', 'G4', 'G5'];

function moa(inches, yards) {
  if (!inches || !yards) return null;
  return (inches * 100 / (yards * 1.0472)).toFixed(2);
}
function mrad(inches, yards) {
  if (!inches || !yards) return null;
  return (inches * 100 / (yards * 3.6)).toFixed(2);
}

function newGroup(index) {
  return {
    id: `g${Date.now()}-${index}`,
    label: `Group ${index + 1}`,
    color: GROUP_COLORS[index % GROUP_COLORS.length],
    points: [],
    size_inches: '',
    wind_inches: '',
    wind_dir: 'R',
    elev_inches: '',
    elev_dir: 'U',
  };
}

async function resizeImage(file, maxW = 1400) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── TargetEditor ─────────────────────────────────────────────────────────

function TargetEditor({ initial, distanceYds, onSave, onClose }) {
  const [groups, setGroups]           = useState(initial?.groups || [newGroup(0)]);
  const [activeGroupId, setActiveGroupId] = useState((initial?.groups || [])[0]?.id || newGroup(0).id);
  const [eraseMode, setEraseMode]     = useState(false);
  const [distance, setDistance]       = useState(distanceYds || initial?.distance_yds || '');
  const [imageData, setImageData]     = useState(initial?.image_data || null);
  const [notes, setNotes]             = useState(initial?.notes || '');
  const [saving, setSaving]           = useState(false);
  const fileRef = useRef();

  // Ensure activeGroupId stays valid
  useEffect(() => {
    if (!groups.find(g => g.id === activeGroupId) && groups.length) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups]);

  const activeGroup = groups.find(g => g.id === activeGroupId);

  function updateGroup(id, patch) {
    setGroups(gs => gs.map(g => g.id === id ? { ...g, ...patch } : g));
  }

  function addGroup() {
    if (groups.length >= 5) return;
    const ng = newGroup(groups.length);
    setGroups(gs => [...gs, ng]);
    setActiveGroupId(ng.id);
  }

  function removeGroup(id) {
    if (groups.length <= 1) return;
    setGroups(gs => gs.filter(g => g.id !== id));
  }

  async function handleImageFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const resized = await resizeImage(file);
    setImageData(resized);
  }

  function handleOverlayClick(e) {
    if (!imageData || !activeGroup) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    if (eraseMode) return; // erase handled per-marker

    updateGroup(activeGroupId, {
      points: [...(activeGroup.points || []), { x, y }],
    });
  }

  function handleOverlayTouch(e) {
    e.preventDefault();
    handleOverlayClick(e);
  }

  function erasePoint(groupId, ptIndex, e) {
    e.stopPropagation();
    if (!eraseMode) return;
    setGroups(gs => gs.map(g =>
      g.id === groupId
        ? { ...g, points: g.points.filter((_, i) => i !== ptIndex) }
        : g
    ));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const obj = {
        ...(initial || {}),
        image_data: imageData,
        distance_yds: distance ? +distance : null,
        groups,
        notes,
      };
      await saveTargetSession(obj);
      onSave();
    } finally {
      setSaving(false);
    }
  }

  const dist = distance ? +distance : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--accent)',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem',
          fontWeight: 700, cursor: 'pointer', padding: 0,
        }}>
          ← BACK
        </button>
        <span style={{ color: 'var(--border2)', margin: '0 2px' }}>|</span>

        {/* Group selector */}
        <div style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto' }}>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => { setActiveGroupId(g.id); setEraseMode(false); }}
              style={{
                padding: '3px 8px', border: '1px solid',
                borderColor: activeGroupId === g.id ? g.color : 'var(--border2)',
                background: activeGroupId === g.id ? g.color + '22' : 'transparent',
                color: activeGroupId === g.id ? g.color : 'var(--ink3)',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '0.625rem', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {g.label} ({g.points.length})
            </button>
          ))}
          {groups.length < 5 && (
            <button onClick={addGroup} style={{
              padding: '3px 8px', border: '1px dashed var(--border2)',
              background: 'transparent', color: 'var(--ink3)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '0.625rem', fontWeight: 700, cursor: 'pointer',
            }}>
              + Group
            </button>
          )}
        </div>

        {/* Erase toggle */}
        <button
          onClick={() => setEraseMode(m => !m)}
          style={{
            padding: '3px 8px', border: '1px solid',
            borderColor: eraseMode ? 'var(--danger)' : 'var(--border2)',
            background: eraseMode ? 'rgba(239,68,68,0.12)' : 'transparent',
            color: eraseMode ? 'var(--danger)' : 'var(--ink3)',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '0.625rem', fontWeight: 700, cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {eraseMode ? 'ERASE ON' : 'ERASE'}
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary btn-xs"
          style={{ flexShrink: 0 }}
        >
          {saving ? '…' : 'SAVE'}
        </button>
      </div>

      {/* Image area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#000' }}>
        {!imageData ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 12,
          }}>
            <div style={{ color: 'var(--ink3)', fontSize: '0.875rem' }}>No target image loaded</div>
            <label>
              <span className="btn btn-primary btn-sm">Upload Target Image</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageFile}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto' }}>
            <div
              style={{ position: 'relative', display: 'inline-block', minWidth: '100%' }}
              onClick={handleOverlayClick}
              onTouchEnd={handleOverlayTouch}
              style={{
                position: 'relative', display: 'block',
                cursor: eraseMode ? 'crosshair' : 'crosshair',
              }}
            >
              <img
                src={imageData}
                alt="Target"
                style={{ width: '100%', display: 'block', userSelect: 'none', WebkitUserSelect: 'none' }}
                draggable={false}
              />
              {/* Shot markers */}
              {groups.flatMap(g =>
                (g.points || []).map((pt, pi) => (
                  <div
                    key={`${g.id}-${pi}`}
                    onClick={e => erasePoint(g.id, pi, e)}
                    onTouchEnd={e => { e.preventDefault(); erasePoint(g.id, pi, e); }}
                    style={{
                      position: 'absolute',
                      left: `${pt.x * 100}%`,
                      top: `${pt.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 18, height: 18,
                      borderRadius: '50%',
                      background: g.color,
                      border: '2px solid rgba(255,255,255,0.9)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
                      cursor: eraseMode ? 'pointer' : 'default',
                      zIndex: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: '0.5rem', fontWeight: 800, lineHeight: 1 }}>
                      {pi + 1}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Change image button */}
        {imageData && (
          <label style={{ position: 'absolute', bottom: 8, right: 8 }}>
            <span className="btn btn-xs" style={{ background: 'rgba(9,9,11,0.7)', border: '1px solid var(--border2)' }}>
              Change Image
            </span>
            <input
              type="file" accept="image/*" capture="environment"
              onChange={handleImageFile} style={{ display: 'none' }}
            />
          </label>
        )}
      </div>

      {/* Stats panel */}
      {activeGroup && (
        <div style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '10px 12px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: activeGroup.color, flexShrink: 0,
            }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--ink2)',
            }}>
              {activeGroup.label} — {activeGroup.points.length} shots
            </span>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="label-caps">Dist</span>
              <input
                type="number"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                placeholder="yds"
                style={{
                  width: 56, background: 'var(--surface2)', border: '1px solid var(--border2)',
                  color: 'var(--ink)', padding: '3px 6px', fontSize: '0.8125rem',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
              <span style={{ fontSize: '0.625rem', color: 'var(--ink3)' }}>yds</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {/* Group size */}
            <div>
              <div className="label-caps" style={{ marginBottom: 4 }}>Group Size</div>
              <input
                type="number"
                step="0.01"
                value={activeGroup.size_inches}
                onChange={e => updateGroup(activeGroup.id, { size_inches: e.target.value })}
                placeholder="inches"
                style={{
                  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)',
                  color: 'var(--ink)', padding: '5px 8px', fontSize: '0.875rem',
                  fontFamily: "'JetBrains Mono', monospace", marginBottom: 4,
                }}
              />
              {activeGroup.size_inches && dist ? (
                <div style={{ fontSize: '0.6875rem' }}>
                  <span style={{ color: 'var(--info)' }}>{moa(activeGroup.size_inches, dist)} MOA</span>
                  <span style={{ color: 'var(--ink3)', margin: '0 4px' }}>·</span>
                  <span style={{ color: 'var(--ink2)' }}>{mrad(activeGroup.size_inches, dist)} MRAD</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.625rem', color: 'var(--ink3)' }}>enter size + dist</div>
              )}
            </div>

            {/* Windage */}
            <div>
              <div className="label-caps" style={{ marginBottom: 4 }}>Windage</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <input
                  type="number"
                  step="0.01"
                  value={activeGroup.wind_inches}
                  onChange={e => updateGroup(activeGroup.id, { wind_inches: e.target.value })}
                  placeholder="inches"
                  style={{
                    flex: 1, background: 'var(--surface2)', border: '1px solid var(--border2)',
                    color: 'var(--ink)', padding: '5px 8px', fontSize: '0.875rem',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <button
                  onClick={() => updateGroup(activeGroup.id, { wind_dir: activeGroup.wind_dir === 'R' ? 'L' : 'R' })}
                  style={{
                    padding: '0 8px', border: '1px solid var(--border2)',
                    background: 'var(--surface2)', color: activeGroup.wind_dir === 'R' ? 'var(--info)' : 'var(--warning)',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                    fontSize: '0.75rem', cursor: 'pointer',
                  }}
                >
                  {activeGroup.wind_dir}
                </button>
              </div>
              {activeGroup.wind_inches && dist ? (
                <div style={{ fontSize: '0.6875rem', color: 'var(--ink2)' }}>
                  {moa(activeGroup.wind_inches, dist)} MOA {activeGroup.wind_dir}
                </div>
              ) : null}
            </div>

            {/* Elevation */}
            <div>
              <div className="label-caps" style={{ marginBottom: 4 }}>Elevation</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <input
                  type="number"
                  step="0.01"
                  value={activeGroup.elev_inches}
                  onChange={e => updateGroup(activeGroup.id, { elev_inches: e.target.value })}
                  placeholder="inches"
                  style={{
                    flex: 1, background: 'var(--surface2)', border: '1px solid var(--border2)',
                    color: 'var(--ink)', padding: '5px 8px', fontSize: '0.875rem',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <button
                  onClick={() => updateGroup(activeGroup.id, { elev_dir: activeGroup.elev_dir === 'U' ? 'D' : 'U' })}
                  style={{
                    padding: '0 8px', border: '1px solid var(--border2)',
                    background: 'var(--surface2)', color: activeGroup.elev_dir === 'U' ? 'var(--success)' : 'var(--danger)',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                    fontSize: '0.75rem', cursor: 'pointer',
                  }}
                >
                  {activeGroup.elev_dir}
                </button>
              </div>
              {activeGroup.elev_inches && dist ? (
                <div style={{ fontSize: '0.6875rem', color: 'var(--ink2)' }}>
                  {moa(activeGroup.elev_inches, dist)} MOA {activeGroup.elev_dir === 'U' ? 'High' : 'Low'}
                </div>
              ) : null}
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: 8 }}>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes…"
              style={{
                width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--ink)', padding: '5px 8px', fontSize: '0.8125rem',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Target List ─────────────────────────────────────────────────────────────

function TargetCard({ target, onEdit, onDelete }) {
  const dist = target.distance_yds;
  const groups = target.groups || [];
  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      display: 'flex', gap: 10, padding: '10px 12px',
    }}>
      {/* Thumbnail */}
      {target.image_data ? (
        <img
          src={target.image_data}
          alt="Target"
          style={{ width: 56, height: 56, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 56, height: 56, background: 'var(--surface3)',
          border: '1px solid var(--border)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink3)', fontSize: '0.625rem',
        }}>
          NO IMG
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
            {groups.length} group{groups.length !== 1 ? 's' : ''} · {dist ? `${dist}yds` : '—'}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-xs" onClick={() => onEdit(target)}>Edit</button>
            <button className="btn btn-xs btn-danger" onClick={() => onDelete(target.id)}>Del</button>
          </div>
        </div>
        {groups.map(g => (
          <div key={g.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>{g.label}</span>
            {g.size_inches && (
              <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink2)' }}>
                {g.size_inches}"
                {dist ? ` · ${moa(g.size_inches, dist)} MOA` : ''}
              </span>
            )}
            {g.wind_inches && (
              <span style={{ fontSize: '0.625rem', color: 'var(--ink3)' }}>
                {g.wind_inches}" {g.wind_dir}
              </span>
            )}
          </div>
        ))}
        {target.notes && (
          <div style={{ fontSize: '0.6875rem', color: 'var(--ink3)', marginTop: 4, fontStyle: 'italic' }}>
            {target.notes}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function TargetAnalysis({ session, targets, onRefresh }) {
  const [editing, setEditing] = useState(null); // null = list view, object = editing

  async function handleDelete(id) {
    if (!confirm('Delete this target?')) return;
    await deleteTargetSession(id);
    onRefresh();
  }

  function startNew() {
    setEditing({
      session_id: session?.id || null,
      platform_id: session?.platform_id || null,
      distance_yds: session?.distance_yds || null,
      groups: [newGroup(0)],
      image_data: null,
      notes: '',
    });
  }

  if (editing !== null) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <TargetEditor
          initial={editing.id ? editing : null}
          distanceYds={session?.distance_yds}
          onSave={() => { setEditing(null); onRefresh(); }}
          onClose={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{
        padding: '8px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'flex-end',
      }}>
        <button className="btn btn-primary btn-sm" onClick={startNew}>
          + Add Target
        </button>
      </div>

      {targets.length === 0 ? (
        <div style={{ padding: '32px 14px', textAlign: 'center' }}>
          <div style={{ color: 'var(--ink3)', fontSize: '0.8125rem', marginBottom: 12 }}>
            No targets for this session. Upload a target photo and mark your groups.
          </div>
          <button className="btn btn-primary btn-sm" onClick={startNew}>
            + Add Target
          </button>
        </div>
      ) : (
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {targets.map(t => (
            <TargetCard
              key={t.id}
              target={t}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
