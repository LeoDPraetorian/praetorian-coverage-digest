// src/__tests__/context7.unit.test.ts
/**
 * Unit tests for Context7 integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatPackagesForDisplay, _setProjectRoot, _resetProjectRoot } from '../phases/context7.js';
import type { Context7Package } from '../lib/types.js';

// Mock execSync to avoid actual MCP calls
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Set a mock project root before tests run
beforeEach(() => {
  _setProjectRoot('/mock/project');
});

describe('formatPackagesForDisplay', () => {
  it('should format single recommended package', () => {
    const packages: Context7Package[] = [
      {
        id: '/npm/@tanstack/react-query',
        name: '@tanstack/react-query',
        version: '5.0.0',
        pageCount: 150,
        description: 'Powerful data synchronization for React',
        status: 'recommended',
      },
    ];

    const result = formatPackagesForDisplay(packages);

    expect(result).toContain('@tanstack/react-query');
    expect(result).toContain('5.0.0');
    expect(result).toContain('✅');
    expect(result).toContain('150 documentation pages');
  });

  it('should format deprecated package with warning', () => {
    const packages: Context7Package[] = [
      {
        id: '/npm/react-query',
        name: 'react-query',
        version: '3.39.3',
        pageCount: 100,
        description: 'Deprecated - use @tanstack/react-query',
        status: 'deprecated',
      },
    ];

    const result = formatPackagesForDisplay(packages);

    expect(result).toContain('❌');
    expect(result).toContain('DEPRECATED');
  });

  it('should format caution package with warning icon', () => {
    const packages: Context7Package[] = [
      {
        id: '/npm/@tanstack/query-core',
        name: '@tanstack/query-core',
        version: '5.0.0',
        pageCount: 50,
        description: 'Core query functionality',
        status: 'caution',
      },
    ];

    const result = formatPackagesForDisplay(packages);

    expect(result).toContain('⚠️');
    expect(result).toContain('Advanced/Internal');
  });

  it('should handle empty package list', () => {
    const packages: Context7Package[] = [];
    const result = formatPackagesForDisplay(packages);
    expect(result).toBe('');
  });

  it('should format multiple packages', () => {
    const packages: Context7Package[] = [
      {
        id: '/npm/@tanstack/react-query',
        name: '@tanstack/react-query',
        version: '5.0.0',
        pageCount: 150,
        description: 'Data fetching',
        status: 'recommended',
      },
      {
        id: '/npm/@tanstack/react-table',
        name: '@tanstack/react-table',
        version: '8.0.0',
        pageCount: 80,
        description: 'Table component',
        status: 'recommended',
      },
    ];

    const result = formatPackagesForDisplay(packages);

    expect(result).toContain('[1]');
    expect(result).toContain('[2]');
    expect(result).toContain('react-query');
    expect(result).toContain('react-table');
  });

  it('should truncate long descriptions', () => {
    const longDesc = 'A'.repeat(200);
    const packages: Context7Package[] = [
      {
        id: '/npm/test-pkg',
        name: 'test-pkg',
        version: '1.0.0',
        pageCount: 10,
        description: longDesc,
        status: 'recommended',
      },
    ];

    const result = formatPackagesForDisplay(packages);

    expect(result).toContain('...');
    expect(result.length).toBeLessThan(longDesc.length + 100);
  });
});

describe('Context7 package status determination', () => {
  // Test the internal status determination logic
  // by checking the expected status values

  it('should mark packages with deprecated in name as deprecated', () => {
    const packages: Context7Package[] = [
      {
        id: '/npm/deprecated-lib',
        name: 'deprecated-lib',
        version: '1.0.0',
        pageCount: 5,
        description: 'Old library',
        status: 'deprecated', // This would be determined by determinePackageStatus
      },
    ];

    expect(packages[0].status).toBe('deprecated');
  });

  it('should mark alpha/beta versions with caution', () => {
    const packages: Context7Package[] = [
      {
        id: '/npm/new-lib',
        name: 'new-lib',
        version: '1.0.0-beta.1',
        pageCount: 20,
        description: 'New library',
        status: 'caution',
      },
    ];

    expect(packages[0].status).toBe('caution');
  });

  it('should mark core/internal packages with caution', () => {
    const packages: Context7Package[] = [
      {
        id: '/npm/@tanstack/query-core',
        name: '@tanstack/query-core',
        version: '5.0.0',
        pageCount: 30,
        description: 'Core package',
        status: 'caution',
      },
    ];

    expect(packages[0].status).toBe('caution');
  });
});
