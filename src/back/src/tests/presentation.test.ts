import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock the database module
vi.mock('../db/index.js', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockOrderBy = vi.fn();
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockSelectFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
  const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
  const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

  const mockExecute = vi.fn();

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      delete: mockDelete,
      update: mockUpdate,
      execute: mockExecute,
      _mocks: {
        mockInsert,
        mockValues,
        mockReturning,
        mockSelect,
        mockSelectFrom,
        mockOrderBy,
        mockWhere,
        mockDelete,
        mockDeleteWhere,
        mockUpdate,
        mockUpdateSet,
        mockUpdateWhere,
        mockUpdateReturning,
        mockExecute,
      },
    },
  };
});

// Mock the log utility
vi.mock('../utils/log', () => ({
  log: { debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { presentationRouter } from '../routers/presentation.js';
import { db } from '../db/index.js';

const mocks = (db as any)._mocks;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UUID1 = '550e8400-e29b-41d4-a716-446655440001';
const UUID2 = '550e8400-e29b-41d4-a716-446655440002';
const UUID3 = '550e8400-e29b-41d4-a716-446655440003';
const UUID4 = '550e8400-e29b-41d4-a716-446655440004';

const validViewState = {
  center: [-73.9857, 40.7484] as [number, number],
  zoom: 12,
  bearing: 0,
  pitch: 0,
};

describe('Presentation Router', () => {
  const caller = presentationRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chains
    mocks.mockInsert.mockReturnValue({ values: mocks.mockValues });
    mocks.mockValues.mockReturnValue({ returning: mocks.mockReturning });
    mocks.mockSelect.mockReturnValue({ from: mocks.mockSelectFrom });
    mocks.mockSelectFrom.mockReturnValue({ where: mocks.mockWhere, orderBy: mocks.mockOrderBy });
    mocks.mockWhere.mockReturnValue({ orderBy: mocks.mockOrderBy });
    mocks.mockDelete.mockReturnValue({ where: mocks.mockDeleteWhere });
    mocks.mockUpdate.mockReturnValue({ set: mocks.mockUpdateSet });
    mocks.mockUpdateSet.mockReturnValue({ where: mocks.mockUpdateWhere });
    mocks.mockUpdateWhere.mockReturnValue({ returning: mocks.mockUpdateReturning });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a presentation when collection exists', async () => {
      const fakeCollection = { id: UUID1, ownerId: UUID2 };
      const createdPresentation = {
        id: UUID3,
        collectionId: UUID1,
        ownerId: UUID2,
        title: 'My Presentation',
        description: 'A test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First select: collection lookup
      mocks.mockWhere.mockResolvedValueOnce([fakeCollection]);
      // Insert returning
      mocks.mockReturning.mockResolvedValueOnce([createdPresentation]);

      const result = await caller.create({
        collectionId: UUID1,
        ownerId: UUID2,
        title: 'My Presentation',
        description: 'A test',
      });

      expect(result).toEqual(createdPresentation);
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('rejects with NOT_FOUND when collection does not exist', async () => {
      mocks.mockWhere.mockResolvedValueOnce([]);

      await expect(
        caller.create({
          collectionId: UUID1,
          ownerId: UUID2,
          title: 'My Presentation',
        })
      ).rejects.toThrow(TRPCError);

      try {
        mocks.mockWhere.mockResolvedValueOnce([]);
        await caller.create({ collectionId: UUID1, ownerId: UUID2, title: 'My Presentation' });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('NOT_FOUND');
        expect((error as TRPCError).message).toContain('Collection not found');
      }
    });
  });

  // ─── addSlide / removeSlide / reorderSlides ─────────────────────────────────

  describe('addSlide', () => {
    it('adds a slide when presentation exists', async () => {
      const fakePresentation = { id: UUID1 };
      const createdSlide = {
        id: UUID2,
        presentationId: UUID1,
        position: 1,
        title: 'Slide 1',
        narratorNote: null,
        viewState: validViewState,
        createdAt: new Date(),
      };

      // Select: presentation lookup
      mocks.mockWhere.mockResolvedValueOnce([fakePresentation]);
      // Update: shift positions
      mocks.mockUpdateWhere.mockResolvedValueOnce(undefined);
      // Insert returning
      mocks.mockReturning.mockResolvedValueOnce([createdSlide]);

      const result = await caller.addSlide({
        presentationId: UUID1,
        position: 1,
        title: 'Slide 1',
        viewState: validViewState,
      });

      expect(result).toEqual(createdSlide);
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('rejects with NOT_FOUND when presentation does not exist', async () => {
      mocks.mockWhere.mockResolvedValueOnce([]);

      await expect(
        caller.addSlide({
          presentationId: UUID1,
          position: 1,
          viewState: validViewState,
        })
      ).rejects.toThrow(TRPCError);

      try {
        mocks.mockWhere.mockResolvedValueOnce([]);
        await caller.addSlide({
          presentationId: UUID1,
          position: 1,
          viewState: validViewState,
        });
      } catch (error) {
        expect((error as TRPCError).code).toBe('NOT_FOUND');
      }
    });
  });

  describe('removeSlide', () => {
    it('removes a slide and shifts positions', async () => {
      const existingSlide = {
        id: UUID2,
        presentationId: UUID1,
        position: 2,
      };

      // Select: slide lookup
      mocks.mockWhere.mockResolvedValueOnce([existingSlide]);
      // Delete
      mocks.mockDeleteWhere.mockResolvedValueOnce(undefined);
      // Update: shift positions down
      mocks.mockUpdateWhere.mockResolvedValueOnce(undefined);

      const result = await caller.removeSlide({ id: UUID2 });

      expect(result).toEqual({ success: true });
      expect(mocks.mockDelete).toHaveBeenCalled();
    });

    it('rejects with NOT_FOUND when slide does not exist', async () => {
      mocks.mockWhere.mockResolvedValueOnce([]);

      await expect(
        caller.removeSlide({ id: UUID2 })
      ).rejects.toThrow(TRPCError);

      try {
        mocks.mockWhere.mockResolvedValueOnce([]);
        await caller.removeSlide({ id: UUID2 });
      } catch (error) {
        expect((error as TRPCError).code).toBe('NOT_FOUND');
      }
    });
  });

  describe('reorderSlides', () => {
    it('updates positions for all provided slide IDs', async () => {
      mocks.mockUpdateWhere.mockResolvedValue(undefined);

      const result = await caller.reorderSlides({
        presentationId: UUID1,
        slideIds: [UUID3, UUID2, UUID4],
      });

      expect(result).toEqual({ success: true });
      // Should call update for each slide
      expect(mocks.mockUpdate).toHaveBeenCalledTimes(3);
    });
  });

  // ─── addSlideItem ───────────────────────────────────────────────────────────

  describe('addSlideItem', () => {
    it('adds a slide item when knowledge item and slide exist', async () => {
      const fakeKnowledgeItem = { id: UUID3 };
      const fakeSlide = { id: UUID2 };
      const createdItem = {
        id: UUID4,
        slideId: UUID2,
        knowledgeItemId: UUID3,
        position: 1,
        annotation: 'Note',
        createdAt: new Date(),
      };

      // First select: knowledge item lookup
      mocks.mockWhere.mockResolvedValueOnce([fakeKnowledgeItem]);
      // Second select: slide lookup
      mocks.mockWhere.mockResolvedValueOnce([fakeSlide]);
      // Insert returning
      mocks.mockReturning.mockResolvedValueOnce([createdItem]);

      const result = await caller.addSlideItem({
        slideId: UUID2,
        knowledgeItemId: UUID3,
        position: 1,
        annotation: 'Note',
      });

      expect(result).toEqual(createdItem);
    });

    it('rejects with NOT_FOUND when knowledge item does not exist', async () => {
      mocks.mockWhere.mockResolvedValueOnce([]);

      await expect(
        caller.addSlideItem({
          slideId: UUID2,
          knowledgeItemId: UUID3,
          position: 1,
        })
      ).rejects.toThrow(TRPCError);

      try {
        mocks.mockWhere.mockResolvedValueOnce([]);
        await caller.addSlideItem({
          slideId: UUID2,
          knowledgeItemId: UUID3,
          position: 1,
        });
      } catch (error) {
        expect((error as TRPCError).code).toBe('NOT_FOUND');
        expect((error as TRPCError).message).toContain('Knowledge item not found');
      }
    });

    it('rejects with NOT_FOUND when slide does not exist', async () => {
      const fakeKnowledgeItem = { id: UUID3 };
      // Knowledge item found
      mocks.mockWhere.mockResolvedValueOnce([fakeKnowledgeItem]);
      // Slide not found
      mocks.mockWhere.mockResolvedValueOnce([]);

      await expect(
        caller.addSlideItem({
          slideId: UUID2,
          knowledgeItemId: UUID3,
          position: 1,
        })
      ).rejects.toThrow(TRPCError);

      try {
        mocks.mockWhere.mockResolvedValueOnce([fakeKnowledgeItem]);
        mocks.mockWhere.mockResolvedValueOnce([]);
        await caller.addSlideItem({
          slideId: UUID2,
          knowledgeItemId: UUID3,
          position: 1,
        });
      } catch (error) {
        expect((error as TRPCError).code).toBe('NOT_FOUND');
        expect((error as TRPCError).message).toContain('Slide not found');
      }
    });
  });

  // ─── navigate ───────────────────────────────────────────────────────────────

  describe('navigate', () => {
    it('returns viewState, items, and navigation metadata for a valid position', async () => {
      const fakeSlide = {
        id: UUID2,
        presentationId: UUID1,
        position: 1,
        title: 'First Slide',
        narratorNote: 'Intro',
        viewState: validViewState,
        createdAt: new Date(),
      };

      const fakeSlideItem = {
        id: UUID4,
        slideId: UUID2,
        knowledgeItemId: UUID3,
        position: 1,
        annotation: 'Note',
      };

      const fakeKnowledgeItem = {
        id: UUID3,
        title: 'Test Item',
        summary: 'Summary',
        itemType: 'article',
      };

      // Navigate procedure makes these queries in order:
      // 1. db.select().from().where() → count (awaited directly)
      // 2. db.select().from().where(and(...)) → slide at position (awaited directly)
      // 3. db.select().from().where().orderBy() → slide items (chains .orderBy)
      // 4. db.select().from().where() → knowledge item (awaited directly)
      mocks.mockWhere.mockReset();
      mocks.mockOrderBy.mockReset();

      mocks.mockWhere
        .mockResolvedValueOnce([{ count: 3 }])                // 1: count
        .mockResolvedValueOnce([fakeSlide])                   // 2: slide at position
        .mockReturnValueOnce({ orderBy: mocks.mockOrderBy })  // 3: slide items → .orderBy
        .mockResolvedValueOnce([fakeKnowledgeItem]);           // 4: knowledge item

      mocks.mockOrderBy.mockResolvedValueOnce([fakeSlideItem]);

      mocks.mockExecute
        .mockResolvedValueOnce({ rows: [] })   // time bindings
        .mockResolvedValueOnce({ rows: [] });  // place bindings

      const result = await caller.navigate({
        presentationId: UUID1,
        position: 1,
      });

      expect(result.slide.id).toBe(UUID2);
      expect(result.slide.viewState).toEqual(validViewState);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Test Item');
      expect(result.navigation).toEqual({
        current: 1,
        total: 3,
        hasNext: true,
        hasPrevious: false,
      });
    });

    it('rejects with BAD_REQUEST when position is out of bounds (too high)', async () => {
      // Count returns 2 slides
      mocks.mockWhere.mockResolvedValueOnce([{ count: 2 }]);

      await expect(
        caller.navigate({ presentationId: UUID1, position: 5 })
      ).rejects.toThrow(TRPCError);

      try {
        mocks.mockWhere.mockResolvedValueOnce([{ count: 2 }]);
        await caller.navigate({ presentationId: UUID1, position: 5 });
      } catch (error) {
        expect((error as TRPCError).code).toBe('BAD_REQUEST');
        expect((error as TRPCError).message).toContain('out of bounds');
      }
    });

    it('rejects with BAD_REQUEST when position is less than 1', async () => {
      // Count returns 2 slides
      mocks.mockWhere.mockResolvedValueOnce([{ count: 2 }]);

      await expect(
        caller.navigate({ presentationId: UUID1, position: 0 })
      ).rejects.toThrow(TRPCError);

      try {
        mocks.mockWhere.mockResolvedValueOnce([{ count: 2 }]);
        await caller.navigate({ presentationId: UUID1, position: 0 });
      } catch (error) {
        expect((error as TRPCError).code).toBe('BAD_REQUEST');
        expect((error as TRPCError).message).toContain('out of bounds');
      }
    });
  });

  // ─── delete ─────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes a presentation (cascades via FK constraints)', async () => {
      const existingPresentation = {
        id: UUID1,
        collectionId: UUID2,
        title: 'To Delete',
      };

      // Select: presentation lookup
      mocks.mockWhere.mockResolvedValueOnce([existingPresentation]);
      // Delete
      mocks.mockDeleteWhere.mockResolvedValueOnce(undefined);

      const result = await caller.delete({ id: UUID1 });

      expect(result).toEqual({ success: true });
      expect(mocks.mockSelect).toHaveBeenCalled();
      expect(mocks.mockDelete).toHaveBeenCalled();
    });

    it('rejects with NOT_FOUND when presentation does not exist', async () => {
      mocks.mockWhere.mockResolvedValueOnce([]);

      await expect(
        caller.delete({ id: UUID1 })
      ).rejects.toThrow(TRPCError);

      try {
        mocks.mockWhere.mockResolvedValueOnce([]);
        await caller.delete({ id: UUID1 });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe('NOT_FOUND');
      }
    });
  });
});
