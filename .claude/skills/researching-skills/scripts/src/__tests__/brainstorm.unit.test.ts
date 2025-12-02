// src/__tests__/brainstorm.unit.test.ts
/**
 * Unit tests for brainstorming phase
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BRAINSTORM_QUESTIONS,
  generateDynamicOptions,
  getAnswer,
  shouldShowQuestion,
  getNextQuestion,
  generateSearchPatterns,
  generateContext7Query,
  buildRequirements,
  suggestWorkflows,
  questionToJson,
  runBrainstormingWithAnswers,
  getAllQuestionsAsJson,
  validateAnswer,
} from '../phases/brainstorm.js';
import { _setProjectRoot, _resetProjectRoot } from '../lib/categories.js';
import type { BrainstormAnswer, SkillType } from '../lib/types.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test fixtures directory
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `brainstorm-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, '.claude', 'skill-library', 'development', 'frontend'), { recursive: true });
  _setProjectRoot(testDir);
});

afterEach(() => {
  _resetProjectRoot();
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('BRAINSTORM_QUESTIONS', () => {
  it('should have required questions', () => {
    const ids = BRAINSTORM_QUESTIONS.map(q => q.id);

    expect(ids).toContain('skillType');
    expect(ids).toContain('location');
    expect(ids).toContain('purpose');
    expect(ids).toContain('workflows');
    expect(ids).toContain('audience');
  });

  it('should have valid question types', () => {
    for (const question of BRAINSTORM_QUESTIONS) {
      expect(['select', 'multiselect', 'text']).toContain(question.type);
    }
  });

  it('should mark required questions', () => {
    const skillType = BRAINSTORM_QUESTIONS.find(q => q.id === 'skillType');
    const purpose = BRAINSTORM_QUESTIONS.find(q => q.id === 'purpose');

    expect(skillType?.required).toBe(true);
    expect(purpose?.required).toBe(true);
  });

  it('should have dependencies defined correctly', () => {
    const category = BRAINSTORM_QUESTIONS.find(q => q.id === 'category');
    const libraryName = BRAINSTORM_QUESTIONS.find(q => q.id === 'libraryName');

    expect(category?.dependsOn?.questionId).toBe('location');
    expect(category?.dependsOn?.values).toContain('library');

    expect(libraryName?.dependsOn?.questionId).toBe('skillType');
    expect(libraryName?.dependsOn?.values).toContain('library');
  });
});

describe('getAnswer', () => {
  it('should return answer value for existing question', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
      { questionId: 'location', value: 'core' },
    ];

    expect(getAnswer(answers, 'skillType')).toBe('library');
    expect(getAnswer(answers, 'location')).toBe('core');
  });

  it('should return undefined for unanswered question', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
    ];

    expect(getAnswer(answers, 'purpose')).toBeUndefined();
  });

  it('should handle array values', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'workflows', value: ['setup', 'testing'] },
    ];

    expect(getAnswer(answers, 'workflows')).toEqual(['setup', 'testing']);
  });
});

describe('shouldShowQuestion', () => {
  it('should return true for questions without dependencies', () => {
    const skillType = BRAINSTORM_QUESTIONS.find(q => q.id === 'skillType')!;
    const answers: BrainstormAnswer[] = [];

    expect(shouldShowQuestion(skillType, answers)).toBe(true);
  });

  it('should return true when dependency is satisfied', () => {
    const category = BRAINSTORM_QUESTIONS.find(q => q.id === 'category')!;
    const answers: BrainstormAnswer[] = [
      { questionId: 'location', value: 'library' },
    ];

    expect(shouldShowQuestion(category, answers)).toBe(true);
  });

  it('should return false when dependency is not satisfied', () => {
    const category = BRAINSTORM_QUESTIONS.find(q => q.id === 'category')!;
    const answers: BrainstormAnswer[] = [
      { questionId: 'location', value: 'core' },
    ];

    expect(shouldShowQuestion(category, answers)).toBe(false);
  });

  it('should return false when dependency question not answered', () => {
    const category = BRAINSTORM_QUESTIONS.find(q => q.id === 'category')!;
    const answers: BrainstormAnswer[] = [];

    expect(shouldShowQuestion(category, answers)).toBe(false);
  });

  it('should handle array values in dependency check', () => {
    const libraryName = BRAINSTORM_QUESTIONS.find(q => q.id === 'libraryName')!;

    const answersWithLibrary: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
    ];
    expect(shouldShowQuestion(libraryName, answersWithLibrary)).toBe(true);

    const answersWithProcess: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'process' },
    ];
    expect(shouldShowQuestion(libraryName, answersWithProcess)).toBe(false);
  });
});

describe('getNextQuestion', () => {
  it('should return first question when no answers', () => {
    const next = getNextQuestion([]);

    expect(next).not.toBeNull();
    expect(next?.id).toBe('skillType');
  });

  it('should return next unanswered question', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'process' },
    ];

    const next = getNextQuestion(answers);
    expect(next?.id).toBe('location');
  });

  it('should skip questions with unmet dependencies', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'process' },
      { questionId: 'location', value: 'core' }, // Skips category (needs library)
    ];

    const next = getNextQuestion(answers);
    // Should skip category and go to purpose
    expect(next?.id).toBe('purpose');
  });

  it('should return null when all questions answered', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'process' },
      { questionId: 'location', value: 'core' },
      { questionId: 'purpose', value: 'Test purpose' },
      { questionId: 'workflows', value: ['setup'] },
      { questionId: 'audience', value: 'intermediate' },
      { questionId: 'contentPreferences', value: ['templates'] },
    ];

    const next = getNextQuestion(answers);
    expect(next).toBeNull();
  });
});

describe('generateDynamicOptions', () => {
  beforeEach(() => {
    // Create test categories
    const libPath = join(testDir, '.claude', 'skill-library');
    const frontendPath = join(libPath, 'development', 'frontend');
    mkdirSync(frontendPath, { recursive: true });
    const skill = join(frontendPath, 'frontend-react');
    mkdirSync(skill, { recursive: true });
    writeFileSync(join(skill, 'SKILL.md'), '# React');
  });

  it('should generate category options from filesystem', () => {
    const options = generateDynamicOptions('category', [], 'test');

    expect(options.length).toBeGreaterThan(0);
    expect(options.some(o => o.value.includes('development'))).toBe(true);
  });

  it('should generate workflow options based on skill type', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
    ];

    const options = generateDynamicOptions('workflows', answers, 'test');

    expect(options.some(o => o.value === 'installation')).toBe(true);
    expect(options.some(o => o.value === 'basic-usage')).toBe(true);
  });

  it('should include custom option in workflows', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'process' },
    ];

    const options = generateDynamicOptions('workflows', answers, 'test');

    expect(options.some(o => o.value === 'custom')).toBe(true);
  });

  it('should return empty array for unknown question', () => {
    const options = generateDynamicOptions('unknown', [], 'test');

    expect(options).toEqual([]);
  });
});

describe('generateSearchPatterns', () => {
  it('should extract keywords from prompt', () => {
    const answers: BrainstormAnswer[] = [];

    const patterns = generateSearchPatterns(answers, 'react hooks state management');

    expect(patterns).toContain('react');
    expect(patterns).toContain('hooks');
    expect(patterns).toContain('state');
  });

  it('should include library name', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'libraryName', value: '@tanstack/query' },
    ];

    const patterns = generateSearchPatterns(answers, 'data fetching');

    expect(patterns).toContain('@tanstack/query');
  });

  it('should extract keywords from purpose', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'purpose', value: 'Manage global application state' },
    ];

    const patterns = generateSearchPatterns(answers, 'test');

    expect(patterns).toContain('global');
    expect(patterns).toContain('application');
    expect(patterns).toContain('state');
  });

  it('should deduplicate patterns', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'purpose', value: 'React state management' },
    ];

    const patterns = generateSearchPatterns(answers, 'react state');

    // Should not have duplicates
    const unique = [...new Set(patterns)];
    expect(patterns.length).toBe(unique.length);
  });

  it('should filter short patterns', () => {
    const answers: BrainstormAnswer[] = [];

    // extractKeywords filters words < 3 characters
    const patterns = generateSearchPatterns(answers, 'a ab abc defg');

    // Should not include 'a' or 'ab' (< 3 chars)
    expect(patterns).not.toContain('a');
    expect(patterns).not.toContain('ab');
    expect(patterns).toContain('abc');
    expect(patterns).toContain('defg');
  });
});

describe('generateContext7Query', () => {
  it('should return library name for library type', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
      { questionId: 'libraryName', value: 'zustand' },
    ];

    const query = generateContext7Query(answers, 'state management');

    expect(query).toBe('zustand');
  });

  it('should return library name for integration type', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'integration' },
      { questionId: 'libraryName', value: 'stripe' },
    ];

    const query = generateContext7Query(answers, 'payment');

    expect(query).toBe('stripe');
  });

  it('should return null for process type', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'process' },
    ];

    const query = generateContext7Query(answers, 'debugging');

    expect(query).toBeNull();
  });

  it('should fall back to prompt keywords', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
    ];

    const query = generateContext7Query(answers, 'tanstack query data fetching');

    expect(query).toBe('tanstack');
  });
});

describe('buildRequirements', () => {
  it('should build complete requirements from answers', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
      { questionId: 'location', value: 'library' },
      { questionId: 'category', value: 'development/frontend' },
      { questionId: 'purpose', value: 'Manage state with Zustand' },
      { questionId: 'workflows', value: ['installation', 'basic-usage'] },
      { questionId: 'audience', value: 'intermediate' },
      { questionId: 'contentPreferences', value: ['templates', 'examples'] },
      { questionId: 'libraryName', value: 'zustand' },
    ];

    const requirements = buildRequirements('frontend-zustand', 'zustand state', answers);

    expect(requirements.name).toBe('frontend-zustand');
    expect(requirements.skillType).toBe('library');
    expect(requirements.location).toEqual({ library: 'development/frontend' });
    expect(requirements.purpose).toBe('Manage state with Zustand');
    expect(requirements.workflows).toEqual(['installation', 'basic-usage']);
    expect(requirements.audience).toBe('intermediate');
    expect(requirements.contentPreferences).toEqual(['templates', 'examples']);
    expect(requirements.libraryName).toBe('zustand');
  });

  it('should use core location when selected', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'process' },
      { questionId: 'location', value: 'core' },
      { questionId: 'purpose', value: 'Test purpose' },
    ];

    const requirements = buildRequirements('test-skill', 'test', answers);

    expect(requirements.location).toBe('core');
  });

  it('should use defaults for missing optional answers', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'process' },
      { questionId: 'location', value: 'library' },
      { questionId: 'purpose', value: 'Test purpose' },
    ];

    const requirements = buildRequirements('test-skill', 'test', answers);

    expect(requirements.audience).toBe('intermediate');
    expect(requirements.contentPreferences).toEqual(['templates', 'examples', 'best-practices']);
  });

  it('should generate search patterns', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
      { questionId: 'location', value: 'library' },
      { questionId: 'purpose', value: 'React hooks' },
      { questionId: 'libraryName', value: 'react' },
    ];

    const requirements = buildRequirements('react-hooks', 'react hooks patterns', answers);

    expect(requirements.searchPatterns.length).toBeGreaterThan(0);
    expect(requirements.searchPatterns).toContain('react');
  });

  it('should generate context7 query for library type', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
      { questionId: 'location', value: 'library' },
      { questionId: 'purpose', value: 'State management' },
      { questionId: 'libraryName', value: 'zustand' },
    ];

    const requirements = buildRequirements('zustand-skill', 'zustand', answers);

    expect(requirements.context7Query).toBe('zustand');
  });
});

describe('suggestWorkflows', () => {
  it('should suggest base workflows for skill type', () => {
    const suggestions = suggestWorkflows('test', 'library');

    expect(suggestions).toContain('installation');
    expect(suggestions).toContain('basic-usage');
  });

  it('should suggest workflows based on prompt keywords', () => {
    const suggestions = suggestWorkflows('testing and debugging', 'process');

    expect(suggestions).toContain('testing');
    expect(suggestions).toContain('troubleshooting');
  });

  it('should deduplicate suggestions', () => {
    const suggestions = suggestWorkflows('test testing verification', 'process');

    const unique = [...new Set(suggestions)];
    expect(suggestions.length).toBe(unique.length);
  });
});

describe('questionToJson', () => {
  it('should convert question to JSON format', () => {
    const question = BRAINSTORM_QUESTIONS.find(q => q.id === 'skillType')!;

    const json = questionToJson(question, [], 'test');

    expect(json.question).toBe(question.question);
    expect(json.header).toBe('skillType');
    expect(json.multiSelect).toBe(false);
    expect(json.options.length).toBeGreaterThan(0);
  });

  it('should set multiSelect for multiselect questions', () => {
    const question = BRAINSTORM_QUESTIONS.find(q => q.id === 'workflows')!;

    const json = questionToJson(question, [{ questionId: 'skillType', value: 'library' }], 'test');

    expect(json.multiSelect).toBe(true);
  });

  it('should truncate header to 12 chars', () => {
    const question = BRAINSTORM_QUESTIONS.find(q => q.id === 'contentPreferences')!;

    const json = questionToJson(question, [], 'test');

    expect(json.header.length).toBeLessThanOrEqual(12);
  });
});

describe('runBrainstormingWithAnswers', () => {
  it('should return complete result with requirements', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'process' },
      { questionId: 'location', value: 'core' },
      { questionId: 'purpose', value: 'Test debugging' },
      { questionId: 'workflows', value: ['setup'] },
      { questionId: 'audience', value: 'intermediate' },
      { questionId: 'contentPreferences', value: ['templates'] },
    ];

    const result = runBrainstormingWithAnswers('debugging-skill', 'debugging', answers);

    expect(result.requirements.name).toBe('debugging-skill');
    expect(result.requirements.skillType).toBe('process');
    expect(result.session.completedAt).toBeTruthy();
    expect(result.suggestedWorkflows.length).toBeGreaterThan(0);
  });

  it('should throw error for missing required answers', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'location', value: 'core' },
      // Missing skillType and purpose
    ];

    expect(() =>
      runBrainstormingWithAnswers('test', 'test', answers)
    ).toThrow(/Missing required answer.*skillType/);
  });
});

describe('getAllQuestionsAsJson', () => {
  it('should return questions formatted for Claude', () => {
    const questions = getAllQuestionsAsJson([], 'test');

    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]).toHaveProperty('id');
    expect(questions[0]).toHaveProperty('question');
    expect(questions[0]).toHaveProperty('options');
  });

  it('should respect dependencies', () => {
    const questions = getAllQuestionsAsJson([], 'test');

    // Category should not be in list (depends on location=library)
    expect(questions.some(q => q.id === 'category')).toBe(false);

    // With location=library, category should appear
    const withLocation = getAllQuestionsAsJson(
      [{ questionId: 'location', value: 'library' }],
      'test'
    );
    expect(withLocation.some(q => q.id === 'category')).toBe(true);
  });
});

describe('validateAnswer', () => {
  it('should accept valid select answers', () => {
    expect(validateAnswer('skillType', 'library', [], 'test')).toBe(true);
    expect(validateAnswer('skillType', 'process', [], 'test')).toBe(true);
  });

  it('should reject invalid select answers', () => {
    expect(() =>
      validateAnswer('skillType', 'invalid', [], 'test')
    ).toThrow(/Invalid value/);
  });

  it('should accept any text for text questions', () => {
    expect(validateAnswer('purpose', 'Any text here', [], 'test')).toBe(true);
  });

  it('should reject empty required answers', () => {
    expect(() =>
      validateAnswer('skillType', '', [], 'test')
    ).toThrow(/requires an answer/);
  });

  it('should throw for unknown questions', () => {
    expect(() =>
      validateAnswer('unknownQuestion', 'value', [], 'test')
    ).toThrow(/Unknown question/);
  });

  it('should accept valid multiselect answers', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
    ];

    expect(validateAnswer(
      'workflows',
      ['installation', 'basic-usage'],
      answers,
      'test'
    )).toBe(true);
  });

  it('should allow custom values for multiselect', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
    ];

    expect(validateAnswer(
      'workflows',
      ['custom-workflow'],
      answers,
      'test'
    )).toBe(true);
  });
});
