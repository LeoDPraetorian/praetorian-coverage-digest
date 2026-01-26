// cache.unit.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { hashBinaryPath, loadCache, saveCache } from '../lib/cache.js';

describe('Cache - Path Hashing', () => {
  it('should generate consistent hash for same path', () => {
    const hash1 = hashBinaryPath('/bins/server.exe');
    const hash2 = hashBinaryPath('/bins/server.exe');
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different paths', () => {
    const hash1 = hashBinaryPath('/bins/server.exe');
    const hash2 = hashBinaryPath('/bins/client.exe');
    expect(hash1).not.toBe(hash2);
  });

  it('should generate short alphanumeric hash', () => {
    const hash = hashBinaryPath('/bins/server.exe');
    expect(hash).toMatch(/^[a-z0-9]{8,16}$/);
  });
});

describe('Cache - Load/Save', () => {
  const TEST_CACHE_DIR = './.test-cache';
  const TEST_BINARY = '/test/binary.exe';

  beforeEach(() => {
    // Create test cache directory
    if (!fs.existsSync(TEST_CACHE_DIR)) {
      fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup test cache
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  it('should return null for non-existent cache', () => {
    const result = loadCache(TEST_BINARY, TEST_CACHE_DIR);
    expect(result).toBeNull();
  });

  it('should save and load cache successfully', () => {
    const data = {
      binary_path: TEST_BINARY,
      analyzed_at: new Date().toISOString(),
      sources: [],
      paths: []
    };

    saveCache(TEST_BINARY, data, TEST_CACHE_DIR);
    const loaded = loadCache(TEST_BINARY, TEST_CACHE_DIR);

    expect(loaded).toEqual(data);
  });

  it('should overwrite existing cache', () => {
    const data1 = { binary_path: TEST_BINARY, analyzed_at: '2024-01-01', sources: [], paths: ['path1'] };
    const data2 = { binary_path: TEST_BINARY, analyzed_at: '2024-01-02', sources: [], paths: ['path2'] };

    saveCache(TEST_BINARY, data1, TEST_CACHE_DIR);
    saveCache(TEST_BINARY, data2, TEST_CACHE_DIR);

    const loaded = loadCache(TEST_BINARY, TEST_CACHE_DIR);
    expect(loaded).toEqual(data2);
  });
});
