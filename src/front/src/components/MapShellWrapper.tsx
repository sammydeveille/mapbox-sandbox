'use client';

import { MapShell } from './MapShell';
import type { ReactNode } from 'react';

interface MapShellWrapperProps {
  mapboxToken: string;
  children: ReactNode;
}

export function MapShellWrapper({ mapboxToken, children }: MapShellWrapperProps) {
  return <MapShell mapboxToken={mapboxToken}>{children}</MapShell>;
}
