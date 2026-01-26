/**
 * Linear OAuth Configuration
 *
 * Contains PUBLIC configuration for Linear OAuth 2.0 PKCE flow.
 * The clientId is NOT a secret - it's a public OAuth application identifier.
 *
 * OAuth tokens are stored in ~/.claude-oauth/linear.json (outside repository)
 */

export interface LinearOAuthConfig {
  provider: 'linear';
  clientId: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

/**
 * Praetorian's public Linear OAuth application configuration
 *
 * To use a different OAuth application:
 * 1. Create OAuth app at https://linear.app/settings/api/applications
 * 2. Set LINEAR_CLIENT_ID environment variable
 *
 * The clientId is PUBLIC and can be safely committed to the repository.
 */
export const LINEAR_OAUTH_CONFIG: LinearOAuthConfig = {
  provider: 'linear',
  clientId: process.env.LINEAR_CLIENT_ID || 'c22fe7e6dfa9be091c5ea19f6121307f',
  authorizationUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  scopes: ['read', 'write', 'issues:create'],
  redirectUri: 'http://localhost:14881/oauth/callback',
};
