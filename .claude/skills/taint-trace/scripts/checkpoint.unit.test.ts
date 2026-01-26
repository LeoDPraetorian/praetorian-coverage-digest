import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadCheckpointFromFile, saveCheckpointToFile, mergePartialResults } from '../lib/checkpoint.js';
import fs from 'fs';
import path from 'path';

describe('Checkpoint - Load from File', () => {
  const tempFile = path.join(process.cwd(), '.test-checkpoint-load.json');

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('should load checkpoint from file', () => {
    const checkpoint = {
      phase: 2,
      functions_analyzed: 50,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(tempFile, JSON.stringify(checkpoint));

    const loaded = loadCheckpointFromFile(tempFile);
    expect(loaded).not.toBeNull();
    expect(loaded?.phase).toBe(2);
    expect(loaded?.functions_analyzed).toBe(50);
  });

  it('should return null for missing file', () => {
    const result = loadCheckpointFromFile('nonexistent.json');
    expect(result).toBeNull();
  });
});

describe('Checkpoint - Save to File', () => {
  const tempFile = path.join(process.cwd(), '.test-checkpoint-save.json');

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('should save checkpoint to file', () => {
    const checkpoint = {
      phase: 2,
      functions_analyzed: 75
    };

    saveCheckpointToFile(tempFile, checkpoint);

    expect(fs.existsSync(tempFile)).toBe(true);
    const loaded = JSON.parse(fs.readFileSync(tempFile, 'utf-8'));
    expect(loaded.phase).toBe(2);
    expect(loaded.functions_analyzed).toBe(75);
  });
});

describe('Checkpoint - Merge Partial Results', () => {
  it('should merge new results with checkpoint', () => {
    const checkpoint = {
      phase: 2,
      functions_analyzed: 50,
      paths: [{ source: 'recv', sink: 'strcpy' }]
    };

    const newResults = {
      functions_analyzed: 25,
      paths: [{ source: 'fread', sink: 'system' }]
    };

    const merged = mergePartialResults(checkpoint, newResults);

    expect(merged.functions_analyzed).toBe(75);
    expect(merged.paths).toHaveLength(2);
    expect(merged.paths).toEqual([
      { source: 'recv', sink: 'strcpy' },
      { source: 'fread', sink: 'system' }
    ]);
  });

  it('should handle checkpoint without paths array', () => {
    const checkpoint = {
      phase: 2,
      functions_analyzed: 50
    };

    const newResults = {
      functions_analyzed: 25,
      paths: [{ source: 'fread', sink: 'system' }]
    };

    const merged = mergePartialResults(checkpoint, newResults);

    expect(merged.functions_analyzed).toBe(75);
    expect(merged.paths).toHaveLength(1);
    expect(merged.paths).toEqual([
      { source: 'fread', sink: 'system' }
    ]);
  });

  it('should handle newResults without paths array', () => {
    const checkpoint = {
      phase: 2,
      functions_analyzed: 50,
      paths: [{ source: 'recv', sink: 'strcpy' }]
    };

    const newResults = {
      functions_analyzed: 25
    };

    const merged = mergePartialResults(checkpoint, newResults);

    expect(merged.functions_analyzed).toBe(75);
    expect(merged.paths).toHaveLength(1);
    expect(merged.paths).toEqual([
      { source: 'recv', sink: 'strcpy' }
    ]);
  });
});
