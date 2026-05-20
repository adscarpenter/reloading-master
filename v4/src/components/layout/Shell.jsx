import TopBar from './TopBar.jsx';
import NavBar from './NavBar.jsx';

export default function Shell({ children, section }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </main>
      <NavBar active={section} />
    </div>
  );
}
