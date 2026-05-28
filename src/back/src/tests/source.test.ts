import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock the database module
vi.mock('../db/index.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockOrderBy = vi.fn();
  const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockWhere = vi.fn();
  const mockSelectFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
  const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

  const mockDeleteWhere = vi.fn();
  const mockDeleteFrom = vi.fn(() => ({ where: mockDeleteWhere }));
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      delete: mockDelete,
      _mocks: {
        mockInsert,
        mockValues,
        mockReturning,
        mockSelect,
        mockSelectFrom,
        mockFrom,
        mockOrderBy,
        mockWhere,
        mockDelete,
        mockDeleteWhere,
      },
    },
  };
});

// Mock the log utility
vi.mock('../utils/log', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { sourceRouter } from '../routers/source.js';
import { db } from '../db/index.js';

const mocks = (db as any)._mocks;

describe('Source Router', () => {
  const caller = sourceRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain for insert
    mocks.mockInsert.mockReturnValue({ values: mocks.mockValues });
    mocks.mockValues.mockReturnValue({ returning: mocks.mockReturning });
    // Reset mock chain for select
    mocks.mockSelect.mockReturnValue({ from: mocks.mockSelectFrom });
    mocks.mockSelectFrom.mockReturnValue({ where: mocks.mockWhere, orderBy: mocks.mockOrderBy });
    // Reset mock chain for delete
    mocks.mockDelete.mockReturnValue({ where: mocks.mockDeleteWhere });
  });

  describe('create', () => {
    it('successfully creates a source with valid name, baseUrl, and sourceType', async () => {
      const newSource = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Wikipedia',
        baseUrl: 'https://en.wikipedia.org',
        sourceType: 'website',
        createdAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([newSource]);

      const result = await caller.create({
        name: 'Wikipedia',
        baseUrl: 'https://en.wikipedia.org',
        sourceType: 'website',
      });

      expect(result).toEqual(newSource);
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith({
        name: 'Wikipedia',
        baseUrl: 'https://en.wikipedia.org',
        sourceType: 'website',
      });
    });

    it('validates that sourceType must be one of the allowed values', async () => {
      await expect(
        caller.create({
          name: 'Test',
          baseUrl: 'https://example.com',
          sourceType: 'invalid' as any,
        })
      ).rejects.toThrow();
    });

    it('validates that name is non-empty', async () => {
      await expect(
        caller.create({
          name: '',
          baseUrl: 'https://example.com',
          sourceType: 'api',
        })
      ).rejects.toThrow();
    });

    it('validates that baseUrl is a valid URL', async () => {
      await expect(
        caller.create({
          name: 'Test',
          baseUrl: 'not-a-url',
          sourceType: 'api',
        })
      ).rejects.toThrow();
    });
  });

  describe('reject duplicate name', () => {
    it('returns a CONFLICT error when creating a source with a name that already exists', async () => {
      mocks.mockReturning.mockRejectedValue(
        new Error('duplicate key value violates unique constraint')
      );

      await expect(
        caller.create({
          name: 'Wikipedia',
          baseUrl: 'https://en.wikipedia.org',
          sourceType: 'website',
        })
      ).rejects.toThrow(TRPCError);

      try {
        await caller.create({
          name: 'Wikipedia',
          baseUrl: 'https://en.wikipedia.org',
          sourceType: 'website',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('CONFLICT');
        expect((error as TRPCError).message).toContain('already exists');
      }
    });
  });

  describe('list', () => {
    it('returns all registered sources', async () => {
      const sources = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Wikipedia',
          baseUrl: 'https://en.wikipedia.org',
          sourceType: 'website',
          createdAt: new Date('2024-01-02'),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'World Bank API',
          baseUrl: 'https://api.worldbank.org',
          sourceType: 'api',
          createdAt: new Date('2024-01-01'),
        },
      ];

      mocks.mockOrderBy.mockResolvedValue(sources);

      const result = await caller.list();

      expect(result).toEqual(sources);
      expect(result).toHaveLength(2);
      expect(mocks.mockSelect).toHaveBeenCalled();
    });

    it('returns an empty array when no sources exist', async () => {
      mocks.mockOrderBy.mockResolvedValue([]);

      const result = await caller.list();

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('deletes a source and cascades to its documents (via FK constraint)', async () => {
      const existingSource = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Wikipedia',
        baseUrl: 'https://en.wikipedia.org',
        sourceType: 'website',
        createdAt: new Date(),
      };

      // First call: select to check existence
      mocks.mockWhere.mockResolvedValue([existingSource]);
      // Second call: delete
      mocks.mockDeleteWhere.mockResolvedValue(undefined);

      const result = await caller.delete({ id: existingSource.id });

      expect(result).toEqual({ success: true });
      expect(mocks.mockSelect).toHaveBeenCalled();
      expect(mocks.mockDelete).toHaveBeenCalled();
    });

    it('throws NOT_FOUND when deleting a non-existent source', async () => {
      mocks.mockWhere.mockResolvedValue([]);

      await expect(
        caller.delete({ id: '550e8400-e29b-41d4-a716-446655440099' })
      ).rejects.toThrow(TRPCError);

      try {
        await caller.delete({ id: '550e8400-e29b-41d4-a716-446655440099' });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('NOT_FOUND');
      }
    });

    it('validates that id must be a valid UUID', async () => {
      await expect(
        caller.delete({ id: 'not-a-uuid' })
      ).rejects.toThrow();
    });
  });
});
