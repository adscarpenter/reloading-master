export default function EmptyState({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: 8,
      textAlign: 'center',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '1px solid var(--border2)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ink3)',
        fontSize: '1.25rem',
        marginBottom: 4,
      }}>
        +
      </div>
      <div style={{ color: 'var(--ink2)', fontSize: '0.875rem', fontWeight: 600 }}>{title}</div>
      {subtitle && <div style={{ color: 'var(--ink3)', fontSize: '0.8125rem', maxWidth: 240 }}>{subtitle}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
