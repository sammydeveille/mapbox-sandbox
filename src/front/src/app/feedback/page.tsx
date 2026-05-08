import { AppShell } from '@/components/AppShell';
import { FeedbackList } from '@/components/FeedbackList';

export default function FeedbackPage() {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  if (!mapboxToken) {
    throw new Error('MAPBOX_ACCESS_TOKEN is not configured');
  }

  return (
    <AppShell mapboxToken={mapboxToken}>
      <FeedbackList />
    </AppShell>
  );
}
