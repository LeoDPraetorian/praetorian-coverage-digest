import { describe, it, expect } from 'vitest';
import {
  formatDecompilationFailurePrompt,
  formatCrossReferenceTimeoutPrompt,
  formatServerCrashPrompt,
  parseUserChoice,
  executeDisassemblyFallback,
  executeSkipFunction,
} from '../lib/error-recovery';

describe('Error Recovery - Decompilation Failure', () => {
  it('should format decompilation failure recovery prompt', () => {
    const prompt = formatDecompilationFailurePrompt('processPacket', 'timeout after 30s');

    expect(prompt).toContain('processPacket');
    expect(prompt).toContain('timeout after 30s');
    expect(prompt).toContain('A) Continue with disassembly');
    expect(prompt).toContain('B) Skip this function');
    expect(prompt).toContain('C) Retry decompilation');
    expect(prompt).toContain('D) Abort analysis');
  });
});

describe('Error Recovery - Cross-Reference Timeout', () => {
  it('should format timeout recovery prompt', () => {
    const prompt = formatCrossReferenceTimeoutPrompt('recv', 450);

    expect(prompt).toContain('recv');
    expect(prompt).toContain('450');
    expect(prompt).toContain('A) Continue with partial results');
    expect(prompt).toContain('B) Increase timeout');
    expect(prompt).toContain('C) Skip');
    expect(prompt).toContain('D) Abort');
  });
});

describe('Error Recovery - Server Crash', () => {
  it('should format server crash recovery prompt', () => {
    const prompt = formatServerCrashPrompt(120, 203);

    expect(prompt).toContain('120');
    expect(prompt).toContain('203');
    expect(prompt).toContain('A) Restart server and resume');
    expect(prompt).toContain('B) Restart from beginning');
    expect(prompt).toContain('C) Abort and show partial results');
  });
});

describe('Error Recovery - Parse User Choice', () => {
  it('should parse single letter choice', () => {
    expect(parseUserChoice('A')).toBe('A');
    expect(parseUserChoice('a')).toBe('A');
    expect(parseUserChoice('B')).toBe('B');
  });

  it('should handle invalid choices', () => {
    expect(() => parseUserChoice('X')).toThrow('Invalid choice');
    expect(() => parseUserChoice('')).toThrow('Invalid choice');
  });
});

describe('Error Recovery - Execute Disassembly Fallback', () => {
  it('should return placeholder disassembly data', async () => {
    const result = await executeDisassemblyFallback('binary.exe', 'main');

    expect(result.code).toBeDefined();
    expect(result.code).toContain('disassembly');
    expect(result.confidence).toBe('low');
  });
});

describe('Error Recovery - Execute Skip Function', () => {
  it('should mark function as skipped', () => {
    const result = executeSkipFunction('processPacket');

    expect(result.skipped).toBe(true);
    expect(result.function).toBe('processPacket');
  });
});
