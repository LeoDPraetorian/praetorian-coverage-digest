import { describe, it, expect } from 'vitest';
import { slugify } from '../internal/slug.js';

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello @World!')).toBe('hello-world');
  });

  it('handles multiple spaces', () => {
    expect(slugify('Hello   World')).toBe('hello-world');
  });

  it('truncates to max length', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(60);
  });

  it('removes leading/trailing hyphens', () => {
    expect(slugify('- Hello World -')).toBe('hello-world');
  });
});
