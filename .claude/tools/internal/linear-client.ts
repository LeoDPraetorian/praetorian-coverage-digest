/**
 * Linear GraphQL Client
 *
 * Direct GraphQL client for Linear API following custom tool pattern
 * No MCP dependency - pure TypeScript implementation
 */

import { getToolConfig } from './config';

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
    extensions?: Record<string, any>;
  }>;
}

/**
 * Execute a GraphQL query against Linear API
 *
 * @param query - GraphQL query string
 * @param variables - Query variables
 * @returns Parsed response data
 *
 * @example
 * ```typescript
 * const result = await executeLinearQuery(`
 *   query GetViewer {
 *     viewer {
 *       id
 *       name
 *       email
 *     }
 *   }
 * `);
 * ```
 */
export async function executeLinearQuery<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const config = getToolConfig('linear');
  const { apiKey, endpoint } = config;

  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error(
      'LINEAR_API_KEY not configured. Set LINEAR_API_KEY environment variable or add to credentials.json'
    );
  }

  const requestBody = {
    query,
    variables: variables || {},
  };

  // Debug logging
  if (process.env.DEBUG_LINEAR) {
    console.log('[DEBUG] Linear GraphQL Request:');
    console.log(JSON.stringify(requestBody, null, 2));
  }

  const response = await fetch(endpoint as string, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey as string, // API keys don't use Bearer prefix
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Linear API request failed: ${response.status} ${response.statusText}\n` +
      `Response: ${errorText}`
    );
  }

  const json: GraphQLResponse<T> = await response.json();

  if (json.errors && json.errors.length > 0) {
    const errorDetails = json.errors.map(e =>
      `${e.message}${e.path ? ` (path: ${e.path.join('.')})` : ''}`
    ).join('\n');
    throw new Error(`Linear GraphQL errors:\n${errorDetails}`);
  }

  if (!json.data) {
    throw new Error('Linear API returned no data');
  }

  return json.data;
}

/**
 * Execute a GraphQL mutation against Linear API
 *
 * @param mutation - GraphQL mutation string
 * @param variables - Mutation variables
 * @returns Parsed response data
 */
export async function executeLinearMutation<T = any>(
  mutation: string,
  variables: Record<string, any>
): Promise<T> {
  return executeLinearQuery<T>(mutation, variables);
}
