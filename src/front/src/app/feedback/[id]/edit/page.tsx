import { AppShell } from '@/components/AppShell';
import { FeedbackForm } from '@/components/FeedbackForm';

interface EditFeedbackPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFeedbackPage({ params }: EditFeedbackPageProps) {
  const { id } = await params;
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  if (!mapboxToken) {
    throw new Error('MAPBOX_ACCESS_TOKEN is not configured');
  }

  return (
    <AppShell mapboxToken={mapboxToken}>
      <FeedbackForm id={id} />
    </AppShell>
  );
}
