'use client';

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface CSVImportProps {
  layerId: string;
  profileId: string;
}

interface ImportResult {
  success: number;
  skipped: Array<{ row: number; reason: string }>;
  total: number;
}

type TemporalPrecision = 'year' | 'month' | 'day' | 'hour' | 'instant';

export function CSVImport({ layerId, profileId }: CSVImportProps) {
  const trpc = useTRPC();

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [latitudeColumn, setLatitudeColumn] = useState('');
  const [longitudeColumn, setLongitudeColumn] = useState('');
  const [timestampColumn, setTimestampColumn] = useState('');
  const [valueColumn, setValueColumn] = useState('');
  const [temporalPrecision, setTemporalPrecision] = useState<TemporalPrecision>('day');
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation(
    trpc.import.csv.mutationOptions({
      onSuccess: (data) => {
        setResult(data);
      },
    })
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);

      // Extract headers from the first line
      const firstLine = text.split('\n')[0];
      if (firstLine) {
        const cols = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        setHeaders(cols);
        // Reset column selections
        setLatitudeColumn('');
        setLongitudeColumn('');
        setTimestampColumn('');
        setValueColumn('');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImport = useCallback(() => {
    if (!fileContent) return;

    importMutation.mutate({
      layerId,
      content: fileContent,
      mapping: {
        latitudeColumn,
        longitudeColumn,
        timestampColumn,
        valueColumn,
        temporalPrecision,
      },
      ownerId: profileId,
    });
  }, [fileContent, layerId, latitudeColumn, longitudeColumn, timestampColumn, valueColumn, temporalPrecision, profileId, importMutation]);

  const isMappingComplete = latitudeColumn && longitudeColumn && timestampColumn && valueColumn;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">CSV Import</h2>

      {/* File Upload */}
      <div>
        <label htmlFor="csv-file" className="block text-sm font-medium mb-1">
          Select CSV File
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
        />
        {fileName && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Loaded: {fileName}
          </p>
        )}
      </div>

      {/* Column Mapping */}
      {headers.length > 0 && (
        <div className="space-y-3 border rounded p-4 border-gray-300 dark:border-gray-600">
          <h3 className="text-sm font-medium">Column Mapping</h3>

          <div>
            <label htmlFor="lat-col" className="block text-sm mb-1">
              Latitude Column
            </label>
            <select
              id="lat-col"
              value={latitudeColumn}
              onChange={(e) => setLatitudeColumn(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            >
              <option value="">-- Select --</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lng-col" className="block text-sm mb-1">
              Longitude Column
            </label>
            <select
              id="lng-col"
              value={longitudeColumn}
              onChange={(e) => setLongitudeColumn(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            >
              <option value="">-- Select --</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ts-col" className="block text-sm mb-1">
              Timestamp Column
            </label>
            <select
              id="ts-col"
              value={timestampColumn}
              onChange={(e) => setTimestampColumn(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            >
              <option value="">-- Select --</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="val-col" className="block text-sm mb-1">
              Value Column
            </label>
            <select
              id="val-col"
              value={valueColumn}
              onChange={(e) => setValueColumn(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            >
              <option value="">-- Select --</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="precision" className="block text-sm mb-1">
              Temporal Precision
            </label>
            <select
              id="precision"
              value={temporalPrecision}
              onChange={(e) => setTemporalPrecision(e.target.value as TemporalPrecision)}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            >
              <option value="year">Year</option>
              <option value="month">Month</option>
              <option value="day">Day</option>
              <option value="hour">Hour</option>
              <option value="instant">Instant</option>
            </select>
          </div>
        </div>
      )}

      {/* Import Button */}
      {headers.length > 0 && (
        <button
          type="button"
          onClick={handleImport}
          disabled={!isMappingComplete || importMutation.isPending}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importMutation.isPending ? 'Importing...' : 'Import'}
        </button>
      )}

      {/* Loading State */}
      {importMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Processing CSV file...
        </div>
      )}

      {/* Import Result Summary */}
      {result && (
        <div className="border rounded p-4 border-gray-300 dark:border-gray-600 space-y-2">
          <h3 className="text-sm font-medium">Import Summary</h3>
          <p className="text-sm text-green-600 dark:text-green-400">
            Successfully imported: {result.success} rows
          </p>
          {result.skipped.length > 0 && (
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">
                Skipped: {result.skipped.length} rows
              </p>
              <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto space-y-1">
                {result.skipped.map((s) => (
                  <li key={s.row}>
                    Row {s.row}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total rows processed: {result.total}
          </p>
        </div>
      )}

      {/* Error State */}
      {importMutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Import failed: {importMutation.error?.message ?? 'Unknown error'}
        </p>
      )}
    </div>
  );
}
