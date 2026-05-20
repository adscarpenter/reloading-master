import { useState, useEffect } from 'react';

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  return {
    section: parts[0] || 'ops',
    params: parts.slice(1),
  };
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return route;
}

export function navigate(section, ...params) {
  const parts = [section, ...params.filter(p => p != null)];
  window.location.hash = `/${parts.join('/')}`;
}
