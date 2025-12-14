/**
 * Unit tests for Phase 13: TodoWrite Mandate Detection
 */

import { Phase13StateExternalization } from '../phase13-state-externalization.js';

describe('Phase13StateExternalization - Mandate Detection', () => {
  test('detects strong mandate with MUST', () => {
    const content = 'You MUST use TodoWrite before starting this workflow.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('STRONG');
    expect(mandate.examples.length).toBeGreaterThan(0);
    expect(mandate.examples[0]).toContain('MUST');
  });

  test('detects strong mandate with REQUIRED', () => {
    // Regex pattern expects "REQUIRED ... TodoWrite" (REQUIRED before TodoWrite)
    const content = 'This is REQUIRED to use TodoWrite for this multi-step process.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('STRONG');
    expect(mandate.examples[0]).toContain('REQUIRED');
  });

  test('detects strong mandate with CRITICAL', () => {
    const content = 'CRITICAL: Use TodoWrite to track all steps in this workflow.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('STRONG');
    expect(mandate.examples[0]).toContain('CRITICAL');
  });

  test('detects strong mandate with BEFORE', () => {
    const content = 'Use TodoWrite BEFORE starting to ensure state tracking.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('STRONG');
    expect(mandate.examples[0]).toContain('BEFORE');
  });

  test('detects strong mandate with MANDATORY', () => {
    const content = 'TodoWrite is MANDATORY for complex multi-phase workflows.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('STRONG');
    expect(mandate.examples[0]).toContain('MANDATORY');
  });

  test('detects weak mandate with should', () => {
    const content = 'You should use TodoWrite to track progress in this workflow.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('WEAK');
    expect(mandate.examples[0]).toContain('should');
  });

  test('detects weak mandate with recommend', () => {
    const content = 'We recommend using TodoWrite for state management.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('WEAK');
    expect(mandate.examples[0]).toContain('recommend');
  });

  test('detects weak mandate with consider', () => {
    const content = 'Consider using TodoWrite to maintain task awareness.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('WEAK');
    // Case-insensitive check since matched text starts with capital 'Consider'
    expect(mandate.examples[0].toLowerCase()).toContain('consider');
  });

  test('detects weak mandate with suggest', () => {
    const content = 'We suggest TodoWrite for tracking multi-step processes.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('WEAK');
    expect(mandate.examples[0]).toContain('suggest');
  });

  test('detects missing mandate', () => {
    const content = 'This is a skill about data processing and validation.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('MISSING');
    expect(mandate.examples.length).toBe(0);
  });

  test('is case-insensitive', () => {
    const content = 'you must use todowrite before starting.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('STRONG');
  });

  test('prefers strong over weak patterns', () => {
    const content = 'You should consider this workflow, but you MUST use TodoWrite before starting.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('STRONG');
    expect(mandate.examples[0]).toContain('MUST');
  });

  test('handles TodoWrite mentioned without mandate', () => {
    const content = 'The TodoWrite tool is available for tracking tasks.';
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('MISSING');
  });

  test('matches TodoWrite in context', () => {
    const content = `
      ## State Tracking

      You MUST use TodoWrite BEFORE starting this workflow.

      TodoWrite helps prevent context drift.
    `;
    const mandate = (Phase13StateExternalization as any).detectTodoWriteMandate(content);
    expect(mandate.strength).toBe('STRONG');
  });
});
