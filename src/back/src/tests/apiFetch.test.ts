import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transformAPIResponse, fetchAndTransform } from '../import/apiFetch.js';

describe('transformAPIResponse', () => {
  const fieldMapping = {
    items: 'data',
    latitude: 'lat',
    longitude: 'lng',
    timestamp: 'ts',
    value: 'val',
  };

  it('transforms a valid API response into DataPointInput[]', () => {
    const response = {
      data: [
        { lat: 40.7128, lng: -74.006, ts: '2024-01-15T10:00:00Z', val: 42 },
        { lat: 51.5074, lng: -0.1278, ts: '2024-02-20T14:30:00Z', val: 18.5 },
      ],
    };

    const result = transformAPIResponse(response, fieldMapping);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      geometry: { type: 'Point', coordinates: [-74.006, 40.7128] },
      timestamp: '2024-01-15T10:00:00.000Z',
      temporalPrecision: 'instant',
      value: 42,
    });
    expect(result[1]).toEqual({
      geometry: { type: 'Point', coordinates: [-0.1278, 51.5074] },
      timestamp: '2024-02-20T14:30:00.000Z',
      temporalPrecision: 'instant',
      value: 18.5,
    });
  });

  it('returns empty array when response is null', () => {
    expect(transformAPIResponse(null, fieldMapping)).toEqual([]);
  });

  it('returns empty array when response is undefined', () => {
    expect(transformAPIResponse(undefined, fieldMapping)).toEqual([]);
  });

  it('returns empty array when response is not an object', () => {
    expect(transformAPIResponse('string', fieldMapping)).toEqual([]);
    expect(transformAPIResponse(123, fieldMapping)).toEqual([]);
    expect(transformAPIResponse(true, fieldMapping)).toEqual([]);
  });

  it('returns empty array when items path does not resolve to an array', () => {
    expect(transformAPIResponse({ data: 'not-array' }, fieldMapping)).toEqual([]);
    expect(transformAPIResponse({ data: null }, fieldMapping)).toEqual([]);
    expect(transformAPIResponse({ other: [] }, fieldMapping)).toEqual([]);
  });

  it('returns empty array when items path is missing from fieldMapping', () => {
    const mapping = { latitude: 'lat', longitude: 'lng', timestamp: 'ts', value: 'val' };
    expect(transformAPIResponse({ data: [{ lat: 0, lng: 0, ts: '2024-01-01T00:00:00Z', val: 1 }] }, mapping)).toEqual([]);
  });

  it('skips items with invalid latitude (out of range)', () => {
    const response = {
      data: [
        { lat: 91, lng: 0, ts: '2024-01-01T00:00:00Z', val: 1 },
        { lat: -91, lng: 0, ts: '2024-01-01T00:00:00Z', val: 2 },
        { lat: 45, lng: 0, ts: '2024-01-01T00:00:00Z', val: 3 },
      ],
    };

    const result = transformAPIResponse(response, fieldMapping);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(3);
  });

  it('skips items with invalid longitude (out of range)', () => {
    const response = {
      data: [
        { lat: 0, lng: 181, ts: '2024-01-01T00:00:00Z', val: 1 },
        { lat: 0, lng: -181, ts: '2024-01-01T00:00:00Z', val: 2 },
        { lat: 0, lng: 90, ts: '2024-01-01T00:00:00Z', val: 3 },
      ],
    };

    const result = transformAPIResponse(response, fieldMapping);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(3);
  });

  it('skips items with non-finite values (NaN, Infinity)', () => {
    const response = {
      data: [
        { lat: 0, lng: 0, ts: '2024-01-01T00:00:00Z', val: NaN },
        { lat: 0, lng: 0, ts: '2024-01-01T00:00:00Z', val: Infinity },
        { lat: 0, lng: 0, ts: '2024-01-01T00:00:00Z', val: -Infinity },
        { lat: 0, lng: 0, ts: '2024-01-01T00:00:00Z', val: 5 },
      ],
    };

    const result = transformAPIResponse(response, fieldMapping);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(5);
  });

  it('skips items with invalid timestamps', () => {
    const response = {
      data: [
        { lat: 0, lng: 0, ts: 'not-a-date', val: 1 },
        { lat: 0, lng: 0, ts: null, val: 2 },
        { lat: 0, lng: 0, ts: '2024-06-15T12:00:00Z', val: 3 },
      ],
    };

    const result = transformAPIResponse(response, fieldMapping);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(3);
  });

  it('supports nested field paths', () => {
    const nestedMapping = {
      items: 'response.results',
      latitude: 'location.lat',
      longitude: 'location.lng',
      timestamp: 'meta.recorded_at',
      value: 'measurements.temperature',
    };

    const response = {
      response: {
        results: [
          {
            location: { lat: 35.6762, lng: 139.6503 },
            meta: { recorded_at: '2024-03-01T09:00:00Z' },
            measurements: { temperature: 12.3 },
          },
        ],
      },
    };

    const result = transformAPIResponse(response, nestedMapping);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      geometry: { type: 'Point', coordinates: [139.6503, 35.6762] },
      timestamp: '2024-03-01T09:00:00.000Z',
      temporalPrecision: 'instant',
      value: 12.3,
    });
  });

  it('skips non-object items in the array', () => {
    const response = {
      data: [
        null,
        undefined,
        'string',
        42,
        { lat: 10, lng: 20, ts: '2024-01-01T00:00:00Z', val: 7 },
      ],
    };

    const result = transformAPIResponse(response, fieldMapping);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(7);
  });

  it('handles numeric timestamps (epoch milliseconds)', () => {
    const response = {
      data: [
        { lat: 0, lng: 0, ts: 1704067200000, val: 1 }, // 2024-01-01T00:00:00Z
      ],
    };

    const result = transformAPIResponse(response, fieldMapping);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe('2024-01-01T00:00:00.000Z');
  });
});

describe('fetchAndTransform', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const fieldMapping = {
    items: 'data',
    latitude: 'lat',
    longitude: 'lng',
    timestamp: 'ts',
    value: 'val',
  };

  it('fetches and transforms a successful response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        data: [{ lat: 40, lng: -74, ts: '2024-01-01T00:00:00Z', val: 10 }],
      }),
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await fetchAndTransform('https://api.example.com/data', fieldMapping);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(10);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith('https://api.example.com/data');
  });

  it('returns empty array on non-ok response', async () => {
    const mockResponse = { ok: false, status: 500 };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await fetchAndTransform('https://api.example.com/data', fieldMapping);
    expect(result).toEqual([]);
  });

  it('returns empty array on network error', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'));

    const result = await fetchAndTransform('https://api.example.com/data', fieldMapping);
    expect(result).toEqual([]);
  });

  it('returns empty array on JSON parse error', async () => {
    const mockResponse = {
      ok: true,
      json: async () => { throw new SyntaxError('Unexpected token'); },
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await fetchAndTransform('https://api.example.com/data', fieldMapping);
    expect(result).toEqual([]);
  });
});
