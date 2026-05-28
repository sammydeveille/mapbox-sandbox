'use client';

import { useEffect, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import { useMapShell } from '@/components/MapShell';
import { truncateDescription } from '@/utils/truncation';

export interface MapPopupData {
  title: string;
  summary: string;
  coordinates: [number, number]; // [lng, lat]
}

interface MapPopupProps {
  data: MapPopupData | null;
  onClose: () => void;
}

/**
 * MapPopup renders a Mapbox GL popup anchored to a clicked spatial overlay.
 * It displays the knowledge item's title and summary (truncated to 300 chars).
 * Only one popup is shown at a time — the previous popup is closed before a new one opens.
 */
export function MapPopup({ data, onClose }: MapPopupProps) {
  const { map } = useMapShell();
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    // Close existing popup before showing a new one
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    if (!map || !data) return;

    import('mapbox-gl').then((mapboxgl) => {
      // Double-check in case component unmounted or data changed during async import
      if (!map || !data) return;

      // Close any lingering popup reference
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }

      const truncatedSummary = truncateDescription(data.summary, 300);

      const popupContent = document.createElement('div');
      popupContent.className = 'map-popup-content';
      popupContent.innerHTML = `
        <h3 class="font-semibold text-sm text-gray-900 mb-1">${escapeHtml(data.title)}</h3>
        <p class="text-xs text-gray-600 leading-relaxed">${escapeHtml(truncatedSummary)}</p>
      `;

      const popup = new mapboxgl.default.Popup({
        closeOnClick: false,
        maxWidth: '300px',
        className: 'map-knowledge-popup',
      })
        .setLngLat(data.coordinates)
        .setDOMContent(popupContent)
        .addTo(map);

      popup.on('close', () => {
        popupRef.current = null;
        onClose();
      });

      popupRef.current = popup;
    });

    // Cleanup on unmount
    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, [map, data, onClose]);

  return null;
}

/**
 * Escapes HTML special characters to prevent XSS when inserting into innerHTML.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
