import { describe, it, expect } from '@jest/globals';
import { clamp, randomRange, overlap, snapshot, circleRectCollision, checkBossCollision } from '../resources/js/utils/utils.js';

describe('clamp', () => {
  it('should clamp value between min and max', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('should handle min > max by swapping them', () => {
    expect(clamp(5, 10, 0)).toBe(5);
    expect(clamp(-5, 10, 0)).toBe(0);
    expect(clamp(15, 10, 0)).toBe(10);
  });

  it('should handle boundary values', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('should handle negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(0, -10, -1)).toBe(-1);
  });

  it('should handle zero range (min === max)', () => {
    expect(clamp(5, 10, 10)).toBe(10);
    expect(clamp(15, 10, 10)).toBe(10);
  });
});

describe('randomRange', () => {
  it('should return value within range', () => {
    for (let i = 0; i < 100; i++) {
      const result = randomRange(0, 10);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  it('should return exact value when min === max', () => {
    expect(randomRange(5, 5)).toBe(5);
    expect(randomRange(0, 0)).toBe(0);
    expect(randomRange(-10, -10)).toBe(-10);
  });

  it('should handle min > max by swapping', () => {
    for (let i = 0; i < 100; i++) {
      const result = randomRange(10, 0);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  it('should work with negative ranges', () => {
    for (let i = 0; i < 100; i++) {
      const result = randomRange(-10, -5);
      expect(result).toBeGreaterThanOrEqual(-10);
      expect(result).toBeLessThanOrEqual(-5);
    }
  });
});

describe('overlap', () => {
  it('should detect overlapping rectangles', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 5, y: 5, w: 10, h: 10 };
    expect(overlap(a, b)).toBe(true);
  });

  it('should detect non-overlapping rectangles', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 20, y: 20, w: 10, h: 10 };
    expect(overlap(a, b)).toBe(false);
  });

  it('should detect edge-touching rectangles as non-overlapping', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 10, y: 0, w: 10, h: 10 };
    expect(overlap(a, b)).toBe(false);
  });

  it('should detect rectangles touching at corners as non-overlapping', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 10, y: 10, w: 10, h: 10 };
    expect(overlap(a, b)).toBe(false);
  });

  it('should detect fully contained rectangles', () => {
    const a = { x: 0, y: 0, w: 20, h: 20 };
    const b = { x: 5, y: 5, w: 5, h: 5 };
    expect(overlap(a, b)).toBe(true);
    expect(overlap(b, a)).toBe(true);
  });

  it('should handle identical rectangles', () => {
    const a = { x: 5, y: 5, w: 10, h: 10 };
    const b = { x: 5, y: 5, w: 10, h: 10 };
    expect(overlap(a, b)).toBe(true);
  });

  it('should detect partial overlaps in various positions', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    
    // Overlap from right
    expect(overlap(a, { x: 5, y: 0, w: 10, h: 10 })).toBe(true);
    // Overlap from left
    expect(overlap(a, { x: -5, y: 0, w: 10, h: 10 })).toBe(true);
    // Overlap from top
    expect(overlap(a, { x: 0, y: -5, w: 10, h: 10 })).toBe(true);
    // Overlap from bottom
    expect(overlap(a, { x: 0, y: 5, w: 10, h: 10 })).toBe(true);
  });
});

