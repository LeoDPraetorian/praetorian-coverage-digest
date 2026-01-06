// .claude/tools/config/lib/oauth-manager.unit.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  OAuthTokenManager,
  type OAuthTokens,
  type OAuthConfig,
} from '../oauth-manager';

// Mock fs module
vi.mock('fs');

describe('OAuthTokenManager', () => {
  const mockConfig: OAuthConfig = {
    provider: 'linear',
    clientId: 'test-client-id',
    authorizationUrl: 'https://linear.app/oauth/authorize',
    tokenUrl: 'https://api.linear.app/oauth/token',
    scopes: ['read', 'write'],
    redirectUri: 'http://localhost:3847/callback',
  };

  let manager: OAuthTokenManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new OAuthTokenManager(mockConfig);
  });

  describe('loadTokens', () => {
    it('should return null if token file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const tokens = await manager.loadTokens();

      expect(tokens).toBeNull();
    });

    it('should return tokens if file exists and is valid', async () => {
      const mockTokens: OAuthTokens = {
        provider: 'linear',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        scopes: ['read', 'write'],
        createdAt: Date.now(),
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockTokens));

      const tokens = await manager.loadTokens();

      expect(tokens).toEqual(mockTokens);
    });
  });

  describe('isTokenValid', () => {
    it('should return false if token is expired', () => {
      const expiredTokens: OAuthTokens = {
        provider: 'linear',
        accessToken: 'test',
        refreshToken: 'test',
        expiresAt: Date.now() - 1000, // Expired
        scopes: ['read'],
        createdAt: Date.now() - 3600000,
      };

      expect(manager.isTokenValid(expiredTokens)).toBe(false);
    });

    it('should return false if token expires within buffer time', () => {
      const soonExpiring: OAuthTokens = {
        provider: 'linear',
        accessToken: 'test',
        refreshToken: 'test',
        expiresAt: Date.now() + 60000, // 1 minute from now (within 5min buffer)
        scopes: ['read'],
        createdAt: Date.now() - 3540000,
      };

      expect(manager.isTokenValid(soonExpiring)).toBe(false);
    });

    it('should return true if token is valid', () => {
      const validTokens: OAuthTokens = {
        provider: 'linear',
        accessToken: 'test',
        refreshToken: 'test',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        scopes: ['read'],
        createdAt: Date.now(),
      };

      expect(manager.isTokenValid(validTokens)).toBe(true);
    });
  });

  describe('saveTokens', () => {
    it('should create directory if it does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const tokens: OAuthTokens = {
        provider: 'linear',
        accessToken: 'test',
        refreshToken: 'test',
        expiresAt: Date.now() + 3600000,
        scopes: ['read'],
        createdAt: Date.now(),
      };

      await manager.saveTokens(tokens);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should set restrictive file permissions (600)', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
      vi.mocked(fs.chmodSync).mockReturnValue(undefined);

      const tokens: OAuthTokens = {
        provider: 'linear',
        accessToken: 'test',
        refreshToken: 'test',
        expiresAt: Date.now() + 3600000,
        scopes: ['read'],
        createdAt: Date.now(),
      };

      await manager.saveTokens(tokens);

      expect(fs.chmodSync).toHaveBeenCalledWith(
        expect.any(String),
        0o600
      );
    });
  });
});
