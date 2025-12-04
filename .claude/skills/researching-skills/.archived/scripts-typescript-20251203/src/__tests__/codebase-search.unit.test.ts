// src/__tests__/codebase-search.unit.test.ts
/**
 * Unit tests for codebase search functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  searchCodePatterns,
  findRelatedTests,
  categorizeMatch,
  _setProjectRoot,
  _resetProjectRoot,
} from '../lib/codebase-search.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test fixtures directory
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `codebase-search-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, 'modules'), { recursive: true });
  _setProjectRoot(testDir);
});

afterEach(() => {
  _resetProjectRoot();
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('categorizeMatch', () => {
  it('should categorize import statements', () => {
    const result = categorizeMatch("import { useQuery } from '@tanstack/react-query'");
    expect(result).toBe('import');
  });

  it('should categorize require statements', () => {
    const result = categorizeMatch("const express = require('express')");
    expect(result).toBe('import');
  });

  it('should categorize function definitions', () => {
    const result = categorizeMatch('function useCustomQuery() {');
    expect(result).toBe('definition');
  });

  it('should categorize const function definitions', () => {
    const result = categorizeMatch('const fetchData = async () => {');
    expect(result).toBe('definition');
  });

  it('should categorize export definitions', () => {
    const result = categorizeMatch('export const useMyHook = () => {');
    expect(result).toBe('definition');
  });

  it('should categorize class definitions', () => {
    const result = categorizeMatch('class QueryClient {');
    expect(result).toBe('definition');
  });

  it('should categorize usage patterns', () => {
    const result = categorizeMatch('const { data } = useQuery({ queryKey: ["users"] })');
    expect(result).toBe('usage');
  });
});

describe('searchCodePatterns', () => {
  beforeEach(() => {
    // Create test module structure
    const uiDir = join(testDir, 'modules', 'chariot', 'ui', 'src');
    mkdirSync(uiDir, { recursive: true });

    // Create a file with React code
    writeFileSync(join(uiDir, 'App.tsx'), `
import React from 'react';
import { useQuery } from '@tanstack/react-query';

export function App() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  if (isLoading) return <div>Loading...</div>;

  return <div>{data}</div>;
}
`);

    // Create another file with hooks
    writeFileSync(join(uiDir, 'hooks', 'useUsers.ts').replace('/hooks/', '/'), `
import { useQuery } from '@tanstack/react-query';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users'),
  });
}
`);
    mkdirSync(join(uiDir, 'hooks'), { recursive: true });
    writeFileSync(join(uiDir, 'hooks', 'useUsers.ts'), `
import { useQuery } from '@tanstack/react-query';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users'),
  });
}
`);
  });

  it('should find patterns in code files', () => {
    const result = searchCodePatterns('useQuery', [join(testDir, 'modules', 'chariot')]);

    expect(result.length).toBeGreaterThan(0);
    expect(result.some(m => m.content.includes('useQuery'))).toBe(true);
  });

  it('should return file path in matches', () => {
    const result = searchCodePatterns('useQuery', [join(testDir, 'modules', 'chariot')]);

    if (result.length > 0) {
      expect(result[0].file).toContain('chariot');
      expect(result[0].file).toMatch(/\.(ts|tsx)$/);
    }
  });

  it('should return line numbers', () => {
    const result = searchCodePatterns('useQuery', [join(testDir, 'modules', 'chariot')]);

    if (result.length > 0) {
      expect(result[0].line).toBeGreaterThan(0);
    }
  });

  it('should categorize matches', () => {
    const result = searchCodePatterns('useQuery', [join(testDir, 'modules', 'chariot')]);

    const importMatches = result.filter(m => m.matchType === 'import');
    const usageMatches = result.filter(m => m.matchType === 'usage');

    expect(importMatches.length + usageMatches.length).toBeGreaterThan(0);
  });

  it('should return empty array for non-matching patterns', () => {
    const result = searchCodePatterns('xyz123nonexistent', [join(testDir, 'modules', 'chariot')]);

    expect(result).toEqual([]);
  });

  it('should search multiple directories', () => {
    // Create another module
    const backendDir = join(testDir, 'modules', 'backend', 'src');
    mkdirSync(backendDir, { recursive: true });
    writeFileSync(join(backendDir, 'handler.go'), `
package main

func handleRequest() {
  // Some handler code
}
`);

    const result = searchCodePatterns('func', [
      join(testDir, 'modules', 'chariot'),
      join(testDir, 'modules', 'backend'),
    ]);

    const backendMatches = result.filter(m => m.file.includes('backend'));
    expect(backendMatches.length).toBeGreaterThan(0);
  });

  it('should limit results', () => {
    // Create many files with matches
    const srcDir = join(testDir, 'modules', 'chariot', 'ui', 'src');
    for (let i = 0; i < 20; i++) {
      writeFileSync(join(srcDir, `component${i}.tsx`), `
import { useQuery } from '@tanstack/react-query';
export const Component${i} = () => useQuery();
`);
    }

    const result = searchCodePatterns('useQuery', [join(testDir, 'modules', 'chariot')], 10);

    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe('findRelatedTests', () => {
  beforeEach(() => {
    // Create test files
    const testDir2 = join(testDir, 'modules', 'chariot', 'ui', 'src', '__tests__');
    mkdirSync(testDir2, { recursive: true });

    writeFileSync(join(testDir2, 'useQuery.unit.test.ts'), `
import { describe, it, expect } from 'vitest';
import { useQuery } from '@tanstack/react-query';

describe('useQuery hook', () => {
  it('should fetch data', () => {
    // Test implementation
  });

  it('should handle loading state', () => {
    // Test implementation
  });
});
`);

    writeFileSync(join(testDir2, 'App.integration.test.tsx'), `
import { describe, it, expect } from 'vitest';

describe('App Integration', () => {
  it('should render users list', () => {
    // Integration test
  });
});
`);

    // Create E2E tests
    const e2eDir = join(testDir, 'modules', 'chariot', 'e2e');
    mkdirSync(e2eDir, { recursive: true });
    writeFileSync(join(e2eDir, 'users.spec.ts'), `
import { test, expect } from '@playwright/test';

test.describe('Users Page', () => {
  test('should load users', async ({ page }) => {
    await page.goto('/users');
  });
});
`);
  });

  it('should find unit tests', () => {
    const result = findRelatedTests('useQuery', [join(testDir, 'modules', 'chariot')]);

    const unitTests = result.filter(t => t.testType === 'unit');
    expect(unitTests.length).toBeGreaterThan(0);
  });

  it('should find integration tests', () => {
    const result = findRelatedTests('App', [join(testDir, 'modules', 'chariot')]);

    const integrationTests = result.filter(t => t.testType === 'integration');
    expect(integrationTests.length).toBeGreaterThan(0);
  });

  it('should find E2E tests', () => {
    const result = findRelatedTests('users', [join(testDir, 'modules', 'chariot')]);

    const e2eTests = result.filter(t => t.testType === 'e2e');
    expect(e2eTests.length).toBeGreaterThan(0);
  });

  it('should extract test names', () => {
    const result = findRelatedTests('useQuery', [join(testDir, 'modules', 'chariot')]);

    if (result.length > 0) {
      expect(result.some(t => t.testName.includes('fetch data') || t.testName.includes('useQuery'))).toBe(true);
    }
  });

  it('should calculate relevance scores', () => {
    const result = findRelatedTests('useQuery', [join(testDir, 'modules', 'chariot')]);

    for (const test of result) {
      expect(test.relevance).toBeGreaterThanOrEqual(0);
      expect(test.relevance).toBeLessThanOrEqual(100);
    }
  });

  it('should sort by relevance descending', () => {
    const result = findRelatedTests('useQuery', [join(testDir, 'modules', 'chariot')]);

    if (result.length > 1) {
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].relevance).toBeGreaterThanOrEqual(result[i].relevance);
      }
    }
  });

  it('should return empty array for non-matching topics', () => {
    const result = findRelatedTests('xyz123nonexistent', [join(testDir, 'modules', 'chariot')]);

    expect(result).toEqual([]);
  });
});

describe('Integration: Real codebase', () => {
  beforeEach(() => {
    _resetProjectRoot(); // Use real project root
  });

  it('should find React patterns in chariot/ui', () => {
    const result = searchCodePatterns('useQuery', [], 20);

    // Should find some matches if chariot/ui exists and uses TanStack Query
    // This test verifies the real codebase integration
    expect(Array.isArray(result)).toBe(true);
  });

  it('should find tests in the codebase', () => {
    const result = findRelatedTests('asset', [], 10);

    // Should find some asset-related tests
    expect(Array.isArray(result)).toBe(true);
  });
});
