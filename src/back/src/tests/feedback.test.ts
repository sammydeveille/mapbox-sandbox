import { describe, it, expect, vi, beforeEach } from 'vitest';
import { feedbackRouter } from '../routers/feedback.js';

// Mock the database module
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockResolvedValue([
      { id: 1, title: 'Test Feedback', description: 'Test Description', createdAt: new Date() }
    ]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      { id: 1, title: 'New Feedback', description: 'New Description', createdAt: new Date() }
    ]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis()
  }
}));

// Mock the logger
vi.mock('../utils/log.js', () => ({
  log: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

describe('Feedback Router Integration', () => {
  const caller = feedbackRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('returns array of feedback', async () => {
      const result = await caller.list();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('title', 'Test Feedback');
    });
  });

  describe('create', () => {
    it('creates new feedback with valid input', async () => {
      const result = await caller.create({
        title: 'New Feedback',
        description: 'New Description'
      });
      
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('title', 'New Feedback');
    });

    it('rejects HTML in title', async () => {
      await expect(
        caller.create({
          title: '<script>alert("XSS")</script>',
          description: 'Test'
        })
      ).rejects.toThrow('HTML tags are not allowed');
    });

    it('rejects empty title', async () => {
      await expect(
        caller.create({
          title: '',
          description: 'Test'
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('updates existing feedback', async () => {
      const result = await caller.update({
        id: 1,
        title: 'Updated Title',
        description: 'Updated Description'
      });
      
      expect(result).toHaveProperty('title', 'New Feedback');
    });

    it('rejects negative ID', async () => {
      await expect(
        caller.update({
          id: -1,
          title: 'Test',
          description: 'Test'
        })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('deletes feedback by ID', async () => {
      const result = await caller.delete({ id: 1 });
      
      expect(result).toHaveProperty('success', true);
    });

    it('rejects invalid ID', async () => {
      await expect(
        caller.delete({ id: 0 })
      ).rejects.toThrow();
    });
  });
});
