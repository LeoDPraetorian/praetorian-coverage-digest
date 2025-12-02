// src/__tests__/web.unit.test.ts
/**
 * Unit tests for web research functionality
 */

import { describe, it, expect } from 'vitest';
import { searchWebSources, formatSourcesForDisplay } from '../phases/web.js';
import type { WebSource } from '../lib/types.js';

describe('searchWebSources', () => {
  it('should return sources for TanStack Query topic', async () => {
    const sources = await searchWebSources('tanstack query');

    expect(sources.length).toBeGreaterThan(0);
    // Should include TkDodo's blog for React Query
    const tkDodo = sources.find((s) => s.url.includes('tkdodo.eu'));
    expect(tkDodo).toBeDefined();
  });

  it('should return sources for React Query topic', async () => {
    const sources = await searchWebSources('react-query');

    // Should recognize React Query and return appropriate sources
    expect(sources.length).toBeGreaterThan(0);
  });

  it('should return sources for Testing Library', async () => {
    const sources = await searchWebSources('testing-library');

    // Should include Kent C. Dodds blog
    const kcd = sources.find((s) => s.url.includes('kentcdodds.com'));
    expect(kcd).toBeDefined();
  });

  it('should sort sources by score descending', async () => {
    const sources = await searchWebSources('tanstack query');

    if (sources.length > 1) {
      for (let i = 0; i < sources.length - 1; i++) {
        expect(sources[i].score).toBeGreaterThanOrEqual(sources[i + 1].score);
      }
    }
  });

  it('should handle unknown topics gracefully', async () => {
    const sources = await searchWebSources('completely-unknown-library-xyz');

    // Should return empty array or minimal results
    expect(Array.isArray(sources)).toBe(true);
  });
});

describe('formatSourcesForDisplay', () => {
  it('should format GitHub sources under GitHub heading', () => {
    const sources: WebSource[] = [
      {
        url: 'https://github.com/tanstack/query',
        title: 'TanStack/query',
        type: 'github-repo',
        score: 95,
        modifiers: [],
      },
    ];

    const result = formatSourcesForDisplay(sources);

    expect(result).toContain('GitHub:');
    expect(result).toContain('TanStack/query');
  });

  it('should format official docs under Official Documentation', () => {
    const sources: WebSource[] = [
      {
        url: 'https://tanstack.com/query/latest',
        title: 'TanStack Query Documentation',
        type: 'official-docs',
        score: 100,
        modifiers: [],
      },
    ];

    const result = formatSourcesForDisplay(sources);

    expect(result).toContain('Official Documentation:');
    expect(result).toContain('TanStack Query Documentation');
  });

  it('should format blogs under Expert Articles', () => {
    const sources: WebSource[] = [
      {
        url: 'https://tkdodo.eu/blog/practical-react-query',
        title: 'Practical React Query',
        type: 'maintainer-blog',
        score: 85,
        modifiers: [],
      },
    ];

    const result = formatSourcesForDisplay(sources);

    expect(result).toContain('Expert Articles:');
    expect(result).toContain('Practical React Query');
  });

  it('should show quality indicators based on score', () => {
    const sources: WebSource[] = [
      {
        url: 'https://example.com/high',
        title: 'High Score',
        type: 'official-docs',
        score: 95,
        modifiers: [],
      },
      {
        url: 'https://example.com/medium',
        title: 'Medium Score',
        type: 'quality-blog',
        score: 75,
        modifiers: [],
      },
      {
        url: 'https://example.com/low',
        title: 'Low Score',
        type: 'article',
        score: 50,
        modifiers: [],
      },
    ];

    const result = formatSourcesForDisplay(sources);

    // High score should get ✅
    expect(result).toContain('✅');
    // Medium score should get ⭐
    expect(result).toContain('⭐');
    // Low score should get ⚠️
    expect(result).toContain('⚠️');
  });

  it('should include score in output', () => {
    const sources: WebSource[] = [
      {
        url: 'https://example.com/test',
        title: 'Test Source',
        type: 'article',
        score: 67,
        modifiers: [],
      },
    ];

    const result = formatSourcesForDisplay(sources);

    expect(result).toContain('Score: 67');
  });

  it('should handle empty source list', () => {
    const sources: WebSource[] = [];
    const result = formatSourcesForDisplay(sources);
    expect(result).toBe('');
  });

  it('should include URLs in output', () => {
    const sources: WebSource[] = [
      {
        url: 'https://example.com/article',
        title: 'Test Article',
        type: 'article',
        score: 50,
        modifiers: [],
      },
    ];

    const result = formatSourcesForDisplay(sources);

    expect(result).toContain('https://example.com/article');
  });
});

describe('Source scoring', () => {
  it('should apply trusted domain boost', async () => {
    const sources = await searchWebSources('tanstack query');

    // TanStack.com sources should have boosted scores
    const tanstackSource = sources.find((s) => s.url.includes('tanstack.com'));
    if (tanstackSource) {
      // Base + domain boost
      expect(tanstackSource.score).toBeGreaterThanOrEqual(100);
      expect(tanstackSource.modifiers.length).toBeGreaterThan(0);
    }
  });

  it('should track modifiers for score adjustments', async () => {
    const sources = await searchWebSources('react-query');

    // Sources with modifiers should explain the boost
    for (const source of sources) {
      if (source.modifiers.length > 0) {
        for (const mod of source.modifiers) {
          expect(mod).toHaveProperty('reason');
          expect(mod).toHaveProperty('delta');
        }
      }
    }
  });
});
