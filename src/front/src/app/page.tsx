import { AppShell } from '@/components/AppShell';
import { Home } from '@/components/Home';

export default function HomePage() {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  if (!mapboxToken) {
    throw new Error('MAPBOX_ACCESS_TOKEN is not configured');
  }

  return (
    <AppShell mapboxToken={mapboxToken}>
      <Home />
    </AppShell>
  );
}
