/**
 * find_issue - Smart Linear Issue Finder
 *
 * Gracefully handles partial/fuzzy issue input:
 * 1. Tries exact match first (by ID or identifier)
 * 2. Falls back to search if not found
 * 3. Presents multiple matches for interactive selection
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600-1000 tokens depending on matches
 * - vs Direct MCP: 46,000 tokens at start
 * - Reduction: 99%
 *
 * Schema Discovery Results (tested with CHARIOT workspace):
 *
 * INPUT FIELDS:
 * - query: string (required) - Issue ID, identifier, number, or search text
 * - team: string (optional) - Team name to narrow search
 * - maxResults: number (optional) - Max matches for disambiguation (1-10, default 5)
 *
 * OUTPUT (Union Type - three possible formats):
 *
 * FoundResult:
 * - status: 'found' (literal)
 * - issue: GetIssueOutput (full issue details)
 *
 * DisambiguationResult:
 * - status: 'disambiguation_needed' (literal)
 * - message: string
 * - query: string
 * - candidates: IssueCandidate[] (identifier, title, state, assignee, url)
 * - hint: string
 *
 * NotFoundResult:
 * - status: 'not_found' (literal)
 * - message: string
 * - query: string
 * - suggestions: string[]
 *
 * Edge cases discovered:
 * - Uses get_issue for exact matches, list_issues for searches
 * - Number-only queries (e.g., "1561") try common prefixes: CHARIOT, ENG, PROD, DEV
 * - Single search result returns full issue details
 * - Multiple results return disambiguation with candidates
 * - Empty search returns not_found with helpful suggestions
 *
 * @example
 * ```typescript
 * // Exact ID - returns directly
 * await findIssue.execute({ query: 'CHARIOT-1561' });
 *
 * // Partial ID - searches and finds match
 * await findIssue.execute({ query: '1561' });
 *
 * // Text search - finds matching issues
 * await findIssue.execute({ query: 'authentication bug' });
 * ```
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { getIssueOutput, type GetIssueOutput } from './get-issue';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../config/lib/sanitize';

/**
 * Input validation schema
 */
export const findIssueParams = z.object({
  query: z.string()
    .min(1)
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .describe('Issue ID, identifier, number, or search text'),
  team: z.string()
    .refine(validateNoControlChars, 'Control characters not allowed')
    .refine(validateNoPathTraversal, 'Path traversal not allowed')
    .refine(validateNoCommandInjection, 'Invalid characters detected')
    .optional()
    .describe('Team name to narrow search (optional)'),
  maxResults: z.number().min(1).max(10).default(5).describe('Max matches to return for disambiguation')
});

export type FindIssueInput = z.infer<typeof findIssueParams>;

/**
 * Candidate issue for selection
 */
export interface IssueCandidate {
  identifier: string;
  title: string;
  state?: string;
  assignee?: string;
  url?: string;
}

/**
 * Output when disambiguation is needed
 */
export interface DisambiguationResult {
  status: 'disambiguation_needed';
  message: string;
  query: string;
  candidates: IssueCandidate[];
  hint: string;
}

/**
 * Output when single issue found
 */
export interface FoundResult {
  status: 'found';
  issue: GetIssueOutput;
}

/**
 * Output when no matches found
 */
export interface NotFoundResult {
  status: 'not_found';
  message: string;
  query: string;
  suggestions: string[];
}

export type FindIssueOutput = FoundResult | DisambiguationResult | NotFoundResult;

/**
 * Check if input looks like an issue identifier
 * Patterns: CHARIOT-1234, 1234, ABC-123, UUID
 */
function looksLikeIdentifier(input: string): boolean {
  // Full identifier: ABC-123
  if (/^[A-Z]+-\d+$/i.test(input)) return true;
  // Just the number: 1234
  if (/^\d+$/.test(input)) return true;
  // UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) return true;
  return false;
}

/**
 * Check if input is number-only (not full identifier or UUID)
 */
function isNumberOnly(input: string): boolean {
  return /^\d+$/.test(input);
}

/**
 * Check if error is critical and should propagate
 */
function isCriticalError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('rate limit') ||
      msg.includes('server') ||
      msg.includes('etimedout') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset')
    );
  }
  return false;
}

/**
 * Try to get issue by exact ID or identifier
 * @param propagateErrors - if true, propagate critical errors instead of returning null
 */
async function tryExactMatch(id: string, propagateErrors: boolean = false): Promise<GetIssueOutput | null> {
  try {
    const rawData = await callMCPTool('linear', 'get_issue', { id });
    if (!rawData) return null;

    // Filter to essential fields
    const filtered = {
      id: rawData.id,
      identifier: rawData.identifier,
      title: rawData.title,
      description: rawData.description?.substring(0, 500),
      priority: rawData.priority ? {
        name: rawData.priority.name,
        value: rawData.priority.value
      } : undefined,
      priorityLabel: rawData.priorityLabel,
      estimate: rawData.estimate ? {
        name: rawData.estimate.name,
        value: rawData.estimate.value
      } : undefined,
      state: rawData.state ? {
        id: rawData.state.id,
        name: rawData.state.name,
        type: rawData.state.type
      } : undefined,
      assignee: rawData.assignee || undefined,
      assigneeId: rawData.assigneeId || undefined,
      url: rawData.url,
      branchName: rawData.gitBranchName || rawData.branchName,
      createdAt: rawData.createdAt,
      updatedAt: rawData.updatedAt,
      attachments: rawData.attachments?.map((a: any) => ({
        id: a.id,
        title: a.title,
        url: a.url
      }))
    };

    return getIssueOutput.parse(filtered);
  } catch (error) {
    // Propagate critical errors (rate limit, server error, timeout)
    if (propagateErrors && isCriticalError(error)) {
      throw error;
    }
    return null;
  }
}

