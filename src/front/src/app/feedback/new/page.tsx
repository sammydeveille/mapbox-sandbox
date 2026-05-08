import { AppShell } from '@/components/AppShell';
import { FeedbackForm } from '@/components/FeedbackForm';

export default function NewFeedbackPage() {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  if (!mapboxToken) {
    throw new Error('MAPBOX_ACCESS_TOKEN is not configured');
  }

  return (
    <AppShell mapboxToken={mapboxToken}>
      <FeedbackForm />
    </AppShell>
  );
}
