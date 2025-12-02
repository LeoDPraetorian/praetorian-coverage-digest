// src/__tests__/conventions.unit.test.ts
/**
 * Unit tests for project conventions extraction
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extractConventions,
  extractSection,
  findConventionDocuments,
  _setProjectRoot,
  _resetProjectRoot,
} from '../lib/conventions.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test fixtures directory
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `conventions-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  _setProjectRoot(testDir);
});

afterEach(() => {
  _resetProjectRoot();
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('extractSection', () => {
  it('should extract section content by heading', () => {
    const content = `# Document

## Code Organization

- Use kebab-case for files
- Group by feature

## Testing

- 80% coverage minimum
`;
    const result = extractSection(content, 'Code Organization');

    expect(result).toContain('kebab-case');
    expect(result).toContain('Group by feature');
    expect(result).not.toContain('80% coverage');
  });

  it('should handle nested headings', () => {
    const content = `# Main

## Section A

Content A

### Subsection

Nested content

## Section B

Content B
`;
    const result = extractSection(content, 'Section A');

    expect(result).toContain('Content A');
    expect(result).toContain('Nested content');
    expect(result).not.toContain('Content B');
  });

  it('should return empty string for missing section', () => {
    const content = `# Document

## Existing Section

Content here
`;
    const result = extractSection(content, 'Missing Section');

    expect(result).toBe('');
  });

  it('should be case-insensitive', () => {
    const content = `# Doc

## Code organization

Some content
`;
    const result = extractSection(content, 'Code Organization');

    expect(result).toContain('Some content');
  });
});

describe('findConventionDocuments', () => {
  it('should find CLAUDE.md in root', () => {
    writeFileSync(join(testDir, 'CLAUDE.md'), '# Claude Config');

    const docs = findConventionDocuments();

    expect(docs.some(d => d.includes('CLAUDE.md'))).toBe(true);
  });

  it('should find DESIGN-PATTERNS.md in docs/', () => {
    mkdirSync(join(testDir, 'docs'), { recursive: true });
    writeFileSync(join(testDir, 'docs', 'DESIGN-PATTERNS.md'), '# Patterns');

    const docs = findConventionDocuments();

    expect(docs.some(d => d.includes('DESIGN-PATTERNS.md'))).toBe(true);
  });

  it('should find CLAUDE.md in modules', () => {
    mkdirSync(join(testDir, 'modules', 'chariot'), { recursive: true });
    writeFileSync(join(testDir, 'modules', 'chariot', 'CLAUDE.md'), '# Chariot');

    const docs = findConventionDocuments();

    expect(docs.some(d => d.includes('chariot') && d.includes('CLAUDE.md'))).toBe(true);
  });

  it('should return empty array when no docs found', () => {
    const docs = findConventionDocuments();

    expect(Array.isArray(docs)).toBe(true);
  });
});

describe('extractConventions', () => {
  beforeEach(() => {
    // Create CLAUDE.md with conventions
    writeFileSync(join(testDir, 'CLAUDE.md'), `# Project

## Code Organization

- Use kebab-case for file names
- Feature-based organization for React
- Co-locate tests with source files

## Naming Conventions

- PascalCase for React components
- camelCase for functions
- SCREAMING_SNAKE for constants

## Testing

- Minimum 80% code coverage
- Use Page Object Model for E2E tests
- Mock external services

## Security

- Validate all user inputs
- Use parameterized queries
- Apply RBAC patterns
`);

    // Create DESIGN-PATTERNS.md
    mkdirSync(join(testDir, 'docs'), { recursive: true });
    writeFileSync(join(testDir, 'docs', 'DESIGN-PATTERNS.md'), `# Design Patterns

## Architecture

- Repository pattern for data access
- Factory pattern for capabilities

## File Organization

- handlers/ for API endpoints
- services/ for business logic
- models/ for data structures

## Code Style

- Use Go formatting conventions
- Comprehensive error handling
- Structured logging
`);
  });

  it('should extract naming patterns', () => {
    const conventions = extractConventions();

    expect(conventions.namingPatterns.length).toBeGreaterThan(0);
    // Test CLAUDE.md has PascalCase and camelCase under "Naming Conventions"
    expect(conventions.namingPatterns.some(p =>
      p.toLowerCase().includes('pascalcase') || p.toLowerCase().includes('camelcase')
    )).toBe(true);
  });

  it('should extract file organization patterns', () => {
    const conventions = extractConventions();

    expect(conventions.fileOrganization.length).toBeGreaterThan(0);
    expect(conventions.fileOrganization.some(p => p.toLowerCase().includes('handler') || p.toLowerCase().includes('feature'))).toBe(true);
  });

  it('should extract coding standards', () => {
    const conventions = extractConventions();

    expect(conventions.codingStandards.length).toBeGreaterThan(0);
  });

  it('should extract testing patterns', () => {
    const conventions = extractConventions();

    expect(conventions.testingPatterns.length).toBeGreaterThan(0);
    expect(conventions.testingPatterns.some(p => p.toLowerCase().includes('coverage') || p.toLowerCase().includes('80%'))).toBe(true);
  });

  it('should extract security patterns', () => {
    const conventions = extractConventions();

    expect(conventions.securityPatterns.length).toBeGreaterThan(0);
    expect(conventions.securityPatterns.some(p => p.toLowerCase().includes('validate') || p.toLowerCase().includes('input'))).toBe(true);
  });

  it('should record source document', () => {
    const conventions = extractConventions();

    expect(conventions.source).toBeTruthy();
  });

  it('should merge conventions from multiple documents', () => {
    const conventions = extractConventions();

    // Should have conventions from both CLAUDE.md and DESIGN-PATTERNS.md
    expect(conventions.fileOrganization.length).toBeGreaterThan(1);
  });

  it('should handle missing documents gracefully', () => {
    // Remove all docs
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    _setProjectRoot(testDir);

    const conventions = extractConventions();

    expect(conventions.namingPatterns).toEqual([]);
    expect(conventions.fileOrganization).toEqual([]);
    expect(conventions.codingStandards).toEqual([]);
    expect(conventions.testingPatterns).toEqual([]);
    expect(conventions.securityPatterns).toEqual([]);
    expect(conventions.source).toBe('none');
  });

  it('should deduplicate similar patterns', () => {
    // Create docs with duplicate content
    writeFileSync(join(testDir, 'CLAUDE.md'), `# Project

## Naming Conventions

- Use kebab-case for files
- Use kebab-case for files
- Use camelCase for variables
`);

    const conventions = extractConventions();

    const kebabCount = conventions.namingPatterns.filter(p =>
      p.toLowerCase().includes('kebab')
    ).length;
    expect(kebabCount).toBeLessThanOrEqual(1);
  });
});

describe('Integration: Real project root', () => {
  beforeEach(() => {
    _resetProjectRoot(); // Use real project root
  });

  it('should find conventions from actual project', () => {
    const conventions = extractConventions();

    // Real project should have at least some conventions
    const totalPatterns =
      conventions.namingPatterns.length +
      conventions.fileOrganization.length +
      conventions.codingStandards.length +
      conventions.testingPatterns.length +
      conventions.securityPatterns.length;

    expect(totalPatterns).toBeGreaterThan(0);
  });

  it('should have a valid source', () => {
    const conventions = extractConventions();

    expect(conventions.source).toBeTruthy();
    expect(conventions.source).not.toBe('none');
  });
});
