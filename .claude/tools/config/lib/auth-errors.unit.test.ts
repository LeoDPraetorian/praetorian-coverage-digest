import { describe, it, expect } from 'vitest';
import { getOnePasswordItemName, createAuthErrorHint } from './auth-errors.js';

describe('auth-errors', () => {
  describe('getOnePasswordItemName', () => {
    it('should return item name for configured services', () => {
      expect(getOnePasswordItemName('shodan')).toBe('Shodan API Key');
      expect(getOnePasswordItemName('featurebase')).toBe('Featurebase API Key');
      expect(getOnePasswordItemName('currents')).toBe('Currents API Key');
      expect(getOnePasswordItemName('context7')).toBe('Context7 API Key');
      expect(getOnePasswordItemName('perplexity')).toBe('Perplexity API Key');
    });

    it('should return undefined for unknown services', () => {
      expect(getOnePasswordItemName('unknown')).toBeUndefined();
      expect(getOnePasswordItemName('')).toBeUndefined();
    });
  });

  describe('createAuthErrorHint', () => {
    it('should return 1Password hint for configured services', () => {
      const hint = createAuthErrorHint('shodan');
      expect(hint).toContain('Shodan API Key');
      expect(hint).toContain('Claude Code Tools'); // vault name
      expect(hint).toContain('password');
    });

    it('should return config hint for unknown services', () => {
      const hint = createAuthErrorHint('unknown');
      expect(hint).toContain('DEFAULT_CONFIG.serviceItems');
      expect(hint).toContain('.claude/tools/1password/lib/config.ts');
    });
  });
});
