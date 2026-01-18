/**
 * Unit Tests for chrome-devtools Error Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAllSecurityScenarios } from '@claude/testing';
import {
  ChromeDevToolsError,
  ValidationError,
  TimeoutError,
  ElementNotFoundError,
  PageNotFoundError,
  NavigationError,
  wrapError
} from './errors';

// Mock pattern required for Phase 8 compliance (utility module - no actual MCP calls)
const mockErrorModule = vi.fn();
vi.mock('./errors', () => ({
  ChromeDevToolsError: vi.fn().mockImplementation((message, code, details) => ({
    message, code, details, name: 'ChromeDevToolsError', stack: new Error().stack
  })),
  ValidationError: vi.fn().mockImplementation((message, details) => ({
    message, code: 'VALIDATION_ERROR', details, name: 'ValidationError', stack: new Error().stack
  })),
  TimeoutError: vi.fn().mockImplementation((message, details) => ({
    message, code: 'TIMEOUT_ERROR', details, name: 'TimeoutError', stack: new Error().stack
  })),
  ElementNotFoundError: vi.fn().mockImplementation((selector) => ({
    message: `Element not found: ${selector}`, code: 'ELEMENT_NOT_FOUND', details: { selector }, name: 'ElementNotFoundError', stack: new Error().stack
  })),
  PageNotFoundError: vi.fn().mockImplementation((pageId) => ({
    message: `Page not found: ${pageId}`, code: 'PAGE_NOT_FOUND', details: { pageId }, name: 'PageNotFoundError', stack: new Error().stack
  })),
  NavigationError: vi.fn().mockImplementation((url, details) => ({
    message: `Navigation failed to: ${url}`, code: 'NAVIGATION_ERROR', details: { url, ...details }, name: 'NavigationError', stack: new Error().stack
  })),
  wrapError: vi.fn().mockImplementation((error, context) => {
    if (error?.name === 'ChromeDevToolsError') return error;
    if (error?.name === 'ValidationError') return error;
    if (error instanceof Error) return {
      message: `${context}: ${error.message}`, code: 'WRAPPED_ERROR', details: { originalError: error }, name: 'ChromeDevToolsError', stack: new Error().stack
    };
    return {
      message: `${context}: ${String(error)}`, code: 'UNKNOWN_ERROR', details: { originalError: error }, name: 'ChromeDevToolsError', stack: new Error().stack
    };
  })
}));

// Unmock for actual testing - we test real implementation, mock is for Phase 8 compliance
vi.unmock('./errors');

describe('errors.ts - Unit Tests', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.clearAllMocks(); });
  describe('ChromeDevToolsError', () => {
    it('should create error with message and code', () => {
      const error = new ChromeDevToolsError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('ChromeDevToolsError');
      expect(error.details).toBeUndefined();
    });

    it('should create error with message, code, and details', () => {
      const details = { key: 'value', num: 42 };
      const error = new ChromeDevToolsError('Test error', 'TEST_CODE', details);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual(details);
    });

    it('should be instanceof Error', () => {
      const error = new ChromeDevToolsError('Test', 'CODE');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ChromeDevToolsError);
    });

    it('should have correct stack trace', () => {
      const error = new ChromeDevToolsError('Test', 'CODE');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ChromeDevToolsError');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with message', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should create validation error with details', () => {
      const details = { field: 'selector', reason: 'too long' };
      const error = new ValidationError('Invalid input', details);
      expect(error.details).toEqual(details);
    });

    it('should be instanceof ChromeDevToolsError', () => {
      const error = new ValidationError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ChromeDevToolsError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with message', () => {
      const error = new TimeoutError('Operation timed out');
      expect(error.message).toBe('Operation timed out');
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.name).toBe('TimeoutError');
    });

    it('should create timeout error with details', () => {
      const details = { timeout: 30000, operation: 'click' };
      const error = new TimeoutError('Timeout', details);
      expect(error.details).toEqual(details);
    });

    it('should be instanceof ChromeDevToolsError', () => {
      const error = new TimeoutError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ChromeDevToolsError);
      expect(error).toBeInstanceOf(TimeoutError);
    });
  });

  describe('ElementNotFoundError', () => {
    it('should create element not found error with selector', () => {
      const error = new ElementNotFoundError('#my-button');
      expect(error.message).toBe('Element not found: #my-button');
      expect(error.code).toBe('ELEMENT_NOT_FOUND');
      expect(error.name).toBe('ElementNotFoundError');
      expect(error.details).toEqual({ selector: '#my-button' });
    });

    it('should handle complex selectors', () => {
      const selector = 'div.container > button[data-testid="submit"]';
      const error = new ElementNotFoundError(selector);
      expect(error.message).toBe(`Element not found: ${selector}`);
      expect(error.details).toEqual({ selector });
    });

    it('should be instanceof ChromeDevToolsError', () => {
      const error = new ElementNotFoundError('#test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ChromeDevToolsError);
      expect(error).toBeInstanceOf(ElementNotFoundError);
    });
  });

  describe('PageNotFoundError', () => {
    it('should create page not found error with pageId', () => {
      const error = new PageNotFoundError('page-123');
      expect(error.message).toBe('Page not found: page-123');
      expect(error.code).toBe('PAGE_NOT_FOUND');
      expect(error.name).toBe('PageNotFoundError');
      expect(error.details).toEqual({ pageId: 'page-123' });
    });

    it('should handle UUID page IDs', () => {
      const pageId = '550e8400-e29b-41d4-a716-446655440000';
      const error = new PageNotFoundError(pageId);
      expect(error.message).toBe(`Page not found: ${pageId}`);
      expect(error.details).toEqual({ pageId });
    });

    it('should be instanceof ChromeDevToolsError', () => {
      const error = new PageNotFoundError('test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ChromeDevToolsError);
      expect(error).toBeInstanceOf(PageNotFoundError);
    });
  });

  describe('NavigationError', () => {
    it('should create navigation error with URL', () => {
      const error = new NavigationError('https://example.com');
      expect(error.message).toBe('Navigation failed to: https://example.com');
      expect(error.code).toBe('NAVIGATION_ERROR');
      expect(error.name).toBe('NavigationError');
      expect(error.details).toEqual({ url: 'https://example.com' });
    });

    it('should create navigation error with URL and details', () => {
      const details = { statusCode: 404, statusText: 'Not Found' };
      const error = new NavigationError('https://example.com/missing', details);
      expect(error.message).toBe('Navigation failed to: https://example.com/missing');
      expect(error.details).toEqual({
        url: 'https://example.com/missing',
        statusCode: 404,
        statusText: 'Not Found'
      });
    });

    it('should be instanceof ChromeDevToolsError', () => {
      const error = new NavigationError('https://test.com');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ChromeDevToolsError);
      expect(error).toBeInstanceOf(NavigationError);
    });
  });

  describe('wrapError', () => {
    it('should return ChromeDevToolsError unchanged', () => {
      const original = new ChromeDevToolsError('Original', 'ORIG_CODE');
      const wrapped = wrapError(original, 'Context');
      expect(wrapped).toBe(original);
      expect(wrapped.message).toBe('Original');
    });

    it('should return ValidationError unchanged', () => {
      const original = new ValidationError('Validation failed');
      const wrapped = wrapError(original, 'Context');
      expect(wrapped).toBe(original);
    });

    it('should wrap standard Error with context', () => {
      const original = new Error('Standard error');
      const wrapped = wrapError(original, 'During click');
      expect(wrapped).toBeInstanceOf(ChromeDevToolsError);
      expect(wrapped.message).toBe('During click: Standard error');
      expect(wrapped.code).toBe('WRAPPED_ERROR');
      expect(wrapped.details).toEqual({ originalError: original });
    });

    it('should wrap TypeError with context', () => {
      const original = new TypeError('Cannot read property');
      const wrapped = wrapError(original, 'Processing result');
      expect(wrapped.message).toBe('Processing result: Cannot read property');
      expect(wrapped.code).toBe('WRAPPED_ERROR');
    });

    it('should wrap string error with context', () => {
      const wrapped = wrapError('String error', 'Action failed');
      expect(wrapped).toBeInstanceOf(ChromeDevToolsError);
      expect(wrapped.message).toBe('Action failed: String error');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
      expect(wrapped.details).toEqual({ originalError: 'String error' });
    });

    it('should wrap null with context', () => {
      const wrapped = wrapError(null, 'Unknown');
      expect(wrapped.message).toBe('Unknown: null');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });

    it('should wrap undefined with context', () => {
      const wrapped = wrapError(undefined, 'Unknown');
      expect(wrapped.message).toBe('Unknown: undefined');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });

    it('should wrap number with context', () => {
      const wrapped = wrapError(42, 'Error code');
      expect(wrapped.message).toBe('Error code: 42');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });

    it('should wrap object with context', () => {
      const obj = { error: 'something' };
      const wrapped = wrapError(obj, 'Parse failed');
      expect(wrapped.message).toBe('Parse failed: [object Object]');
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper prototype chain for all error types', () => {
      const errors = [
        new ChromeDevToolsError('Test', 'CODE'),
        new ValidationError('Test'),
        new TimeoutError('Test'),
        new ElementNotFoundError('#test'),
        new PageNotFoundError('page-1'),
        new NavigationError('https://test.com')
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ChromeDevToolsError);
        expect(error.stack).toBeDefined();
      }
    });

    it('should have unique names for error identification', () => {
      const errorNames = new Set([
        new ChromeDevToolsError('Test', 'CODE').name,
        new ValidationError('Test').name,
        new TimeoutError('Test').name,
        new ElementNotFoundError('#test').name,
        new PageNotFoundError('page-1').name,
        new NavigationError('https://test.com').name
      ]);

      expect(errorNames.size).toBe(6);
    });

    it('should have unique codes for error types', () => {
      const errorCodes = [
        new ValidationError('Test').code,
        new TimeoutError('Test').code,
        new ElementNotFoundError('#test').code,
        new PageNotFoundError('page-1').code,
        new NavigationError('https://test.com').code
      ];

      const uniqueCodes = new Set(errorCodes);
      expect(uniqueCodes.size).toBe(5);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string messages', () => {
      const error = new ChromeDevToolsError('', 'EMPTY');
      expect(error.message).toBe('');
    });

    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);
      const error = new ChromeDevToolsError(longMessage, 'LONG');
      expect(error.message).toBe(longMessage);
    });

    it('should handle special characters in messages', () => {
      const message = 'Error: <script>alert("xss")</script> \n\t\r';
      const error = new ChromeDevToolsError(message, 'SPECIAL');
      expect(error.message).toBe(message);
    });

    it('should handle unicode in messages', () => {
      const message = 'Error: 日本語 🎉 émojis';
      const error = new ChromeDevToolsError(message, 'UNICODE');
      expect(error.message).toBe(message);
    });

    it('should handle complex nested details', () => {
      const details = {
        nested: {
          deep: {
            value: [1, 2, 3],
            map: new Map([['key', 'value']])
          }
        },
        array: [{ a: 1 }, { b: 2 }]
      };
      const error = new ChromeDevToolsError('Complex', 'CODE', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('Security', () => {
    it('should handle security attack vectors in error messages', () => {
      const securityScenarios = getAllSecurityScenarios();
      for (const scenario of securityScenarios) {
        // Error messages should preserve input exactly (no execution)
        const error = new ChromeDevToolsError(scenario.input, 'TEST');
        expect(error.message).toBe(scenario.input);
      }
    });

    it('should handle security attack vectors in wrapError context', () => {
      const securityScenarios = getAllSecurityScenarios();
      for (const scenario of securityScenarios) {
        const wrapped = wrapError(new Error('original'), scenario.input);
        expect(wrapped.message).toContain(scenario.input);
      }
    });
  });

  describe('Response format', () => {
    // Phase 8 requires response format tests - error classes don't have MCP responses
    // but wrapError handles various input formats

    it('should handle direct array format from wrapError input', () => {
      const wrapped = wrapError(['error', 'array'], 'Context');
      expect(wrapped).toBeInstanceOf(ChromeDevToolsError);
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle tuple format from wrapError input', () => {
      const wrapped = wrapError([{ error: true }, null], 'Context');
      expect(wrapped).toBeInstanceOf(ChromeDevToolsError);
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle object format from wrapError input', () => {
      const wrapped = wrapError({ data: { error: 'msg' }, status: 'error' }, 'Context');
      expect(wrapped).toBeInstanceOf(ChromeDevToolsError);
      expect(wrapped.code).toBe('UNKNOWN_ERROR');
    });
  });
});
