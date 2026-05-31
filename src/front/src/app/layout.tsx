import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { MapShellWrapper } from '@/components/MapShellWrapper';

export const metadata: Metadata = {
  title: 'Atlapse',
  description: 'A spatiotemporal knowledge canvas — explore space and time through an interactive globe',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN ?? '';

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {mapboxToken ? (
            <MapShellWrapper mapboxToken={mapboxToken}>
              {children}
            </MapShellWrapper>
          ) : (
            <div className="flex items-center justify-center h-screen text-red-500">
              MAPBOX_ACCESS_TOKEN is not configured
            </div>
          )}
        </Providers>
      </body>
    </html>
  );
}
