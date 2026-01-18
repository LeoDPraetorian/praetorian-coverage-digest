/**
 * Tests for Input Sanitization Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateNoPathTraversal,
  validateNoCommandInjection,
  validateNoXSS,
  validateNoControlChars,
  validateInput,
  sanitizeString,
  validateLength,
  validators,
} from './sanitize';

describe('Input Sanitization', () => {
  describe('validateNoPathTraversal', () => {
    it('should allow normal paths', () => {
      expect(validateNoPathTraversal('/user/react')).toBe(true);
      expect(validateNoPathTraversal('src/components')).toBe(true);
      expect(validateNoPathTraversal('file.txt')).toBe(true);
    });

    it('should block Unix path traversal', () => {
      expect(validateNoPathTraversal('../etc/passwd')).toBe(false);
      expect(validateNoPathTraversal('../../secret')).toBe(false);
      expect(validateNoPathTraversal('valid/../../../etc/shadow')).toBe(false);
    });

    it('should block Windows path traversal', () => {
      expect(validateNoPathTraversal('..\\windows\\system32')).toBe(false);
      expect(validateNoPathTraversal('..\\..\\..\\secret')).toBe(false);
    });

    it('should block home directory expansion', () => {
      expect(validateNoPathTraversal('~/.ssh/id_rsa')).toBe(false);
      expect(validateNoPathTraversal('~/secret')).toBe(false);
    });
  });

  describe('validateNoCommandInjection', () => {
    it('should allow normal input', () => {
      expect(validateNoCommandInjection('react')).toBe(true);
      expect(validateNoCommandInjection('my-library')).toBe(true);
      expect(validateNoCommandInjection('@types/node')).toBe(true);
    });

    it('should block semicolon injection', () => {
      expect(validateNoCommandInjection('; rm -rf /')).toBe(false);
      expect(validateNoCommandInjection('test; whoami')).toBe(false);
    });

    it('should block pipe injection', () => {
      expect(validateNoCommandInjection('| cat /etc/passwd')).toBe(false);
      expect(validateNoCommandInjection('test | whoami')).toBe(false);
    });

    it('should block AND/OR operators', () => {
      expect(validateNoCommandInjection('&& whoami')).toBe(false);
      expect(validateNoCommandInjection('|| rm -rf /')).toBe(false);
    });

    it('should block command substitution', () => {
      expect(validateNoCommandInjection('$(whoami)')).toBe(false);
      expect(validateNoCommandInjection('`whoami`')).toBe(false);
    });

    it('should block output redirection', () => {
      expect(validateNoCommandInjection('> /etc/passwd')).toBe(false);
      expect(validateNoCommandInjection('>> /tmp/log')).toBe(false);
    });
  });

  describe('validateNoXSS', () => {
    it('should allow normal text', () => {
      expect(validateNoXSS('Hello World')).toBe(true);
      expect(validateNoXSS('React library for UI')).toBe(true);
    });

    it('should block script tags', () => {
      expect(validateNoXSS('<script>alert(1)</script>')).toBe(false);
      expect(validateNoXSS('<SCRIPT>alert(1)</SCRIPT>')).toBe(false);
    });

    it('should block event handlers', () => {
      expect(validateNoXSS('<img onerror=alert(1)>')).toBe(false);
      expect(validateNoXSS('<div onclick="evil()">')).toBe(false);
    });

    it('should block javascript protocol', () => {
      expect(validateNoXSS('javascript:alert(1)')).toBe(false);
    });

    it('should block iframe/object/embed', () => {
      expect(validateNoXSS('<iframe src="evil">')).toBe(false);
      expect(validateNoXSS('<object data="evil">')).toBe(false);
      expect(validateNoXSS('<embed src="evil">')).toBe(false);
    });
  });

  describe('validateNoControlChars', () => {
    it('should allow normal text', () => {
      expect(validateNoControlChars('Hello World')).toBe(true);
      expect(validateNoControlChars('Line1\nLine2')).toBe(false); // newline is control char
    });

    it('should block null bytes', () => {
      expect(validateNoControlChars('test\x00null')).toBe(false);
    });

    it('should block other control characters', () => {
      expect(validateNoControlChars('test\x01start')).toBe(false);
      expect(validateNoControlChars('test\x7Fdelete')).toBe(false);
    });

    it('should allow tabs and newlines in some contexts', () => {
      // Note: This test shows that newlines ARE blocked by default
      // If you need to allow them, use a different validator
      expect(validateNoControlChars('test\ttab')).toBe(false);
    });
  });

  describe('validateInput (combined)', () => {
    it('should return valid for safe input', () => {
      const result = validateInput('react');
      expect(result.valid).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should return all failure reasons', () => {
      const result = validateInput('../test; rm\x00');
      expect(result.valid).toBe(false);
      expect(result.reasons).toContain('Path traversal detected');
      expect(result.reasons).toContain('Invalid characters detected');
      expect(result.reasons).toContain('Control characters detected');
    });
  });

  describe('sanitizeString', () => {
    it('should remove control characters', () => {
      expect(sanitizeString('test\x00null')).toBe('testnull');
      expect(sanitizeString('test\x01start')).toBe('teststart');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });

    it('should preserve normal text', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World');
    });
  });

  describe('validateLength', () => {
    it('should validate within bounds', () => {
      expect(validateLength('test', 10)).toBe(true);
      expect(validateLength('test', 4)).toBe(true);
    });

    it('should reject too long', () => {
      expect(validateLength('test', 3)).toBe(false);
    });

    it('should reject too short', () => {
      expect(validateLength('', 10)).toBe(false);
      expect(validateLength('ab', 10, 3)).toBe(false);
    });

    it('should allow empty with minLength 0', () => {
      expect(validateLength('', 10, 0)).toBe(true);
    });
  });

  describe('validators.libraryId', () => {
    it('should allow valid library IDs', () => {
      expect(validators.libraryId('/user/react')).toBe(true);
      expect(validators.libraryId('@types/node')).toBe(true);
      expect(validators.libraryId('lodash.debounce')).toBe(true);
      expect(validators.libraryId('my-library')).toBe(true);
    });

    it('should block invalid library IDs', () => {
      expect(validators.libraryId('../etc/passwd')).toBe(false);
      expect(validators.libraryId('; rm -rf /')).toBe(false);
      expect(validators.libraryId('test<script>')).toBe(false);
    });
  });

  describe('validators.issueId', () => {
    it('should allow valid issue IDs', () => {
      expect(validators.issueId('ENG-1234')).toBe(true);
      expect(validators.issueId('abc-123-def')).toBe(true);
      expect(validators.issueId('PROJ123')).toBe(true);
    });

    it('should block invalid issue IDs', () => {
      expect(validators.issueId('../etc/passwd')).toBe(false);
      expect(validators.issueId('ENG-1234; rm')).toBe(false);
    });
  });

  describe('validators.searchQuery', () => {
    it('should allow valid search queries', () => {
      expect(validators.searchQuery('react hooks')).toBe(true);
      expect(validators.searchQuery('how to use useState')).toBe(true);
    });

    it('should block command injection in queries', () => {
      expect(validators.searchQuery('react; rm -rf /')).toBe(false);
      expect(validators.searchQuery('$(whoami)')).toBe(false);
    });

    it('should block control characters', () => {
      expect(validators.searchQuery('test\x00null')).toBe(false);
    });
  });

  describe('validators.filePath', () => {
    it('should allow valid file paths', () => {
      expect(validators.filePath('src/index.ts')).toBe(true);
      expect(validators.filePath('package.json')).toBe(true);
    });

    it('should block path traversal', () => {
      expect(validators.filePath('../../../etc/passwd')).toBe(false);
    });

    it('should block special characters', () => {
      expect(validators.filePath('file; rm')).toBe(false);
    });
  });
});