describe('snapshot', () => {
  it('should copy specified properties', () => {
    const source = { a: 1, b: 2, c: 3, d: 4 };
    const result = snapshot(source, ['a', 'c']);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('should return empty object for empty keys array', () => {
    const source = { a: 1, b: 2 };
    const result = snapshot(source, []);
    expect(result).toEqual({});
  });

  it('should handle missing keys gracefully', () => {
    const source = { a: 1, b: 2 };
    const result = snapshot(source, ['a', 'c', 'd']);
    expect(result).toEqual({ a: 1, c: undefined, d: undefined });
  });

  it('should create a new object (not reference)', () => {
    const source = { a: 1, b: 2 };
    const result = snapshot(source, ['a', 'b']);
    expect(result).not.toBe(source);
    result.a = 999;
    expect(source.a).toBe(1);
  });

  it('should handle objects with various value types', () => {
    const source = {
      num: 42,
      str: 'hello',
      bool: true,
      null: null,
      undef: undefined,
      arr: [1, 2, 3],
      obj: { nested: true }
    };
    const result = snapshot(source, ['num', 'str', 'bool', 'arr', 'obj']);
    expect(result.num).toBe(42);
    expect(result.str).toBe('hello');
    expect(result.bool).toBe(true);
    expect(result.arr).toEqual([1, 2, 3]);
    expect(result.obj).toEqual({ nested: true });
  });
});

describe('circleRectCollision', () => {
  it('should detect collision when circle center is inside rectangle', () => {
    const result = circleRectCollision(5, 5, 3, { x: 0, y: 0, w: 10, h: 10 });
    expect(result).toBe(true);
  });

  it('should detect no collision when circle is far from rectangle', () => {
    const result = circleRectCollision(50, 50, 5, { x: 0, y: 0, w: 10, h: 10 });
    expect(result).toBe(false);
  });

  it('should detect collision when circle overlaps rectangle edge', () => {
    // Circle at (15, 5) with radius 6 should overlap rect at (0,0,10,10)
    const result = circleRectCollision(15, 5, 6, { x: 0, y: 0, w: 10, h: 10 });
    expect(result).toBe(true);
  });

  it('should detect no collision when circle just touches rectangle edge', () => {
    // Circle at (15, 5) with radius 5 should just touch rect at (0,0,10,10)
    const result = circleRectCollision(15, 5, 5, { x: 0, y: 0, w: 10, h: 10 });
    expect(result).toBe(false);
  });

  it('should detect collision at rectangle corners', () => {
    // Circle at (12, 12) with radius 3 should overlap corner at (10, 10)
    const result = circleRectCollision(12, 12, 3, { x: 0, y: 0, w: 10, h: 10 });
    expect(result).toBe(true);
  });

  it('should handle zero-radius circle (point collision)', () => {
    const result = circleRectCollision(5, 5, 0, { x: 0, y: 0, w: 10, h: 10 });
    expect(result).toBe(true);
    
    const noCollision = circleRectCollision(15, 15, 0, { x: 0, y: 0, w: 10, h: 10 });
    expect(noCollision).toBe(false);
  });
});

describe('checkBossCollision', () => {
  it('should use rectangle collision in square mode', () => {
    const boss = {
      x: 0, y: 0, w: 50, h: 50,
      morphMode: 'square',
      morphBlend: 1
    };
    const rect = { x: 25, y: 25, w: 10, h: 10 };
    expect(checkBossCollision(boss, rect)).toBe(true);
  });

  it('should use circle collision in circle mode', () => {
    const boss = {
      x: 0, y: 0, w: 50, h: 50,
      morphMode: 'circle',
      morphBlend: 0
    };
    const rect = { x: 25, y: 25, w: 5, h: 5 };
    expect(checkBossCollision(boss, rect)).toBe(true);
  });

  it('should not collide when rectangle is outside circle radius', () => {
    const boss = {
      x: 0, y: 0, w: 50, h: 50,
      morphMode: 'circle',
      morphBlend: 0
    };
    // Rectangle far outside circle
    const rect = { x: 100, y: 100, w: 5, h: 5 };
    expect(checkBossCollision(boss, rect)).toBe(false);
  });

  it('should handle morphBlend affecting circle radius', () => {
    const boss = {
      x: 0, y: 0, w: 50, h: 50,
      morphMode: 'circle',
      morphBlend: 0.5  // Halfway between circle and square
    };
    const rect = { x: 25, y: 25, w: 5, h: 5 };
    // Should still detect collision at center
    expect(checkBossCollision(boss, rect)).toBe(true);
  });

  it('should use morphBlend when morphMode is circle', () => {
    const boss = {
      x: 0, y: 0, w: 100, h: 100,
      morphMode: 'circle',
      morphBlend: 0  // Full circle
    };
    const centerRect = { x: 48, y: 48, w: 4, h: 4 };
    expect(checkBossCollision(boss, centerRect)).toBe(true);
  });

  it('should default morphBlend based on morphMode if not provided', () => {
    const squareBoss = {
      x: 0, y: 0, w: 50, h: 50,
      morphMode: 'square'
      // morphBlend not provided, should default to 1 for square
    };
    const circleBoss = {
      x: 0, y: 0, w: 50, h: 50,
      morphMode: 'circle'
      // morphBlend not provided, should default to 0 for circle
    };
    
    const rect = { x: 25, y: 25, w: 5, h: 5 };
    expect(checkBossCollision(squareBoss, rect)).toBe(true);
    expect(checkBossCollision(circleBoss, rect)).toBe(true);
  });
});
