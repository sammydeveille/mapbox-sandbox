'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface ManualEntryProps {
  layerId: string;
  profileId: string;
  mapClickCoords?: [number, number];
}

type TemporalPrecision = 'year' | 'month' | 'day' | 'hour' | 'instant';

interface ValidationErrors {
  longitude?: string;
  latitude?: string;
  timestamp?: string;
  value?: string;
  metadata?: string;
}

export function ManualEntry({ layerId, profileId, mapClickCoords }: ManualEntryProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [temporalPrecision, setTemporalPrecision] = useState<TemporalPrecision>('instant');
  const [value, setValue] = useState('');
  const [metadata, setMetadata] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});

  const createMutation = useMutation(
    trpc.dataPoint.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.dataPoint.query.queryKey() });
        clearForm();
      },
    })
  );

  // Auto-populate coordinates when map is clicked
  useEffect(() => {
    if (mapClickCoords) {
      setLongitude(mapClickCoords[0].toString());
      setLatitude(mapClickCoords[1].toString());
      // Clear coordinate validation errors when populated from map
      setErrors((prev) => ({ ...prev, longitude: undefined, latitude: undefined }));
    }
  }, [mapClickCoords]);

  function clearForm() {
    setLongitude('');
    setLatitude('');
    setTimestamp('');
    setTemporalPrecision('instant');
    setValue('');
    setMetadata('');
    setErrors({});
  }

  function validate(): boolean {
    const newErrors: ValidationErrors = {};

    const lng = parseFloat(longitude);
    if (longitude.trim() === '' || isNaN(lng)) {
      newErrors.longitude = 'Longitude is required and must be a number';
    } else if (lng < -180 || lng > 180) {
      newErrors.longitude = 'Longitude must be between -180 and 180';
    }

    const lat = parseFloat(latitude);
    if (latitude.trim() === '' || isNaN(lat)) {
      newErrors.latitude = 'Latitude is required and must be a number';
    } else if (lat < -90 || lat > 90) {
      newErrors.latitude = 'Latitude must be between -90 and 90';
    }

    if (!timestamp.trim()) {
      newErrors.timestamp = 'Timestamp is required';
    }

    const numValue = parseFloat(value);
    if (value.trim() === '' || isNaN(numValue)) {
      newErrors.value = 'Value is required and must be a number';
    } else if (!isFinite(numValue)) {
      newErrors.value = 'Value must be a finite number';
    }

    if (metadata.trim()) {
      try {
        JSON.parse(metadata);
      } catch {
        newErrors.metadata = 'Metadata must be valid JSON';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);

    // Convert datetime-local to ISO 8601 with timezone
    const isoTimestamp = new Date(timestamp).toISOString();

    const input: {
      layerId: string;
      geometry: { type: 'Point'; coordinates: [number, number] };
      timestamp: string;
      temporalPrecision: TemporalPrecision;
      value: number;
      metadata?: Record<string, unknown>;
    } = {
      layerId,
      geometry: {
        type: 'Point' as const,
        coordinates: [lng, lat],
      },
      timestamp: isoTimestamp,
      temporalPrecision,
      value: parseFloat(value),
    };

    if (metadata.trim()) {
      input.metadata = JSON.parse(metadata);
    }

    try {
      await createMutation.mutateAsync(input);
    } catch (error) {
      console.error('Failed to create data point:', error);
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Manual Point Entry</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="longitude" className="block text-sm font-medium mb-1">
              Longitude
            </label>
            <input
              id="longitude"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="-180 to 180"
              className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600 text-sm"
            />
            {errors.longitude && (
              <p className="text-red-500 text-xs mt-1">{errors.longitude}</p>
            )}
          </div>
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium mb-1">
              Latitude
            </label>
            <input
              id="latitude"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="-90 to 90"
              className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600 text-sm"
            />
            {errors.latitude && (
              <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>
            )}
          </div>
        </div>

        {mapClickCoords && (
          <p className="text-xs text-gray-500">
            Coordinates populated from map click
          </p>
        )}

        {/* Timestamp */}
        <div>
          <label htmlFor="timestamp" className="block text-sm font-medium mb-1">
            Timestamp
          </label>
          <input
            id="timestamp"
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600 text-sm"
          />
          {errors.timestamp && (
            <p className="text-red-500 text-xs mt-1">{errors.timestamp}</p>
          )}
        </div>

        {/* Temporal Precision */}
        <div>
          <label htmlFor="temporalPrecision" className="block text-sm font-medium mb-1">
            Temporal Precision
          </label>
          <select
            id="temporalPrecision"
            value={temporalPrecision}
            onChange={(e) => setTemporalPrecision(e.target.value as TemporalPrecision)}
            className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600 text-sm"
          >
            <option value="instant">Instant</option>
            <option value="hour">Hour</option>
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>

        {/* Value */}
        <div>
          <label htmlFor="value" className="block text-sm font-medium mb-1">
            Value
          </label>
          <input
            id="value"
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Numeric value"
            className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600 text-sm"
          />
          {errors.value && (
            <p className="text-red-500 text-xs mt-1">{errors.value}</p>
          )}
        </div>

        {/* Metadata */}
        <div>
          <label htmlFor="metadata" className="block text-sm font-medium mb-1">
            Metadata (JSON)
          </label>
          <textarea
            id="metadata"
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            placeholder='{"key": "value"}'
            rows={3}
            className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600 text-sm font-mono"
          />
          {errors.metadata && (
            <p className="text-red-500 text-xs mt-1">{errors.metadata}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {createMutation.isPending ? 'Adding...' : 'Add Point'}
        </button>

        {createMutation.isError && (
          <p className="text-red-500 text-sm">
            Failed to add point. Please try again.
          </p>
        )}

        {createMutation.isSuccess && (
          <p className="text-green-500 text-sm">
            Point added successfully!
          </p>
        )}
      </form>
    </div>
  );
}
