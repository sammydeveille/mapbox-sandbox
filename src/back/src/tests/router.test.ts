import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from '../router';

vi.mock('../utils/log', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

describe('Main Router', () => {
  const caller = appRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MAPBOX_ACCESS_TOKEN;
  });

  describe('getMapboxToken', () => {
    it('returns token when configured', async () => {
      process.env.MAPBOX_ACCESS_TOKEN = 'test-token';
      const result = await caller.getMapboxToken();
      expect(result).toEqual({ token: 'test-token' });
    });

    it('throws error when token not configured', async () => {
      await expect(caller.getMapboxToken()).rejects.toThrow('MAPBOX_ACCESS_TOKEN not configured');
    });
  });

  describe('health', () => {
    it('returns status ok with timestamp', async () => {
      const result = await caller.health();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});