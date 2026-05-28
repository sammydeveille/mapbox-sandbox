import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('../db/index.js', () => {
  const mockExecute = vi.fn();

  return {
    db: {
      execute: mockExecute,
      _mocks: {
        mockExecute,
      },
    },
  };
});

// Mock the redis utility
vi.mock('../utils/redis.js', () => ({
  redis: {
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock the log utility
vi.mock('../utils/log', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { searchRouter } from '../routers/search.js';
import { db } from '../db/index.js';
import { redis } from '../utils/redis.js';

const mocks = (db as any)._mocks;
const redisMock = redis as unknown as {
  get: ReturnType<typeof vi.fn>;
  setEx: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
};

describe('Search Router', () => {
  const caller = searchRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue(null); // No cache by default
    redisMock.setEx.mockResolvedValue(undefined);
  });

  // ─── Text-Only Search ─────────────────────────────────────────────────────

  describe('text-only search', () => {
    it('returns ranked results for a text query', async () => {
      const dataRows = [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          title: 'The Industrial Revolution',
          summary: 'A period of major industrialization.',
          item_type: 'event',
          content: null,
          score: 0.85,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440011',
          title: 'Industrial Pollution',
          summary: 'Environmental effects of industry.',
          item_type: 'article',
          content: null,
          score: 0.65,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      // First call: data query, second call: count query
      mocks.mockExecute
        .mockResolvedValueOnce({ rows: dataRows })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] });

      // Mock times and places for each item (2 items × 2 queries each)
      mocks.mockExecute
        .mockResolvedValueOnce({ rows: [] }) // item 1 times
        .mockResolvedValueOnce({ rows: [] }) // item 1 places
        .mockResolvedValueOnce({ rows: [] }) // item 2 times
        .mockResolvedValueOnce({ rows: [] }); // item 2 places

      const result = await caller.query({ text: 'industrial revolution' });

      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(0);
      expect(result.pageSize).toBe(20);
      expect(result.results[0].title).toBe('The Industrial Revolution');
      expect(result.results[0].score).toBe(0.85);
      expect(result.results[0].itemType).toBe('event');
      expect(mocks.mockExecute).toHaveBeenCalled();
    });
  });

  // ─── Spatial Filter ───────────────────────────────────────────────────────

  describe('spatial filter', () => {
    it('filters results by bounding box [west, south, east, north]', async () => {
      const dataRows = [
        {
          id: '550e8400-e29b-41d4-a716-446655440012',
          title: 'Paris Event',
          summary: 'An event in Paris.',
          item_type: 'event',
          content: null,
          score: 1.0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mocks.mockExecute
        .mockResolvedValueOnce({ rows: dataRows })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      // Times and places for the single item
      mocks.mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'place-1',
              geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
              place_name: 'Paris',
              precision: 'city',
            },
          ],
        });

      const result = await caller.query({
        bbox: [2.0, 48.5, 2.8, 49.0], // bounding box around Paris
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('Paris Event');
      expect(result.total).toBe(1);
      expect(mocks.mockExecute).toHaveBeenCalled();
    });
  });

  // ─── Temporal Filter ──────────────────────────────────────────────────────

  describe('temporal filter', () => {
    it('filters results by time range (timeStart and timeEnd)', async () => {
      const dataRows = [
        {
          id: '550e8400-e29b-41d4-a716-446655440013',
          title: 'World War II',
          summary: 'The second world war.',
          item_type: 'event',
          content: null,
          score: 1.0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mocks.mockExecute
        .mockResolvedValueOnce({ rows: dataRows })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      // Times and places for the single item
      mocks.mockExecute
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'time-1',
              start_time: '1939-09-01T00:00:00Z',
              end_time: '1945-09-02T00:00:00Z',
              precision: 'day',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await caller.query({
        timeStart: '1939-01-01T00:00:00Z',
        timeEnd: '1945-12-31T00:00:00Z',
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('World War II');
      expect(result.total).toBe(1);
    });

    it('filters with only timeStart provided', async () => {
      mocks.mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const result = await caller.query({
        timeStart: '2020-01-01T00:00:00Z',
      });

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('filters with only timeEnd provided', async () => {
      mocks.mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const result = await caller.query({
        timeEnd: '2020-12-31T00:00:00Z',
      });

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ─── Combined Filters (AND logic) ────────────────────────────────────────

  describe('combined filters', () => {
    it('applies text + spatial + temporal filters together with AND logic', async () => {
      const dataRows = [
        {
          id: '550e8400-e29b-41d4-a716-446655440014',
          title: 'London Blitz',
          summary: 'The bombing of London during WWII.',
          item_type: 'event',
          content: null,
          score: 0.9,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mocks.mockExecute
        .mockResolvedValueOnce({ rows: dataRows })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      // Times and places for the single item
      mocks.mockExecute
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'time-2',
              start_time: '1940-09-07T00:00:00Z',
              end_time: '1941-05-11T00:00:00Z',
              precision: 'day',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'place-2',
              geometry: { type: 'Point', coordinates: [-0.1276, 51.5074] },
              place_name: 'London',
              precision: 'city',
            },
          ],
        });

      const result = await caller.query({
        text: 'blitz bombing',
        bbox: [-0.5, 51.0, 0.5, 52.0], // bounding box around London
        timeStart: '1940-01-01T00:00:00Z',
        timeEnd: '1941-12-31T00:00:00Z',
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('London Blitz');
      expect(result.results[0].score).toBe(0.9);
      expect(result.results[0].times).toHaveLength(1);
      expect(result.results[0].places).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ─── Pagination ───────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('uses default page=0 and pageSize=20 when not specified', async () => {
      mocks.mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const result = await caller.query({ text: 'test' });

      expect(result.page).toBe(0);
      expect(result.pageSize).toBe(20);
    });

    it('respects custom page and pageSize parameters', async () => {
      const dataRows = [
        {
          id: '550e8400-e29b-41d4-a716-446655440015',
          title: 'Page 2 Item',
          summary: 'An item on page 2.',
          item_type: 'article',
          content: null,
          score: 0.5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mocks.mockExecute
        .mockResolvedValueOnce({ rows: dataRows })
        .mockResolvedValueOnce({ rows: [{ total: '15' }] });

      // Times and places for the single item
      mocks.mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await caller.query({
        text: 'test',
        page: 1,
        pageSize: 10,
      });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(15);
      expect(result.results).toHaveLength(1);
    });

    it('validates pageSize must be between 1 and 100', async () => {
      await expect(
        caller.query({ text: 'test', pageSize: 0 })
      ).rejects.toThrow();

      await expect(
        caller.query({ text: 'test', pageSize: 101 })
      ).rejects.toThrow();
    });

    it('validates page must be a non-negative integer', async () => {
      await expect(
        caller.query({ text: 'test', page: -1 })
      ).rejects.toThrow();
    });
  });

  // ─── Empty Results ────────────────────────────────────────────────────────

  describe('empty results', () => {
    it('returns empty list with total count of zero when no items match', async () => {
      mocks.mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const result = await caller.query({ text: 'nonexistent query xyz' });

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(0);
      expect(result.pageSize).toBe(20);
    });

    it('rejects search with no filter criteria (empty query)', async () => {
      await expect(
        caller.query({})
      ).rejects.toThrow();
    });
  });

  // ─── Cache Behavior ───────────────────────────────────────────────────────

  describe('cache behavior', () => {
    it('returns cached results when available', async () => {
      const cachedResponse = {
        results: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            title: 'Cached Item',
            summary: 'From cache.',
            itemType: 'article',
            content: null,
            score: 0.9,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            times: [],
            places: [],
          },
        ],
        total: 1,
        page: 0,
        pageSize: 20,
      };

      redisMock.get.mockResolvedValue(JSON.stringify(cachedResponse));

      const result = await caller.query({ text: 'cached' });

      expect(result).toEqual(cachedResponse);
      expect(mocks.mockExecute).not.toHaveBeenCalled();
    });

    it('caches results after a successful query', async () => {
      mocks.mockExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await caller.query({ text: 'new query' });

      expect(redisMock.setEx).toHaveBeenCalledWith(
        expect.stringMatching(/^search:/),
        60,
        expect.any(String)
      );
    });
  });
});
