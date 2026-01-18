// .claude/tools/config/lib/oauth-manager.ts
/**
 * OAuth Token Manager
 *
 * Manages OAuth 2.0 tokens with PKCE support for Linear API authentication.
 * Stores tokens securely in ~/.claude-oauth/ outside the repository.
 *
 * Security Features:
 * - PKCE flow (no client secret required)
 * - Tokens stored with 600 permissions
 * - Automatic refresh before expiry
 * - Storage outside repository
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { z } from 'zod';

/**
 * OAuth configuration for a provider
 */
export interface OAuthConfig {
  provider: string;
  clientId: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

/**
 * OAuth tokens schema
 */
export const OAuthTokensSchema = z.object({
  provider: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  scopes: z.array(z.string()),
  createdAt: z.number(),
  lastRefreshedAt: z.number().optional(),
});

export type OAuthTokens = z.infer<typeof OAuthTokensSchema>;

/**
 * OAuth token response from provider
 */
const OAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
});

/**
 * PKCE parameters for authorization
 */
export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Token refresh buffer (refresh 5 minutes before expiry)
 */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * OAuth token storage directory
 */
const OAUTH_DIR = path.join(os.homedir(), '.claude-oauth');

/**
 * OAuth Token Manager
 *
 * Handles loading, saving, validating, and refreshing OAuth tokens.
 */
export class OAuthTokenManager {
  private config: OAuthConfig;
  private tokenPath: string;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.tokenPath = path.join(OAUTH_DIR, `${config.provider}.json`);
  }

  /**
   * Load tokens from disk
   *
   * @returns Tokens if they exist and are valid JSON, null otherwise
   */
  async loadTokens(): Promise<OAuthTokens | null> {
    if (!fs.existsSync(this.tokenPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.tokenPath, 'utf-8');
      const parsed = JSON.parse(content);
      return OAuthTokensSchema.parse(parsed);
    } catch (error) {
      // Invalid tokens - return null to trigger re-auth
      return null;
    }
  }

  /**
   * Check if token is still valid (not expired, with buffer)
   *
   * @param tokens - Tokens to validate
   * @returns True if token is valid and not expiring soon
   */
  isTokenValid(tokens: OAuthTokens): boolean {
    const expiresWithBuffer = tokens.expiresAt - TOKEN_REFRESH_BUFFER_MS;
    return Date.now() < expiresWithBuffer;
  }

  /**
   * Save tokens to disk with secure permissions
   *
   * @param tokens - Tokens to save
   */
  async saveTokens(tokens: OAuthTokens): Promise<void> {
    // Create directory if it doesn't exist
    if (!fs.existsSync(OAUTH_DIR)) {
      fs.mkdirSync(OAUTH_DIR, { recursive: true, mode: 0o700 });
    }

    // Write tokens
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2), 'utf-8');

    // Set restrictive permissions (owner read/write only)
    fs.chmodSync(this.tokenPath, 0o600);
  }

  /**
   * Delete tokens from disk
   */
  async deleteTokens(): Promise<void> {
    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
    }
  }

  /**
   * Generate PKCE parameters for authorization
   *
   * @returns PKCE code verifier, challenge, and state
   */
  generatePKCE(): PKCEParams {
    // Generate 32 random bytes for code verifier
    const codeVerifier = crypto.randomBytes(32).toString('base64url');

    // Create SHA-256 hash for code challenge
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    return { codeVerifier, codeChallenge, state };
  }

  /**
   * Build authorization URL for browser redirect
   *
   * @param pkce - PKCE parameters
   * @returns Authorization URL
   */
  buildAuthorizationUrl(pkce: PKCEParams): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state: pkce.state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param code - Authorization code from callback
   * @param codeVerifier - PKCE code verifier
   * @returns OAuth tokens
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        code: code,
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const rawData = await response.json();
    const data = OAuthTokenResponseSchema.parse(rawData);

    const tokens: OAuthTokens = {
      provider: this.config.provider,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      scopes: this.config.scopes,
      createdAt: Date.now(),
    };

    await this.saveTokens(tokens);
    return tokens;
  }

  /**
   * Refresh access token using refresh token
   *
   * @param refreshToken - Current refresh token
   * @returns New OAuth tokens
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const rawData = await response.json();
    const data = OAuthTokenResponseSchema.parse(rawData);

    const tokens: OAuthTokens = {
      provider: this.config.provider,
      accessToken: data.access_token,
      // Linear may return new refresh token (rotating)
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      scopes: this.config.scopes,
      createdAt: Date.now(),
      lastRefreshedAt: Date.now(),
    };

    await this.saveTokens(tokens);
    return tokens;
  }

  /**
   * Get valid access token (refresh if needed)
   *
   * @returns Valid access token or null if re-auth required
   */
  async getValidAccessToken(): Promise<string | null> {
    const tokens = await this.loadTokens();

    if (!tokens) {
      return null;
    }

    // Token is still valid
    if (this.isTokenValid(tokens)) {
      return tokens.accessToken;
    }

    // Try to refresh
    if (tokens.refreshToken) {
      try {
        const newTokens = await this.refreshAccessToken(tokens.refreshToken);
        return newTokens.accessToken;
      } catch (error) {
        // Refresh failed - need re-auth
        console.error('Token refresh failed:', error);
        return null;
      }
    }

    // No refresh token available
    return null;
  }
}

/**
 * Linear-specific OAuth configuration
 */
export const LinearOAuthConfig: OAuthConfig = {
  provider: 'linear',
  clientId: '', // Will be set via credentials.json or environment variable
  authorizationUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  scopes: ['read', 'write', 'issues:create'],
  redirectUri: 'http://localhost:14881/oauth/callback',
};
