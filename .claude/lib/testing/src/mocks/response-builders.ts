/**
 * Response Builders for MCP Mocks
 *
 * Provides factory functions to build realistic MCP responses for testing.
 * Covers common patterns across different MCP servers.
 */

/**
 * Build a mock response for any MCP tool
 *
 * Usage:
 * ```typescript
 * const response = buildMockResponse('context7', 'resolve-library-id', {
 *   libraries: [{ id: '1', name: 'react', description: 'A JavaScript library' }]
 * });
 * ```
 */
export function buildMockResponse(
  mcpName: string,
  toolName: string,
  data: any
): any {
  // Add common response metadata
  return {
    ...data,
    _meta: {
      mcpName,
      toolName,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Context7-specific response builders
 *
 * IMPORTANT: Context7 MCP returns PLAIN TEXT, not JSON.
 * These builders generate text in the actual Context7 format.
 */
export const Context7Responses = {
  /**
   * resolve-library-id response - returns plain text with "----------" delimiters
   */
  resolveLibraryId: (libraries: Array<{
    id: string;
    name: string;
    description?: string;
    codeSnippets?: number;
    sourceReputation?: string;
    benchmarkScore?: number;
    versions?: string[];
  }>): string => {
    const header = `Available Libraries:

Each result includes:
- Library ID: Context7-compatible identifier (format: /org/project)
- Name: Library or package name
- Description: Short summary
- Code Snippets: Number of available code examples
- Source Reputation: Authority indicator (High, Medium, Low, or Unknown)
- Benchmark Score: Quality indicator (100 is the highest score)
- Versions: List of versions if available.

----------
`;

    const entries = libraries.map(lib => {
      let entry = `- Title: ${lib.name}\n`;
      entry += `- Context7-compatible library ID: ${lib.id}\n`;
      if (lib.description) entry += `- Description: ${lib.description}\n`;
      if (lib.codeSnippets) entry += `- Code Snippets: ${lib.codeSnippets}\n`;
      if (lib.sourceReputation) entry += `- Source Reputation: ${lib.sourceReputation}\n`;
      if (lib.benchmarkScore) entry += `- Benchmark Score: ${lib.benchmarkScore}\n`;
      if (lib.versions) entry += `- Versions: ${lib.versions.join(', ')}\n`;
      return entry;
    }).join('----------\n');

    return header + entries;
  },

  /**
   * get-library-docs response - returns plain text documentation
   */
  getLibraryDocs: (documentation: string): string => documentation,

  /**
   * Empty library search result - returns text with no entries
   */
  emptySearch: (): string => `Available Libraries:

Each result includes:
- Library ID: Context7-compatible identifier (format: /org/project)
- Name: Library or package name
- Description: Short summary

----------
`,

  /**
   * Very long documentation (for token reduction tests)
   */
  longDocumentation: (): string => 'A'.repeat(10000), // ~2500 tokens
};

/**
 * Linear-specific response builders
 */
export const LinearResponses = {
  /**
   * get-issue response
   */
  getIssue: (config: {
    id: string;
    identifier: string;
    title: string;
    priority?: { name: string; value: number };
    assignee?: string;
    state?: string;
  }) => ({
    id: config.id,
    identifier: config.identifier,
    title: config.title,
    priority: config.priority,
    assignee: config.assignee,
    state: config.state || 'In Progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  /**
   * Minimal issue (only required fields)
   */
  minimalIssue: (id: string, identifier: string, title: string) => ({
    id,
    identifier,
    title,
  }),

  /**
   * Full issue with all optional fields
   */
  fullIssue: (id: string, identifier: string, title: string) => ({
    id,
    identifier,
    title,
    priority: { name: 'High', value: 1 },
    assignee: 'John Doe',
    state: 'In Progress',
    description: 'Detailed description',
    labels: ['bug', 'urgent'],
    comments: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }),
};

/**
 * Currents-specific response builders
 */
export const CurrentsResponses = {
  /**
   * get-projects response
   */
  getProjects: (projects: Array<{ id: string; name: string }>) => ({
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: new Date().toISOString(),
    })),
  }),

  /**
   * get-run-details response
   */
  getRunDetails: (runId: string) => ({
    id: runId,
    status: 'passed',
    totalTests: 100,
    passed: 95,
    failed: 5,
    duration: 12345,
    createdAt: new Date().toISOString(),
  }),
};

/**
 * Generic response builders for common patterns
 */
export const GenericResponses = {
  /**
   * List response with pagination
   */
  list: <T>(items: T[], page: number = 1, pageSize: number = 20) => ({
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: items.length,
    hasMore: page * pageSize < items.length,
  }),

  /**
   * Empty list
   */
  emptyList: () => ({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  }),

  /**
   * Single item
   */
  single: <T>(item: T) => ({
    data: item,
  }),

  /**
   * Success response with message
   */
  success: (message: string = 'Operation successful') => ({
    success: true,
    message,
  }),

  /**
   * Error response
   */
  error: (message: string, code?: string) => ({
    success: false,
    error: {
      message,
      code: code || 'INTERNAL_ERROR',
    },
  }),
};

/**
 * Test data generators
 */
export const TestData = {
  /**
   * Generate realistic library names
   */
  libraryNames: () => [
    'react',
    'vue',
    'angular',
    '@types/node',
    '@babel/core',
    'lodash',
    'moment',
    'axios',
    'express',
    'next.js',
  ],

  /**
   * Generate realistic issue identifiers
   */
  issueIdentifiers: (prefix: string = 'PROJ') =>
    Array.from({ length: 10 }, (_, i) => `${prefix}-${1000 + i}`),

  /**
   * Generate realistic user names
   */
  userNames: () => [
    'John Doe',
    'Jane Smith',
    'Bob Johnson',
    'Alice Williams',
    'Charlie Brown',
  ],

  /**
   * Generate random string of specified length
   */
  randomString: (length: number) =>
    'A'.repeat(length),

  /**
   * Generate UUID
   */
  uuid: () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
};
