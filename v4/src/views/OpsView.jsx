import { useState, useEffect } from 'react';
import { useApp } from '../core/store.jsx';
import { navigate } from '../core/router.jsx';
import KpiCard from '../components/ui/KpiCard.jsx';
import { getPlatforms } from '../services/platforms.js';
import { getRecipes } from '../services/recipes.js';
import { getSessions, getShots, getSessionStats, computeStats } from '../services/sessions.js';
import { getRecipe } from '../services/recipes.js';

function SectionHeader({ children, right }) {
  return (
    <div style={{
      padding: '9px 14px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <span className="label-caps" style={{ color: 'var(--ink2)' }}>{children}</span>
      {right && <span>{right}</span>}
    </div>
  );
}

export default function OpsView() {
  const { state } = useApp();
  const [kpis, setKpis] = useState({ platforms: 0, recipes: 0, sessions: 0, rounds: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [state.refreshKey]);

  async function load() {
    setLoading(true);
    try {
      const [platforms, recipes, sessions] = await Promise.all([
        getPlatforms(),
        getRecipes(),
        getSessions(),
      ]);

      // Get all shots at once for round count
      let totalRounds = 0;
      const shotCounts = {};
      for (const s of sessions) {
        const shots = await getShots(s.id);
        const valid = shots.filter(sh => sh.velocity > 0);
        totalRounds += valid.length;
        shotCounts[s.id] = valid;
      }

      setKpis({
        platforms: platforms.length,
        recipes: recipes.length,
        sessions: sessions.length,
        rounds: totalRounds,
      });

      // Recent sessions (last 6, newest first)
      const sorted = [...sessions].sort((a, b) => {
        if (a.range_date && b.range_date) return b.range_date.localeCompare(a.range_date);
        return b.id - a.id;
      }).slice(0, 6);

      const enriched = await Promise.all(
        sorted.map(async (s) => {
          const recipe = s.recipe_id ? await getRecipe(s.recipe_id).catch(() => null) : null;
          const shots = (shotCounts[s.id] || []).map(sh => sh.velocity);
          const stats = computeStats(shots);
          return { ...s, recipe, stats };
        })
      );
      setRecent(enriched);
    } finally {
      setLoading(false);
    }
  }

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: '2-digit',
      });
    } catch { return d; }
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface2)',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.18em',
          color: 'var(--ink2)',
          textTransform: 'uppercase',
        }}>
          OPS <span style={{ color: 'var(--accent)' }}>//</span> COMMAND CENTER
        </span>
        <span className="mono" style={{ fontSize: '0.625rem', color: 'var(--ink3)' }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
        </span>
      </div>

      {/* KPI strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1,
        background: 'var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <KpiCard label="Platforms" value={kpis.platforms} />
        <KpiCard label="Recipes" value={kpis.recipes} />
        <KpiCard label="Sessions" value={kpis.sessions} />
        <KpiCard label="Rounds" value={kpis.rounds.toLocaleString()} />
      </div>

      {/* Quick actions */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div className="label-caps" style={{ marginBottom: 10 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('dev')}>
            + Session
          </button>
          <button className="btn btn-sm" onClick={() => navigate('dev')}>
            + Recipe
          </button>
          <button className="btn btn-sm" onClick={() => navigate('platforms')}>
            + Platform
          </button>
          <button className="btn btn-sm" onClick={() => navigate('components')}>
            + Component
          </button>
        </div>
      </div>

      {/* Recent sessions */}
      <SectionHeader right={
        <button
          onClick={() => navigate('dev')}
          style={{
            background: 'none', border: 'none', color: 'var(--accent)',
            fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em',
            cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: 'uppercase',
          }}
        >
          VIEW ALL →
        </button>
      }>
        Recent Sessions
      </SectionHeader>

      <div style={{ padding: '10px 14px' }}>
        {loading ? (
          <div style={{ color: 'var(--ink3)', fontSize: '0.8125rem', padding: '16px 0' }}>Loading…</div>
        ) : recent.length === 0 ? (
          <div style={{
            padding: '24px 0',
            textAlign: 'center',
            color: 'var(--ink3)',
            fontSize: '0.8125rem',
          }}>
            <div style={{ marginBottom: 8 }}>No sessions yet.</div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('platforms')}
            >
              Start by adding a platform →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {recent.map(s => (
              <div
                key={s.id}
                onClick={() => navigate('dev')}
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'border-color 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)' }}>
                    {s.recipe?.name || 'Unknown Recipe'}
                  </span>
                  <span style={{ fontSize: '0.625rem', color: 'var(--ink3)', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginLeft: 8 }}>
                    {fmtDate(s.range_date)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {s.distance_yds && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                      {s.distance_yds}yds
                    </span>
                  )}
                  {s.stats.count > 0 ? (
                    <>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--info)' }}>
                        {s.stats.avg.toLocaleString()} avg
                      </span>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                        ES {s.stats.es}
                      </span>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                        SD {s.stats.sd}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>
                        {s.stats.count} shots
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)' }}>No shots logged</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
