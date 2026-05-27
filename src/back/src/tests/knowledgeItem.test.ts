import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock the database module
vi.mock('../db/index.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockWhere = vi.fn();
  const mockLeftJoin = vi.fn(() => ({ where: mockWhere }));
  const mockSelectFrom = vi.fn(() => ({ where: mockWhere, leftJoin: mockLeftJoin }));
  const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  const mockExecute = vi.fn();

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      delete: mockDelete,
      execute: mockExecute,
      _mocks: {
        mockInsert,
        mockValues,
        mockReturning,
        mockSelect,
        mockSelectFrom,
        mockLeftJoin,
        mockWhere,
        mockDelete,
        mockDeleteWhere,
        mockExecute,
      },
    },
  };
});

// Mock the log utility
vi.mock('../utils/log', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { knowledgeItemRouter } from '../routers/knowledgeItem.js';
import { db } from '../db/index.js';

const mocks = (db as any)._mocks;

describe('Knowledge Item Router', () => {
  const caller = knowledgeItemRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain for insert
    mocks.mockInsert.mockReturnValue({ values: mocks.mockValues });
    mocks.mockValues.mockReturnValue({ returning: mocks.mockReturning });
    // Reset mock chain for select
    mocks.mockSelect.mockReturnValue({ from: mocks.mockSelectFrom });
    mocks.mockSelectFrom.mockReturnValue({ where: mocks.mockWhere, leftJoin: mocks.mockLeftJoin });
    mocks.mockLeftJoin.mockReturnValue({ where: mocks.mockWhere });
    // Reset mock chain for delete
    mocks.mockDelete.mockReturnValue({ where: mocks.mockDeleteWhere });
  });

  // ─── Create Item ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('successfully creates a knowledge item with title, summary, and itemType', async () => {
      const newItem = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        title: 'The Industrial Revolution',
        summary: 'A period of major industrialization in the late 18th and early 19th centuries.',
        itemType: 'event',
        content: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([newItem]);

      const result = await caller.create({
        title: 'The Industrial Revolution',
        summary: 'A period of major industrialization in the late 18th and early 19th centuries.',
        itemType: 'event',
      });

      expect(result).toEqual(newItem);
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith({
        title: 'The Industrial Revolution',
        summary: 'A period of major industrialization in the late 18th and early 19th centuries.',
        itemType: 'event',
        content: undefined,
      });
    });

    it('validates that title is non-empty (whitespace only rejected)', async () => {
      await expect(
        caller.create({
          title: '   ',
          summary: 'Some summary',
          itemType: 'article',
        })
      ).rejects.toThrow();
    });

    it('validates that itemType must be one of the allowed values', async () => {
      await expect(
        caller.create({
          title: 'Test Item',
          summary: 'Some summary',
          itemType: 'invalid' as any,
        })
      ).rejects.toThrow();
    });

    it('validates that title does not exceed 255 characters', async () => {
      await expect(
        caller.create({
          title: 'A'.repeat(256),
          summary: 'Some summary',
          itemType: 'article',
        })
      ).rejects.toThrow();
    });
  });

  // ─── Add/Remove Evidence ────────────────────────────────────────────────────

  describe('addEvidence', () => {
    it('successfully links a source document to a knowledge item', async () => {
      const knowledgeItemId = '550e8400-e29b-41d4-a716-446655440010';
      const sourceDocumentId = '550e8400-e29b-41d4-a716-446655440020';

      const createdEvidence = {
        id: '550e8400-e29b-41d4-a716-446655440030',
        knowledgeItemId,
        sourceDocumentId,
        relevance: 'primary',
        excerpt: 'Key finding from the document',
        createdAt: new Date(),
      };

      // First call: check knowledge item exists
      // Second call: check source document exists
      let callCount = 0;
      mocks.mockWhere.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return [{ id: knowledgeItemId }]; // knowledge item exists
        }
        if (callCount === 2) {
          return [{ id: sourceDocumentId }]; // source document exists
        }
        return [];
      });

      mocks.mockReturning.mockResolvedValue([createdEvidence]);

      const result = await caller.addEvidence({
        knowledgeItemId,
        sourceDocumentId,
        relevance: 'primary',
        excerpt: 'Key finding from the document',
      });

      expect(result).toEqual(createdEvidence);
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('throws NOT_FOUND when knowledge item does not exist', async () => {
      mocks.mockWhere.mockResolvedValue([]);

      await expect(
        caller.addEvidence({
          knowledgeItemId: '550e8400-e29b-41d4-a716-446655440099',
          sourceDocumentId: '550e8400-e29b-41d4-a716-446655440020',
          relevance: 'primary',
        })
      ).rejects.toThrow(TRPCError);

      try {
        await caller.addEvidence({
          knowledgeItemId: '550e8400-e29b-41d4-a716-446655440099',
          sourceDocumentId: '550e8400-e29b-41d4-a716-446655440020',
          relevance: 'primary',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('NOT_FOUND');
      }
    });

    it('throws NOT_FOUND when source document does not exist', async () => {
      let callCount = 0;
      mocks.mockWhere.mockImplementation(() => {
        callCount++;
        if (callCount === 1 || callCount === 3) {
          return [{ id: '550e8400-e29b-41d4-a716-446655440010' }]; // knowledge item exists
        }
        return []; // source document not found
      });

      await expect(
        caller.addEvidence({
          knowledgeItemId: '550e8400-e29b-41d4-a716-446655440010',
          sourceDocumentId: '550e8400-e29b-41d4-a716-446655440099',
          relevance: 'supporting',
        })
      ).rejects.toThrow(TRPCError);

      try {
        await caller.addEvidence({
          knowledgeItemId: '550e8400-e29b-41d4-a716-446655440010',
          sourceDocumentId: '550e8400-e29b-41d4-a716-446655440099',
          relevance: 'supporting',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('NOT_FOUND');
        expect((error as TRPCError).message).toContain('Source document');
      }
    });
  });

  describe('removeEvidence', () => {
    it('successfully removes an evidence link', async () => {
      mocks.mockDeleteWhere.mockResolvedValue(undefined);

      const result = await caller.removeEvidence({
        id: '550e8400-e29b-41d4-a716-446655440030',
      });

      expect(result).toEqual({ success: true });
      expect(mocks.mockDelete).toHaveBeenCalled();
    });

    it('validates that id must be a valid UUID', async () => {
      await expect(
        caller.removeEvidence({ id: 'not-a-uuid' })
      ).rejects.toThrow();
    });
  });

  // ─── Add/Remove Time ────────────────────────────────────────────────────────

  describe('addTime', () => {
    it('successfully adds a temporal binding with start and end time', async () => {
      const knowledgeItemId = '550e8400-e29b-41d4-a716-446655440010';
      const createdTime = {
        id: '550e8400-e29b-41d4-a716-446655440040',
        knowledgeItemId,
        startTime: new Date('2020-01-01T00:00:00Z'),
        endTime: new Date('2020-12-31T23:59:59Z'),
        precision: 'year',
        createdAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([createdTime]);

      const result = await caller.addTime({
        knowledgeItemId,
        startTime: '2020-01-01T00:00:00Z',
        endTime: '2020-12-31T23:59:59Z',
        precision: 'year',
      });

      expect(result).toEqual(createdTime);
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('successfully adds a temporal binding with only start time (no end)', async () => {
      const knowledgeItemId = '550e8400-e29b-41d4-a716-446655440010';
      const createdTime = {
        id: '550e8400-e29b-41d4-a716-446655440041',
        knowledgeItemId,
        startTime: new Date('2020-06-15T10:30:00Z'),
        endTime: null,
        precision: 'day',
        createdAt: new Date(),
      };

      mocks.mockReturning.mockResolvedValue([createdTime]);

      const result = await caller.addTime({
        knowledgeItemId,
        startTime: '2020-06-15T10:30:00Z',
        precision: 'day',
      });

      expect(result).toEqual(createdTime);
    });

    it('rejects when start time is after end time', async () => {
      await expect(
        caller.addTime({
          knowledgeItemId: '550e8400-e29b-41d4-a716-446655440010',
          startTime: '2020-12-31T23:59:59Z',
          endTime: '2020-01-01T00:00:00Z',
          precision: 'year',
        })
      ).rejects.toThrow();
    });

    it('validates that precision must be one of the allowed values', async () => {
      await expect(
        caller.addTime({
          knowledgeItemId: '550e8400-e29b-41d4-a716-446655440010',
          startTime: '2020-01-01T00:00:00Z',
          precision: 'invalid' as any,
        })
      ).rejects.toThrow();
    });
  });

  describe('removeTime', () => {
    it('successfully removes a temporal binding', async () => {
      mocks.mockDeleteWhere.mockResolvedValue(undefined);

      const result = await caller.removeTime({
        id: '550e8400-e29b-41d4-a716-446655440040',
      });

      expect(result).toEqual({ success: true });
      expect(mocks.mockDelete).toHaveBeenCalled();
    });
  });

  // ─── Add/Remove Place ──────────────────────────────────────────────────────

  describe('addPlace', () => {
    it('successfully adds a spatial binding with Point geometry', async () => {
      const knowledgeItemId = '550e8400-e29b-41d4-a716-446655440010';
      const createdPlace = {
        id: '550e8400-e29b-41d4-a716-446655440050',
        knowledge_item_id: knowledgeItemId,
        geometry: { type: 'Point', coordinates: [-73.9857, 40.7484] },
        place_name: 'Empire State Building',
        precision: 'exact',
        created_at: new Date(),
      };

      mocks.mockExecute.mockResolvedValue({ rows: [createdPlace] });

      const result = await caller.addPlace({
        knowledgeItemId,
        geometry: { type: 'Point', coordinates: [-73.9857, 40.7484] },
        placeName: 'Empire State Building',
        precision: 'exact',
      });

      expect(result).toEqual(createdPlace);
      expect(mocks.mockExecute).toHaveBeenCalled();
    });

    it('successfully adds a spatial binding with Polygon geometry', async () => {
      const knowledgeItemId = '550e8400-e29b-41d4-a716-446655440010';
      const polygon = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      const createdPlace = {
        id: '550e8400-e29b-41d4-a716-446655440051',
        knowledge_item_id: knowledgeItemId,
        geometry: polygon,
        place_name: null,
        precision: 'region',
        created_at: new Date(),
      };

      mocks.mockExecute.mockResolvedValue({ rows: [createdPlace] });

      const result = await caller.addPlace({
        knowledgeItemId,
        geometry: polygon,
        precision: 'region',
      });

      expect(result).toEqual(createdPlace);
    });

    it('validates that longitude is between -180 and 180', async () => {
      await expect(
        caller.addPlace({
          knowledgeItemId: '550e8400-e29b-41d4-a716-446655440010',
          geometry: { type: 'Point', coordinates: [200, 40] },
          precision: 'exact',
        })
      ).rejects.toThrow();
    });

    it('validates that latitude is between -90 and 90', async () => {
      await expect(
        caller.addPlace({
          knowledgeItemId: '550e8400-e29b-41d4-a716-446655440010',
          geometry: { type: 'Point', coordinates: [-73, 100] },
          precision: 'exact',
        })
      ).rejects.toThrow();
    });
  });

  describe('removePlace', () => {
    it('successfully removes a spatial binding', async () => {
      mocks.mockDeleteWhere.mockResolvedValue(undefined);

      const result = await caller.removePlace({
        id: '550e8400-e29b-41d4-a716-446655440050',
      });

      expect(result).toEqual({ success: true });
      expect(mocks.mockDelete).toHaveBeenCalled();
    });
  });

  // ─── Get Item with All Bindings ─────────────────────────────────────────────

  describe('get', () => {
    it('returns a knowledge item with its evidence, times, and places', async () => {
      const itemId = '550e8400-e29b-41d4-a716-446655440010';
      const knowledgeItemData = {
        id: itemId,
        title: 'The Industrial Revolution',
        summary: 'A period of major industrialization.',
        itemType: 'event',
        content: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const evidenceData = [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          knowledgeItemId: itemId,
          sourceDocumentId: '550e8400-e29b-41d4-a716-446655440020',
          relevance: 'primary',
          excerpt: 'Key finding',
          createdAt: new Date(),
          sourceDocument: {
            id: '550e8400-e29b-41d4-a716-446655440020',
            sourceId: '550e8400-e29b-41d4-a716-446655440001',
            externalId: 'wiki-123',
            contentHash: 'abc123',
            retrievedAt: new Date(),
          },
        },
      ];

      const timesData = [
        {
          id: '550e8400-e29b-41d4-a716-446655440040',
          knowledgeItemId: itemId,
          startTime: new Date('1760-01-01'),
          endTime: new Date('1840-12-31'),
          precision: 'year',
          createdAt: new Date(),
        },
      ];

      const placesData = {
        rows: [
          {
            id: '550e8400-e29b-41d4-a716-446655440050',
            knowledge_item_id: itemId,
            geometry: { type: 'Point', coordinates: [-1.5, 53.0] },
            place_name: 'Manchester, England',
            precision: 'approximate',
            created_at: new Date(),
          },
        ],
      };

      // Mock the select chain for the knowledge item (first call)
      // Mock the select chain for evidence (second call with leftJoin)
      // Mock the select chain for times (third call)
      let selectCallCount = 0;
      mocks.mockWhere.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return [knowledgeItemData]; // knowledge item
        }
        if (selectCallCount === 2) {
          return evidenceData; // evidence with leftJoin
        }
        if (selectCallCount === 3) {
          return timesData; // times
        }
        return [];
      });

      // Mock execute for places (uses raw SQL)
      mocks.mockExecute.mockResolvedValue(placesData);

      const result = await caller.get({ id: itemId });

      expect(result.id).toBe(itemId);
      expect(result.title).toBe('The Industrial Revolution');
      expect(result.evidence).toEqual(evidenceData);
      expect(result.times).toEqual(timesData);
      expect(result.places).toEqual(placesData.rows);
    });

    it('throws NOT_FOUND when knowledge item does not exist', async () => {
      mocks.mockWhere.mockResolvedValue([]);

      await expect(
        caller.get({ id: '550e8400-e29b-41d4-a716-446655440099' })
      ).rejects.toThrow(TRPCError);

      try {
        await caller.get({ id: '550e8400-e29b-41d4-a716-446655440099' });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('NOT_FOUND');
      }
    });

    it('validates that id must be a valid UUID', async () => {
      await expect(
        caller.get({ id: 'not-a-uuid' })
      ).rejects.toThrow();
    });
  });
});
