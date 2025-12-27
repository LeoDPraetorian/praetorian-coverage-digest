/**
 * @chariot/formatting-skill-output
 *
 * Deterministic table formatter for skill management output.
 * Provides consistent, reproducible formatting for findings from
 * auditing-skills, finding-agents-for-skills, etc.
 *
 * @example
 * ```typescript
 * import {
 *   formatFindingsTable,
 *   countFindings,
 *   formatCompletionMessage,
 *   validateSemanticFindings,
 *   semanticFindingsToFindings,
 * } from '@chariot/formatting-skill-output';
 *
 * // Or import from subpaths:
 * import { Finding } from '@chariot/formatting-skill-output/lib/table-formatter';
 * import { SemanticFindingsJson } from '@chariot/formatting-skill-output/lib/schemas';
 * ```
 */

// Re-export from table-formatter (core types and functions)
export {
  type Severity,
  type Source,
  type Finding,
  type FindingCounts,
  formatFindingsTable,
  formatCompletionMessage,
  countFindings,
} from './lib/table-formatter.js';

// Re-export from schemas (JSON validation and conversion)
export {
  type SemanticCriterion,
  type SemanticFinding,
  type SemanticFindingsJson,
  type AgentRecommendation,
  type AgentRecommendationsJson,
  validateSemanticFindings,
  semanticFindingsToFindings,
  agentRecommendationsToFindings,
} from './lib/schemas.js';

// Re-export from utils
export { findRepoRoot, getClaudeDir } from './lib/utils.js';
