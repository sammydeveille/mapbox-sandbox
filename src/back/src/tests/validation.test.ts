import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { noHtmlString } from '../utils/validators';

// Test schemas for validating noHtmlString and common input patterns
const textInputSchema = z.object({ 
  title: noHtmlString({ max: 255 }),
  description: noHtmlString({ max: 5000 })
});

const idSchema = z.object({ 
  id: z.number().int().positive()
});

const locationSchema = z.object({ 
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

describe('Input Validation & SQL Injection Protection', () => {
  describe('Format Validation', () => {
    it('accepts SQL injection strings (safe due to parameterized queries)', () => {
      // This test proves we DON'T sanitize input - we rely on Drizzle ORM's parameterized queries
      const maliciousInput = "'; DROP TABLE users; --";
      const result = textInputSchema.parse({
        title: maliciousInput,
        description: 'Test'
      });
      
      // Validation passes - the string is treated as data, not SQL code
      expect(result.title).toBe(maliciousInput);
    });

    it('rejects empty strings', () => {
      expect(() => textInputSchema.parse({
        title: '',
        description: 'Test'
      })).toThrow();
    });

    it('rejects strings exceeding max length', () => {
      expect(() => textInputSchema.parse({
        title: 'a'.repeat(256),
        description: 'Test'
      })).toThrow();
    });

    it('trims whitespace', () => {
      const result = textInputSchema.parse({
        title: '  Test Title  ',
        description: '  Test Description  '
      });
      
      expect(result.title).toBe('Test Title');
      expect(result.description).toBe('Test Description');
    });

    it('rejects negative IDs', () => {
      expect(() => idSchema.parse({ id: -1 })).toThrow();
    });

    it('rejects non-integer IDs', () => {
      expect(() => idSchema.parse({ id: 1.5 })).toThrow();
    });

    it('rejects zero IDs', () => {
      expect(() => idSchema.parse({ id: 0 })).toThrow();
    });
  });

  describe('Coordinate Validation', () => {
    it('rejects invalid latitude (> 90)', () => {
      expect(() => locationSchema.parse({ lat: 91, lng: 0 })).toThrow();
    });

    it('rejects invalid latitude (< -90)', () => {
      expect(() => locationSchema.parse({ lat: -91, lng: 0 })).toThrow();
    });

    it('rejects invalid longitude (> 180)', () => {
      expect(() => locationSchema.parse({ lat: 0, lng: 181 })).toThrow();
    });

    it('rejects invalid longitude (< -180)', () => {
      expect(() => locationSchema.parse({ lat: 0, lng: -181 })).toThrow();
    });

    it('rejects non-numeric coordinates', () => {
      expect(() => locationSchema.parse({ lat: 'invalid', lng: 0 })).toThrow();
    });

    it('accepts valid coordinates', () => {
      const result = locationSchema.parse({ lat: 51.5074, lng: -0.1278 });
      expect(result.lat).toBe(51.5074);
      expect(result.lng).toBe(-0.1278);
    });
  });

  describe('XSS Protection', () => {
    it('rejects HTML tags in title', () => {
      expect(() => textInputSchema.parse({
        title: '<script>alert("XSS")</script>',
        description: 'Test'
      })).toThrow('HTML tags are not allowed');
    });

    it('rejects HTML tags in description', () => {
      expect(() => textInputSchema.parse({
        title: 'Test',
        description: '<img src=x onerror=alert(1)>'
      })).toThrow('HTML tags are not allowed');
    });

    it('accepts text with angle brackets in math', () => {
      const result = textInputSchema.parse({
        title: 'x > 5 and y < 10',
        description: 'Test'
      });
      expect(result.title).toBe('x > 5 and y < 10');
    });

    it('handles special characters safely', () => {
      const result = textInputSchema.parse({
        title: "Test's \"quoted\" title",
        description: 'Line1\nLine2\tTabbed'
      });
      
      expect(result.title).toBe("Test's \"quoted\" title");
      expect(result.description).toBe('Line1\nLine2\tTabbed');
    });

    it('handles unicode characters', () => {
      const result = textInputSchema.parse({
        title: '测试 🚀 Тест',
        description: 'Émojis: 😀🎉'
      });
      
      expect(result.title).toBe('测试 🚀 Тест');
      expect(result.description).toBe('Émojis: 😀🎉');
    });
  });
});
