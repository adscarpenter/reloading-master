import { AppProvider } from './core/store.jsx';
import { useRoute } from './core/router.jsx';
import Shell from './components/layout/Shell.jsx';
import OpsView from './views/OpsView.jsx';
import PlatformsView from './views/PlatformsView.jsx';
import ComponentsView from './views/ComponentsView.jsx';
import DevelopmentView from './views/DevelopmentView.jsx';
import AnalyticsView from './views/AnalyticsView.jsx';
import DataView from './views/DataView.jsx';

function Views() {
  const route = useRoute();

  const view = {
    ops:        <OpsView />,
    platforms:  <PlatformsView />,
    components: <ComponentsView />,
    dev:        <DevelopmentView />,
    analytics:  <AnalyticsView />,
    data:       <DataView />,
  }[route.section] ?? <OpsView />;

  return (
    <Shell section={route.section}>
      {view}
    </Shell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Views />
    </AppProvider>
  );
}
