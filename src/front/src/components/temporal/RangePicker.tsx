'use client';

import { useState, useEffect } from 'react';

interface RangePickerProps {
  temporalStart?: string;
  temporalEnd?: string;
  onChange: (start: string, end: string) => void;
}

/**
 * Converts an ISO datetime string to the format expected by datetime-local inputs (YYYY-MM-DDTHH:mm).
 */
function toDatetimeLocalValue(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converts a datetime-local input value back to an ISO string.
 */
function fromDatetimeLocalValue(value: string): string {
  if (!value) return '';
  return new Date(value).toISOString();
}

export function RangePicker({ temporalStart, temporalEnd, onChange }: RangePickerProps) {
  const [start, setStart] = useState(() => toDatetimeLocalValue(temporalStart));
  const [end, setEnd] = useState(() => toDatetimeLocalValue(temporalEnd));

  useEffect(() => {
    setStart(toDatetimeLocalValue(temporalStart));
  }, [temporalStart]);

  useEffect(() => {
    setEnd(toDatetimeLocalValue(temporalEnd));
  }, [temporalEnd]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStart(newStart);
    onChange(fromDatetimeLocalValue(newStart), fromDatetimeLocalValue(end));
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    setEnd(newEnd);
    onChange(fromDatetimeLocalValue(start), fromDatetimeLocalValue(newEnd));
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-bg-secondary border border-gray-300 dark:border-gray-600">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="temporal-start" className="text-xs text-gray-500 dark:text-gray-400">
            Start
          </label>
          <input
            id="temporal-start"
            type="datetime-local"
            value={start}
            onChange={handleStartChange}
            className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="temporal-end" className="text-xs text-gray-500 dark:text-gray-400">
            End
          </label>
          <input
            id="temporal-end"
            type="datetime-local"
            value={end}
            onChange={handleEndChange}
            className="border rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>
    </div>
  );
}
