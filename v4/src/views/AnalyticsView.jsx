import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useApp } from '../core/store.jsx';
import { getPlatforms } from '../services/platforms.js';
import { getRecipes } from '../services/recipes.js';
import { getSessions, getShots, computeStats } from '../services/sessions.js';
import EmptyState from '../components/ui/EmptyState.jsx';

function StatCell({ label, value, unit, highlight }) {
  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      padding: '10px 12px',
    }}>
      <div className="label-caps" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="metric-md" style={{ color: highlight || 'var(--ink)' }}>{value ?? '—'}</span>
        {unit && <span style={{ fontSize: '0.625rem', color: 'var(--ink3)' }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function AnalyticsView() {
  const { state } = useApp();
  const [platforms, setPlatforms] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [platformId, setPlatformId] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [chartData, setChartData] = useState(null);
  const [sessionTableData, setSessionTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPlatforms().then(setPlatforms);
    getRecipes().then(setRecipes);
    getSessions().then(setSessions);
    if (state.activePlatformId) setPlatformId(String(state.activePlatformId));
  }, [state.refreshKey, state.activePlatformId]);

  useEffect(() => {
    if (recipeId || platformId) loadChartData();
    else { setChartData(null); setSessionTableData([]); }
  }, [recipeId, platformId, sessions]);

  async function loadChartData() {
    setLoading(true);
    try {
      let filtered = sessions;
      if (recipeId) filtered = filtered.filter(s => s.recipe_id === +recipeId);
      else if (platformId) filtered = filtered.filter(s => s.platform_id === +platformId);

      if (!filtered.length) { setChartData(null); setSessionTableData([]); setLoading(false); return; }

      const sorted = [...filtered].sort((a, b) =>
        (a.range_date || '').localeCompare(b.range_date || '') || a.id - b.id
      );

      const tableRows = [];
      const scatterData = [];
      let shotOffset = 0;

      for (const sess of sorted) {
        const shots = await getShots(sess.id);
        const velocities = shots.map(s => s.velocity).filter(v => v > 0);
        const st = computeStats(velocities);
        tableRows.push({ session: sess, stats: st });

        velocities.forEach((v, i) => {
          scatterData.push([shotOffset + i, v]);
        });
        shotOffset += velocities.length;
      }

      setSessionTableData(tableRows);

      const allVelocities = tableRows.flatMap(r => []);
      const allSD = tableRows.filter(r => r.stats.count > 0).map(r => r.stats.sd);
      const allES = tableRows.filter(r => r.stats.count > 0).map(r => r.stats.es);
      const allAvg = tableRows.filter(r => r.stats.count > 0).map(r => r.stats.avg);

      setChartData({ scatterData, tableRows, allSD, allES, allAvg });
    } finally {
      setLoading(false);
    }
  }

  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }); }
    catch { return d; }
  };

  const filteredRecipes = platformId
    ? recipes.filter(r => r.platform_id === +platformId)
    : recipes;

  // Build velocity scatter chart option
  const scatterOption = chartData && chartData.scatterData.length > 0 ? {
    backgroundColor: 'transparent',
    textStyle: { color: '#9ca3af', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10 },
    grid: { left: 52, right: 16, top: 20, bottom: 36 },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#111318',
      borderColor: '#2a2f3a',
      textStyle: { color: '#e8eaed', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
      formatter: (params) => `Shot #${params.value[0] + 1}<br/><b>${params.value[1].toLocaleString()} fps</b>`,
    },
    xAxis: {
      type: 'value',
      name: 'Shot',
      nameTextStyle: { color: '#6b7280', fontSize: 9 },
      axisLine: { lineStyle: { color: '#2a2f3a' } },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 9 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 9 },
      splitLine: { lineStyle: { color: '#1a1e26' } },
      min: v => Math.floor((v.min - 30) / 10) * 10,
      max: v => Math.ceil((v.max + 30) / 10) * 10,
    },
    series: [
      {
        type: 'scatter',
        data: chartData.scatterData,
        symbolSize: 7,
        itemStyle: { color: '#3b82f6', opacity: 0.85 },
      },
    ],
  } : null;

  // Build SD/ES bar chart option
  const statsBarOption = chartData && chartData.tableRows.filter(r => r.stats.count > 0).length > 0 ? (() => {
    const rows = chartData.tableRows.filter(r => r.stats.count > 0);
    return {
      backgroundColor: 'transparent',
      textStyle: { color: '#9ca3af', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10 },
      grid: { left: 52, right: 16, top: 24, bottom: 60 },
      legend: {
        bottom: 0,
        textStyle: { color: '#9ca3af', fontSize: 9 },
        itemWidth: 10, itemHeight: 6,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#111318',
        borderColor: '#2a2f3a',
        textStyle: { color: '#e8eaed', fontSize: 11 },
      },
      xAxis: {
        type: 'category',
        data: rows.map(r => fmtDate(r.session.range_date)),
        axisLine: { lineStyle: { color: '#2a2f3a' } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 8, rotate: 30 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 9 },
        splitLine: { lineStyle: { color: '#1a1e26' } },
        min: 0,
      },
      series: [
        {
          name: 'SD',
          type: 'bar',
          data: rows.map(r => r.stats.sd),
          itemStyle: { color: '#3b82f6' },
          barMaxWidth: 24,
        },
        {
          name: 'ES',
          type: 'bar',
          data: rows.map(r => r.stats.es),
          itemStyle: { color: '#f59e0b' },
          barMaxWidth: 24,
        },
      ],
    };
  })() : null;

  const hasData = chartData && sessionTableData.some(r => r.stats.count > 0);

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
          ANALYTICS <span style={{ color: 'var(--accent)' }}>//</span> PERFORMANCE DATA
        </span>
      </div>

      {/* Selectors */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label className="form-label">Platform</label>
            <select
              className="form-control"
              style={{ minHeight: 34, padding: '4px 8px', fontSize: '0.8125rem' }}
              value={platformId}
              onChange={e => { setPlatformId(e.target.value); setRecipeId(''); }}
            >
              <option value="">All Platforms</option>
              {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Recipe</label>
            <select
              className="form-control"
              style={{ minHeight: 34, padding: '4px 8px', fontSize: '0.8125rem' }}
              value={recipeId}
              onChange={e => setRecipeId(e.target.value)}
            >
              <option value="">All Recipes</option>
              {filteredRecipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink3)', fontSize: '0.875rem' }}>
          Loading…
        </div>
      )}

      {!loading && !platformId && !recipeId && (
        <EmptyState
          title="Select a Platform or Recipe"
          subtitle="Choose filters above to load velocity analytics."
        />
      )}

      {!loading && (platformId || recipeId) && !hasData && (
        <EmptyState
          title="No Velocity Data"
          subtitle="Log range sessions with shots to see analytics."
        />
      )}

      {!loading && hasData && (
        <>
          {/* Aggregate stats */}
          {(() => {
            const allRows = sessionTableData.filter(r => r.stats.count > 0);
            const allVels = allRows.map(r => r.stats.avg);
            const overallAvg = allVels.length ? Math.round(allVels.reduce((a, b) => a + b) / allVels.length) : 0;
            const avgSD = allRows.length ? +(allRows.reduce((a, r) => a + r.stats.sd, 0) / allRows.length).toFixed(1) : 0;
            const avgES = allRows.length ? Math.round(allRows.reduce((a, r) => a + r.stats.es, 0) / allRows.length) : 0;
            const totalShots = allRows.reduce((a, r) => a + r.stats.count, 0);
            return (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 1, background: 'var(--border)', borderBottom: '1px solid var(--border)',
              }}>
                <StatCell label="Sessions" value={allRows.length} />
                <StatCell label="Avg MV" value={overallAvg.toLocaleString()} unit="fps" highlight="var(--info)" />
                <StatCell label="Avg ES" value={avgES} unit="fps" />
                <StatCell label="Avg SD" value={avgSD} unit="fps" />
              </div>
            );
          })()}

          {/* Scatter chart */}
          {scatterOption && (
            <div style={{ padding: '14px 14px 0' }}>
              <div className="label-caps" style={{ marginBottom: 8 }}>Velocity — All Shots</div>
              <div style={{ border: '1px solid var(--border)', background: 'var(--surface2)' }}>
                <ReactECharts option={scatterOption} style={{ height: 220 }} />
              </div>
            </div>
          )}

          {/* SD/ES bar chart */}
          {statsBarOption && sessionTableData.filter(r => r.stats.count > 0).length > 1 && (
            <div style={{ padding: '14px 14px 0' }}>
              <div className="label-caps" style={{ marginBottom: 8 }}>SD / ES by Session</div>
              <div style={{ border: '1px solid var(--border)', background: 'var(--surface2)' }}>
                <ReactECharts option={statsBarOption} style={{ height: 200 }} />
              </div>
            </div>
          )}

          {/* Session table */}
          <div style={{ padding: 14 }}>
            <div className="label-caps" style={{ marginBottom: 8 }}>Session Breakdown</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr>
                    {['Date', 'Recipe', 'Dist', 'Shots', 'Avg', 'ES', 'SD', 'Min', 'Max'].map(h => (
                      <th key={h} style={{
                        padding: '6px 8px', textAlign: 'left',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'var(--ink3)', borderBottom: '1px solid var(--border)',
                        background: 'var(--surface)',
                        position: 'sticky', top: 0,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionTableData.filter(r => r.stats.count > 0).map(({ session: s, stats }) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px', color: 'var(--ink3)', whiteSpace: 'nowrap' }}>{fmtDate(s.range_date)}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--ink)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {recipes.find(r => r.id === s.recipe_id)?.name || '—'}
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--ink3)' }}>{s.distance_yds || '—'}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--ink2)', fontFamily: 'JetBrains Mono, monospace' }}>{stats.count}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--info)', fontFamily: 'JetBrains Mono, monospace' }}>{stats.avg?.toLocaleString()}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--ink2)', fontFamily: 'JetBrains Mono, monospace' }}>{stats.es}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--ink2)', fontFamily: 'JetBrains Mono, monospace' }}>{stats.sd}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--ink3)', fontFamily: 'JetBrains Mono, monospace' }}>{stats.min?.toLocaleString()}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--ink3)', fontFamily: 'JetBrains Mono, monospace' }}>{stats.max?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
