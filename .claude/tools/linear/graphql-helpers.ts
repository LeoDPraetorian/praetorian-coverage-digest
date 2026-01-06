// .claude/tools/linear/graphql-helpers.ts
/**
 * GraphQL Request/Response Helpers for Linear API
 *
 * Provides utilities for building GraphQL requests and parsing responses
 * with proper error handling for Linear's GraphQL API format.
 */

/**
 * GraphQL error structure from Linear API
 */
export interface GraphQLErrorItem {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
  extensions?: Record<string, unknown>;
}

/**
 * GraphQL response structure
 */
export interface GraphQLResponse<T> {
  data?: T | null;
  errors?: GraphQLErrorItem[];
}

/**
 * GraphQL request body structure
 */
export interface GraphQLRequestBody {
  query: string;
  variables: Record<string, unknown>;
  operationName?: string;
}

/**
 * Custom error for GraphQL errors
 */
export class GraphQLError extends Error {
  constructor(
    message: string,
    public readonly errors: GraphQLErrorItem[],
    public readonly operationName?: string
  ) {
    super(message);
    this.name = 'GraphQLError';
  }
}

/**
 * Build a GraphQL request body
 *
 * @param query - GraphQL query or mutation string
 * @param variables - Variables for the query
 * @param operationName - Optional operation name for multi-operation documents
 */
export function buildGraphQLRequest(
  query: string,
  variables: Record<string, unknown> = {},
  operationName?: string
): GraphQLRequestBody {
  const body: GraphQLRequestBody = {
    query,
    variables,
  };

  if (operationName) {
    body.operationName = operationName;
  }

  return body;
}

/**
 * Parse a GraphQL response and extract data
 *
 * @param response - Raw GraphQL response
 * @returns Extracted data
 * @throws GraphQLError if response contains errors or null data
 */
export function parseGraphQLResponse<T>(response: GraphQLResponse<T>): T {
  // Check for GraphQL errors first
  if (response.errors && response.errors.length > 0) {
    const messages = response.errors.map((e) => e.message).join('; ');
    throw new GraphQLError(
      `GraphQL errors: ${messages}`,
      response.errors
    );
  }

  // Check for null/undefined data
  if (response.data === null || response.data === undefined) {
    throw new GraphQLError(
      'No data returned from GraphQL query',
      []
    );
  }

  return response.data;
}

/**
 * HTTP client type (from http-client.ts)
 */
export interface HTTPPort {
  request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    options?: any
  ): Promise<{ ok: boolean; data?: T; error?: any }>;
}

/**
 * Execute a GraphQL query against Linear API
 *
 * Combines client request with response parsing.
 * Supports both pre-created clients (for testing) and client factories (for OAuth token refresh).
 *
 * @param clientOrFactory - HTTPPort, Promise<HTTPPort>, or factory function returning Promise<HTTPPort>
 * @param query - GraphQL query string
 * @param variables - Query variables
 * @returns Parsed response data
 *
 * @example Using pre-created client (testing)
 * ```typescript
 * const client = await createLinearClient({ apiKey: 'test' });
 * const result = await executeGraphQL(client, query);
 * ```
 *
 * @example Using Promise<HTTPPort> (backward compatibility)
 * ```typescript
 * const result = await executeGraphQL(createLinearClient(), query);
 * // Promise is automatically awaited
 * ```
 *
 * @example Using factory function (OAuth with token refresh)
 * ```typescript
 * const result = await executeGraphQL(() => getLinearClient(), query);
 * // Factory called on every request, enabling token refresh
 * ```
 */
export async function executeGraphQL<T>(
  clientOrFactory: HTTPPort | Promise<HTTPPort> | (() => Promise<HTTPPort>),
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  // Resolve client:
  // - If function, call it to get Promise<HTTPPort>
  // - If Promise, await it to get HTTPPort
  // - Otherwise, use HTTPPort directly
  const client =
    typeof clientOrFactory === 'function'
      ? await clientOrFactory()
      : clientOrFactory instanceof Promise
      ? await clientOrFactory
      : clientOrFactory;

  const body = buildGraphQLRequest(query, variables);

  const result = await client.request<GraphQLResponse<T>>('post', 'graphql', {
    json: body,
    maxResponseBytes: 5_000_000, // 5MB for large list responses
  });

  if (!result.ok) {
    throw new Error(`HTTP error: ${result.error?.message || 'Unknown error'}`);
  }

  return parseGraphQLResponse(result.data!);
}
