import { navigate } from '../../core/router.jsx';
import { NAV_ITEMS } from '../../core/constants.js';

export default function NavBar({ active }) {
  return (
    <nav style={{
      display: 'flex',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      flexShrink: 0,
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            style={{
              flex: 1,
              padding: '9px 2px 7px',
              background: 'none',
              border: 'none',
              borderTop: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              color: isActive ? 'var(--ink)' : 'var(--ink3)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '0.5625rem',
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'color 0.1s, border-color 0.1s',
              lineHeight: 1,
            }}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
