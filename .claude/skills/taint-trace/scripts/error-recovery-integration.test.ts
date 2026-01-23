import { describe, it, expect, afterEach } from 'vitest';
import {
  formatDecompilationFailurePrompt,
  parseUserChoice,
  executeDisassemblyFallback,
  executeSkipFunction,
  formatCrossReferenceTimeoutPrompt,
} from '../lib/error-recovery.js';
import { loadCheckpointFromFile, saveCheckpointToFile, mergePartialResults } from '../lib/checkpoint.js';
import fs from 'fs';

describe('Integration - Decompilation Failure Recovery', () => {
  it('should handle user choosing disassembly fallback', async () => {
    const prompt = formatDecompilationFailurePrompt('main', '0x401000');
    expect(prompt).toBeDefined();
    expect(prompt).toContain('main');
    expect(prompt).toContain('0x401000');

    const userChoice = parseUserChoice('A');
    expect(userChoice).toBe('A');

    const result = await executeDisassemblyFallback('binary.exe', 'main');
    expect(result.confidence).toBe('low');
    expect(result.code).toContain('Disassembly fallback');
  });

  it('should handle user choosing skip', () => {
    const prompt = formatDecompilationFailurePrompt('processPacket', 'timeout');
    expect(prompt).toContain('processPacket');

    const userChoice = parseUserChoice('B');
    expect(userChoice).toBe('B');

    const result = executeSkipFunction('processPacket');

    expect(result.skipped).toBe(true);
    expect(result.function).toBe('processPacket');
  });
});

describe('Integration - Timeout Recovery', () => {
  it('should handle cross-reference timeout', () => {
    const prompt = formatCrossReferenceTimeoutPrompt('recv', 450);
    expect(prompt).toContain('450');
    expect(prompt).toContain('recv');

    const choice = parseUserChoice('A'); // Continue with partial
    expect(choice).toBe('A');
  });

  it('should handle timeout with skip option', () => {
    const prompt = formatCrossReferenceTimeoutPrompt('send', 200);
    expect(prompt).toContain('200');

    const choice = parseUserChoice('C'); // Skip
    expect(choice).toBe('C');

    const result = executeSkipFunction('send');
    expect(result.skipped).toBe(true);
  });
});

describe('Integration - Full Resume from Checkpoint', () => {
  const tempFile = '.test-resume-checkpoint.json';

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('should save, load, and merge checkpoint', () => {
    // Save initial checkpoint
    const initial = {
      phase: 2,
      functions_analyzed: 50,
      paths: [{ source: 'recv', sink: 'strcpy' }],
    };
    saveCheckpointToFile(tempFile, initial);

    // Simulate crash and resume
    const loaded = loadCheckpointFromFile(tempFile);
    expect(loaded).not.toBeNull();
    expect(loaded?.phase).toBe(2);
    expect(loaded?.functions_analyzed).toBe(50);

    // Merge new results
    const newResults = {
      functions_analyzed: 25,
      paths: [{ source: 'fread', sink: 'system' }],
    };
    const merged = mergePartialResults(loaded!, newResults);

    expect(merged.functions_analyzed).toBe(75);
    expect(merged.paths).toHaveLength(2);
    expect(merged.paths).toEqual([
      { source: 'recv', sink: 'strcpy' },
      { source: 'fread', sink: 'system' },
    ]);
  });

  it('should handle resume with empty checkpoint paths', () => {
    const initial = {
      phase: 2,
      functions_analyzed: 30,
    };
    saveCheckpointToFile(tempFile, initial);

    const loaded = loadCheckpointFromFile(tempFile);
    expect(loaded).not.toBeNull();

    const newResults = {
      functions_analyzed: 20,
      paths: [{ source: 'scanf', sink: 'sprintf' }],
    };
    const merged = mergePartialResults(loaded!, newResults);

    expect(merged.functions_analyzed).toBe(50);
    expect(merged.paths).toHaveLength(1);
  });
});
