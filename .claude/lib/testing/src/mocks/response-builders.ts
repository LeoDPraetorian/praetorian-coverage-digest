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
 * Serena-specific response builders
 *
 * Serena MCP returns JSON strings for most operations.
 */
export const SerenaResponses = {
  /**
   * find_symbol response - returns array of symbol objects
   */
  findSymbol: (symbols: Array<{
    name_path: string;
    kind?: number;
    relative_path?: string;
    body_location?: { start_line: number; end_line: number };
    body?: string;
  }>) => symbols.map(s => ({
    name_path: s.name_path,
    kind: s.kind ?? 12, // Function by default
    relative_path: s.relative_path ?? 'src/example.ts',
    body_location: s.body_location ?? { start_line: 1, end_line: 10 },
    ...(s.body ? { body: s.body } : {}),
  })),

  /**
   * Single symbol match
   */
  singleSymbol: (name_path: string, kind: number = 12) => [{
    name_path,
    kind,
    relative_path: 'src/example.ts',
    body_location: { start_line: 1, end_line: 10 },
  }],

  /**
   * Empty symbol search
   */
  emptySymbolSearch: () => [],

  /**
   * Symbol with body included
   */
  symbolWithBody: (name_path: string, body: string) => [{
    name_path,
    kind: 12,
    relative_path: 'src/example.ts',
    body_location: { start_line: 1, end_line: body.split('\n').length },
    body,
  }],

  /**
   * get_symbols_overview response
   */
  symbolsOverview: (symbols: Array<{
    name: string;
    kind: number;
    children?: Array<{ name: string; kind: number }>;
  }>) => symbols,

  /**
   * find_referencing_symbols response
   */
  referencingSymbols: (refs: Array<{
    name_path: string;
    kind: number;
    relative_path: string;
    content_around_reference?: string;
  }>) => refs.map(r => ({
    name_path: r.name_path,
    kind: r.kind,
    relative_path: r.relative_path,
    content_around_reference: r.content_around_reference ?? '  // reference here',
  })),

  /**
   * Memory operations - success message
   */
  memorySuccess: (operation: string, name: string) =>
    `Memory '${name}' ${operation} successfully.`,

  /**
   * list_memories response
   */
  listMemories: (names: string[]) => names,

  /**
   * read_memory response
   */
  readMemory: (content: string) => content,

  /**
   * list_dir response
   */
  listDir: (dirs: string[], files: string[]) => ({ dirs, files }),

  /**
   * find_file response
   */
  findFile: (files: string[]) => ({ files }),

  /**
   * search_for_pattern response
   */
  searchPattern: (matches: Array<{
    file: string;
    line: number;
    content: string;
  }>) => matches,

  /**
   * Thinking tool responses (prompts)
   */
  thinkingPrompt: (type: 'collected_info' | 'task_adherence' | 'done') => {
    const prompts: Record<string, string> = {
      collected_info: 'Reflect on the information you have gathered...',
      task_adherence: 'Consider whether you are still on track with the task...',
      done: 'Evaluate whether the task is truly complete...',
    };
    return prompts[type] || 'Reflect on your progress...';
  },

  /**
   * Generic success response
   */
  success: () => 'Success',

  /**
   * get_current_config response
   */
  currentConfig: () => ({
    active_project: 'test-project',
    tools: ['find_symbol', 'replace_symbol_body'],
    modes: ['interactive', 'editing'],
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
