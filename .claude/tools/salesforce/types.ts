/**
 * Salesforce MCP Wrapper Types
 *
 * Shared type definitions for all Salesforce wrappers.
 */

import type { SalesforceError } from './errors.js';

/**
 * Result type for all wrapper returns
 * Based on implementing-result-either-pattern skill
 */
export type Result<T, E = SalesforceError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Token estimation metadata
 */
export interface TokenEstimate {
  withoutCustomTool: number;
  withCustomTool: number;
  whenUsed: number;
  reduction: string;
}

/**
 * Common response wrapper with metadata
 */
export interface SalesforceResponse<T> {
  data: T;
  metadata: {
    timestamp: string;
    orgId?: string;
    apiVersion?: string;
  };
  tokenEstimate: TokenEstimate;
}

/**
 * Paginated response for list operations
 */
export interface PaginatedResponse<T> {
  summary: {
    total_count: number;
    returned_count: number;
    has_more: boolean;
  };
  items: T[];
  nextOffset?: string;
  estimatedTokens: number;
}

/**
 * MCP Port interface for hexagonal architecture
 * Enables dependency injection for testing
 */
export interface MCPPort {
  callTool: (service: string, tool: string, params: Record<string, unknown>) => Promise<unknown>;
}
