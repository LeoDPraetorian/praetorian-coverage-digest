/**
 * Linear GraphQL API Client Configuration
 *
 * OAuth 2.0 ONLY authentication. API keys are NOT supported.
 *
 * OAuth provides:
 * - Short-lived tokens with automatic refresh
 * - Explicit user consent flow
 * - Secure storage outside repository (~/.claude-oauth/)
 * - Auto-expiry if leaked (vs manual revocation for API keys)
 *
 * Setup: Add clientId to credentials.json, run any Linear command.
 *
 * API Endpoint: https://api.linear.app/graphql
 * Rate Limit: 500 requests/hour
 *
 * @see https://linear.app/developers/graphql
 * @see https://linear.app/developers/oauth-2-0-authentication
 */

import { createHTTPClient, type HTTPServiceConfig, type HTTPPort } from '../config/lib/http-client.js';
import {
  OAuthTokenManager,
  LinearOAuthConfig,
} from '../config/lib/oauth-manager.js';
import { startOAuthFlow } from '../config/lib/oauth-browser-flow.js';
import { getToolConfig, hasToolConfig } from '../config/config-loader.js';

/**
 * OAuth configuration error - thrown when clientId not configured
 */
export class OAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthConfigurationError';
  }
}

/**
 * OAuth authentication error - thrown when browser flow fails
 */
export class OAuthAuthenticationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OAuthAuthenticationError';
  }
}

/**
 * Linear OAuth configuration
 *
 * Loads clientId from credentials.json or LINEAR_CLIENT_ID env var.
 * Does NOT support API key fallback.
 *
 * Requires clientId to be set in credentials.json:
 * {
 *   "linear": {
 *     "clientId": "your-oauth-app-client-id"
 *   }
 * }
 */
const getLinearOAuthConfig = () => {
  const creds = hasToolConfig('linear') ? getToolConfig<{
    clientId?: string;
  }>('linear') : {};

  return {
    ...LinearOAuthConfig,
    clientId: creds.clientId || process.env.LINEAR_CLIENT_ID || LinearOAuthConfig.clientId,
  };
};

/**
 * Linear GraphQL API configuration
 */
export const linearConfig: HTTPServiceConfig = {
  baseUrl: 'https://api.linear.app',
  auth: {
    type: 'bearer',  // OAuth always uses Bearer tokens
    keyName: 'Authorization',
    credentialKey: 'apiKey', // Key name for token in credentials object
  },
  timeout: 30_000,
  retry: {
    limit: 3,
    methods: ['post'],  // GraphQL uses POST
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
};

/**
 * Get Linear OAuth credentials (OAuth ONLY - no fallback)
 *
 * @throws {OAuthConfigurationError} If clientId not configured
 * @throws {OAuthAuthenticationError} If browser auth flow fails
 * @returns OAuth access token with Bearer prefix
 */
async function getOAuthCredentials(): Promise<{ token: string }> {
  const oauthConfig = getLinearOAuthConfig();

  // REQUIRE clientId - no fallback
  if (!oauthConfig.clientId) {
    throw new OAuthConfigurationError(
      'Linear OAuth not configured.\n\n' +
      'Setup Instructions:\n' +
      '1. Create OAuth app at https://linear.app/settings/api/applications\n' +
      '   - Name: "Claude Code"\n' +
      '   - Redirect URI: http://localhost:3847/callback\n' +
      '   - Copy the Client ID\n\n' +
      '2. Add to .claude/tools/config/credentials.json:\n' +
      '   {\n' +
      '     "linear": {\n' +
      '       "clientId": "your-oauth-client-id"\n' +
      '     }\n' +
      '   }\n\n' +
      '3. Run any Linear command - browser will open for authorization\n\n' +
      'Note: API keys are NOT supported. OAuth provides better security\n' +
      'through short-lived tokens with automatic refresh.'
    );
  }

  const tokenManager = new OAuthTokenManager(oauthConfig);
  const accessToken = await tokenManager.getValidAccessToken();

  if (accessToken) {
    return { token: accessToken }; // http-client adds "Bearer " prefix
  }

  // No valid tokens - initiate browser flow
  console.log('\nNo valid OAuth tokens found. Starting browser authorization...');
  console.log('If browser does not open, visit the URL printed below.\n');

  const pkce = tokenManager.generatePKCE();
  const authUrl = tokenManager.buildAuthorizationUrl(pkce);

  try {
    const code = await startOAuthFlow(authUrl, pkce.state);
    const tokens = await tokenManager.exchangeCodeForTokens(code, pkce.codeVerifier);
    return { token: tokens.accessToken }; // http-client adds "Bearer " prefix
  } catch (error) {
    throw new OAuthAuthenticationError(
      'OAuth authorization failed.\n\n' +
      'Possible causes:\n' +
      '- Browser authorization was cancelled or timed out\n' +
      '- Network connectivity issues\n' +
      '- Invalid OAuth app configuration\n\n' +
      'To retry:\n' +
      '1. Ensure your OAuth app is configured correctly at Linear\n' +
      '2. Run the command again to restart authorization\n\n' +
      'To clear cached tokens and start fresh:\n' +
      '  rm ~/.claude-oauth/linear.json',
      { cause: error }
    );
  }
}

/**
 * Create a Linear GraphQL HTTP client (OAuth only)
 *
 * @param testToken - Optional test token for unit tests (must be Bearer format)
 * @returns HTTPPort implementation for Linear API
 * @throws {OAuthConfigurationError} If OAuth not configured (production)
 * @throws {OAuthAuthenticationError} If auth flow fails (production)
 */
export async function createLinearClient(
  testToken?: string
): Promise<HTTPPort> {
  // For testing only - can be raw token or Bearer-prefixed
  if (testToken) {
    const token = testToken.startsWith('Bearer ') ? testToken.substring(7) : testToken;
    return createHTTPClient('linear', linearConfig, { apiKey: token });
  }

  // Production: OAuth only (token returned without Bearer prefix)
  const { token } = await getOAuthCredentials();
  return createHTTPClient('linear', linearConfig, { apiKey: token });
}

/**
 * Default Linear client instance (lazy initialization)
 */
let defaultClient: HTTPPort | null = null;

export async function getLinearClient(): Promise<HTTPPort> {
  if (!defaultClient) {
    defaultClient = await createLinearClient();
  }
  return defaultClient;
}

/**
 * Force OAuth re-authentication
 *
 * Call this to clear tokens and re-authorize via browser.
 */
export async function reauthorizeLinear(): Promise<void> {
  const oauthConfig = getLinearOAuthConfig();
  const tokenManager = new OAuthTokenManager(oauthConfig);

  // Delete existing tokens
  await tokenManager.deleteTokens();

  // Clear cached client
  defaultClient = null;

  console.log('OAuth tokens cleared. Next API call will trigger re-authorization.');
}
