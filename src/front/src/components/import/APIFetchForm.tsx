'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface APIFetchFormProps {
  layerId: string;
  profileId: string;
}

export function APIFetchForm({ layerId, profileId }: APIFetchFormProps) {
  const trpc = useTRPC();

  const [url, setUrl] = useState('');
  const [itemsPath, setItemsPath] = useState('');
  const [latitudePath, setLatitudePath] = useState('');
  const [longitudePath, setLongitudePath] = useState('');
  const [timestampPath, setTimestampPath] = useState('');
  const [valuePath, setValuePath] = useState('');

  const apiFetchMutation = useMutation(
    trpc.import.apiFetch.mutationOptions()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fieldMapping: Record<string, string> = {
      items: itemsPath,
      latitude: latitudePath,
      longitude: longitudePath,
      timestamp: timestampPath,
      value: valuePath,
    };

    apiFetchMutation.mutate({
      layerId,
      url,
      fieldMapping,
      ownerId: profileId,
    });
  };

  const isDisabled =
    apiFetchMutation.isPending ||
    !url.trim() ||
    !latitudePath.trim() ||
    !longitudePath.trim() ||
    !timestampPath.trim() ||
    !valuePath.trim();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Fetch from API</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="api-url" className="block text-sm font-medium mb-1">
            API URL
          </label>
          <input
            id="api-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/data"
            className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
            required
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Field Mapping</legend>

          <div>
            <label htmlFor="items-path" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Items Path
            </label>
            <input
              id="items-path"
              type="text"
              value={itemsPath}
              onChange={(e) => setItemsPath(e.target.value)}
              placeholder="e.g. data.results"
              className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
            />
          </div>

          <div>
            <label htmlFor="latitude-path" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Latitude Path
            </label>
            <input
              id="latitude-path"
              type="text"
              value={latitudePath}
              onChange={(e) => setLatitudePath(e.target.value)}
              placeholder="e.g. coordinates.lat"
              className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
              required
            />
          </div>

          <div>
            <label htmlFor="longitude-path" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Longitude Path
            </label>
            <input
              id="longitude-path"
              type="text"
              value={longitudePath}
              onChange={(e) => setLongitudePath(e.target.value)}
              placeholder="e.g. coordinates.lng"
              className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
              required
            />
          </div>

          <div>
            <label htmlFor="timestamp-path" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Timestamp Path
            </label>
            <input
              id="timestamp-path"
              type="text"
              value={timestampPath}
              onChange={(e) => setTimestampPath(e.target.value)}
              placeholder="e.g. measured_at"
              className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
              required
            />
          </div>

          <div>
            <label htmlFor="value-path" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Value Path
            </label>
            <input
              id="value-path"
              type="text"
              value={valuePath}
              onChange={(e) => setValuePath(e.target.value)}
              placeholder="e.g. measurement"
              className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
              required
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isDisabled}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {apiFetchMutation.isPending ? 'Fetching...' : 'Fetch & Import'}
        </button>
      </form>

      {apiFetchMutation.isSuccess && (
        <div className="p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">
          Successfully imported {apiFetchMutation.data.success} data points.
        </div>
      )}

      {apiFetchMutation.isError && (
        <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
          {apiFetchMutation.error.message}
        </div>
      )}
    </div>
  );
}
