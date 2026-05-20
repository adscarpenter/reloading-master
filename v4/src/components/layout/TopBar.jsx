import { useApp } from '../../core/store.jsx';
import { navigate } from '../../core/router.jsx';
import { useEffect, useState } from 'react';
import { getPlatform } from '../../services/platforms.js';

export default function TopBar() {
  const { state } = useApp();
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    if (state.activePlatformId) {
      getPlatform(state.activePlatformId).then(setPlatform).catch(() => setPlatform(null));
    } else {
      setPlatform(null);
    }
  }, [state.activePlatformId, state.refreshKey]);

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 14px',
      height: '44px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <button
        onClick={() => navigate('ops')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '0.9375rem',
          letterSpacing: '0.15em',
          color: 'var(--ink)',
          textTransform: 'uppercase',
        }}>
          RELOAD<span style={{ color: 'var(--accent)' }}> // </span>MASTER
          <span style={{ color: 'var(--ink3)', fontWeight: 500, fontSize: '0.625rem', marginLeft: 4 }}>V4</span>
        </span>
      </button>

      {platform ? (
        <button
          onClick={() => navigate('platforms')}
          style={{
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.35)',
            color: 'var(--accent)',
            padding: '3px 10px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            maxWidth: '160px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
          }}
        >
          {platform.name}
        </button>
      ) : (
        <button
          onClick={() => navigate('platforms')}
          style={{
            background: 'transparent',
            border: '1px solid var(--border2)',
            color: 'var(--ink3)',
            padding: '3px 10px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '0.625rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          SELECT PLATFORM
        </button>
      )}
    </header>
  );
}
