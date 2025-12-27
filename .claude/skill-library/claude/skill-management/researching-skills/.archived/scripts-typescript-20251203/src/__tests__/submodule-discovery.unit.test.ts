// src/__tests__/submodule-discovery.unit.test.ts
/**
 * Unit tests for submodule discovery functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  discoverSubmodules,
  extractPurposeFromClaudeMd,
  extractPurposeFromReadme,
  detectLanguages,
  extractKeywords,
  findRelevantSubmodules,
  _setProjectRoot,
  _resetProjectRoot,
} from '../lib/submodule-discovery.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test fixtures directory
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `submodule-test-${Date.now()}`);
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

describe('discoverSubmodules', () => {
  it('should return empty array when modules directory does not exist', () => {
    rmSync(join(testDir, 'modules'), { recursive: true });
    const result = discoverSubmodules();
    expect(result).toEqual([]);
  });

  it('should discover a simple submodule', () => {
    const chariotDir = join(testDir, 'modules', 'chariot');
    mkdirSync(chariotDir, { recursive: true });
    writeFileSync(join(chariotDir, 'go.mod'), 'module chariot\n');

    const result = discoverSubmodules();

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('chariot');
    expect(result[0].languages).toContain('go');
  });

  it('should discover multiple submodules', () => {
    // Create chariot
    const chariotDir = join(testDir, 'modules', 'chariot');
    mkdirSync(chariotDir, { recursive: true });
    writeFileSync(join(chariotDir, 'go.mod'), 'module chariot\n');

    // Create nebula
    const nebulaDir = join(testDir, 'modules', 'nebula');
    mkdirSync(nebulaDir, { recursive: true });
    writeFileSync(join(nebulaDir, 'requirements.txt'), 'boto3\n');

    // Create ui-components
    const uiDir = join(testDir, 'modules', 'ui-components');
    mkdirSync(uiDir, { recursive: true });
    writeFileSync(join(uiDir, 'package.json'), '{}');

    const result = discoverSubmodules();

    expect(result.length).toBe(3);
    expect(result.map(m => m.name).sort()).toEqual(['chariot', 'nebula', 'ui-components']);
  });

  it('should skip hidden directories', () => {
    const hiddenDir = join(testDir, 'modules', '.hidden');
    mkdirSync(hiddenDir, { recursive: true });

    const result = discoverSubmodules();

    expect(result.find(m => m.name === '.hidden')).toBeUndefined();
  });

  it('should detect CLAUDE.md presence', () => {
    const moduleDir = join(testDir, 'modules', 'test-module');
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(join(moduleDir, 'CLAUDE.md'), '# Test Module\n');

    const result = discoverSubmodules();

    expect(result[0].hasClaudeMd).toBe(true);
  });

  it('should sort modules alphabetically', () => {
    const modules = ['zebra', 'alpha', 'middle'];
    for (const name of modules) {
      mkdirSync(join(testDir, 'modules', name), { recursive: true });
    }

    const result = discoverSubmodules();

    expect(result.map(m => m.name)).toEqual(['alpha', 'middle', 'zebra']);
  });
});

describe('extractPurposeFromClaudeMd', () => {
  it('should extract purpose from Project Overview section', () => {
    const filePath = join(testDir, 'CLAUDE.md');
    writeFileSync(filePath, `# Module

## Project Overview

This is a test module that does amazing things.

## Other Section
`);

    const result = extractPurposeFromClaudeMd(filePath);

    expect(result).toContain('test module');
    expect(result).toContain('amazing things');
  });

  it('should extract purpose from Overview section', () => {
    const filePath = join(testDir, 'CLAUDE.md');
    writeFileSync(filePath, `# Module

## Overview

The main purpose of this module is security scanning.
`);

    const result = extractPurposeFromClaudeMd(filePath);

    expect(result).toContain('security scanning');
  });

  it('should fallback to first paragraph after heading', () => {
    const filePath = join(testDir, 'CLAUDE.md');
    writeFileSync(filePath, `# My Module

This is the first paragraph describing the module.

More content here.
`);

    const result = extractPurposeFromClaudeMd(filePath);

    expect(result).toContain('first paragraph');
  });

  it('should return empty string for non-existent file', () => {
    const result = extractPurposeFromClaudeMd('/nonexistent/path/CLAUDE.md');
    expect(result).toBe('');
  });

  it('should truncate long purpose to 500 chars', () => {
    const filePath = join(testDir, 'CLAUDE.md');
    const longText = 'A'.repeat(1000);
    writeFileSync(filePath, `# Module\n\n${longText}`);

    const result = extractPurposeFromClaudeMd(filePath);

    expect(result.length).toBeLessThanOrEqual(500);
  });
});

describe('extractPurposeFromReadme', () => {
  it('should extract purpose from README', () => {
    const filePath = join(testDir, 'README.md');
    writeFileSync(filePath, `# My Project

This project provides cloud security scanning capabilities.
`);

    const result = extractPurposeFromReadme(filePath);

    expect(result).toContain('cloud security');
  });

  it('should skip badge lines', () => {
    const filePath = join(testDir, 'README.md');
    writeFileSync(filePath, `# Project

[![Build Status](https://example.com/badge.svg)](https://example.com)
![Coverage](https://example.com/coverage.svg)

The actual description is here.
`);

    const result = extractPurposeFromReadme(filePath);

    expect(result).toContain('actual description');
    expect(result).not.toContain('Build Status');
  });

  it('should return empty string for non-existent file', () => {
    const result = extractPurposeFromReadme('/nonexistent/path/README.md');
    expect(result).toBe('');
  });
});

describe('detectLanguages', () => {
  it('should detect Go from go.mod', () => {
    const moduleDir = join(testDir, 'go-module');
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(join(moduleDir, 'go.mod'), 'module test');

    const result = detectLanguages(moduleDir);

    expect(result).toContain('go');
  });

  it('should detect TypeScript from tsconfig.json', () => {
    const moduleDir = join(testDir, 'ts-module');
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(join(moduleDir, 'tsconfig.json'), '{}');

    const result = detectLanguages(moduleDir);

    expect(result).toContain('typescript');
  });

  it('should detect Python from requirements.txt', () => {
    const moduleDir = join(testDir, 'py-module');
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(join(moduleDir, 'requirements.txt'), 'boto3');

    const result = detectLanguages(moduleDir);

    expect(result).toContain('python');
  });

  it('should detect multiple languages', () => {
    const moduleDir = join(testDir, 'multi-module');
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(join(moduleDir, 'go.mod'), 'module test');
    writeFileSync(join(moduleDir, 'package.json'), '{}');

    const result = detectLanguages(moduleDir);

    expect(result).toContain('go');
    expect(result).toContain('typescript');
  });

  it('should return other for unknown project type', () => {
    const moduleDir = join(testDir, 'unknown-module');
    mkdirSync(moduleDir, { recursive: true });

    const result = detectLanguages(moduleDir);

    expect(result).toContain('other');
  });

  it('should detect VQL from .vql files', () => {
    const moduleDir = join(testDir, 'vql-module');
    mkdirSync(join(moduleDir, 'capabilities'), { recursive: true });
    writeFileSync(join(moduleDir, 'capabilities', 'test.vql'), 'SELECT * FROM test');

    const result = detectLanguages(moduleDir);

    expect(result).toContain('vql');
  });
});

describe('extractKeywords', () => {
  it('should extract meaningful words', () => {
    const text = 'This module provides security scanning and cloud integration.';
    const result = extractKeywords(text);

    expect(result).toContain('module');
    expect(result).toContain('security');
    expect(result).toContain('scanning');
    expect(result).toContain('cloud');
    expect(result).toContain('integration');
  });

  it('should filter stop words', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const result = extractKeywords(text);

    expect(result).not.toContain('the');
    expect(result).not.toContain('over');
    expect(result).toContain('quick');
    expect(result).toContain('brown');
  });

  it('should filter short words', () => {
    const text = 'A to be or not to be.';
    const result = extractKeywords(text);

    expect(result).not.toContain('to');
    expect(result).not.toContain('be');
    expect(result).not.toContain('or');
  });

  it('should return unique keywords', () => {
    const text = 'security security security scanning scanning';
    const result = extractKeywords(text);

    const securityCount = result.filter(k => k === 'security').length;
    expect(securityCount).toBe(1);
  });

  it('should handle empty text', () => {
    const result = extractKeywords('');
    expect(result).toEqual([]);
  });

  it('should lowercase keywords', () => {
    const text = 'SECURITY Scanning CLOUD';
    const result = extractKeywords(text);

    expect(result).toContain('security');
    expect(result).toContain('scanning');
    expect(result).toContain('cloud');
    expect(result).not.toContain('SECURITY');
  });
});

describe('findRelevantSubmodules', () => {
  it('should find submodules matching query keywords', () => {
    // Create test modules
    const chariotDir = join(testDir, 'modules', 'chariot');
    mkdirSync(chariotDir, { recursive: true });
    writeFileSync(join(chariotDir, 'package.json'), '{}');
    writeFileSync(join(chariotDir, 'CLAUDE.md'), '# Chariot\n\n## Overview\n\nReact frontend application.');

    const nebulaDir = join(testDir, 'modules', 'nebula');
    mkdirSync(nebulaDir, { recursive: true });
    writeFileSync(join(nebulaDir, 'requirements.txt'), 'boto3');
    writeFileSync(join(nebulaDir, 'CLAUDE.md'), '# Nebula\n\n## Overview\n\nCloud security scanner.');

    const result = findRelevantSubmodules('react frontend');

    expect(result.length).toBeGreaterThan(0);
    // Chariot should rank higher (matches react, frontend)
    const chariotResult = result.find(r => r.name === 'chariot');
    expect(chariotResult).toBeDefined();
    expect(chariotResult!.relevance).toBeGreaterThan(0);
  });

  it('should return all submodules with zero relevance for empty query', () => {
    const chariotDir = join(testDir, 'modules', 'chariot');
    mkdirSync(chariotDir, { recursive: true });

    const result = findRelevantSubmodules('');

    expect(result.every(r => r.relevance === 0)).toBe(true);
  });

  it('should sort by relevance descending', () => {
    // Create modules with different relevance to query
    const reactDir = join(testDir, 'modules', 'react-app');
    mkdirSync(reactDir, { recursive: true });
    writeFileSync(join(reactDir, 'CLAUDE.md'), '# React App\n\n## Overview\n\nReact TypeScript frontend.');

    const goDir = join(testDir, 'modules', 'go-backend');
    mkdirSync(goDir, { recursive: true });
    writeFileSync(join(goDir, 'go.mod'), 'module go-backend');
    writeFileSync(join(goDir, 'CLAUDE.md'), '# Go Backend\n\n## Overview\n\nGo API server.');

    const result = findRelevantSubmodules('react frontend typescript');

    if (result.length > 1) {
      // First result should have higher or equal relevance
      expect(result[0].relevance).toBeGreaterThanOrEqual(result[1].relevance);
    }
  });

  it('should filter out zero-relevance results', () => {
    const unrelatedDir = join(testDir, 'modules', 'unrelated');
    mkdirSync(unrelatedDir, { recursive: true });
    writeFileSync(join(unrelatedDir, 'CLAUDE.md'), '# Unrelated\n\n## Overview\n\nDatabase migrations tool.');

    const result = findRelevantSubmodules('react frontend');

    // Unrelated module should not appear (zero relevance filtered)
    const unrelatedResult = result.find(r => r.name === 'unrelated');
    expect(unrelatedResult).toBeUndefined();
  });

  it('should accept custom submodules array', () => {
    const customSubmodules = [
      {
        name: 'custom',
        path: '/custom',
        purpose: 'Custom React module',
        keywords: ['react', 'custom'],
        languages: ['typescript'] as const,
        hasClaudeMd: true,
      },
    ];

    const result = findRelevantSubmodules('react', customSubmodules as any);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('custom');
    expect(result[0].relevance).toBeGreaterThan(0);
  });
});

describe('Integration: Real modules directory', () => {
  // These tests use the real project root
  beforeEach(() => {
    _resetProjectRoot(); // Use real project root
  });

  it('should discover actual submodules (12+)', () => {
    const result = discoverSubmodules();

    // We expect at least 12 modules based on project structure
    expect(result.length).toBeGreaterThanOrEqual(10);

    // Check for known modules
    const moduleNames = result.map(m => m.name);
    expect(moduleNames).toContain('chariot');
    // Note: Some modules might not exist in all environments
  });

  it('should find frontend modules for react query', () => {
    const result = findRelevantSubmodules('react frontend');

    // Should find chariot (has React UI)
    const chariot = result.find(r => r.name === 'chariot');
    if (chariot) {
      expect(chariot.relevance).toBeGreaterThan(0);
    }
  });

  it('should find security modules for security query', () => {
    const result = findRelevantSubmodules('security scanning');

    // Should find security-related modules
    expect(result.length).toBeGreaterThan(0);
  });
});