/**
 * Search for issues matching the query
 */
async function searchIssues(
  query: string,
  team?: string,
  limit: number = 5
): Promise<IssueCandidate[]> {
  try {
    const params: any = {
      query,
      limit,
      includeArchived: false,
      orderBy: 'updatedAt'
    };

    if (team) {
      params.team = team;
    }

    const rawData = await callMCPTool('linear', 'list_issues', params);
    if (!rawData) return [];

    const issues = Array.isArray(rawData) ? rawData : (rawData.issues || []);

    return issues.map((issue: any) => ({
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state?.name,
      assignee: issue.assignee,
      url: issue.url
    }));
  } catch {
    return [];
  }
}

/**
 * Search for issues by identifier number
 */
async function searchByNumber(
  number: string,
  team?: string,
  limit: number = 5
): Promise<IssueCandidate[]> {
  try {
    // Search for issues containing the number in their identifier
    // Linear doesn't have a direct "identifier contains" filter,
    // so we search and then filter results
    const params: any = {
      limit: 50, // Get more to filter
      includeArchived: false,
      orderBy: 'updatedAt'
    };

    if (team) {
      params.team = team;
    }

    const rawData = await callMCPTool('linear', 'list_issues', params);
    if (!rawData) return [];

    const issues = Array.isArray(rawData) ? rawData : (rawData.issues || []);

    // Filter to issues where identifier contains the number
    const matching = issues
      .filter((issue: any) => {
        const identifierNumber = issue.identifier?.split('-')[1];
        return identifierNumber?.includes(number);
      })
      .slice(0, limit);

    return matching.map((issue: any) => ({
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state?.name,
      assignee: issue.assignee,
      url: issue.url
    }));
  } catch {
    return [];
  }
}

/**
 * Smart issue finder with disambiguation support
 */
export const findIssue = {
  name: 'linear.find_issue',
  description: 'Smart issue finder - handles partial IDs and searches with disambiguation',
  parameters: findIssueParams,

  async execute(input: FindIssueInput): Promise<FindIssueOutput> {
    const validated = findIssueParams.parse(input);
    const { query, team, maxResults } = validated;

    // Step 1: Handle identifier-like inputs
    if (looksLikeIdentifier(query)) {
      // For number-only inputs, try common prefixes FIRST
      if (isNumberOnly(query)) {
        // Try with common team prefixes
        const commonPrefixes = ['CHARIOT', 'ENG', 'PROD', 'DEV'];
        for (const prefix of commonPrefixes) {
          const fullId = `${prefix}-${query}`;
          // First attempt propagates errors (rate limit, server error, timeout)
          const match = await tryExactMatch(fullId, prefix === 'CHARIOT');
          if (match) {
            return {
              status: 'found',
              issue: match
            };
          }
        }

        // Search by number if no prefix match
        const numberMatches = await searchByNumber(query, team, maxResults);
        if (numberMatches.length === 1) {
          // Single match - fetch full details
          const fullIssue = await tryExactMatch(numberMatches[0].identifier);
          if (fullIssue) {
            return {
              status: 'found',
              issue: fullIssue
            };
          }
        } else if (numberMatches.length > 1) {
          return {
            status: 'disambiguation_needed',
            message: `Found ${numberMatches.length} issues matching "${query}"`,
            query,
            candidates: numberMatches,
            hint: `Please specify the full identifier (e.g., "${numberMatches[0].identifier}")`
          };
        }
      } else {
        // Full identifier or UUID - try exact match first
        // Propagate critical errors on first attempt
        const exactMatch = await tryExactMatch(query, true);
        if (exactMatch) {
          return {
            status: 'found',
            issue: exactMatch
          };
        }
      }
    }

    // Step 2: Fall back to text search
    const searchResults = await searchIssues(query, team, maxResults);

    if (searchResults.length === 0) {
      return {
        status: 'not_found',
        message: `No issues found matching "${query}"`,
        query,
        suggestions: [
          'Try a different search term',
          'Check if the issue exists in a different team',
          'Use the full issue identifier (e.g., CHARIOT-1234)'
        ]
      };
    }

    if (searchResults.length === 1) {
      // Single match - fetch full details
      const fullIssue = await tryExactMatch(searchResults[0].identifier);
      if (fullIssue) {
        return {
          status: 'found',
          issue: fullIssue
        };
      }
    }

    // Multiple matches - need disambiguation
    return {
      status: 'disambiguation_needed',
      message: `Found ${searchResults.length} issues matching "${query}"`,
      query,
      candidates: searchResults,
      hint: `Please specify which issue you want by identifier (e.g., "${searchResults[0].identifier}")`
    };
  },

  tokenEstimate: {
    withoutCustomTool: 46000,
    withCustomTool: 0,
    whenUsed: 800,
    reduction: '99%'
  }
};
