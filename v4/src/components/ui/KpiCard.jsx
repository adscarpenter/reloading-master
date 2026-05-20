export default function KpiCard({ label, value, unit, sub, accentColor }) {
  return (
    <div className="kpi-card" style={accentColor ? { '--accent': accentColor } : {}}>
      <div className="label-caps" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span className="metric-lg">{value ?? '—'}</span>
        {unit && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--ink3)', fontFamily: "'Barlow Condensed', sans-serif" }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: '0.625rem', color: 'var(--ink3)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}
