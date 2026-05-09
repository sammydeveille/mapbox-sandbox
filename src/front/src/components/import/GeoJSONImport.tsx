'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface GeoJSONImportProps {
  layerId: string;
  profileId: string;
}

type TemporalPrecision = 'year' | 'month' | 'day' | 'hour' | 'instant';

interface ImportResult {
  success: number;
  skipped: Array<{ index: number; reason: string }>;
  total: number;
}

export function GeoJSONImport({ layerId, profileId }: GeoJSONImportProps) {
  const trpc = useTRPC();

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [propertyKeys, setPropertyKeys] = useState<string[]>([]);
  const [timestampField, setTimestampField] = useState<string>('');
  const [defaultTimestamp, setDefaultTimestamp] = useState<string>('');
  const [temporalPrecision, setTemporalPrecision] = useState<TemporalPrecision>('instant');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const importMutation = useMutation(
    trpc.import.geojson.mutationOptions({
      onSuccess: (data) => {
        setResult(data as ImportResult);
      },
    })
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setParseError(null);
    setPropertyKeys([]);
    setTimestampField('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      setFileName(file.name);

      try {
        const parsed = JSON.parse(text);
        if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
          setParseError('File is not a valid GeoJSON FeatureCollection.');
          return;
        }

        // Extract property keys from the first feature
        const firstFeature = parsed.features[0];
        if (firstFeature?.properties && typeof firstFeature.properties === 'object') {
          const keys = Object.keys(firstFeature.properties);
          setPropertyKeys(keys);
        }
      } catch {
        setParseError('Failed to parse file as JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!fileContent) return;

    importMutation.mutate({
      layerId,
      content: fileContent,
      timestampField: timestampField || undefined,
      defaultTimestamp: defaultTimestamp || undefined,
      temporalPrecision,
      ownerId: profileId,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded border-gray-300 dark:border-gray-600">
      <h2 className="text-lg font-semibold">Import GeoJSON</h2>

      {/* File Upload */}
      <div>
        <label htmlFor="geojson-file" className="block text-sm font-medium mb-1">
          GeoJSON File
        </label>
        <input
          id="geojson-file"
          type="file"
          accept=".geojson,.json"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
        />
        {fileName && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Loaded: {fileName}
          </p>
        )}
      </div>

      {parseError && (
        <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
      )}

      {/* Timestamp Field Selection */}
      {propertyKeys.length > 0 && (
        <div>
          <label htmlFor="timestamp-field" className="block text-sm font-medium mb-1">
            Timestamp Property
          </label>
          <select
            id="timestamp-field"
            value={timestampField}
            onChange={(e) => setTimestampField(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
          >
            <option value="">-- None (use default) --</option>
            {propertyKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Default Timestamp */}
      <div>
        <label htmlFor="default-timestamp" className="block text-sm font-medium mb-1">
          Default Timestamp
        </label>
        <input
          id="default-timestamp"
          type="datetime-local"
          value={defaultTimestamp}
          onChange={(e) => setDefaultTimestamp(e.target.value)}
          className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Used for features without a timestamp property
        </p>
      </div>

      {/* Temporal Precision */}
      <div>
        <label htmlFor="temporal-precision" className="block text-sm font-medium mb-1">
          Temporal Precision
        </label>
        <select
          id="temporal-precision"
          value={temporalPrecision}
          onChange={(e) => setTemporalPrecision(e.target.value as TemporalPrecision)}
          className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
        >
          <option value="year">Year</option>
          <option value="month">Month</option>
          <option value="day">Day</option>
          <option value="hour">Hour</option>
          <option value="instant">Instant</option>
        </select>
      </div>

      {/* Import Button */}
      <button
        type="button"
        onClick={handleImport}
        disabled={!fileContent || importMutation.isPending || !!parseError}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {importMutation.isPending ? 'Importing...' : 'Import'}
      </button>

      {/* Error Display */}
      {importMutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Import failed: {importMutation.error.message}
        </p>
      )}

      {/* Import Result */}
      {result && (
        <div className="p-3 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-2">Import Result</h3>
          <p className="text-sm text-green-700 dark:text-green-400">
            Successfully imported: {result.success} / {result.total} features
          </p>
          {result.skipped.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Skipped: {result.skipped.length} features
              </p>
              <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto space-y-1">
                {result.skipped.map((item, idx) => (
                  <li key={idx}>
                    Feature {item.index}: {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
